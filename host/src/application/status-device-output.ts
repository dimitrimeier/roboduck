import type { DisplayStatus, StatusEvent, StatusView } from "../core/model.js";
import type { StatusDeviceConnection } from "../ports/status-device.js";
import type { StatusReporter } from "../ports/status-reporter.js";

const PROTOCOL_VERSION = 1;

export type StatusDeviceEvent =
  | {
      readonly kind: "candidate-rejected";
      readonly path: string;
      readonly error: string;
    }
  | {
      readonly kind: "connected";
      readonly path: string;
      readonly firmware: string;
      readonly leds: number;
      readonly status: DisplayStatus;
      readonly role: "active" | "standby";
    }
  | {
      readonly kind: "role-changed";
      readonly path: string;
      readonly role: "active" | "standby";
    }
  | {
      readonly kind: "disconnected";
      readonly path: string | undefined;
      readonly error: string;
    };

export interface StatusDeviceObserver {
  report(event: StatusDeviceEvent): void;
}

export interface StatusDeviceAvailabilityObserver {
  connected(): void;
  disconnected(): void;
}

export interface StatusDeviceOutputOptions {
  readonly scanIntervalMs?: number;
  readonly keepAliveIntervalMs?: number;
  readonly responseTimeoutMs?: number;
  readonly openTimeoutMs?: number;
  readonly brightness?: number;
  readonly observer?: StatusDeviceObserver;
  readonly availabilityObserver?: StatusDeviceAvailabilityObserver;
  readonly initiallyActive?: boolean;
}

export interface DeviceInformation {
  readonly firmware: string;
  readonly leds: number;
}

export interface VerifiedStatusDevice {
  readonly connection: StatusDeviceConnection;
  readonly information: DeviceInformation;
}

export interface StatusDeviceFindContext {
  readonly signal: AbortSignal;
  readonly openTimeoutMs: number;
  verify(connection: StatusDeviceConnection): Promise<DeviceInformation>;
  rejected(path: string, error: unknown): void;
}

export interface StatusDeviceFinder {
  find(context: StatusDeviceFindContext): Promise<VerifiedStatusDevice | undefined>;
}

const SILENT_OBSERVER: StatusDeviceObserver = {
  report: () => undefined,
};

const SILENT_AVAILABILITY_OBSERVER: StatusDeviceAvailabilityObserver = {
  connected: () => undefined,
  disconnected: () => undefined,
};

export class StatusDeviceOutput implements StatusReporter {
  readonly #finder: StatusDeviceFinder;
  readonly #scanIntervalMs: number;
  readonly #keepAliveIntervalMs: number;
  readonly #responseTimeoutMs: number;
  readonly #openTimeoutMs: number;
  readonly #brightness: number;
  readonly #observer: StatusDeviceObserver;
  readonly #availabilityObserver: StatusDeviceAvailabilityObserver;
  readonly #wakeWaiters = new Set<() => void>();
  #status: DisplayStatus = "off";
  #revision = 0;
  #active: boolean;
  #connectedPath: string | undefined;
  #connectionAnnounced = false;

