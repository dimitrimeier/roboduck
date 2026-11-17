import { aggregateStatus } from "../../core/aggregate-status.js";
import type { SessionView, StatusView } from "../../core/model.js";
import { MAX_FINISHED_HOLD_MS } from "../../core/status-store.js";

export const RELAY_MAX_AGE_MS = 10_000;
export const RELAY_MAX_BYTES = 256 * 1024;
const MAX_SESSIONS = 1_000;
const SESSION_STATUSES = new Set(["idle", "finished", "running", "asking", "error"]);

export interface RelaySession {
  readonly sessionId: string;
  readonly status: SessionView["status"];
  readonly finishedUntil?: number;
}

export interface RelaySnapshot {
  readonly version: 1;
  readonly updatedAt: number;
  readonly connected: boolean;
  readonly sessions: readonly RelaySession[];
}

export function readRelaySnapshot(value: unknown, now: number): StatusView | undefined {
  if (
    !record(value) || value["version"] !== 1 || value["connected"] !== true ||
    !timestamp(value["updatedAt"]) || value["updatedAt"] > now + 2_000 ||
    now - value["updatedAt"] >= RELAY_MAX_AGE_MS ||
    !Array.isArray(value["sessions"]) || value["sessions"].length > MAX_SESSIONS
  ) {
    return undefined;
  }

  const sessions: SessionView[] = [];
  const ids = new Set<string>();
  for (const session of value["sessions"]) {
    if (
      !record(session) || typeof session["sessionId"] !== "string" ||
      session["sessionId"].length === 0 || session["sessionId"].length > 256 ||
      /[\x00-\x1f\x7f\ud800-\udfff]/.test(session["sessionId"]) || ids.has(session["sessionId"]) ||
      typeof session["status"] !== "string" || !SESSION_STATUSES.has(session["status"])
    ) {
      return undefined;
    }

    let status = session["status"] as SessionView["status"];
    if (status === "finished") {
      if (
        !timestamp(session["finishedUntil"]) ||
        session["finishedUntil"] > value["updatedAt"] + MAX_FINISHED_HOLD_MS
      ) {
        return undefined;
      }
      if (now >= session["finishedUntil"]) {
        status = "idle";
      }
    }
    ids.add(session["sessionId"]);
    sessions.push({
      sessionId: session["sessionId"],
      status,
      running: status === "running" || status === "asking",
      pendingAttention: [],
      updatedAt: value["updatedAt"],
      lastEventType: "snapshot",
    });
  }

  return { overallStatus: aggregateStatus(sessions.map((session) => session.status)), sessions };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function timestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
