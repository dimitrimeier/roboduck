import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isExpectedStatusDevice,
  SerialStatusOutput,
  type SerialStatusEvent,
} from "../src/application/serial-status-output.js";
import type { DisplayStatus, StatusView } from "../src/core/model.js";
import type {
  SerialConnection,
  SerialOpenOptions,
  SerialPortDescriptor,
  SerialRequestOptions,
  SerialTransport,
} from "../src/ports/serial-transport.js";

describe("SerialStatusOutput", () => {
  it("filters candidates by the confirmed application VID and PID", () => {
    assert.equal(isExpectedStatusDevice(port("COM6", "239a", "0029")), true);
    assert.equal(isExpectedStatusDevice(port("COM6", "0x239A", "0x0029")), true);
    assert.equal(isExpectedStatusDevice(port("COM5", "239A", "00B3")), false);
    assert.equal(isExpectedStatusDevice(port("COM3", undefined, undefined)), false);
  });

  it("handshakes, fully synchronizes, and sends status changes", async () => {
    const connection = successfulConnection("COM6");
    const transport = new FakeTransport(
      [port("COM3", undefined, undefined), port("COM6", "239A", "0029")],
      new Map([["COM6", [connection]]]),
    );
    const events: SerialStatusEvent[] = [];
    const output = createOutput(transport, events);
    const abortController = new AbortController();

    const running = output.run(abortController.signal);
    await waitUntil(() => connection.commands.includes("SYNC_COMPLETE"));
    output.connected(view("running"));
    await waitUntil(() => connection.commands.includes("SET 0 RUNNING"));
    abortController.abort();
    await running;

    assert.deepEqual(transport.opened, ["COM6"]);
    assert.deepEqual(connection.commands, [
      "HELLO 1",
      "RESET_STATE",
      "BRIGHTNESS 128",
      "SET 0 OFF",
      "SYNC_COMPLETE",
      "SET 0 RUNNING",
    ]);
    assert.equal(connection.closed, 1);
    assert.deepEqual(events, [
      {
        kind: "connected",
        path: "COM6",
        firmware: "0.1.0",
        leds: 1,
        status: "off",
        role: "active",
      },
    ]);
  });

  it("sends no state commands to a candidate that fails the handshake", async () => {
    const rejected = new FakeConnection("COM5", () => "NOT_A_STATUS_LIGHT");
    const accepted = successfulConnection("COM6");
    const transport = new FakeTransport(
      [port("COM5", "239A", "0029"), port("COM6", "239A", "0029")],
      new Map([
        ["COM5", [rejected]],
        ["COM6", [accepted]],
      ]),
    );
    const events: SerialStatusEvent[] = [];
    const output = createOutput(transport, events);
    const abortController = new AbortController();

    const running = output.run(abortController.signal);
    await waitUntil(() => accepted.commands.includes("SYNC_COMPLETE"));
    abortController.abort();
    await running;

    assert.deepEqual(rejected.commands, ["HELLO 1"]);
    assert.equal(rejected.closed, 1);
    assert.equal(events[0]?.kind, "candidate-rejected");
    assert.equal(events[1]?.kind, "connected");
  });

  it("skips a blocked matching port and continues with the next candidate", async () => {
    const accepted = successfulConnection("COM6");
    const transport = new FakeTransport(
      [port("COM5", "239A", "0029"), port("COM6", "239A", "0029")],
      new Map([["COM6", [accepted]]]),
    );
    const events: SerialStatusEvent[] = [];
    const output = createOutput(transport, events);
    const abortController = new AbortController();

    const running = output.run(abortController.signal);
    await waitUntil(() => accepted.commands.includes("SYNC_COMPLETE"));
    abortController.abort();
    await running;

    assert.deepEqual(transport.opened, ["COM5", "COM6"]);
    assert.equal(events[0]?.kind, "candidate-rejected");
    assert.equal(events[1]?.kind, "connected");
  });

  it("reconnects and fully synchronizes the newest host state", async () => {
    let failRunningUpdate = true;
    const first = new FakeConnection("COM6", (command) => {
      if (command === "HELLO 1") {
        return deviceResponse();
      }
      if (command === "SET 0 RUNNING" && failRunningUpdate) {
        failRunningUpdate = false;
        throw new Error("device removed");
      }
      return command === "PING" ? "PONG" : "OK";
    });
    const second = successfulConnection("COM6");
    const transport = new FakeTransport(
      [port("COM6", "239A", "0029")],
      new Map([["COM6", [first, second]]]),
    );
    const events: SerialStatusEvent[] = [];
    const output = createOutput(transport, events);
    const abortController = new AbortController();

    const running = output.run(abortController.signal);
    await waitUntil(() => first.commands.includes("SYNC_COMPLETE"));
    output.connected(view("running"));
    await waitUntil(() => second.commands.includes("SYNC_COMPLETE"));
    abortController.abort();
    await running;

    assert.deepEqual(second.commands, [
      "HELLO 1",
      "RESET_STATE",
      "BRIGHTNESS 128",
      "SET 0 RUNNING",
      "SYNC_COMPLETE",
    ]);
    assert.equal(events.some((event) => event.kind === "disconnected"), true);
    assert.equal(events.at(-1)?.kind, "connected");
  });

  it("uses PING/PONG to monitor an idle serial connection", async () => {
    const connection = successfulConnection("COM6");
    const transport = new FakeTransport(
      [port("COM6", "239A", "0029")],
      new Map([["COM6", [connection]]]),
    );
    const output = createOutput(transport, [], { keepAliveIntervalMs: 1 });
    const abortController = new AbortController();

    const running = output.run(abortController.signal);
    await waitUntil(() => connection.commands.includes("PING"));
    abortController.abort();
    await running;

    assert.equal(connection.commands.includes("PING"), true);
  });
});

