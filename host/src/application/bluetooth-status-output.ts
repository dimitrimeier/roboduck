import {
  StatusDeviceOutput,
  type StatusDeviceEvent,
  type StatusDeviceFinder,
  type StatusDeviceObserver,
  type StatusDeviceOutputOptions,
} from "./status-device-output.js";
import type { StatusEvent, StatusView } from "../core/model.js";
import type { BluetoothConnection, BluetoothTransport } from "../ports/bluetooth-transport.js";
import type { StatusReporter } from "../ports/status-reporter.js";

export type BluetoothStatusEvent = StatusDeviceEvent;
export interface BluetoothStatusObserver extends StatusDeviceObserver {}
export interface BluetoothStatusOutputOptions extends StatusDeviceOutputOptions {}

export class BluetoothStatusOutput implements StatusReporter {
  readonly #output: StatusDeviceOutput;

  constructor(transport: BluetoothTransport, options: BluetoothStatusOutputOptions = {}) {
    const finder: StatusDeviceFinder = {
      find: async (context) => {
        let connection: BluetoothConnection | undefined;
        try {
          connection = await transport.connect({
            timeoutMs: context.openTimeoutMs,
            signal: context.signal,
          });
          if (connection === undefined) {
            return undefined;
          }

          const information = await context.verify(connection);
          return { connection, information };
        } catch (error) {
          try {
            await connection?.close();
          } catch {
            // Continue scanning after a failed BLE candidate.
          }
          if (context.signal.aborted) {
            return undefined;
          }
          context.rejected(connection?.path ?? "Bluetooth OCStatus", error);
          return undefined;
        }
      },
    };

    this.#output = new StatusDeviceOutput(finder, {
      ...options,
      openTimeoutMs: options.openTimeoutMs ?? 25_000,
    });
  }

  connected(view: StatusView): void {
    this.#output.connected(view);
  }

  eventReceived(event: StatusEvent, view: StatusView): void {
    this.#output.eventReceived(event, view);
  }

  timerChanged(view: StatusView): void {
    this.#output.timerChanged(view);
  }

  disconnected(error: unknown, retryInMs: number): void {
    this.#output.disconnected(error, retryInMs);
  }

  setActive(active: boolean): void {
    this.#output.setActive(active);
  }

  run(signal: AbortSignal): Promise<void> {
    return this.#output.run(signal);
  }
}
