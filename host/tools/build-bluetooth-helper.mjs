import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "win32" && process.platform !== "darwin") {
  throw new Error(`Bluetooth helper builds are not supported on ${process.platform}`);
}

const toolsRoot = dirname(fileURLToPath(import.meta.url));
const hostRoot = dirname(toolsRoot);
const helperRoot = join(hostRoot, "ble-helper");
const outputName = process.platform === "win32"
  ? "opencode-status-ble.exe"
  : "opencode-status-ble";
const outputPath = join(hostRoot, "bin", outputName);

mkdirSync(dirname(outputPath), { recursive: true });

const result = spawnSync(process.env.GO ?? "go", ["build", "-o", outputPath, "."], {
  cwd: helperRoot,
  stdio: "inherit",
});

if (result.error !== undefined) {
  throw new Error(
    "Go was not found. Install Go 1.25 or newer and, on macOS, the Xcode Command Line Tools.",
    { cause: result.error },
  );
}
if (result.status !== 0) {
  throw new Error(`Bluetooth helper build failed with exit code ${String(result.status)}`);
}

console.log(`Bluetooth helper built: ${outputPath}`);