class FakeTransport implements SerialTransport {
  readonly opened: string[] = [];

  constructor(
    readonly ports: readonly SerialPortDescriptor[],
    readonly connections: Map<string, FakeConnection[]>,
  ) {}

  async list(): Promise<readonly SerialPortDescriptor[]> {
    return this.ports;
  }

  async open(path: string, _options: SerialOpenOptions): Promise<SerialConnection> {
    this.opened.push(path);
    const connection = this.connections.get(path)?.shift();
    if (connection === undefined) {
      throw new Error(`No fake connection available for ${path}`);
    }
    return connection;
  }
}

class FakeConnection implements SerialConnection {
  readonly disconnected = new Promise<Error>(() => undefined);
  readonly commands: string[] = [];
  closed = 0;

  constructor(
    readonly path: string,
    readonly respond: (command: string) => string,
  ) {}

  async request(command: string, _options: SerialRequestOptions): Promise<string> {
    this.commands.push(command);
    return this.respond(command);
  }

  async close(): Promise<void> {
    this.closed += 1;
  }
}

function successfulConnection(path: string): FakeConnection {
  return new FakeConnection(path, (command) => {
    if (command === "HELLO 1") {
      return deviceResponse();
    }
    return command === "PING" ? "PONG" : "OK";
  });
}

function deviceResponse(): string {
  return "DEVICE OPENCODE_STATUS protocol=1 firmware=0.1.0 leds=1";
}

function port(
  path: string,
  vendorId: string | undefined,
  productId: string | undefined,
): SerialPortDescriptor {
  return {
    path,
    vendorId,
    productId,
    manufacturer: undefined,
    serialNumber: undefined,
    pnpId: undefined,
  };
}

function view(overallStatus: DisplayStatus): StatusView {
  return { overallStatus, sessions: [] };
}

function createOutput(
  transport: SerialTransport,
  events: SerialStatusEvent[],
  overrides: { readonly keepAliveIntervalMs?: number } = {},
): SerialStatusOutput {
  return new SerialStatusOutput(transport, {
    scanIntervalMs: 1,
    keepAliveIntervalMs: overrides.keepAliveIntervalMs ?? 10_000,
    responseTimeoutMs: 100,
    openTimeoutMs: 100,
    handshakeDelayMs: 0,
    observer: { report: (event) => events.push(event) },
  });
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
