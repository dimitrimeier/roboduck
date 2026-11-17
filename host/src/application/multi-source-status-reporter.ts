import { aggregateStatus } from "../core/aggregate-status.js";
import type { StatusView } from "../core/model.js";
import type { StatusReporter } from "../ports/status-reporter.js";

export class MultiSourceStatusReporter {
  readonly #reporter: StatusReporter;
  readonly #views = new Map<string, StatusView>();

  constructor(reporter: StatusReporter) {
    this.#reporter = reporter;
  }

  forSource(sourceId: string): StatusReporter {
    const sessionId = (id: string) => `${encodeURIComponent(sourceId)}:${encodeURIComponent(id)}`;
    const update = (view: StatusView) => {
      this.#views.set(sourceId, {
        overallStatus: view.overallStatus,
        sessions: view.sessions.map((session) => ({
          ...session,
          sessionId: sessionId(session.sessionId),
        })),
      });
      return this.view();
    };

    return {
      connected: (view) => this.#reporter.connected(update(view)),
      eventReceived: (event, view) => this.#reporter.eventReceived(
        { ...event, sessionId: sessionId(event.sessionId) },
        update(view),
      ),
      timerChanged: (view) => this.#reporter.timerChanged(update(view)),
      disconnected: (error, retryInMs) => {
        if (this.#views.delete(sourceId)) {
          this.#reporter.timerChanged(this.view());
        }
        this.#reporter.disconnected(error, retryInMs);
      },
    };
  }

  view(): StatusView {
    const views = [...this.#views.values()];
    return {
      overallStatus: aggregateStatus(views.map((view) => view.overallStatus)),
      sessions: views.flatMap((view) => view.sessions)
        .sort((left, right) => left.sessionId.localeCompare(right.sessionId)),
    };
  }
}
