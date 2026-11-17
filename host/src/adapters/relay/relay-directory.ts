import { homedir } from "node:os";
import { join } from "node:path";

export function relayDirectory(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  home: string = homedir(),
): string | undefined {
  const override = env["OPENCODE_STATUS_RELAY_DIR"];
  if (override !== undefined) {
    if (override.trim() === "") {
      throw new Error("OPENCODE_STATUS_RELAY_DIR must not be empty");
    }
    return override;
  }
  return platform === "win32"
    ? join(env["LOCALAPPDATA"] ?? join(home, "AppData", "Local"), "OpenCodeStatus", "sources")
    : undefined;
}
