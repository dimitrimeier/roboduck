import type { StatusDeviceConnection } from "./status-device.js";

export interface BluetoothConnectOptions {
  readonly timeoutMs: number;
  readonly signal: AbortSignal;
}

export interface BluetoothConnection extends StatusDeviceConnection {}

export interface BluetoothTransport {
  connect(options: BluetoothConnectOptions): Promise<BluetoothConnection | undefined>;
}
