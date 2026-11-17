import type {
  BluetoothStatusEvent,
  BluetoothStatusObserver,
} from "../../application/bluetooth-status-output.js";

export class ConsoleBluetoothObserver implements BluetoothStatusObserver {
  report(event: BluetoothStatusEvent): void {
    const { kind, ...details } = event;
    process.stdout.write(
      `${JSON.stringify({
        timestamp: new Date().toISOString(),
        kind: `bluetooth_${kind.replace("-", "_")}`,
        ...details,
      })}\n`,
    );
  }
}
