import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SourceSnapshot, StatusEvent } from "../src/core/model.js";
import { StatusStore, type Clock } from "../src/core/status-store.js";

class FakeClock implements Clock {
  constructor(public value: number) {}

  now(): number {
    return this.value;
  }
}

describe("StatusStore", () => {
  it("reports off when the synchronized snapshot has no active sessions", () => {
    const store = new StatusStore();

    store.replaceSnapshot(snapshot([]));

    assert.deepEqual(store.view(), {
      overallStatus: "off",
      sessions: [],
    });
  });

  it("restores running and asking sessions from a snapshot", () => {
    const store = new StatusStore();

    store.replaceSnapshot(
      snapshot([
        { sessionId: "running", running: true, pendingAttention: [] },
        {
          sessionId: "asking",
          running: true,
          pendingAttention: [{ key: "permission:p1", kind: "permission" }],
        },
      ]),
    );

    const view = store.view();
    assert.equal(view.overallStatus, "asking");
    assert.deepEqual(
      view.sessions.map((session) => [session.sessionId, session.status]),
      [
        ["asking", "asking"],
        ["running", "running"],
      ],
    );
  });

  it("handles running, asking, reply, finished and expiry deterministically", () => {
    const clock = new FakeClock(1_000);
    const store = new StatusStore({ clock, finishedHoldMs: 5_000 });
    store.replaceSnapshot(snapshot([]));

    store.apply(event("session.execution.started", 1_000));
    assert.equal(sessionStatus(store), "running");

    store.apply({
      ...eventBase(2_000),
      type: "permission.asked",
      attention: { key: "permission:p1", kind: "permission" },
    });
    assert.equal(sessionStatus(store), "asking");

    store.apply({
      ...eventBase(3_000),
      type: "permission.replied",
      attentionKey: "permission:p1",
    });
    assert.equal(sessionStatus(store), "running");

    clock.value = 4_000;
    store.apply(event("session.execution.succeeded", 4_000));
    store.apply(event("session.idle", 4_001));
    assert.equal(sessionStatus(store), "finished", "idle must not hide the finished hold period");

    assert.equal(store.tick(8_999), false);
    assert.equal(store.tick(9_000), true);
    assert.equal(sessionStatus(store), "idle");
  });

  it("caps the finished hold period at five seconds", () => {
    const clock = new FakeClock(1_000);
    const store = new StatusStore({ clock, finishedHoldMs: 60_000 });

    store.apply(event("session.execution.succeeded", clock.value));

    assert.equal(store.tick(5_999), false);
    assert.equal(store.tick(6_000), true);
    assert.equal(sessionStatus(store), "idle");
  });

  it("keeps asking until every pending request is closed", () => {
    const store = new StatusStore();
    store.replaceSnapshot(snapshot([]));

    store.apply({
      ...eventBase(1),
      type: "permission.asked",
      attention: { key: "permission:p1", kind: "permission" },
    });
    store.apply({
      ...eventBase(2),
      type: "form.created",
      attention: { key: "form:f1", kind: "form" },
    });
    store.apply({
      ...eventBase(3),
      type: "permission.replied",
      attentionKey: "permission:p1",
    });

    assert.equal(sessionStatus(store), "asking");
    assert.deepEqual(store.view().sessions[0]?.pendingAttention, [
      { key: "form:f1", kind: "form" },
    ]);

    store.apply({
      ...eventBase(4),
      type: "form.cancelled",
      attentionKey: "form:f1",
    });
    assert.equal(sessionStatus(store), "running");
  });

  it("uses the documented priority across concurrent sessions", () => {
    const store = new StatusStore();
    store.replaceSnapshot(
      snapshot([
        { sessionId: "a", running: true, pendingAttention: [] },
        {
          sessionId: "b",
          running: true,
          pendingAttention: [{ key: "form:f1", kind: "form" }],
        },
      ]),
    );

    store.apply({
      type: "session.execution.failed",
      sessionId: "c",
      occurredAt: 2,
    });

    assert.equal(store.view().overallStatus, "error");
  });

  it("keeps a failed execution in error even if attention was still pending", () => {
    const store = new StatusStore();
    store.apply({
      ...eventBase(1),
      type: "permission.asked",
      attention: { key: "permission:p1", kind: "permission" },
    });

    store.apply(event("session.execution.failed", 2));

    assert.equal(sessionStatus(store), "error");
  });

  it("clears stale state when a fresh snapshot is installed", () => {
    const store = new StatusStore();
    store.apply(event("session.execution.started", 1));
    assert.equal(store.view().sessions.length, 1);

    store.replaceSnapshot(snapshot([]));

    assert.equal(store.view().overallStatus, "off");
    assert.equal(store.view().sessions.length, 0);
  });

  it("removes deleted and archived sessions", () => {
    const store = new StatusStore();
    store.replaceSnapshot(
      snapshot([{ sessionId: "session-1", running: true, pendingAttention: [] }]),
    );

    store.apply(event("session.archived", 2));

    assert.equal(store.view().overallStatus, "off");
  });

  it("treats interruption as idle rather than as an error", () => {
    const store = new StatusStore();
    store.apply(event("session.execution.started", 1));
    store.apply({
      ...eventBase(2),
      type: "form.created",
      attention: { key: "form:f1", kind: "form" },
    });

    store.apply(event("session.execution.interrupted", 3));

    assert.equal(sessionStatus(store), "idle");
    assert.equal(store.view().sessions[0]?.pendingAttention.length, 0);
  });

  it("removes a session when polling reports it as inactive", () => {
    const store = new StatusStore();
    store.apply(event("session.execution.started", 1));

    store.apply({
      type: "host.session.inactive",
      sessionId: "session-1",
      occurredAt: 2,
    });

    assert.equal(store.view().overallStatus, "off");
  });
});

function snapshot(sessions: SourceSnapshot["sessions"]): SourceSnapshot {
  return { capturedAt: 100, sessions };
}

function eventBase(occurredAt: number): Pick<StatusEvent, "sessionId" | "occurredAt"> {
  return { sessionId: "session-1", occurredAt };
}

function event(
  type:
    | "session.execution.started"
    | "session.execution.succeeded"
    | "session.execution.failed"
    | "session.execution.interrupted"
    | "session.idle"
    | "session.deleted"
    | "session.archived"
    | "host.session.inactive",
  occurredAt: number,
): StatusEvent {
  return { type, ...eventBase(occurredAt) };
}

function sessionStatus(store: StatusStore): string | undefined {
  return store.view().sessions[0]?.status;
}
