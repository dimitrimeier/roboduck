import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { reconcileSnapshot } from "../src/application/reconcile-snapshot.js";
import type { SourceSnapshot, StatusView } from "../src/core/model.js";
import { StatusStore } from "../src/core/status-store.js";

describe("reconcileSnapshot", () => {
  it("creates an inactive event for a tracked session missing from the API snapshot", () => {
    const events = reconcileSnapshot(view("running"), emptySnapshot());

    assert.deepEqual(events, [
      {
        type: "host.session.inactive",
        sessionId: "session-1",
        occurredAt: 200,
      },
    ]);
  });

  it("preserves finished sessions until their hold timer expires", () => {
    const events = reconcileSnapshot(view("finished"), emptySnapshot());

    assert.deepEqual(events, []);
  });

  it("creates no event when the snapshot has not changed", () => {
    const events = reconcileSnapshot(view("running"), {
      capturedAt: 200,
      sessions: [{ sessionId: "session-1", running: true, pendingAttention: [] }],
    });

    assert.deepEqual(events, []);
  });

  it("reconciles newly discovered sessions and pending attention", () => {
    const snapshot: SourceSnapshot = {
      capturedAt: 200,
      sessions: [
        {
          sessionId: "session-2",
          running: true,
          pendingAttention: [{ key: "form:f1", kind: "form" }],
        },
      ],
    };

    const events = reconcileSnapshot({ overallStatus: "off", sessions: [] }, snapshot);

    assert.deepEqual(events, [
      {
        type: "host.session.reconciled",
        sessionId: "session-2",
        occurredAt: 200,
        running: true,
        pendingAttention: [{ key: "form:f1", kind: "form" }],
      },
    ]);
  });

  it("removes a finished session only after its hold period has expired", () => {
    let now = 1_000;
    const store = new StatusStore({
      finishedHoldMs: 5_000,
      clock: { now: () => now },
    });
    store.apply({
      type: "session.execution.succeeded",
      sessionId: "session-1",
      occurredAt: now,
    });

    assert.deepEqual(reconcileSnapshot(store.view(), emptySnapshot()), []);

    now = 6_000;
    store.tick();
    const events = reconcileSnapshot(store.view(), emptySnapshot());
    for (const event of events) {
      store.apply(event);
    }

    assert.equal(store.view().overallStatus, "off");
    assert.equal(events[0]?.type, "host.session.inactive");
  });
});

function emptySnapshot(): SourceSnapshot {
  return { capturedAt: 200, sessions: [] };
}

function view(status: "running" | "finished"): StatusView {
  return {
    overallStatus: status,
    sessions: [
      {
        sessionId: "session-1",
        status,
        running: status === "running",
        pendingAttention: [],
        updatedAt: 100,
        lastEventType:
          status === "running" ? "session.execution.started" : "session.execution.succeeded",
      },
    ],
  };
}
