import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  enabledTransports,
  readTransportMode,
} from "../src/application/transport-mode.js";

describe("transport mode", () => {
  it("enables USB and Bluetooth by default", () => {
    const mode = readTransportMode(undefined);

    assert.equal(mode, "both");
    assert.deepEqual(enabledTransports(mode), ["usb", "bluetooth"]);
  });

  it("keeps single-transport diagnostic modes", () => {
    assert.deepEqual(enabledTransports(readTransportMode(" usb ")), ["usb"]);
    assert.deepEqual(enabledTransports(readTransportMode("BLUETOOTH")), ["bluetooth"]);
  });

  it("rejects unknown transport modes", () => {
    assert.throws(
      () => readTransportMode("serial"),
      /must be usb, bluetooth, or both/,
    );
  });
});
