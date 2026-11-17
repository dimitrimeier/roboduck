import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readRelaySnapshot, RELAY_MAX_AGE_MS } from "../src/adapters/relay/relay-snapshot.js";

const NOW = 20_000;
function snapshot() {
  return { version: 1, updatedAt: NOW, connected: true,
    sessions: [{ sessionId: "ses_1", status: "running" }] };
}

describe("readRelaySnapshot", () => {
  it("reconstructs status while discarding all unrecognized data", () => {
    const data = snapshot();
    const value = readRelaySnapshot({ ...data, prompt: "private", sessions: [
      { ...data.sessions[0], content: "private" },
      { sessionId: "ses_2", status: "asking", token: "private" },
    ] }, NOW);
    assert.equal(value?.overallStatus, "asking");
    assert.equal(value?.sessions.length, 2);
    assert.ok(!JSON.stringify(value).includes("private"));
  });

  it("rejects disconnected, expired, future, or unsupported records", () => {
    for (const data of [null, [], {},
      { ...snapshot(), connected: false }, { ...snapshot(), connected: "true" },
      { ...snapshot(), version: 2 }, { ...snapshot(), updatedAt: NOW - RELAY_MAX_AGE_MS },
      { ...snapshot(), updatedAt: NOW + 2_001 }, { ...snapshot(), updatedAt: NaN },
      { ...snapshot(), updatedAt: Infinity }, { ...snapshot(), updatedAt: "20000" },
    ]) {
      assert.equal(readRelaySnapshot(data, NOW), undefined);
    }
    assert.ok(readRelaySnapshot({ ...snapshot(), updatedAt: NOW - RELAY_MAX_AGE_MS + 1 }, NOW));
  });

  it("rejects invalid, duplicate, or excessive sessions", () => {
    for (const sessions of [null, {}, [null],
      [{ sessionId: "", status: "running" }],
      [{ sessionId: "ses_\n", status: "asking" }],
      [{ sessionId: "\ud800", status: "running" }],
      [{ sessionId: "x".repeat(257), status: "idle" }],
      [{ sessionId: "ses_1", status: "off" }],
      [{ sessionId: "ses_1", status: "unknown" }],
      [snapshot().sessions[0], snapshot().sessions[0]],
      Array.from({ length: 1_001 }, (_, index) => ({ sessionId: `ses_${index}`, status: "idle" })),
    ]) {
      assert.equal(readRelaySnapshot({ ...snapshot(), sessions }, NOW), undefined);
    }
  });

  it("expires finished locally even when the collector stops updating", () => {
    const data = { ...snapshot(), sessions: [
      { sessionId: "ses_1", status: "finished", finishedUntil: NOW + 3_000 },
    ] };
    assert.equal(readRelaySnapshot(data, NOW)?.overallStatus, "finished");
    assert.equal(readRelaySnapshot(data, NOW + 3_000)?.overallStatus, "idle");
    assert.equal(readRelaySnapshot({ ...data, sessions: [
      { sessionId: "ses_1", status: "finished" },
    ] }, NOW), undefined);
    assert.equal(readRelaySnapshot({ ...data, sessions: [
      { sessionId: "ses_1", status: "finished", finishedUntil: NOW + 5_001 },
    ] }, NOW), undefined);
  });
});
