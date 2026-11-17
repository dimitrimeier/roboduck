import { StatusStore } from "../core/status-store.js";
import type { StatusReporter } from "../ports/status-reporter.js";
import type { StatusConnection, StatusSource } from "../ports/status-source.js";

export interface Scheduler {
  every(intervalMs: number, callback: () => void): () => void;
  wait(delayMs: number, signal: AbortSignal): Promise<void>;
}

export interface StatusMonitorOptions {
  readonly initialRetryMs?: number;
  readonly maximumRetryMs?: number;
  readonly tickIntervalMs?: number;
  readonly scheduler?: Scheduler;
}

const SYSTEM_SCHEDULER: Scheduler = {
  every(intervalMs, callback) {
    const timer = setInterval(callback, intervalMs);
    timer.unref();
    return () => clearInterval(timer);
  },

  wait(delayMs, signal) {
    return new Promise((resolve) => {
      if (signal.aborted) {
        resolve();
        return;
      }

      const timer = setTimeout(finish, delayMs);
      const onAbort = () => finish();

      function finish(): void {
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        resolve();
      }

      signal.addEventListener("abort", onAbort, { once: true });
    });
  },
};

export class StatusMonitor {
  readonly #source: StatusSource;
  readonly #store: StatusStore;
  readonly #reporter: StatusReporter;
  readonly #initialRetryMs: number;
  readonly #maximumRetryMs: number;
  readonly #tickIntervalMs: number;
  readonly #scheduler: Scheduler;

  constructor(
    source: StatusSource,
    store: StatusStore,
    reporter: StatusReporter,
    options: StatusMonitorOptions = {},
  ) {
    this.#source = source;
    this.#store = store;
    this.#reporter = reporter;
    this.#initialRetryMs = options.initialRetryMs ?? 1_000;
    this.#maximumRetryMs = options.maximumRetryMs ?? 30_000;
    this.#tickIntervalMs = options.tickIntervalMs ?? 1_000;
    this.#scheduler = options.scheduler ?? SYSTEM_SCHEDULER;
  }

  async run(signal: AbortSignal): Promise<void> {
    let retryInMs = this.#initialRetryMs;
    const stopTicking = this.#scheduler.every(this.#tickIntervalMs, () => {
      if (this.#store.tick()) {
        this.#reporter.timerChanged(this.#store.view());
      }
    });

    try {
      while (!signal.aborted) {
        let connection: StatusConnection | undefined;
        let failure: unknown;

        try {
          connection = await this.#source.connect(signal);
          if (signal.aborted) {
            break;
          }

          this.#store.replaceSnapshot(connection.snapshot);
          this.#reporter.connected(this.#store.view());
          retryInMs = this.#initialRetryMs;

          for await (const event of connection.events) {
            if (signal.aborted) {
              break;
            }

            this.#store.apply(event);
            this.#reporter.eventReceived(event, this.#store.view());
          }

          if (!signal.aborted) {
            throw new Error("OpenCode event stream ended");
          }
        } catch (error) {
          failure = error;
        } finally {
          try {
            await connection?.close();
          } catch (error) {
            failure ??= error;
          }
        }

        if (signal.aborted) {
          break;
        }

        if (failure !== undefined) {
          this.#reporter.disconnected(failure, retryInMs);
          await this.#scheduler.wait(retryInMs, signal);
          retryInMs = Math.min(retryInMs * 2, this.#maximumRetryMs);
        }
      }
    } finally {
      stopTicking();
    }
  }
}
