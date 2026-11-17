import type { StatusEvent, StatusView } from "../../core/model.js";
import type { StatusReporter } from "../../ports/status-reporter.js";

interface LogRecord {
  readonly timestamp: string;
  readonly kind: "connected" | "event" | "timer" | "disconnected";
  readonly overallStatus?: string;
  readonly sessions?: number;
  readonly event?: string;
  readonly sessionId?: string;
  readonly sessionStatus?: string | undefined;
  readonly retryInMs?: number;
  readonly error?: string;
}

export class ConsoleReporter implements StatusReporter {
  connected(view: StatusView): void {
    this.#write({
      timestamp: new Date().toISOString(),
      kind: "connected",
      overallStatus: view.overallStatus,
      sessions: view.sessions.length,
    });
  }

  eventReceived(event: StatusEvent, view: StatusView): void {
    this.#write({
      timestamp: new Date(event.occurredAt).toISOString(),
      kind: "event",
      event: event.type,
      sessionId: event.sessionId,
      sessionStatus: view.sessions.find((session) => session.sessionId === event.sessionId)?.status,
      overallStatus: view.overallStatus,
    });
  }

  timerChanged(view: StatusView): void {
    this.#write({
      timestamp: new Date().toISOString(),
      kind: "timer",
      overallStatus: view.overallStatus,
      sessions: view.sessions.length,
    });
  }

  disconnected(error: unknown, retryInMs: number): void {
    this.#write({
      timestamp: new Date().toISOString(),
      kind: "disconnected",
      retryInMs,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  #write(record: LogRecord): void {
    process.stdout.write(`${JSON.stringify(record)}\n`);
  }
}
