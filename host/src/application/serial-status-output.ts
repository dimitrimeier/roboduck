import {
  StatusDeviceOutput,
  type StatusDeviceEvent,
  type StatusDeviceFinder,
  type StatusDeviceObserver,
  type StatusDeviceOutputOptions,
} from "./status-device-output.js";
import type { StatusEvent, StatusView } from "../core/model.js";
import type { SerialConnection, SerialPortDescriptor, SerialTransport } from "../ports/serial-transport.js";
import type { StatusReporter } from "../ports/status-reporter.js";

const EXPECTED_VENDOR_ID = "239A";
const EXPECTED_PRODUCT_ID = "0029";

export type SerialStatusEvent = StatusDeviceEvent;
export interface SerialStatusObserver extends StatusDeviceObserver {}

export interface SerialStatusOutputOptions extends StatusDeviceOutputOptions {
  readonly handshakeDelayMs?: number;
}

export class SerialStatusOutput implements StatusReporter {
  readonly #output: StatusDeviceOutput;

  constructor(transport: SerialTransport, options: SerialStatusOutputOptions = {}) {
    const handshakeDelayMs = nonNegativeNumber(
      options.handshakeDelayMs,
      100,
      "handshakeDelayMs",
    );
    const finder: StatusDeviceFinder = {
      find: async (context) => {
        const ports = await transport.list();
        for (const port of ports) {
          if (!isExpectedStatusDevice(port) || context.signal.aborted) {
            continue;
          }

          let connection: SerialConnection | undefined;
          try {
            connection = await transport.open(port.path, {
              timeoutMs: context.openTimeoutMs,
              signal: context.signal,
            });

            if (handshakeDelayMs > 0) {
              await waitForDelay(handshakeDelayMs, context.signal);
            }

            const information = await context.verify(connection);
            return { connection, information };
          } catch (error) {
            try {
              await connection?.close();
            } catch {
              // Continue scanning after a failed candidate.
            }

            if (context.signal.aborted) {
              return undefined;
            }
            context.rejected(port.path, error);
          }
        }

        return undefined;
      },
    };

    this.#output = new StatusDeviceOutput(finder, options);
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

export function isExpectedStatusDevice(port: SerialPortDescriptor): boolean {
  return normalizeUsbId(port.vendorId) === EXPECTED_VENDOR_ID &&
    normalizeUsbId(port.productId) === EXPECTED_PRODUCT_ID;
}

function normalizeUsbId(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value.replace(/^0x/i, "").padStart(4, "0").toUpperCase();
}

function nonNegativeNumber(value: number | undefined, fallback: number, name: string): number {
  const result = value ?? fallback;
  if (!Number.isFinite(result) || result < 0) {
    throw new Error(`${name} must be non-negative`);
  }
  return result;
}

function waitForDelay(delayMs: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(abortError());
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(finish, delayMs);
    timer.unref();
    const onAbort = () => {
      cleanup();
      reject(abortError());
    };
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
    };
    function finish() {
      cleanup();
      resolve();
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function abortError(): Error {
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
}
