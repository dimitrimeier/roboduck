export const COLLECTOR_SERVICE_MARKER = "# Managed by roboduck install-wsl-collector.mjs";

export interface CollectorServiceOptions {
  readonly nodeExecutable: string;
  readonly opencodeDirectory: string;
  readonly applicationDirectory: string;
  readonly outputFile: string;
}

export function collectorService(options: CollectorServiceOptions): string {
  const nodeDirectory = options.nodeExecutable.slice(0, options.nodeExecutable.lastIndexOf("/"));
  const path = [...new Set([
    nodeDirectory, options.opencodeDirectory, "/usr/local/bin", "/usr/bin", "/bin",
  ])].join(":");
  return `${COLLECTOR_SERVICE_MARKER}
[Unit]
Description=OpenCode status collector for WSL
StartLimitIntervalSec=0

[Service]
Type=simple
WorkingDirectory=%h
ExecStart=${quote(options.nodeExecutable, true)} ${quote(`${options.applicationDirectory}/collector.js`, true)} ${quote(options.outputFile, true)}
Environment=${quote(`PATH=${path}`)}
Restart=on-failure
RestartSec=3
TimeoutStopSec=10
UMask=0077
NoNewPrivileges=true

[Install]
WantedBy=default.target
`;
}

function quote(value: string, command = false): string {
  if (/[\x00-\x1f\x7f]/.test(value)) {
    throw new Error("Service paths must not contain control characters");
  }
  const escaped = value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("%", "%%");
  return `"${command ? escaped.replaceAll("$", () => "$$") : escaped}"`;
}
