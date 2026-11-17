import { StatusMonitor } from "./application/status-monitor.js";
import { BluetoothStatusOutput } from "./application/bluetooth-status-output.js";
import { PreferredStatusOutput } from "./application/preferred-status-output.js";
import { SerialStatusOutput } from "./application/serial-status-output.js";
import {
  enabledTransports,
  readTransportMode,
  type TransportMode,
} from "./application/transport-mode.js";
import { GoBluetoothTransport } from "./adapters/bluetooth/go-bluetooth-transport.js";
import { CompositeStatusReporter } from "./adapters/composite/composite-status-reporter.js";
import { ConsoleBluetoothObserver } from "./adapters/console/console-bluetooth-observer.js";
import { ConsoleSerialObserver } from "./adapters/console/console-serial-observer.js";
import { ConsoleReporter } from "./adapters/console/console-reporter.js";
import { OpenCodeStatusSource } from "./adapters/opencode/open-code-source.js";
import { NodeSerialTransport } from "./adapters/serial/node-serial-transport.js";
import { MAX_FINISHED_HOLD_MS, StatusStore } from "./core/status-store.js";
import type { StatusReporter } from "./ports/status-reporter.js";

interface RunnableStatusOutput extends StatusReporter {
  run(signal: AbortSignal): Promise<void>;
}

const abortController = new AbortController();

process.once("SIGINT", () => abortController.abort());
process.once("SIGTERM", () => abortController.abort());

const finishedHoldMs = readNonNegativeNumber(
  process.env["OPENCODE_STATUS_FINISHED_HOLD_MS"],
  MAX_FINISHED_HOLD_MS,
);
const pollIntervalMs = readPositiveNumber(
  process.env["OPENCODE_STATUS_POLL_INTERVAL_MS"],
  5_000,
);
const brightness = readByte(process.env["OPENCODE_STATUS_BRIGHTNESS"], 128);
const transportMode = readTransportMode(process.env["OPENCODE_STATUS_TRANSPORT"]);

reportConfiguration(transportMode);
const statusOutputs = createStatusOutputs(transportMode, brightness);

const monitor = new StatusMonitor(
  new OpenCodeStatusSource(),
  new StatusStore({ finishedHoldMs }),
  new CompositeStatusReporter(new ConsoleReporter(), ...statusOutputs),
  { pollIntervalMs },
);

await Promise.all([
  monitor.run(abortController.signal),
  ...statusOutputs.map((output) => output.run(abortController.signal)),
]);

function createStatusOutputs(
  mode: TransportMode,
  brightness: number,
): readonly RunnableStatusOutput[] {
  if (mode === "both") {
    return [
      new PreferredStatusOutput(
        (availabilityObserver) => new SerialStatusOutput(new NodeSerialTransport(), {
          brightness,
          observer: new ConsoleSerialObserver(),
          availabilityObserver,
          initiallyActive: false,
        }),
        (availabilityObserver) => new BluetoothStatusOutput(createBluetoothTransport(), {
          brightness,
          observer: new ConsoleBluetoothObserver(),
          availabilityObserver,
          initiallyActive: false,
        }),
      ),
    ];
  }

  return enabledTransports(mode).map((transport) => {
    if (transport === "bluetooth") {
      return new BluetoothStatusOutput(createBluetoothTransport(), {
        brightness,
        observer: new ConsoleBluetoothObserver(),
      });
    }

    return new SerialStatusOutput(new NodeSerialTransport(), {
      brightness,
      observer: new ConsoleSerialObserver(),
    });
  });
}

function createBluetoothTransport(): GoBluetoothTransport {
  const helperPath = process.env["OPENCODE_STATUS_BLE_HELPER"];
  return helperPath === undefined
    ? new GoBluetoothTransport()
    : new GoBluetoothTransport({ executablePath: helperPath });
}

function reportConfiguration(mode: TransportMode): void {
  process.stdout.write(
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      kind: "configuration",
      transportMode: mode,
      transports: enabledTransports(mode),
    })}\n`,
  );
}

function readNonNegativeNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("OPENCODE_STATUS_FINISHED_HOLD_MS must be a non-negative number");
  }

  return parsed;
}

function readPositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = readNonNegativeNumber(value, fallback);
  if (parsed === 0) {
    throw new Error("OPENCODE_STATUS_POLL_INTERVAL_MS must be greater than zero");
  }
  return parsed;
}

function readByte(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 255) {
    throw new Error("OPENCODE_STATUS_BRIGHTNESS must be an integer between 0 and 255");
  }
  return parsed;
}
