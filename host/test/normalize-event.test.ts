import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { OpenCodeEvent } from "@opencode/client";

import { normalizeOpenCodeEvent } from "../src/adapters/opencode/normalize-event.js";

describe("normalizeOpenCodeEvent", () => {
  it("keeps only identifiers from permission requests", () => {
    const normalized = normalizeOpenCodeEvent(
      rawEvent({
        type: "permission.asked",
        data: {
          id: "request-1",
          sessionID: "session-1",
          action: "shell",
          resources: ["sensitive-resource"],
          message: "sensitive message",
        },
      }),
    );

    assert.deepEqual(normalized, {
      type: "permission.asked",
      sessionId: "session-1",
      occurredAt: 1_000,
      attention: {
        key: "permission:request-1",
        kind: "permission",
      },
    });
    assert.equal(JSON.stringify(normalized).includes("sensitive"), false);
  });

  it("maps form lifecycle events to the same attention key", () => {
    const created = normalizeOpenCodeEvent(
      rawEvent({
        type: "form.created",
        data: {
          form: {
            id: "form-1",
            sessionID: "session-1",
            title: "Sensitive title",
            fields: [],
          },
        },
      }),
    );
    const replied = normalizeOpenCodeEvent(
      rawEvent({
        type: "form.replied",
        data: {
          id: "form-1",
          sessionID: "session-1",
          answer: {},
        },
      }),
    );

    assert.equal(created?.type, "form.created");
    assert.equal(created !== undefined && "attention" in created ? created.attention.key : undefined, "form:form-1");
    assert.equal(replied?.type, "form.replied");
    assert.equal(
      replied !== undefined && "attentionKey" in replied ? replied.attentionKey : undefined,
      "form:form-1",
    );
  });

  it("maps session status without retaining retry messages", () => {
    const normalized = normalizeOpenCodeEvent(
      rawEvent({
        type: "session.status",
        data: {
          sessionID: "session-1",
          status: {
            type: "retry",
            attempt: 2,
            message: "sensitive provider response",
            next: 2_000,
          },
        },
      }),
    );

    assert.deepEqual(normalized, {
      type: "session.status",
      sessionId: "session-1",
      occurredAt: 1_000,
      status: "retry",
    });
  });

  it("ignores unrelated events", () => {
    const normalized = normalizeOpenCodeEvent(
      rawEvent({
        type: "config.updated",
        data: {},
      }),
    );

    assert.equal(normalized, undefined);
  });
});

function rawEvent(event: { readonly type: string; readonly data: unknown }): OpenCodeEvent {
  return {
    id: "event-1",
    created: 1_000,
    ...event,
  } as OpenCodeEvent;
}
