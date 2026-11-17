# Progress

Last updated: 2026-11-17

## Current status

**Phase:** Proof of concept / PoC 1–5 validation

The host core, OpenCode integration, and privacy-minimized console output are
implemented. Firmware and host adapters work with the physical
nice!nano-v2-compatible Pro Micro nRF52840 board over USB CDC and Bluetooth LE.
Metadata/service filtering, mandatory handshake, full synchronization, and real
OpenCode end-to-end runs have succeeded over both transports.

The default mode keeps USB active and BLE connected as warm standby. Controlled
failover and failback, physical USB reconnect, and the firmware watchdog have
been validated on Windows. macOS support uses `serialport` and the same Go BLE
helper through CoreBluetooth; native macOS build, automated tests, and physical
hardware validation remain pending.

Firmware 0.6.5 drives the first external RGB eye using hardware PWM. The startup
self-test, supply indication, connection sequence, mixed-color running fade,
asking flashes, finished pulse, and idle double flash have been visually tested.

## Completed

- [x] Evaluated feasibility using the OpenCode API and live event stream.
- [x] Defined host → USB/BLE → microcontroller architecture.
- [x] Implemented a testable ports-and-adapters host structure.
- [x] Loaded active sessions, open forms, and permissions at startup.
- [x] Normalized events without retaining prompt or file contents.
- [x] Implemented aggregate priority and time-limited `FINISHED` state.
- [x] Added reconnect with exponential backoff and periodic snapshot
  reconciliation.
- [x] Added privacy-minimized JSON Lines diagnostics.
- [x] Implemented USB metadata filtering and mandatory handshake.
- [x] Implemented reset, full sync, incremental state, keepalive, and reconnect.
- [x] Built and flashed TinyGo firmware and validated the protocol physically.
- [x] Completed real OpenCode-to-LED end-to-end tests.
- [x] Implemented the 15-second firmware watchdog.
- [x] Implemented BLE GATT firmware and the WinRT/CoreBluetooth Go helper.
- [x] Validated USB-primary/BLE-standby failover and failback.
- [x] Measured supply voltage through `VDDH/5` and calibrated the tested board.
- [x] Added non-blocking startup, battery, connection, and RGB status sequences.
- [x] Connected and tested the first common-cathode RGB eye with hardware PWM.
- [x] Added platform-neutral BLE helper build/start scripts for macOS support.
- [x] Converted all repository documentation to English.
- [x] Expanded ignore rules and added public contribution/security guidance.
- [x] Added GitHub Actions checks for the host and BLE helper.
- [x] Scanned tracked content for common credentials and local absolute paths.

## Next steps

1. Define battery percentage thresholds and hysteresis from a measured discharge
   curve.
2. Test a real USB cable failure while BLE standby remains battery-powered.
3. Fully observe `IDLE` and `OFF` in normal end-to-end operation.
4. Test changing COM port names and a genuinely blocked port.
5. Complete additional edge-case and event-ordering tests.
6. Complete at least a two-hour primary/backup endurance test.
7. Measure RGB LED forward voltages and finalize six resistors, PWM pins, and
   source drivers for 10 mA per channel.
8. Build and test USB, BLE-only, failover, and failback on physical macOS
   hardware.

## Open questions

- What are the forward voltages of all six RGB channels?
- Which supply, pins, resistors, and source drivers should be used for the final
  independently controlled eyes?
- Should the MVP show one aggregate status or one LED per session?
- Should permission requests have a separate color from `ASKING`?
- Should BLE eventually require pairing and encrypted characteristics?

## Work log

Keep new entries brief. Detailed technical behavior belongs in the relevant
document.

### 2026-11-17 — Prepared repository for public GitHub hosting

- Converted root, host, firmware, planning, progress, and agent documentation to
  English.
- Added public contribution and security guidance, repository text attributes,
  and continuous integration.
- Extended ignore rules for credentials, local configuration, generated output,
  coverage, editor files, and platform artifacts.
- Scanned tracked files for common secret formats and absolute user paths; none
  were found.
- Selected no software license for now and documented the resulting all-rights-
  reserved status.
- Rewrote existing Git author metadata to the public identity
  `mcmuffin <mcmuffin@users.noreply.github.com>` before publication.

### 2026-11-17 — Ported host to macOS

- Replaced PowerShell-only BLE build/start dependencies with platform-neutral
  Node scripts.
- Selected `.exe` on Windows and an extensionless native helper on macOS.
- Kept name/service filters, handshake, full sync, keepalive, and reconnect
  unchanged through CoreBluetooth.
- Passed 44 host tests, type checking, TypeScript build, Go tests, and native
  Windows helper build.
- Native macOS build and hardware testing remain open.

### 2026-11-16 — Physical USB and BLE proof of concept

- Identified the nRF52840 board by USB/UF2 metadata.
- Built and flashed USB CDC firmware and validated all protocol commands.
- Added safe USB discovery, full sync, keepalive, reconnect, and watchdog.
- Added the project BLE GATT service and validated Windows BLE end to end.
- Confirmed USB active/BLE standby, failover, failback, and USB reconnect.
- Confirmed no fixed COM port or BLE address is required.

### 2026-11-16 — Supply measurement and RGB prototype

- Determined that `P0.04` does not expose useful battery voltage on the tested
  clone.
- Validated internal `VDDH/5` measurement and calibrated it against 4.230 V.
- Added startup, supply, connection, and status render phases plus diagnostics.
- Connected the first RGB eye and progressively refined brightness and colors
  through firmware 0.6.5.

### 2026-11-12 — Host core and OpenCode integration

- Implemented the state model, start snapshot, event normalization, reconnect,
  periodic reconciliation, and JSON Lines output.
- Confirmed a real local OpenCode connection and session snapshot.
- Found that session inactivity may lack a live event, motivating periodic
  active-snapshot reconciliation.
