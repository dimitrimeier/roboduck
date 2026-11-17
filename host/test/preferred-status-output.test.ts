import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PreferredStatusOutput,
  type ControllableStatusOutput,
} from "../src/application/preferred-status-output.js";
import type { StatusView } from "../src/core/model.js";
import type { StatusDeviceAvailabilityObserver } from "../src/application/status-device-output.js";

describe("PreferredStatusOutput", () => {
  it("uses the backup only while the primary is unavailable", () => {
    let primary: FakeControllableOutput | undefined;
    let backup: FakeControllableOutput | undefined;
    new PreferredStatusOutput(
      (observer) => {
        primary = new FakeControllableOutput(observer);
        return primary;
      },
      (observer) => {
        backup = new FakeControllableOutput(observer);
        return backup;
      },
    );

    assert.equal(primary?.active, false);
    assert.equal(backup?.active, false);

    backup?.becomeAvailable();
    assert.equal(primary?.active, false);
    assert.equal(backup?.active, true);

    primary?.becomeAvailable();
    assert.equal(primary?.active, true);
    assert.equal(backup?.active, false);

    primary?.becomeUnavailable();
    assert.equal(primary?.active, false);
    assert.equal(backup?.active, true);

    backup?.becomeUnavailable();
    assert.equal(primary?.active, false);
    assert.equal(backup?.active, false);
  });

  it("forwards every host status to primary and backup caches", () => {
    let primary: FakeControllableOutput | undefined;
    let backup: FakeControllableOutput | undefined;
    const output = new PreferredStatusOutput(
      (observer) => {
        primary = new FakeControllableOutput(observer);
        return primary;
      },
      (observer) => {
        backup = new FakeControllableOutput(observer);
        return backup;
      },
    );
    const view: StatusView = { overallStatus: "asking", sessions: [] };

    output.connected(view);

    assert.deepEqual(primary?.views, [view]);
    assert.deepEqual(backup?.views, [view]);
  });
});

class FakeControllableOutput implements ControllableStatusOutput {
  readonly views: StatusView[] = [];
  active = false;

  constructor(readonly availability: StatusDeviceAvailabilityObserver) {}

  becomeAvailable(): void {
    this.availability.connected();
  }

  becomeUnavailable(): void {
    this.availability.disconnected();
  }

  setActive(active: boolean): void {
    this.active = active;
  }

  connected(view: StatusView): void {
    this.views.push(view);
  }

  eventReceived(): void {}

  timerChanged(): void {}

  disconnected(): void {}

  async run(): Promise<void> {}
}
