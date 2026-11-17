import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BluetoothStatusOutput,
  type BluetoothStatusEvent,
} from "../src/application/bluetooth-status-output.js";
import type { DisplayStatus, StatusView } from "../src/core/model.js";
import type {
  BluetoothConnectOptions,
  BluetoothConnection,
  BluetoothTransport,
} from "../src/ports/bluetooth-transport.js";
import type { StatusDeviceRequestOptions } from "../src/ports/status-device.js";

describe("BluetoothStatusOutput", () => {
  it("handshakes, synchronizes, and forwards status changes over BLE", async () => {
    const connection = successfulConnection();
    const transport = new FakeBluetoothTransport([connection]);
    const events: BluetoothStatusEvent[] = [];
    const output = createOutput(transport, events);
    const abortController = new AbortController();

    const running = output.run(abortController.signal);
    await waitUntil(() => connection.commands.includes("SYNC_COMPLETE"));
    output.connected(view("asking"));
    await waitUntil(() => connection.commands.includes("SET 0 ASKING"));
    abortController.abort();
    await running;

    assert.deepEqual(connection.commands, [
      "HELLO 1",
      "RESET_STATE",
      "BRIGHTNESS 128",
      "SET 0 OFF",
      "SYNC_COMPLETE",
      "SET 0 ASKING",
    ]);
    assert.equal(connection.closed, 1);
    assert.deepEqual(events, [
      {
        kind: "connected",
        path: "Bluetooth OCStatus (AA:BB:CC:DD:EE:FF)",
        firmware: "0.3.0",
        leds: 1,
        status: "off",
        role: "active",
      },
    ]);
  });

  it("treats an empty BLE scan as no device instead of a rejected candidate", async () => {
    const transport = new FakeBluetoothTransport([]);
    const events: BluetoothStatusEvent[] = [];
    const output = createOutput(transport, events);
    const abortController = new AbortController();

    const running = output.run(abortController.signal);
    await waitUntil(() => transport.connects > 0);
    abortController.abort();
    await running;

    assert.deepEqual(events, []);
  });

  it("rejects a BLE endpoint that fails the protocol handshake", async () => {
    const connection = new FakeBluetoothConnection(() => "NOT_A_STATUS_LIGHT");
    const transport = new FakeBluetoothTransport([connection]);
    const events: BluetoothStatusEvent[] = [];
    const output = createOutput(transport, events);
    const abortController = new AbortController();

    const running = output.run(abortController.signal);
    await waitUntil(() => events.some((event) => event.kind === "candidate-rejected"));
    abortController.abort();
    await running;

    assert.deepEqual(connection.commands, ["HELLO 1"]);
    assert.equal(connection.closed, 1);
    assert.equal(events[0]?.kind, "candidate-rejected");
  });

  it("keeps a standby connection warm and fully synchronizes it on activation", async () => {
    const connection = successfulConnection();
    const transport = new FakeBluetoothTransport([connection]);
    const events: BluetoothStatusEvent[] = [];
    const output = new BluetoothStatusOutput(transport, {
      scanIntervalMs: 1,
      keepAliveIntervalMs: 1,
      responseTimeoutMs: 100,
      openTimeoutMs: 100,
      initiallyActive: false,
      observer: { report: (event) => events.push(event) },
    });
    output.connected(view("running"));
    const abortController = new AbortController();

    const running = output.run(abortController.signal);
    await waitUntil(() => events.some((event) => event.kind === "connected"));
    await waitUntil(() => connection.commands.includes("PING"));

    assert.deepEqual(connection.commands.slice(0, 2), ["HELLO 1", "PING"]);
    assert.equal(connection.commands.some((command) => command.startsWith("SET ")), false);

    output.setActive(true);
    await waitUntil(() => connection.commands.includes("SYNC_COMPLETE"));
    abortController.abort();
    await running;

    assert.deepEqual(connection.commands.slice(-4), [
      "RESET_STATE",
      "BRIGHTNESS 128",
      "SET 0 RUNNING",
      "SYNC_COMPLETE",
    ]);
    assert.equal(
      events.some((event) => event.kind === "role-changed" && event.role === "active"),
      true,
    );
  });

  it("reacts to a disconnect signal without waiting for the next keepalive", async () => {
    const connection = successfulConnection();
    const transport = new FakeBluetoothTransport([connection]);
    const events: BluetoothStatusEvent[] = [];
    const output = createOutput(transport, events);
    const abortController = new AbortController();

    const running = output.run(abortController.signal);
    await waitUntil(() => events.some((event) => event.kind === "connected"));
    connection.fail(new Error("link lost"));
    await waitUntil(() => events.some((event) => event.kind === "disconnected"));
    abortController.abort();
    await running;

    assert.equal(
      events.some((event) => event.kind === "disconnected" && event.error === "link lost"),
      true,
    );
  });
});

class FakeBluetoothTransport implements BluetoothTransport {
  connects = 0;

  constructor(readonly connections: FakeBluetoothConnection[]) {}

  async connect(_options: BluetoothConnectOptions): Promise<BluetoothConnection | undefined> {
    this.connects += 1;
    return this.connections.shift();
  }
}

class FakeBluetoothConnection implements BluetoothConnection {
  readonly path = "Bluetooth OCStatus (AA:BB:CC:DD:EE:FF)";
  readonly disconnected: Promise<Error>;
  readonly commands: string[] = [];
  closed = 0;
  readonly #resolveDisconnected: (error: Error) => void;

  constructor(readonly respond: (command: string) => string) {
    let resolveDisconnected: ((error: Error) => void) | undefined;
    this.disconnected = new Promise((resolve) => {
      resolveDisconnected = resolve;
    });
    this.#resolveDisconnected = (error) => resolveDisconnected?.(error);
  }

  fail(error: Error): void {
    this.#resolveDisconnected(error);
  }

  async request(command: string, _options: StatusDeviceRequestOptions): Promise<string> {
    this.commands.push(command);
    return this.respond(command);
  }

  async close(): Promise<void> {
    this.closed += 1;
  }
}

function successfulConnection(): FakeBluetoothConnection {
  return new FakeBluetoothConnection((command) => {
    if (command === "HELLO 1") {
      return "DEVICE OPENCODE_STATUS protocol=1 firmware=0.3.0 leds=1";
    }
    return command === "PING" ? "PONG" : "OK";
  });
}

function createOutput(
  transport: BluetoothTransport,
  events: BluetoothStatusEvent[],
): BluetoothStatusOutput {
  return new BluetoothStatusOutput(transport, {
    scanIntervalMs: 1,
    keepAliveIntervalMs: 10_000,
    responseTimeoutMs: 100,
    openTimeoutMs: 100,
    observer: { report: (event) => events.push(event) },
  });
}

function view(overallStatus: DisplayStatus): StatusView {
  return { overallStatus, sessions: [] };
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 1_000; attempt += 1) {
    if (predicate()) {
      return;
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  throw new Error("Timed out waiting for test condition");
}
