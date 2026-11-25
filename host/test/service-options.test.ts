import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { Service } from "@opencode/client/service";

import { openCodeServiceOptions } from "../src/adapters/opencode/service-options.js";

describe("OpenCode service startup", () => {
  it("uses the Windows command interpreter with a fixed command and no AutoRun", () => {
    const interpreter = "C:\\Windows folder\\cmd.exe";
    assert.deepEqual(openCodeServiceOptions("win32", { ComSpec: interpreter }), {
      command: [interpreter, "/d", "/s", "/c", "opencode serve --service"],
    });
  });

  it("falls back to cmd.exe when ComSpec is missing or empty", () => {
    const expected = {
      command: ["cmd.exe", "/d", "/s", "/c", "opencode serve --service"],
    };
    assert.deepEqual(openCodeServiceOptions("win32", {}), expected);
    assert.deepEqual(openCodeServiceOptions("win32", { ComSpec: "" }), expected);
  });

  it("keeps the SDK's default startup on macOS and Linux", () => {
    assert.deepEqual(openCodeServiceOptions("darwin", { ComSpec: "ignored" }), {});
    assert.deepEqual(openCodeServiceOptions("linux", { ComSpec: "ignored" }), {});
  });

  it("automatically starts through a Windows npm shim, reuses, and recovers", {
    skip: process.platform !== "win32",
    timeout: 20_000,
  }, async (t) => {
    const root = join(tmpdir(), "opencode");
    await mkdir(root, { recursive: true });
    const directory = await mkdtemp(join(root, "service-test-"));
    const shimDirectory = join(directory, "CLI with spaces");
    const file = join(directory, "service.json");
    t.after(async () => {
      // This registration belongs only to the fake service, never real OpenCode.
      await Service.stop({ file });
      await rm(directory, { recursive: true, force: true });
    });
    await mkdir(shimDirectory);
    await writeFile(join(shimDirectory, "opencode.cmd"), [
      "@echo off",
      '"%OPENCODE_STATUS_TEST_NODE%" "%OPENCODE_STATUS_TEST_SERVICE%" %*',
      "",
    ].join("\r\n"));

    const starts: string[] = [];
    const options = {
      ...openCodeServiceOptions(),
      file,
      env: {
        PATH: shimDirectory,
        OPENCODE_STATUS_TEST_NODE: process.execPath,
        OPENCODE_STATUS_TEST_SERVICE: fileURLToPath(
          new URL("./fixtures/fake-opencode-service.mjs", import.meta.url),
        ),
        OPENCODE_STATUS_TEST_REGISTRATION: file,
      },
      onStart: (reason: string) => { starts.push(reason); },
    };

    assert.equal(await Service.discover({ file }), undefined);
    const endpoint = await Service.ensure(options);
    assert.match(endpoint.url, /^http:\/\/127\.0\.0\.1:\d+$/);
    assert.deepEqual(starts, ["missing"]);
    const registration = JSON.parse(await readFile(file, "utf8"));
    assert.deepEqual(registration.args, ["serve", "--service"]);

    assert.deepEqual(await Service.ensure(options), endpoint);
    assert.deepEqual(starts, ["missing"], "a healthy service must not be restarted");

    await Service.stop({ file });
    await Service.ensure(options);
    assert.deepEqual(starts, ["missing", "missing"], "a stopped service is started again");
    const recovered = JSON.parse(await readFile(file, "utf8"));
    assert.notEqual(recovered.pid, registration.pid);
    assert.deepEqual(recovered.args, ["serve", "--service"]);
  });
});
