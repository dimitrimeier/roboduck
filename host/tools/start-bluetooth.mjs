import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const toolsRoot = dirname(fileURLToPath(import.meta.url));
const hostRoot = dirname(toolsRoot);
const helperName = process.platform === "win32"
  ? "opencode-status-ble.exe"
  : "opencode-status-ble";
const helperPath = process.env.OPENCODE_STATUS_BLE_HELPER ?? join(hostRoot, "bin", helperName);

if (!existsSync(helperPath)) {
  throw new Error("Bluetooth helper not found. Run 'npm run build:bluetooth' first.");
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const child = spawn(npm, ["run", "dev"], {
  env: { ...process.env, OPENCODE_STATUS_TRANSPORT: "bluetooth" },
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  if (signal !== null) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
