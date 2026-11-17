import { SerialPort } from "serialport";

import type {
  SerialConnection,
  SerialOpenOptions,
  SerialPortDescriptor,
  SerialRequestOptions,
  SerialTransport,
} from "../../ports/serial-transport.js";

interface PendingResponse {
  readonly resolve: (response: string) => void;
  readonly reject: (error: unknown) => void;
  readonly cleanup: () => void;
}

export class NodeSerialTransport implements SerialTransport {
  async list(): Promise<readonly SerialPortDescriptor[]> {
    const ports = await SerialPort.list();
    return ports.map((port) => ({
      path: port.path,
      vendorId: port.vendorId,
      productId: port.productId,
      manufacturer: port.manufacturer,
      serialNumber: port.serialNumber,
      pnpId: port.pnpId,
    }));
  }

  async open(path: string, options: SerialOpenOptions): Promise<SerialConnection> {
    const port = new SerialPort({
      path,
      baudRate: 115_200,
      autoOpen: false,
    });

    await openPort(port, options);
    return new NodeSerialConnection(port);
  }
}

class NodeSerialConnection implements SerialConnection {
  readonly #port: SerialPort;
  readonly disconnected: Promise<Error>;
  readonly #resolveDisconnected: (error: Error) => void;
  #pending: PendingResponse | undefined;
  #buffer = "";
  #closed = false;
  #failure: Error | undefined;

  constructor(port: SerialPort) {
    this.#port = port;
    let resolveDisconnected: ((error: Error) => void) | undefined;
    this.disconnected = new Promise((resolve) => {
      resolveDisconnected = resolve;
    });
    this.#resolveDisconnected = (error) => resolveDisconnected?.(error);
    port.on("data", (data: Buffer) => this.#receive(data));
    port.on("error", (error: Error) => this.#fail(error));
    port.on("close", () => this.#fail(new Error("Serial port closed")));
  }

  get path(): string {
    return this.#port.path;
  }

  request(command: string, options: SerialRequestOptions): Promise<string> {
    if (this.#failure !== undefined) {
      return Promise.reject(this.#failure);
    }
    if (this.#closed || !this.#port.isOpen) {
      return Promise.reject(new Error("Serial port is not open"));
    }
    if (this.#pending !== undefined) {
      return Promise.reject(new Error("A serial request is already pending"));
    }
    if (options.signal.aborted) {
      return Promise.reject(abortError());
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#rejectPending(new Error(`Serial response timed out for ${command}`));
      }, options.timeoutMs);
      timer.unref();
      const onAbort = () => this.#rejectPending(abortError());
      const cleanup = () => {
        clearTimeout(timer);
        options.signal.removeEventListener("abort", onAbort);
      };

      this.#pending = { resolve, reject, cleanup };
      options.signal.addEventListener("abort", onAbort, { once: true });

      this.#port.write(`${command}\n`, (error) => {
        if (error !== null && error !== undefined) {
          this.#rejectPending(error);
          return;
        }
        this.#port.drain((drainError) => {
          if (drainError !== null && drainError !== undefined) {
            this.#rejectPending(drainError);
          }
        });
      });
    });
  }

  async close(): Promise<void> {
    if (this.#closed) {
      return;
    }
    this.#closed = true;
    this.#rejectPending(new Error("Serial connection closed"));
    if (!this.#port.isOpen) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.#port.close((error) => {
        if (error !== null) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  #receive(data: Buffer): void {
    this.#buffer += data.toString("utf8");
    if (this.#buffer.length > 512 && !this.#buffer.includes("\n")) {
      this.#buffer = "";
      this.#rejectPending(new Error("Serial response line is too long"));
      return;
    }

    let newline = this.#buffer.indexOf("\n");
    while (newline >= 0) {
      const line = this.#buffer.slice(0, newline).replace(/\r$/, "");
      this.#buffer = this.#buffer.slice(newline + 1);
      if (line.length > 0) {
        this.#resolvePending(line);
      }
      newline = this.#buffer.indexOf("\n");
    }
  }

  #resolvePending(response: string): void {
    const pending = this.#pending;
    if (pending === undefined) {
      return;
    }
    this.#pending = undefined;
    pending.cleanup();
    pending.resolve(response);
  }

  #rejectPending(error: unknown): void {
    const pending = this.#pending;
    if (pending === undefined) {
      return;
    }
    this.#pending = undefined;
    pending.cleanup();
    pending.reject(error);
  }

  #fail(error: Error): void {
    if (this.#closed) {
      return;
    }
    this.#failure = error;
    this.#resolveDisconnected(error);
    this.#rejectPending(error);
  }
}

function openPort(port: SerialPort, options: SerialOpenOptions): Promise<void> {
  if (options.signal.aborted) {
    return Promise.reject(abortError());
  }

  return new Promise((resolve, reject) => {
    let finished = false;
    const timer = setTimeout(() => finish(new Error(`Opening ${port.path} timed out`)), options.timeoutMs);
    timer.unref();
    const onAbort = () => finish(abortError());

    const finish = (error?: Error | null) => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timer);
      options.signal.removeEventListener("abort", onAbort);
      if (error !== undefined && error !== null) {
        reject(error);
      } else {
        resolve();
      }
    };

    options.signal.addEventListener("abort", onAbort, { once: true });
    port.open((error) => {
      if (finished) {
        if (port.isOpen) {
          port.close(() => undefined);
        }
        return;
      }
      finish(error);
    });
  });
}

function abortError(): Error {
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
}
