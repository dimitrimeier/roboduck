import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "node:test";

import { relayDirectory } from "../src/adapters/relay/relay-directory.js";
import { collectorService } from "../src/application/collector-service.js";

const OPTIONS = {
  nodeExecutable: "/home/test/.nvm/bin/node",
  opencodeDirectory: "/home/test/.nvm/bin",
  applicationDirectory: "/home/test/.local/share/opencode-status-collector/app",
  outputFile: "/mnt/c/Users/test/AppData/Local/OpenCodeStatus/sources/wsl-test.json",
};

describe("collector service setup", () => {
  it("uses native executables and boot-enabled user service settings", () => {
    const unit = collectorService(OPTIONS);
    assert.ok(unit.includes(`ExecStart="${OPTIONS.nodeExecutable}"`));
    assert.ok(unit.includes("WorkingDirectory=%h\n"));
    assert.ok(unit.includes(`"${OPTIONS.applicationDirectory}/collector.js" "${OPTIONS.outputFile}"`));
    assert.ok(unit.includes('Environment="PATH=/home/test/.nvm/bin:/usr/local/bin:/usr/bin:/bin"'));
    assert.ok(unit.includes("WantedBy=default.target"));
    assert.ok(unit.includes("Restart=on-failure"));
    assert.ok(unit.includes("NoNewPrivileges=true"));
    assert.ok(!unit.includes("serialport"));
    assert.ok(!unit.includes("opencode serve"));
  });

  it("quotes spaces, specifiers, dollar signs, quotes and backslashes", () => {
    const unit = collectorService({ ...OPTIONS,
      outputFile: '/mnt/c/user name/%folder/$state/"quoted"\\file.json',
    });
    assert.ok(unit.includes('/mnt/c/user name/%%folder/$$state/\\"quoted\\"\\\\file.json'));
    assert.throws(() => collectorService({ ...OPTIONS, outputFile: "/tmp/x\nExecStart=bad" }));
  });

  it("uses a per-user Windows relay directory without starting WSL", () => {
    assert.equal(relayDirectory("win32", { LOCALAPPDATA: "/local-data" }, "/home"),
      join("/local-data", "OpenCodeStatus", "sources"));
    assert.equal(relayDirectory("win32", {}, "/home"),
      join("/home", "AppData", "Local", "OpenCodeStatus", "sources"));
    assert.equal(relayDirectory("linux", {}, "/home"), undefined);
    assert.equal(relayDirectory("darwin", { OPENCODE_STATUS_RELAY_DIR: "/custom" }), "/custom");
    assert.throws(() => relayDirectory("win32", { OPENCODE_STATUS_RELAY_DIR: " " }));
  });
});
