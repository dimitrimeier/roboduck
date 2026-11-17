import { StatusMonitor } from "./application/status-monitor.js";
import { ConsoleReporter } from "./adapters/console/console-reporter.js";
import { OpenCodeStatusSource } from "./adapters/opencode/open-code-source.js";
import { StatusStore } from "./core/status-store.js";

const abortController = new AbortController();

process.once("SIGINT", () => abortController.abort());
process.once("SIGTERM", () => abortController.abort());

const finishedHoldMs = readNonNegativeNumber(
  process.env["OPENCODE_STATUS_FINISHED_HOLD_MS"],
  60_000,
);
const pollIntervalMs = readPositiveNumber(
  process.env["OPENCODE_STATUS_POLL_INTERVAL_MS"],
  5_000,
);

const monitor = new StatusMonitor(
  new OpenCodeStatusSource(),
  new StatusStore({ finishedHoldMs }),
  new ConsoleReporter(),
  { pollIntervalMs },
);

await monitor.run(abortController.signal);

function readNonNegativeNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("OPENCODE_STATUS_FINISHED_HOLD_MS must be a non-negative number");
  }

  return parsed;
}

function readPositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = readNonNegativeNumber(value, fallback);
  if (parsed === 0) {
    throw new Error("OPENCODE_STATUS_POLL_INTERVAL_MS must be greater than zero");
  }
  return parsed;
}
