import type { StatusEvent, StatusView } from "../../core/model.js";
import type { StatusReporter } from "../../ports/status-reporter.js";

export class CompositeStatusReporter implements StatusReporter {
  readonly #reporters: readonly StatusReporter[];

  constructor(...reporters: readonly StatusReporter[]) {
    this.#reporters = reporters;
  }

  connected(view: StatusView): void {
    for (const reporter of this.#reporters) {
      reporter.connected(view);
    }
  }

  eventReceived(event: StatusEvent, view: StatusView): void {
    for (const reporter of this.#reporters) {
      reporter.eventReceived(event, view);
    }
  }

  timerChanged(view: StatusView): void {
    for (const reporter of this.#reporters) {
      reporter.timerChanged(view);
    }
  }

  disconnected(error: unknown, retryInMs: number): void {
    for (const reporter of this.#reporters) {
      reporter.disconnected(error, retryInMs);
    }
  }
}
