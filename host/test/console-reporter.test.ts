import assert from "node:assert/strict";
import { describe, it, type TestContext } from "node:test";

import { ConsoleReporter } from "../src/adapters/console/console-reporter.js";

describe("ConsoleReporter connection errors", () => {
  it("reports an allowlisted system code without exposing nested cause contents", (t) => {
    const records = captureOutput(t);
    const cause = Object.assign(new Error("private stderr, password and path"), { code: "ENOENT" });
    new ConsoleReporter().disconnected(new Error("Failed to start server", {
      cause: new Error("private intermediate error", { cause }),
    }), 1_000);

    const record = JSON.parse(records[0]!);
    assert.equal(record.kind, "disconnected");
    assert.equal(record.retryInMs, 1_000);
    assert.equal(record.error, "Failed to start server");
    assert.equal(record.errorCode, "ENOENT");
    assert.ok(!records[0]!.includes("private"));
  });

  it("does not expose arbitrary code values or non-error causes", (t) => {
    const records = captureOutput(t);
    const cause = Object.assign(new Error("private cause"), { code: "private secret" });
    new ConsoleReporter().disconnected(new Error("Connection failed", { cause }), 1_000);
    new ConsoleReporter().disconnected(new Error("Connection failed", {
      cause: { code: "ENOENT", message: "private cause" },
    }), 1_000);
    for (const raw of records) {
      assert.equal(JSON.parse(raw).errorCode, undefined);
      assert.ok(!raw.includes("private"));
    }
  });

  it("handles cyclic causes and unknown errors", (t) => {
    const records = captureOutput(t);
    const error = new Error("Connection failed");
    error.cause = error;
    new ConsoleReporter().disconnected(error, 1_000);
    new ConsoleReporter().disconnected("private value", 2_000);
    assert.equal(JSON.parse(records[0]!).errorCode, undefined);
    assert.equal(JSON.parse(records[1]!).error, "Unknown error");
    assert.ok(!records.join("").includes("private"));
  });
});

function captureOutput(t: TestContext): string[] {
  const records: string[] = [];
  t.mock.method(process.stdout, "write", (chunk: string | Uint8Array) => {
    records.push(chunk.toString());
    return true;
  });
  return records;
}
