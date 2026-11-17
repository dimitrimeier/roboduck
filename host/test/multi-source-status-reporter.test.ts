import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MultiSourceStatusReporter } from "../src/application/multi-source-status-reporter.js";
import type { SessionView, StatusEvent, StatusView } from "../src/core/model.js";
import type { StatusReporter } from "../src/ports/status-reporter.js";

describe("MultiSourceStatusReporter", () => {
  it("aggregates priorities across independent sources and snapshots", () => {
    const sources = new MultiSourceStatusReporter(silentReporter());
    const local = sources.forSource("local");
    const wsl = sources.forSource("wsl:Ubuntu");
    local.connected(view("running"));
    wsl.connected(view("asking"));
    assert.equal(sources.view().overallStatus, "asking");

    local.connected(view("idle"));
    assert.equal(sources.view().overallStatus, "asking", "a local reconnect must not erase WSL");
    wsl.timerChanged(view("finished"));
    assert.equal(sources.view().overallStatus, "finished");
    local.timerChanged(view("error"));
    assert.equal(sources.view().overallStatus, "error");
  });

  it("removes only the disconnected source and accepts its later reconnect", () => {
    const updates: StatusView[] = [];
    const sources = new MultiSourceStatusReporter({
      ...silentReporter(), timerChanged: (value) => updates.push(value),
    });
    const local = sources.forSource("local");
    const wsl = sources.forSource("wsl");
    local.connected(view("running"));
    wsl.connected(view("asking"));
    wsl.disconnected(new Error("stopped"), 1_000);

    assert.equal(updates.at(-1)?.overallStatus, "running");
    assert.equal(sources.view().sessions.length, 1);
    wsl.connected(view("error"));
    local.disconnected(new Error("stopped"), 1_000);
    assert.equal(sources.view().overallStatus, "error");
    wsl.disconnected(new Error("stopped"), 1_000);
    assert.deepEqual(sources.view(), { overallStatus: "off", sessions: [] });
  });

  it("namespaces identical session IDs and forwarded events without collisions", () => {
    const events: StatusEvent[] = [];
    const sources = new MultiSourceStatusReporter({
      ...silentReporter(), eventReceived: (event) => events.push(event),
    });
    sources.forSource("wsl:Ubuntu").connected(view("asking"));
    sources.forSource("wsl").eventReceived({
      type: "session.execution.started", sessionId: "Ubuntu:same", occurredAt: 100,
    }, view("running", "Ubuntu:same"));

    assert.equal(new Set(sources.view().sessions.map((session) => session.sessionId)).size, 2);
    assert.equal(events[0]?.sessionId, "wsl:Ubuntu%3Asame");
  });
});

function view(status: SessionView["status"], sessionId = "same"): StatusView {
  return {
    overallStatus: status,
    sessions: [{ sessionId, status, running: status === "running", pendingAttention: [],
      updatedAt: 100, lastEventType: "snapshot" }],
  };
}

function silentReporter(): StatusReporter {
  return { connected() {}, eventReceived() {}, timerChanged() {}, disconnected() {} };
}
