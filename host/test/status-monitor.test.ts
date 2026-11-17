import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { StatusMonitor, type Scheduler } from "../src/application/status-monitor.js";
import type { StatusEvent, StatusView } from "../src/core/model.js";
import { StatusStore } from "../src/core/status-store.js";
import type { StatusReporter } from "../src/ports/status-reporter.js";
import type { StatusConnection, StatusSource } from "../src/ports/status-source.js";

const TEST_SCHEDULER: Scheduler = {
  every: () => () => undefined,
  wait: async () => undefined,
};

describe("StatusMonitor", () => {
  it("installs a snapshot before forwarding buffered events", async () => {
    const abortController = new AbortController();
    const reports: string[] = [];
    const reporter = reporterRecording(reports, abortController);
    const source: StatusSource = {
      async connect() {
        return connection([
          {
            type: "session.execution.succeeded",
            sessionId: "session-1",
            occurredAt: 200,
          },
        ]);
      },
    };
    const monitor = new StatusMonitor(source, new StatusStore(), reporter, {
      scheduler: TEST_SCHEDULER,
    });

    await monitor.run(abortController.signal);

    assert.deepEqual(reports, ["connected:running", "event:finished"]);
  });

  it("retries after a connection error", async () => {
    const abortController = new AbortController();
    const reports: string[] = [];
    let attempts = 0;
    const source: StatusSource = {
      async connect() {
        attempts += 1;
        if (attempts === 1) {
          throw new Error("temporary failure");
        }
        return connection([
          {
            type: "session.execution.succeeded",
            sessionId: "session-1",
            occurredAt: 200,
          },
        ]);
      },
    };
    const monitor = new StatusMonitor(
      source,
      new StatusStore(),
      reporterRecording(reports, abortController),
      { scheduler: TEST_SCHEDULER },
    );

    await monitor.run(abortController.signal);

    assert.equal(attempts, 2);
    assert.deepEqual(reports, [
      "disconnected:temporary failure",
      "connected:running",
      "event:finished",
    ]);
  });

  it("closes a failed connection before waiting to reconnect", async () => {
    const abortController = new AbortController();
    const order: string[] = [];
    let attempts = 0;
    const scheduler: Scheduler = {
      every: () => () => undefined,
      wait(delayMs, signal) {
        if (delayMs === 1_000) {
          order.push("wait");
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          signal.addEventListener("abort", () => resolve(), { once: true });
        });
      },
    };
    const source: StatusSource = {
      async connect() {
        attempts += 1;
        if (attempts === 1) {
          return {
            snapshot: { capturedAt: 100, sessions: [] },
            events: toAsyncIterable([]),
            async refreshSnapshot() {
              return { capturedAt: 100, sessions: [] };
            },
            async close() {
              order.push("close");
            },
          };
        }

        abortController.abort();
        return connection([]);
      },
    };
    const monitor = new StatusMonitor(source, new StatusStore(), silentReporter(), {
      scheduler,
    });

    await monitor.run(abortController.signal);

    assert.deepEqual(order, ["close", "wait"]);
  });

  it("emits an inactive host event when polling detects a closed session", async () => {
    const abortController = new AbortController();
    const received: StatusEvent[] = [];
    const source: StatusSource = {
      async connect() {
        return {
          snapshot: {
            capturedAt: 100,
            sessions: [{ sessionId: "session-1", running: true, pendingAttention: [] }],
          },
          events: neverEndingEvents(),
          async refreshSnapshot() {
            return { capturedAt: 200, sessions: [] };
          },
          close: async () => undefined,
        };
      },
    };
    const reporter: StatusReporter = {
      connected: () => undefined,
      eventReceived(event, view) {
        received.push(event);
        assert.equal(view.overallStatus, "off");
        abortController.abort();
      },
      timerChanged: () => undefined,
      disconnected: () => undefined,
    };
    const monitor = new StatusMonitor(source, new StatusStore(), reporter, {
      scheduler: TEST_SCHEDULER,
      pollIntervalMs: 5_000,
    });

    await monitor.run(abortController.signal);

    assert.deepEqual(received, [
      {
        type: "host.session.inactive",
        sessionId: "session-1",
        occurredAt: 200,
      },
    ]);
  });
});

function connection(events: readonly StatusEvent[]): StatusConnection {
  return {
    snapshot: {
      capturedAt: 100,
      sessions: [{ sessionId: "session-1", running: true, pendingAttention: [] }],
    },
    events: toAsyncIterable(events),
    async refreshSnapshot() {
      return {
        capturedAt: 100,
        sessions: [{ sessionId: "session-1", running: true, pendingAttention: [] }],
      };
    },
    close: async () => undefined,
  };
}

async function* toAsyncIterable(events: readonly StatusEvent[]): AsyncIterable<StatusEvent> {
  yield* events;
}

function neverEndingEvents(): AsyncIterable<StatusEvent> {
  return {
    [Symbol.asyncIterator]() {
      return {
        next: () => new Promise<IteratorResult<StatusEvent>>(() => undefined),
      };
    },
  };
}

function reporterRecording(
  reports: string[],
  abortController: AbortController,
): StatusReporter {
  return {
    connected(view: StatusView) {
      reports.push(`connected:${view.overallStatus}`);
    },
    eventReceived(_event: StatusEvent, view: StatusView) {
      reports.push(`event:${view.overallStatus}`);
      abortController.abort();
    },
    timerChanged() {
      reports.push("timer");
    },
    disconnected(error: unknown) {
      reports.push(`disconnected:${error instanceof Error ? error.message : "unknown"}`);
    },
  };
}

function silentReporter(): StatusReporter {
  return {
    connected: () => undefined,
    eventReceived: () => undefined,
    timerChanged: () => undefined,
    disconnected: () => undefined,
  };
}
