import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { delimiter, dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

import { relayDirectory } from "../dist/adapters/relay/relay-directory.js";
import { collectorService, COLLECTOR_SERVICE_MARKER } from "../dist/application/collector-service.js";

const script = fileURLToPath(import.meta.url);
const hostRoot = dirname(dirname(script));
const args = process.argv.slice(2);
const unitName = "opencode-status-collector.service";

function run(command, argv, options = {}) {
  const result = spawnSync(command, argv, { encoding: "utf8", timeout: 120_000, ...options });
  if (result.error !== undefined || result.status !== 0) {
    throw new Error(`Command failed: ${command} ${argv[0] ?? ""}. ${result.stderr?.trim() ?? ""}`, {
      cause: result.error,
    });
  }
  return result.stdout?.trim() ?? "";
}

function option(name) {
  const index = args.indexOf(name);
  const value = index < 0 ? undefined : args[index + 1];
  if (value === undefined || value.startsWith("--") || args.length !== 2) {
    throw new Error(`Expected ${name} <value>`);
  }
  return value;
}

if (process.platform === "win32") {
  const distribution = option("--distribution");
  if (/[\x00-\x1f]/.test(distribution)) {
    throw new Error("Invalid WSL distribution name");
  }
  const directory = relayDirectory();
  const suffix = createHash("sha256").update(distribution).digest("hex").slice(0, 8);
  const name = distribution.replaceAll(/[^a-zA-Z0-9._-]/g, "-").slice(0, 60);
  const output = join(directory, `wsl-${name}-${suffix}.json`);
  const wslPath = (path) => run("wsl.exe", [
    "--distribution", distribution, "--exec", "wslpath", "-u", path,
  ]);
  mkdirSync(directory, { recursive: true });
  run("wsl.exe", [
    "--distribution", distribution, "--exec", "bash", "-lic",
    'exec node "$1" --output "$2"', "install-wsl-collector", wslPath(script), wslPath(output),
  ], { stdio: "inherit", timeout: 0 });
  console.log("Windows bridge autostart was not changed. Restart the manually running bridge to load WSL support.");
} else if (process.platform === "linux" && process.env.WSL_DISTRO_NAME !== undefined) {
  if (userInfo().uid === 0) {
    throw new Error("Install the collector as your normal WSL user, not as root or through sudo");
  }
  const output = option("--output");
  if (!isAbsolute(output) || !output.endsWith(".json") || /[\r\n\x00]/.test(output)) {
    throw new Error("The collector output must be an absolute .json path on the Windows filesystem");
  }
  const version = run("opencode", ["--version"]);
  if (!/^(?:opencode v)?2\./.test(version)) {
    throw new Error("The WSL collector requires OpenCode V2; no OpenCode installation was changed");
  }
  run("systemctl", ["--user", "is-active", "default.target"]);
  const opencode = process.env.PATH.split(delimiter)
    .map((directory) => join(directory, "opencode"))
    .find((candidate) => existsSync(candidate));
  if (opencode === undefined || !isAbsolute(opencode)) {
    throw new Error("A native WSL OpenCode executable must be on PATH");
  }

  const dataRoot = process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
  const configRoot = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  const installation = join(dataRoot, "opencode-status-collector");
  const application = join(installation, "app");
  const marker = join(installation, ".roboduck-collector");
  const unit = join(configRoot, "systemd", "user", unitName);
  if (existsSync(installation) && !existsSync(marker)) {
    throw new Error("Refusing to overwrite an unrecognized collector installation");
  }
  if (existsSync(unit) && !readFileSync(unit, "utf8").startsWith(COLLECTOR_SERVICE_MARKER)) {
    throw new Error("Refusing to overwrite an unmanaged systemd unit");
  }
  const user = userInfo().username;
  if (run("loginctl", ["show-user", user, "--property=Linger", "--value"]) !== "yes") {
    try {
      run("loginctl", ["enable-linger", user], { timeout: 15_000 });
    } catch {
      throw new Error('Boot autostart requires lingering. Run sudo loginctl enable-linger "$USER" in WSL, then retry.');
    }
  }

  if (existsSync(unit) &&
      run("systemctl", ["--user", "show", unitName, "--property=LoadState", "--value"]) === "loaded") {
    run("systemctl", ["--user", "stop", unitName]);
  }
  mkdirSync(installation, { recursive: true, mode: 0o700 });
  writeFileSync(marker, "1\n", { mode: 0o600 });
  cpSync(join(hostRoot, "dist"), application, { recursive: true });
  const lock = JSON.parse(readFileSync(join(hostRoot, "package-lock.json"), "utf8"));
  const clientVersion = lock.packages["node_modules/@opencode/client"].version;
  writeFileSync(join(installation, "package.json"), `${JSON.stringify({
    name: "opencode-status-collector-runtime", private: true, type: "module",
    dependencies: { "@opencode/client": clientVersion },
  }, null, 2)}\n`, { mode: 0o600 });
  // Only the pure-JavaScript client is installed here, never serial/BLE dependencies.
  run("npm", ["install", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], {
    cwd: installation, stdio: "inherit",
  });
  mkdirSync(dirname(unit), { recursive: true, mode: 0o700 });
  writeFileSync(unit, collectorService({
    nodeExecutable: process.execPath,
    opencodeDirectory: dirname(opencode),
    applicationDirectory: application,
    outputFile: output,
  }), { mode: 0o600 });
  run("systemd-analyze", ["--user", "verify", unit]);
  run("systemctl", ["--user", "daemon-reload"]);
  run("systemctl", ["--user", "enable", "--now", unitName]);
  run("systemctl", ["--user", "is-active", unitName]);
  console.log(`WSL collector enabled for ${process.env.WSL_DISTRO_NAME}. It will start with this distribution.`);
  console.log(`Status: systemctl --user status ${unitName}`);
  console.log(`Logs: journalctl --user -u ${unitName} -n 30`);
} else {
  throw new Error("Run on Windows with --distribution <name>, or inside WSL with --output <path>");
}
