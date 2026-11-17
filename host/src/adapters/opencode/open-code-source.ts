import { OpenCode, type OpenCodeClient, type OpenCodeEvent } from "@opencode/client";
import { Service } from "@opencode/client/service";

import type { PendingAttention, SourceSnapshot, StatusEvent } from "../../core/model.js";
import type { StatusConnection, StatusSource } from "../../ports/status-source.js";
import { AsyncQueue } from "./async-queue.js";
import { normalizeOpenCodeEvent } from "./normalize-event.js";

const OBSERVED_EVENT_TYPES = [
  "session.execution.started",
  "session.execution.succeeded",
  "session.execution.failed",
  "session.execution.interrupted",
  "session.status",
  "session.idle",
  "session.deleted",
  "session.archived",
  "permission.asked",
  "permission.replied",
  "form.created",
  "form.replied",
  "form.cancelled",
] as const;

export interface OpenCodeClientFactory {
  create(): Promise<OpenCodeClient>;
}

export interface OpenCodeStatusSourceOptions {
  readonly clientFactory?: OpenCodeClientFactory;
  readonly now?: () => number;
}

const SERVICE_CLIENT_FACTORY: OpenCodeClientFactory = {
  async create() {
    const endpoint = await Service.ensure();
    return OpenCode.make({
      baseUrl: endpoint.url,
      headers: Service.headers(endpoint),
    });
  },
};

interface Deferred {
  readonly promise: Promise<void>;
  resolve(): void;
  reject(error: unknown): void;
}

export class OpenCodeStatusSource implements StatusSource {
  readonly #clientFactory: OpenCodeClientFactory;
  readonly #now: () => number;

  constructor(options: OpenCodeStatusSourceOptions = {}) {
    this.#clientFactory = options.clientFactory ?? SERVICE_CLIENT_FACTORY;
    this.#now = options.now ?? Date.now;
  }

  async connect(signal: AbortSignal): Promise<StatusConnection> {
    const client = await this.#clientFactory.create();
    const queue = new AsyncQueue<StatusEvent>();
    const connected = createDeferred();
    const eventIterator = client.event
      .subscribe({ types: OBSERVED_EVENT_TYPES, signal })
      [Symbol.asyncIterator]();

    const pump = this.#pumpEvents(eventIterator, queue, connected);

    try {
      await connected.promise;
      const snapshot = await this.#loadSnapshot(client, signal);

      return {
        snapshot,
        events: queue,
        refreshSnapshot: () => this.#loadSnapshot(client, signal),
        async close() {
          await eventIterator.return?.();
          queue.end();
          await pump;
        },
      };
    } catch (error) {
      await eventIterator.return?.();
      queue.end(error);
      await pump;
      throw error;
    }
  }

  async #loadSnapshot(client: OpenCodeClient, signal: AbortSignal): Promise<SourceSnapshot> {
    const active = await client.session.active({ signal });

    const sessions = await Promise.all(
      Object.keys(active).map(async (sessionId) => {
        const [permissions, forms] = await Promise.all([
          client.permission.list({ sessionID: sessionId }, { signal }),
          client.session.form.list({ sessionID: sessionId }, { signal }),
        ]);

        const pendingAttention: PendingAttention[] = [
          ...permissions.map((permission) => ({
            key: `permission:${permission.id}`,
            kind: "permission" as const,
          })),
          ...forms.map((form) => ({
            key: `form:${form.id}`,
            kind: "form" as const,
          })),
        ];

        return {
          sessionId,
          running: true,
          pendingAttention,
        };
      }),
    );

    return {
      capturedAt: this.#now(),
      sessions,
    };
  }

  async #pumpEvents(
    iterator: AsyncIterator<OpenCodeEvent>,
    queue: AsyncQueue<StatusEvent>,
    connected: Deferred,
  ): Promise<void> {
    let connectionConfirmed = false;

    try {
      while (true) {
        const result = await iterator.next();
        if (result.done) {
          throw new Error("OpenCode event stream ended");
        }

        if (result.value.type === "server.connected") {
          connectionConfirmed = true;
          connected.resolve();
          continue;
        }

        const normalized = normalizeOpenCodeEvent(result.value);
        if (normalized !== undefined) {
          queue.push(normalized);
        }
      }
    } catch (error) {
      if (!connectionConfirmed) {
        connected.reject(error);
      }
      queue.end(error);
    }
  }
}

function createDeferred(): Deferred {
  let resolvePromise!: () => void;
  let rejectPromise!: (error: unknown) => void;
  const promise = new Promise<void>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  };
}
