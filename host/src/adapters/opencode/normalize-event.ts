import type { OpenCodeEvent } from "@opencode/client";

import type { StatusEvent } from "../../core/model.js";

export function normalizeOpenCodeEvent(event: OpenCodeEvent): StatusEvent | undefined {
  if (
    event.type === "session.execution.started" ||
    event.type === "session.execution.succeeded" ||
    event.type === "session.execution.failed" ||
    event.type === "session.execution.interrupted" ||
    event.type === "session.idle" ||
    event.type === "session.deleted" ||
    event.type === "session.archived"
  ) {
    return {
      type: event.type,
      sessionId: event.data.sessionID,
      occurredAt: event.created,
    };
  }

  if (event.type === "session.status") {
    return {
      type: event.type,
      sessionId: event.data.sessionID,
      occurredAt: event.created,
      status: event.data.status.type,
    };
  }

  if (event.type === "permission.asked") {
    return {
      type: event.type,
      sessionId: event.data.sessionID,
      occurredAt: event.created,
      attention: {
        key: `permission:${event.data.id}`,
        kind: "permission",
      },
    };
  }

  if (event.type === "permission.replied") {
    return {
      type: event.type,
      sessionId: event.data.sessionID,
      occurredAt: event.created,
      attentionKey: `permission:${event.data.requestID}`,
    };
  }

  if (event.type === "form.created") {
    return {
      type: event.type,
      sessionId: event.data.form.sessionID,
      occurredAt: event.created,
      attention: {
        key: `form:${event.data.form.id}`,
        kind: "form",
      },
    };
  }

  if (event.type === "form.replied" || event.type === "form.cancelled") {
    return {
      type: event.type,
      sessionId: event.data.sessionID,
      occurredAt: event.created,
      attentionKey: `form:${event.data.id}`,
    };
  }

  return undefined;
}
