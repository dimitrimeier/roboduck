import { open, readdir } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";

import type { StatusReporter } from "../../ports/status-reporter.js";
import { readRelaySnapshot, RELAY_MAX_BYTES } from "./relay-snapshot.js";

interface ActiveRelay {
  readonly reporter: StatusReporter;
  signature: string;
}

export class RelayDirectoryMonitor {
  readonly #directory: string;
  readonly #reporterForSource: (sourceId: string) => StatusReporter;
  readonly #now: () => number;
  readonly #active = new Map<string, ActiveRelay>();

  constructor(
    directory: string,
    reporterForSource: (sourceId: string) => StatusReporter,
    now: () => number = Date.now,
  ) {
    this.#directory = directory;
    this.#reporterForSource = reporterForSource;
    this.#now = now;
  }

  async poll(): Promise<void> {
    const available = new Set<string>();
    const files = await readdir(this.#directory, { withFileTypes: true }).catch(() => []);
    for (const file of files.filter((entry) => entry.isFile() &&
      /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,120}\.json$/.test(entry.name)).slice(0, 32)) {
      try {
        const view = readRelaySnapshot(await readBoundedJson(join(this.#directory, file.name)), this.#now());
        if (view === undefined) {
          continue;
        }
        available.add(file.name);
        const signature = JSON.stringify(view.sessions.map(({ sessionId, status }) => ({ sessionId, status })));
        const active = this.#active.get(file.name);
        if (active === undefined) {
          const reporter = this.#reporterForSource(`relay:${file.name.slice(0, -5)}`);
          this.#active.set(file.name, { reporter, signature });
          reporter.connected(view);
        } else if (active.signature !== signature) {
          active.signature = signature;
          active.reporter.timerChanged(view);
        }
      } catch {
        // Missing, malformed, oversized, or temporarily inaccessible files are not trusted state.
      }
    }

    for (const [file, active] of this.#active) {
      if (!available.has(file)) {
        this.#active.delete(file);
        active.reporter.disconnected(new Error(`Relay source unavailable: ${file}`), 1_000);
      }
    }
  }

  async run(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      await this.poll();
      await setTimeout(1_000, undefined, { signal }).catch((error: unknown) => {
        if (!signal.aborted) {
          throw error;
        }
      });
    }
  }
}

async function readBoundedJson(path: string): Promise<unknown> {
  const file = await open(path, "r");
  try {
    const buffer = Buffer.alloc(RELAY_MAX_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await file.read(buffer, length, buffer.length - length, null);
      if (bytesRead === 0) {
        break;
      }
      length += bytesRead;
    }
    if (length > RELAY_MAX_BYTES) {
      throw new Error("Relay file exceeds its size limit");
    }
    return JSON.parse(buffer.toString("utf8", 0, length)) as unknown;
  } finally {
    await file.close();
  }
}
