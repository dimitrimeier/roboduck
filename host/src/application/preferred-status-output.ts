import type { StatusEvent, StatusView } from "../core/model.js";
import type { StatusReporter } from "../ports/status-reporter.js";
import type { StatusDeviceAvailabilityObserver } from "./status-device-output.js";

export interface ControllableStatusOutput extends StatusReporter {
  setActive(active: boolean): void;
  run(signal: AbortSignal): Promise<void>;
}

export type ControllableStatusOutputFactory = (
  availabilityObserver: StatusDeviceAvailabilityObserver,
) => ControllableStatusOutput;

export class PreferredStatusOutput implements StatusReporter {
  readonly #primary: ControllableStatusOutput;
  readonly #backup: ControllableStatusOutput;
  #primaryAvailable = false;
  #backupAvailable = false;
  #stopping = false;

  constructor(
    primaryFactory: ControllableStatusOutputFactory,
    backupFactory: ControllableStatusOutputFactory,
  ) {
    this.#primary = primaryFactory({
      connected: () => {
        this.#primaryAvailable = true;
        this.#selectActiveOutput();
      },
      disconnected: () => {
        this.#primaryAvailable = false;
        this.#selectActiveOutput();
      },
    });
    this.#backup = backupFactory({
      connected: () => {
        this.#backupAvailable = true;
        this.#selectActiveOutput();
      },
      disconnected: () => {
        this.#backupAvailable = false;
        this.#selectActiveOutput();
      },
    });
    this.#selectActiveOutput();
  }

  connected(view: StatusView): void {
    this.#primary.connected(view);
    this.#backup.connected(view);
  }

  eventReceived(event: StatusEvent, view: StatusView): void {
    this.#primary.eventReceived(event, view);
    this.#backup.eventReceived(event, view);
  }

  timerChanged(view: StatusView): void {
    this.#primary.timerChanged(view);
    this.#backup.timerChanged(view);
  }

  disconnected(error: unknown, retryInMs: number): void {
    this.#primary.disconnected(error, retryInMs);
    this.#backup.disconnected(error, retryInMs);
  }

  async run(signal: AbortSignal): Promise<void> {
    const onAbort = () => {
      this.#stopping = true;
      this.#selectActiveOutput();
    };
    if (signal.aborted) {
      onAbort();
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }
    try {
      await Promise.all([this.#primary.run(signal), this.#backup.run(signal)]);
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
  }

  #selectActiveOutput(): void {
    if (this.#stopping) {
      this.#primary.setActive(false);
      this.#backup.setActive(false);
      return;
    }
    this.#primary.setActive(this.#primaryAvailable);
    this.#backup.setActive(!this.#primaryAvailable && this.#backupAvailable);
  }
}
