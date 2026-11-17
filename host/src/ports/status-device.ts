export interface StatusDeviceRequestOptions {
  readonly timeoutMs: number;
  readonly signal: AbortSignal;
}

export interface StatusDeviceConnection {
  readonly path: string;
  readonly disconnected: Promise<Error>;
  request(command: string, options: StatusDeviceRequestOptions): Promise<string>;
  close(): Promise<void>;
}
