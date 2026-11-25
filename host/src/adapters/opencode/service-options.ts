import type { EnsureOptions } from "@opencode/client/service";

export function openCodeServiceOptions(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): EnsureOptions {
  if (platform !== "win32") {
    return {};
  }

  // npm installs a .cmd shim on Windows, which Node cannot spawn directly.
  // Disable cmd AutoRun and keep the shell command fixed, without user input.
  return {
    command: [
      env["ComSpec"] || "cmd.exe",
      "/d",
      "/s",
      "/c",
      "opencode serve --service",
    ],
  };
}
