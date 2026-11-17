import type { DisplayStatus } from "./model.js";

const STATUS_PRIORITY: Readonly<Record<DisplayStatus, number>> = {
  off: 0,
  idle: 1,
  finished: 2,
  running: 3,
  asking: 4,
  error: 5,
};

export function aggregateStatus(statuses: Iterable<DisplayStatus>): DisplayStatus {
  let overallStatus: DisplayStatus = "off";
  for (const status of statuses) {
    if (STATUS_PRIORITY[status] > STATUS_PRIORITY[overallStatus]) {
      overallStatus = status;
    }
  }
  return overallStatus;
}
