import type { SerialStatusEvent, SerialStatusObserver } from "../../application/serial-status-output.js";

export class ConsoleSerialObserver implements SerialStatusObserver {
  report(event: SerialStatusEvent): void {
    const { kind, ...details } = event;
    process.stdout.write(
      `${JSON.stringify({
        timestamp: new Date().toISOString(),
        kind: `serial_${kind.replace("-", "_")}`,
        ...details,
      })}\n`,
    );
  }
}
