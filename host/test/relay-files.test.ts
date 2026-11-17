import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, type TestContext } from "node:test";

import { RelayDirectoryMonitor } from "../src/adapters/relay/relay-directory-monitor.js";
import { RelayFileReporter } from "../src/adapters/relay/relay-file-reporter.js";
import { readRelaySnapshot, RELAY_MAX_AGE_MS, RELAY_MAX_BYTES } from "../src/adapters/relay/relay-snapshot.js";
import { MultiSourceStatusReporter } from "../src/application/multi-source-status-reporter.js";
import type { SessionView, StatusView } from "../src/core/model.js";

describe("relay files", () => {
  it("publishes only reduced state and clears it on a source disconnect", async (t) => {
    const directory = await temporaryDirectory(t);
    const file = join(directory, "wsl.json");
    const publisher = new RelayFileReporter(file, () => 20_000);
    publisher.connected({ ...view("asking"), prompt: "private" } as StatusView);
    await publisher.publish();
    const raw = await readFile(file, "utf8");
    assert.ok(!raw.includes("private"));
    assert.ok(!raw.includes("pendingAttention"));
    assert.equal(readRelaySnapshot(JSON.parse(raw), 20_000)?.overallStatus, "asking");
    assert.deepEqual(await readdir(directory), ["wsl.json"], "atomic writes leave no temporary files");

    publisher.disconnected(new Error("private SDK response"), 1_000);
    publisher.timerChanged(view("asking"));
    await publisher.publish();
    const disconnected = JSON.parse(await readFile(file, "utf8"));
    assert.equal(disconnected.connected, false);
    assert.deepEqual(disconnected.sessions, []);
  });

  it("does not extend finished deadlines on heartbeat or unrelated events", async (t) => {
    const directory = await temporaryDirectory(t);
    const file = join(directory, "wsl.json");
    let now = 20_000;
    const publisher = new RelayFileReporter(file, () => now);
    publisher.connected(view("finished"));
    now += 4_000;
    publisher.timerChanged(view("finished"));
    await publisher.publish();
    const data = JSON.parse(await readFile(file, "utf8"));
    assert.equal(data.sessions[0].finishedUntil, 25_000);
    assert.equal(readRelaySnapshot(data, 25_000)?.overallStatus, "idle");
  });

  it("combines local and WSL state, expires WSL only, and reconnects", async (t) => {
    const directory = await temporaryDirectory(t);
    let now = 20_000;
    const aggregate = new MultiSourceStatusReporter({
      connected() {}, eventReceived() {}, timerChanged() {}, disconnected() {},
    });
    aggregate.forSource("local").connected(view("running"));
    const relay = new RelayDirectoryMonitor(directory, (id) => aggregate.forSource(id), () => now);
    const publisher = new RelayFileReporter(join(directory, "wsl.json"), () => now);
    publisher.connected(view("asking"));
    await publisher.publish();
    await relay.poll();
    assert.equal(aggregate.view().overallStatus, "asking");
    assert.equal(aggregate.view().sessions.length, 2, "identical local and WSL IDs stay separate");

    now += RELAY_MAX_AGE_MS;
    await relay.poll();
    assert.equal(aggregate.view().overallStatus, "running");
    assert.equal(aggregate.view().sessions.length, 1);

    await publisher.publish();
    await relay.poll();
    assert.equal(aggregate.view().overallStatus, "asking");
    publisher.disconnected(undefined, 0);
    await publisher.publish();
    await relay.poll();
    assert.equal(aggregate.view().overallStatus, "running");
  });

  it("ignores heartbeats but forwards real state changes and file removal", async (t) => {
    const directory = await temporaryDirectory(t);
    const file = join(directory, "wsl.json");
    const reports: string[] = [];
    let now = 20_000;
    const publisher = new RelayFileReporter(file, () => now);
    const monitor = new RelayDirectoryMonitor(directory, () => ({
      connected: (value) => reports.push(`connected:${value.overallStatus}`),
      timerChanged: (value) => reports.push(`changed:${value.overallStatus}`),
      eventReceived() {}, disconnected: () => reports.push("disconnected"),
    }), () => now);
    publisher.connected(view("finished"));
    await publisher.publish();
    await monitor.poll();
    now += 1_000;
    await publisher.publish();
    await monitor.poll();
    now += 4_000;
    await monitor.poll();
    await rm(file);
    await monitor.poll();
    assert.deepEqual(reports, ["connected:finished", "changed:idle", "disconnected"]);
  });

  it("tolerates missing directories and rejects malformed or oversized files", async (t) => {
    const directory = await temporaryDirectory(t);
    let connections = 0;
    const monitor = new RelayDirectoryMonitor(directory, () => ({
      connected: () => connections++, eventReceived() {}, timerChanged() {}, disconnected() {},
    }));
    await writeFile(join(directory, "bad.json"), "not json");
    await writeFile(join(directory, "huge.json"), " ".repeat(RELAY_MAX_BYTES + 1));
    await writeFile(join(directory, "ignored.tmp"), "{}");
    await monitor.poll();
    assert.equal(connections, 0);
    await new RelayDirectoryMonitor(join(directory, "missing"), () => {
      throw new Error("must not create a source");
    }).poll();
  });

  it("writes a disconnected record when stopped", async (t) => {
    const directory = await temporaryDirectory(t);
    const file = join(directory, "wsl.json");
    const publisher = new RelayFileReporter(file);
    publisher.connected(view("running"));
    const controller = new AbortController();
    controller.abort();
    await publisher.run(controller.signal);
    assert.equal(JSON.parse(await readFile(file, "utf8")).connected, false);
  });
});

async function temporaryDirectory(t: TestContext): Promise<string> {
  const root = join(tmpdir(), "opencode");
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, "relay-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

function view(status: SessionView["status"]): StatusView {
  return { overallStatus: status, sessions: [{
    sessionId: "ses_1", status, running: status === "running", pendingAttention: [],
    updatedAt: 20_000, lastEventType: "snapshot",
  }] };
}