  constructor(finder: StatusDeviceFinder, options: StatusDeviceOutputOptions = {}) {
    this.#finder = finder;
    this.#scanIntervalMs = positiveNumber(options.scanIntervalMs, 2_000, "scanIntervalMs");
    this.#keepAliveIntervalMs = positiveNumber(
      options.keepAliveIntervalMs,
      5_000,
      "keepAliveIntervalMs",
    );
    this.#responseTimeoutMs = positiveNumber(
      options.responseTimeoutMs,
      1_000,
      "responseTimeoutMs",
    );
    this.#openTimeoutMs = positiveNumber(options.openTimeoutMs, 1_500, "openTimeoutMs");
    this.#brightness = byte(options.brightness, 128, "brightness");
    this.#observer = options.observer ?? SILENT_OBSERVER;
    this.#availabilityObserver = options.availabilityObserver ?? SILENT_AVAILABILITY_OBSERVER;
    this.#active = options.initiallyActive ?? true;
  }

  connected(view: StatusView): void {
    this.#update(view.overallStatus);
  }

  eventReceived(_event: StatusEvent, view: StatusView): void {
    this.#update(view.overallStatus);
  }

  timerChanged(view: StatusView): void {
    this.#update(view.overallStatus);
  }

  disconnected(_error: unknown, _retryInMs: number): void {
    // Preserve the last host state while the OpenCode source reconnects.
  }

  setActive(active: boolean): void {
    if (active === this.#active) {
      return;
    }

    this.#active = active;
    if (this.#connectionAnnounced && this.#connectedPath !== undefined) {
      this.#report({
        kind: "role-changed",
        path: this.#connectedPath,
        role: active ? "active" : "standby",
      });
    }
    this.#wake();
  }

  async run(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      let connection: StatusDeviceConnection | undefined;
      let connectedPath: string | undefined;
      let available = false;

      try {
        const verified = await this.#finder.find({
          signal,
          openTimeoutMs: this.#openTimeoutMs,
          verify: (candidate) => this.#verify(candidate, signal),
          rejected: (path, error) => {
            this.#report({ kind: "candidate-rejected", path, error: errorMessage(error) });
          },
        });
        if (verified === undefined) {
          await this.#waitForWakeOrTimeout(this.#scanIntervalMs, signal);
          continue;
        }

        connection = verified.connection;
        connectedPath = connection.path;
        this.#connectedPath = connection.path;
        available = true;
        this.#availabilityObserver.connected();

        let synchronizedRevision: number | undefined;
        let connectedStatus = this.#status;
        if (this.#active) {
          const synchronized = await this.#synchronize(connection, signal);
          if (synchronized !== undefined) {
            synchronizedRevision = synchronized.revision;
            connectedStatus = synchronized.status;
          }
        }

        this.#connectionAnnounced = true;
        this.#report({
          kind: "connected",
          path: connection.path,
          firmware: verified.information.firmware,
          leds: verified.information.leds,
          status: connectedStatus,
          role: this.#active ? "active" : "standby",
        });

        while (!signal.aborted) {
          if (!this.#active) {
            synchronizedRevision = undefined;
          } else if (synchronizedRevision === undefined) {
            const synchronized = await this.#synchronize(connection, signal);
            if (synchronized !== undefined) {
              synchronizedRevision = synchronized.revision;
            }
            continue;
          } else if (synchronizedRevision !== this.#revision) {
            const update = this.#captureStatus();
            await this.#expect(
              connection,
              `SET 0 ${toProtocolStatus(update.status)}`,
              "OK",
              signal,
            );
            synchronizedRevision = update.revision;
            continue;
          }

          const activity = await Promise.race([
            this.#waitForWakeOrTimeout(this.#keepAliveIntervalMs, signal).then((reason) => ({
              kind: "wait" as const,
              reason,
            })),
            connection.disconnected.then((error) => ({
              kind: "disconnected" as const,
              error,
            })),
          ]);
          if (activity.kind === "disconnected") {
            throw activity.error;
          }
          const reason = activity.reason;
          if (reason === "timeout") {
            await this.#expect(connection, "PING", "PONG", signal);
          }
        }
      } catch (error) {
        if (available) {
          this.#availabilityObserver.disconnected();
          available = false;
        }
        if (!signal.aborted) {
          this.#report({
            kind: "disconnected",
            path: connectedPath,
            error: errorMessage(error),
          });
        }
      } finally {
        if (available) {
          this.#availabilityObserver.disconnected();
        }
        this.#connectionAnnounced = false;
        this.#connectedPath = undefined;
        try {
          await connection?.close();
        } catch {
          // A disconnected device is already closed from the host's perspective.
        }
      }

      if (!signal.aborted) {
        await this.#waitForWakeOrTimeout(this.#scanIntervalMs, signal);
      }
    }
  }

  async #verify(
    connection: StatusDeviceConnection,
    signal: AbortSignal,
  ): Promise<DeviceInformation> {
    const response = await connection.request(`HELLO ${PROTOCOL_VERSION}`, {
      timeoutMs: this.#responseTimeoutMs,
      signal,
    });
    const information = parseDeviceInformation(response);
    if (information === undefined) {
      throw new Error("Device handshake was rejected");
    }
    if (information.leds < 1) {
      throw new Error("Device reports no controllable LEDs");
    }
    return information;
  }

  async #synchronize(
    connection: StatusDeviceConnection,
    signal: AbortSignal,
  ): Promise<{ readonly status: DisplayStatus; readonly revision: number } | undefined> {
    if (!this.#active) {
      return undefined;
    }
    await this.#expect(connection, "RESET_STATE", "OK", signal);
    if (!this.#active) {
      return undefined;
    }
    await this.#expect(connection, `BRIGHTNESS ${this.#brightness}`, "OK", signal);
    if (!this.#active) {
      return undefined;
    }

    const update = this.#captureStatus();
    await this.#expect(connection, `SET 0 ${toProtocolStatus(update.status)}`, "OK", signal);
    if (!this.#active) {
      return undefined;
    }
    await this.#expect(connection, "SYNC_COMPLETE", "OK", signal);
    return update;
  }

  async #expect(
    connection: StatusDeviceConnection,
    command: string,
    expected: string,
    signal: AbortSignal,
  ): Promise<void> {
    const response = await connection.request(command, {
      timeoutMs: this.#responseTimeoutMs,
      signal,
    });
    if (response !== expected) {
      throw new Error(`Unexpected response to ${command}: ${response}`);
    }
  }

  #captureStatus(): { readonly status: DisplayStatus; readonly revision: number } {
    return { status: this.#status, revision: this.#revision };
  }

  #update(status: DisplayStatus): void {
    if (status === this.#status) {
      return;
    }

    this.#status = status;
    this.#revision += 1;
    this.#wake();
  }

  #wake(): void {
    for (const wake of [...this.#wakeWaiters]) {
      wake();
    }
  }

  #waitForWakeOrTimeout(
    delayMs: number,
    signal: AbortSignal,
  ): Promise<"wake" | "timeout" | "aborted"> {
    if (signal.aborted) {
      return Promise.resolve("aborted");
    }

    return new Promise((resolve) => {
      let finished = false;
      const timer = setTimeout(() => finish("timeout"), delayMs);
      timer.unref();
      const wake = () => finish("wake");
      const onAbort = () => finish("aborted");

      const finish = (reason: "wake" | "timeout" | "aborted") => {
        if (finished) {
          return;
        }
        finished = true;
        clearTimeout(timer);
        this.#wakeWaiters.delete(wake);
        signal.removeEventListener("abort", onAbort);
        resolve(reason);
      };

      this.#wakeWaiters.add(wake);
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  #report(event: StatusDeviceEvent): void {
    this.#observer.report(event);
  }
}

function parseDeviceInformation(response: string): DeviceInformation | undefined {
  const match = /^DEVICE OPENCODE_STATUS protocol=1 firmware=([^ ]+) leds=(\d+)$/.exec(response);
  if (match === null) {
    return undefined;
  }

  const firmware = match[1];
  const leds = Number(match[2]);
  if (firmware === undefined || !Number.isSafeInteger(leds)) {
    return undefined;
  }
  return { firmware, leds };
}

function toProtocolStatus(status: DisplayStatus): string {
  return status.toUpperCase();
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown device error";
}

function positiveNumber(value: number | undefined, fallback: number, name: string): number {
  const result = value ?? fallback;
  if (!Number.isFinite(result) || result <= 0) {
    throw new Error(`${name} must be greater than zero`);
  }
  return result;
}

function byte(value: number | undefined, fallback: number, name: string): number {
  const result = value ?? fallback;
  if (!Number.isInteger(result) || result < 0 || result > 255) {
    throw new Error(`${name} must be an integer between 0 and 255`);
  }
  return result;
}
