import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createInterface, type Interface as ReadlineInterface } from "node:readline";

import type {
  BluetoothConnectOptions,
  BluetoothConnection,
  BluetoothTransport,
} from "../../ports/bluetooth-transport.js";
import type { StatusDeviceRequestOptions } from "../../ports/status-device.js";

const DEFAULT_HELPER_PATH = fileURLToPath(
  new URL("../../../bin/opencode-status-ble.exe", import.meta.url),
);

interface GoBluetoothTransportOptions {
  readonly executablePath?: string;
}

interface PendingResponse {
  readonly resolve: (response: string) => void;
  readonly reject: (error: unknown) => void;
  readonly cleanup: () => void;
}

interface HelperMessage {
  readonly type: string;
  readonly address?: string;
  readonly name?: string;
  readonly value?: string;
  readonly code?: string;
  readonly message?: string;
}

export class GoBluetoothTransport implements BluetoothTransport {
  readonly #executablePath: string;

  constructor(options: GoBluetoothTransportOptions = {}) {
    this.#executablePath = options.executablePath ?? DEFAULT_HELPER_PATH;
  }

  async connect(options: BluetoothConnectOptions): Promise<BluetoothConnection | undefined> {
    if (options.signal.aborted) {
      throw abortError();
    }

    const scanTimeoutMs = Math.max(1, Math.min(5_000, Math.floor(options.timeoutMs - 500)));
    const child = spawn(this.#executablePath, [`-scan-timeout=${scanTimeoutMs}ms`], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    const connection = new GoBluetoothConnection(child);

    try {
      await connection.ready(options);
      return connection;
    } catch (error) {
      await connection.close();
      if (error instanceof BluetoothHelperError && error.code === "not_found") {
        return undefined;
      }
      throw error;
    }
  }
}

class GoBluetoothConnection implements BluetoothConnection {
  readonly #child: ChildProcessWithoutNullStreams;
  readonly #lines: ReadlineInterface;
  readonly disconnected: Promise<Error>;
  readonly #resolveDisconnected: (error: Error) => void;
  readonly #readyPromise: Promise<void>;
  readonly #resolveReady: () => void;
  readonly #rejectReady: (error: unknown) => void;
  #path = "Bluetooth OCStatus";
  #pending: PendingResponse | undefined;
  #failure: Error | undefined;
  #closed = false;
  #ready = false;
  #stderr = "";

  constructor(child: ChildProcessWithoutNullStreams) {
    this.#child = child;

    let resolveDisconnected: ((error: Error) => void) | undefined;
    this.disconnected = new Promise((resolve) => {
      resolveDisconnected = resolve;
    });
    this.#resolveDisconnected = (error) => resolveDisconnected?.(error);

    let resolveReady: (() => void) | undefined;
    let rejectReady: ((error: unknown) => void) | undefined;
    this.#readyPromise = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    this.#resolveReady = () => resolveReady?.();
    this.#rejectReady = (error) => rejectReady?.(error);

    this.#lines = createInterface({ input: child.stdout });
    this.#lines.on("line", (line) => this.#receive(line));
    child.stdin.on("error", (error) => {
      if (!this.#closed) {
        this.#fail(error);
      }
    });
    child.stderr.on("data", (data: Buffer) => {
      this.#stderr = (this.#stderr + data.toString("utf8")).slice(-2_048);
    });
    child.on("error", (error) => this.#fail(error));
    child.on("exit", (code, signal) => {
      if (this.#closed) {
        return;
      }
      const detail = this.#stderr.trim();
      const suffix = detail === "" ? "" : `: ${detail}`;
      this.#fail(
        new Error(
          `Bluetooth helper exited (${signal === null ? `code ${String(code)}` : signal})${suffix}`,
        ),
      );
    });
  }

  get path(): string {
    return this.#path;
  }

  async ready(options: BluetoothConnectOptions): Promise<void> {
    await withTimeoutAndAbort(
      this.#readyPromise,
      options.timeoutMs,
      options.signal,
      "Bluetooth helper connection timed out",
    );
  }

