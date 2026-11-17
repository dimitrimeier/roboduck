import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defaultBluetoothHelperPath } from "../src/adapters/bluetooth/go-bluetooth-transport.js";

describe("GoBluetoothTransport", () => {
  it("selects the Windows helper executable", () => {
    assert.match(defaultBluetoothHelperPath("win32"), /opencode-status-ble\.exe$/);
  });

  it("selects the extensionless macOS helper executable", () => {
    assert.match(defaultBluetoothHelperPath("darwin"), /opencode-status-ble$/);
  });

  it("rejects platforms without a supported native BLE backend", () => {
    assert.throws(() => defaultBluetoothHelperPath("linux"), /not supported/);
  });
});
