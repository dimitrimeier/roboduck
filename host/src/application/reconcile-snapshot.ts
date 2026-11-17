import type {
  PendingAttention,
  SourceSnapshot,
  StatusEvent,
  StatusView,
} from "../core/model.js";

export function reconcileSnapshot(
  current: StatusView,
  snapshot: SourceSnapshot,
): readonly StatusEvent[] {
  const events: StatusEvent[] = [];
  const snapshotBySession = new Map(
    snapshot.sessions.map((session) => [session.sessionId, session]),
  );

  for (const session of current.sessions) {
    if (snapshotBySession.has(session.sessionId)) {
      continue;
    }

    // A successful execution remains visible for its configured FINISHED hold.
    // Afterwards, retain the known session as IDLE even if the active-session
    // snapshot omits it. Explicit deletion/archive events still remove it.
    if (session.status === "finished" || session.status === "idle") {
      continue;
    }

    events.push({
      type: "host.session.inactive",
      sessionId: session.sessionId,
      occurredAt: snapshot.capturedAt,
    });
  }

  for (const session of snapshot.sessions) {
    const existing = current.sessions.find((item) => item.sessionId === session.sessionId);
    if (
      existing !== undefined &&
      existing.running === session.running &&
      attentionsEqual(existing.pendingAttention, session.pendingAttention)
    ) {
      continue;
    }

    events.push({
      type: "host.session.reconciled",
      sessionId: session.sessionId,
      occurredAt: snapshot.capturedAt,
      running: session.running,
      pendingAttention: session.pendingAttention,
    });
  }

  return events;
}

function attentionsEqual(
  left: readonly PendingAttention[],
  right: readonly PendingAttention[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const rightByKey = new Map(right.map((attention) => [attention.key, attention.kind]));
  return left.every((attention) => rightByKey.get(attention.key) === attention.kind);
}
