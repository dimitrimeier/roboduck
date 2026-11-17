import type { SourceSnapshot, StatusEvent } from "../core/model.js";

export interface StatusConnection {
  readonly snapshot: SourceSnapshot;
  readonly events: AsyncIterable<StatusEvent>;
  close(): Promise<void>;
}

export interface StatusSource {
  connect(signal: AbortSignal): Promise<StatusConnection>;
}