  request(command: string, options: StatusDeviceRequestOptions): Promise<string> {
    if (this.#failure !== undefined) {
      return Promise.reject(this.#failure);
    }
    if (this.#closed || !this.#ready) {
      return Promise.reject(new Error("Bluetooth connection is not open"));
    }
    if (this.#pending !== undefined) {
      return Promise.reject(new Error("A Bluetooth request is already pending"));
    }
    if (options.signal.aborted) {
      return Promise.reject(abortError());
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#rejectPending(new Error(`Bluetooth response timed out for ${command}`));
      }, options.timeoutMs);
      timer.unref();
      const onAbort = () => this.#rejectPending(abortError());
      const cleanup = () => {
        clearTimeout(timer);
        options.signal.removeEventListener("abort", onAbort);
      };

      this.#pending = { resolve, reject, cleanup };
      options.signal.addEventListener("abort", onAbort, { once: true });
      this.#write({ type: "request", value: command }, (error) => {
        if (error !== undefined) {
          this.#rejectPending(error);
        }
      });
    });
  }

  async close(): Promise<void> {
    if (this.#closed) {
      return;
    }
    this.#closed = true;
    this.#rejectReady(new Error("Bluetooth connection closed"));
    this.#rejectPending(new Error("Bluetooth connection closed"));

    if (this.#child.exitCode === null && !this.#child.killed) {
      this.#write({ type: "close" });
      this.#child.stdin.end();
      const exited = await waitForExit(this.#child, 750);
      if (!exited) {
        this.#child.kill();
      }
    }
    this.#lines.close();
  }

  #receive(line: string): void {
    let message: HelperMessage;
    try {
      message = JSON.parse(line) as HelperMessage;
    } catch {
      this.#fail(new Error("Bluetooth helper returned invalid JSON"));
      return;
    }

    switch (message.type) {
      case "ready":
        if (message.address === undefined) {
          this.#fail(new Error("Bluetooth helper omitted the device address"));
          return;
        }
        this.#path = `Bluetooth ${message.name ?? "OCStatus"} (${message.address})`;
        this.#ready = true;
        this.#resolveReady();
        return;

      case "response":
        if (message.value === undefined) {
          this.#fail(new Error("Bluetooth helper omitted a response value"));
          return;
        }
        this.#resolvePending(message.value);
        return;

      case "error":
        this.#fail(
          new BluetoothHelperError(
            message.code ?? "unknown",
            message.message ?? "Unknown Bluetooth helper error",
          ),
        );
        return;

      case "disconnected":
        this.#fail(new Error(message.message ?? "Bluetooth device disconnected"));
        return;

      default:
        this.#fail(new Error(`Bluetooth helper returned unknown message type: ${message.type}`));
    }
  }

  #write(message: object, callback?: (error: Error | undefined) => void): void {
    if (!this.#child.stdin.writable) {
      callback?.(new Error("Bluetooth helper input is closed"));
      return;
    }
    this.#child.stdin.write(`${JSON.stringify(message)}\n`, (error) => {
      callback?.(error ?? undefined);
    });
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
    if (this.#failure !== undefined || this.#closed) {
      return;
    }
    this.#failure = error;
    this.#resolveDisconnected(error);
    this.#rejectReady(error);
    this.#rejectPending(error);
  }
}

class BluetoothHelperError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "BluetoothHelperError";
  }
}

function withTimeoutAndAbort(
  operation: Promise<void>,
  timeoutMs: number,
  signal: AbortSignal,
  timeoutMessage: string,
): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(abortError());
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error(timeoutMessage)), timeoutMs);
    timer.unref();
    const onAbort = () => finish(abortError());

    const finish = (error?: unknown) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    };

    signal.addEventListener("abort", onAbort, { once: true });
    operation.then(() => finish(), finish);
  });
}

function waitForExit(child: ChildProcessWithoutNullStreams, timeoutMs: number): Promise<boolean> {
  if (child.exitCode !== null) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => finish(false), timeoutMs);
    timer.unref();
    const onExit = () => finish(true);
    const finish = (exited: boolean) => {
      clearTimeout(timer);
      child.removeListener("exit", onExit);
      resolve(exited);
    };
    child.once("exit", onExit);
  });
}

function abortError(): Error {
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
}
