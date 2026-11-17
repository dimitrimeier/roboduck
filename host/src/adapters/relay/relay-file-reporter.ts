import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout } from "node:timers/promises";

import type { StatusEvent, StatusView } from "../../core/model.js";
import { MAX_FINISHED_HOLD_MS } from "../../core/status-store.js";
import type { StatusReporter } from "../../ports/status-reporter.js";
import { RELAY_MAX_BYTES, type RelaySession, type RelaySnapshot } from "./relay-snapshot.js";

export class RelayFileReporter implements StatusReporter {
  readonly #file: string;
  readonly #temporaryFile: string;
  readonly #now: () => number;
  readonly #finishedUntil = new Map<string, number>();
  #connected = false;
  #sessions: readonly RelaySession[] = [];

  constructor(file: string, now: () => number = Date.now) {
    this.#file = file;
    this.#temporaryFile = `${file}.${randomUUID()}.tmp`;
    this.#now = now;
  }

  connected(view: StatusView): void {
    this.#connected = true;
    this.#update(view);
  }

  eventReceived(_event: StatusEvent, view: StatusView): void {
    this.#update(view);
  }

  timerChanged(view: StatusView): void {
    if (this.#connected) {
      this.#update(view);
    }
  }

  disconnected(_error: unknown, _retryInMs: number): void {
    this.#connected = false;
    this.#sessions = [];
    this.#finishedUntil.clear();
  }

  async publish(): Promise<void> {
    const snapshot: RelaySnapshot = {
      version: 1,
      updatedAt: this.#now(),
      connected: this.#connected,
      sessions: this.#sessions,
    };
    const data = `${JSON.stringify(snapshot)}\n`;
    if (Buffer.byteLength(data) > RELAY_MAX_BYTES) {
      throw new Error("Relay snapshot exceeds its size limit");
    }
    await mkdir(dirname(this.#file), { recursive: true, mode: 0o700 });
    try {
      await writeFile(this.#temporaryFile, data, { mode: 0o600 });
      await rename(this.#temporaryFile, this.#file);
    } finally {
      await rm(this.#temporaryFile, { force: true });
    }
  }

  async run(signal: AbortSignal): Promise<void> {
    try {
      while (!signal.aborted) {
        await this.publish();
        await setTimeout(1_000, undefined, { signal }).catch((error: unknown) => {
          if (!signal.aborted) {
            throw error;
          }
        });
      }
    } finally {
      this.disconnected(undefined, 0);
      await this.publish();
    }
  }

  #update(view: StatusView): void {
    const finishedIds = new Set<string>();
    this.#sessions = view.sessions.map((session) => {
      if (session.status !== "finished") {
        return { sessionId: session.sessionId, status: session.status };
      }
      finishedIds.add(session.sessionId);
      const deadline = this.#finishedUntil.get(session.sessionId) ??
        this.#now() + MAX_FINISHED_HOLD_MS;
      this.#finishedUntil.set(session.sessionId, deadline);
      return { sessionId: session.sessionId, status: session.status, finishedUntil: deadline };
    });
    for (const id of this.#finishedUntil.keys()) {
      if (!finishedIds.has(id)) {
        this.#finishedUntil.delete(id);
      }
    }
  }
}
