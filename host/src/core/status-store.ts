import type {
  DisplayStatus,
  PendingAttention,
  SessionView,
  SourceSnapshot,
  StatusEvent,
  StatusView,
} from "./model.js";

interface MutableSessionState {
  readonly sessionId: string;
  status: Exclude<DisplayStatus, "off">;
  running: boolean;
  readonly pendingAttention: Map<string, PendingAttention>;
  updatedAt: number;
  lastEventType: SessionView["lastEventType"];
  finishedUntil: number | undefined;
}

export interface Clock {
  now(): number;
}

export interface StatusStoreOptions {
  readonly finishedHoldMs?: number;
  readonly clock?: Clock;
}

const SYSTEM_CLOCK: Clock = {
  now: () => Date.now(),
};

const STATUS_PRIORITY: Readonly<Record<DisplayStatus, number>> = {
  off: 0,
  idle: 1,
  finished: 2,
  running: 3,
  asking: 4,
  error: 5,
};

export class StatusStore {
  readonly #sessions = new Map<string, MutableSessionState>();
  readonly #finishedHoldMs: number;
  readonly #clock: Clock;

  constructor(options: StatusStoreOptions = {}) {
    this.#finishedHoldMs = options.finishedHoldMs ?? 60_000;
    this.#clock = options.clock ?? SYSTEM_CLOCK;

    if (!Number.isFinite(this.#finishedHoldMs) || this.#finishedHoldMs < 0) {
      throw new RangeError("finishedHoldMs must be a non-negative number");
    }
  }

  replaceSnapshot(snapshot: SourceSnapshot): void {
    this.#sessions.clear();

    for (const session of snapshot.sessions) {
      const pendingAttention = new Map(
        session.pendingAttention.map((attention) => [attention.key, attention]),
      );

      this.#sessions.set(session.sessionId, {
        sessionId: session.sessionId,
        status: pendingAttention.size > 0 ? "asking" : session.running ? "running" : "idle",
        running: session.running,
        pendingAttention,
        updatedAt: snapshot.capturedAt,
        lastEventType: "snapshot",
        finishedUntil: undefined,
      });
    }
  }

  apply(event: StatusEvent): void {
    if (event.type === "session.deleted" || event.type === "session.archived") {
      this.#sessions.delete(event.sessionId);
      return;
    }

    const state = this.#getOrCreate(event.sessionId, event.occurredAt);
    state.updatedAt = event.occurredAt;
    state.lastEventType = event.type;

    switch (event.type) {
      case "session.execution.started":
        state.running = true;
        state.finishedUntil = undefined;
        state.status = state.pendingAttention.size > 0 ? "asking" : "running";
        break;

      case "session.execution.succeeded":
        state.running = false;
        if (state.pendingAttention.size > 0) {
          state.status = "asking";
          state.finishedUntil = undefined;
        } else {
          state.status = "finished";
          state.finishedUntil = this.#clock.now() + this.#finishedHoldMs;
        }
        break;

      case "session.execution.failed":
        state.running = false;
        state.finishedUntil = undefined;
        state.status = "error";
        break;

      case "session.execution.interrupted":
        state.running = false;
        state.pendingAttention.clear();
        state.finishedUntil = undefined;
        state.status = "idle";
        break;

      case "session.idle":
        this.#markIdle(state);
        break;

      case "session.status":
        if (event.status === "busy" || event.status === "retry") {
          state.running = true;
          state.finishedUntil = undefined;
          state.status = state.pendingAttention.size > 0 ? "asking" : "running";
        } else {
          this.#markIdle(state);
        }
        break;

      case "permission.asked":
      case "form.created":
        state.running = true;
        state.pendingAttention.set(event.attention.key, event.attention);
        state.finishedUntil = undefined;
        state.status = "asking";
        break;

      case "permission.replied":
      case "form.replied":
      case "form.cancelled":
        state.pendingAttention.delete(event.attentionKey);
        state.finishedUntil = undefined;
        state.status = state.pendingAttention.size > 0 ? "asking" : state.running ? "running" : "idle";
        break;
    }
  }

  tick(now = this.#clock.now()): boolean {
    let changed = false;

    for (const state of this.#sessions.values()) {
      if (
        state.status === "finished" &&
        state.finishedUntil !== undefined &&
        now >= state.finishedUntil
      ) {
        state.status = "idle";
        state.finishedUntil = undefined;
        state.updatedAt = now;
        state.lastEventType = "timer";
        changed = true;
      }
    }

    return changed;
  }

  view(): StatusView {
    const sessions = [...this.#sessions.values()]
      .sort((left, right) => left.sessionId.localeCompare(right.sessionId))
      .map<SessionView>((state) => ({
        sessionId: state.sessionId,
        status: state.status,
        running: state.running,
        pendingAttention: [...state.pendingAttention.values()].sort((left, right) =>
          left.key.localeCompare(right.key),
        ),
        updatedAt: state.updatedAt,
        lastEventType: state.lastEventType,
      }));

    let overallStatus: DisplayStatus = "off";
    for (const session of sessions) {
      if (STATUS_PRIORITY[session.status] > STATUS_PRIORITY[overallStatus]) {
        overallStatus = session.status;
      }
    }

    return { overallStatus, sessions };
  }

  #getOrCreate(sessionId: string, occurredAt: number): MutableSessionState {
    const existing = this.#sessions.get(sessionId);
    if (existing !== undefined) {
      return existing;
    }

    const created: MutableSessionState = {
      sessionId,
      status: "idle",
      running: false,
      pendingAttention: new Map(),
      updatedAt: occurredAt,
      lastEventType: "snapshot",
      finishedUntil: undefined,
    };
    this.#sessions.set(sessionId, created);
    return created;
  }

  #markIdle(state: MutableSessionState): void {
    state.running = false;

    if (state.pendingAttention.size > 0) {
      state.status = "asking";
      state.finishedUntil = undefined;
      return;
    }

    if (state.status !== "finished" && state.status !== "error") {
      state.status = "idle";
      state.finishedUntil = undefined;
    }
  }
}
