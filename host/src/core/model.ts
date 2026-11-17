export type DisplayStatus =
  | "off"
  | "idle"
  | "finished"
  | "running"
  | "asking"
  | "error";

export type AttentionKind = "permission" | "form";

export interface PendingAttention {
  readonly key: string;
  readonly kind: AttentionKind;
}

export interface SnapshotSession {
  readonly sessionId: string;
  readonly running: boolean;
  readonly pendingAttention: readonly PendingAttention[];
}

export interface SourceSnapshot {
  readonly capturedAt: number;
  readonly sessions: readonly SnapshotSession[];
}

interface StatusEventBase {
  readonly sessionId: string;
  readonly occurredAt: number;
}

export type StatusEvent =
  | (StatusEventBase & {
      readonly type: "session.execution.started";
    })
  | (StatusEventBase & {
      readonly type: "session.execution.succeeded";
    })
  | (StatusEventBase & {
      readonly type: "session.execution.failed";
    })
  | (StatusEventBase & {
      readonly type: "session.execution.interrupted";
    })
  | (StatusEventBase & {
      readonly type: "session.idle";
    })
  | (StatusEventBase & {
      readonly type: "session.status";
      readonly status: "busy" | "idle" | "retry";
    })
  | (StatusEventBase & {
      readonly type: "permission.asked";
      readonly attention: PendingAttention;
    })
  | (StatusEventBase & {
      readonly type: "permission.replied";
      readonly attentionKey: string;
    })
  | (StatusEventBase & {
      readonly type: "form.created";
      readonly attention: PendingAttention;
    })
  | (StatusEventBase & {
      readonly type: "form.replied" | "form.cancelled";
      readonly attentionKey: string;
    })
  | (StatusEventBase & {
      readonly type: "session.deleted" | "session.archived";
    });

export interface SessionView {
  readonly sessionId: string;
  readonly status: Exclude<DisplayStatus, "off">;
  readonly running: boolean;
  readonly pendingAttention: readonly PendingAttention[];
  readonly updatedAt: number;
  readonly lastEventType: StatusEvent["type"] | "snapshot" | "timer";
}

export interface StatusView {
  readonly overallStatus: DisplayStatus;
  readonly sessions: readonly SessionView[];
}
