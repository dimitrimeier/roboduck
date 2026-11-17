import type {
  StatusDeviceConnection,
  StatusDeviceRequestOptions,
} from "./status-device.js";

export interface SerialPortDescriptor {
  readonly path: string;
  readonly vendorId: string | undefined;
  readonly productId: string | undefined;
  readonly manufacturer: string | undefined;
  readonly serialNumber: string | undefined;
  readonly pnpId: string | undefined;
}

export interface SerialRequestOptions extends StatusDeviceRequestOptions {}

export interface SerialOpenOptions {
  readonly timeoutMs: number;
  readonly signal: AbortSignal;
}

export interface SerialConnection extends StatusDeviceConnection {}

export interface SerialTransport {
  list(): Promise<readonly SerialPortDescriptor[]>;
  open(path: string, options: SerialOpenOptions): Promise<SerialConnection>;
}
