import type { StatusEvent, StatusView } from "../core/model.js";

export interface StatusReporter {
  connected(view: StatusView): void;
  eventReceived(event: StatusEvent, view: StatusView): void;
  timerChanged(view: StatusView): void;
  disconnected(error: unknown, retryInMs: number): void;
}
