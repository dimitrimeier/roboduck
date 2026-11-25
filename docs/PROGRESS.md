# Progress

Last updated: 2026-11-25

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

Firmware 0.8.6 builds on the deployed 0.8.5 two-eye firmware: six independent
PWM channels, opposing `RUNNING` brightness, alternating red `ASKING`, and
three-pulse `FINISHED`. It raises the global output cap to 100% and replays the
blue connection flashes on successful USB/BLE handovers. Host brightness and
relative animation dimming remain unchanged. Firmware 0.8.6 was built and
successfully flashed after USB metadata, application handshake, and UF2
Board-ID validation. The updated version handshake and USB protocol tests
passed. Visual animation and real USB/BLE handover validation of 0.8.6 remain
pending.

An optional native WSL collector now starts as a lingering systemd user service
and relays reduced session state to the manually started Windows bridge through
local files. Hardware remains owned exclusively by Windows. The user confirmed
that the native WSL setup works with the display. A full distribution restart
and explicit simultaneous-source priority/recovery tests remain pending.

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
- [x] Added independent Windows/WSL aggregation, bounded local relays, and WSL
  collector installation with systemd boot autostart.
- [x] Documented the additional WSL installation separately, including
  prerequisites, service autostart, verification, maintenance, and troubleshooting.
- [x] Fixed automatic OpenCode service startup through Windows npm CLI shims.
- [x] Raised the global firmware PWM cap from 65% to 100%.
- [x] Added transport-aware blue confirmation after full sync on a new source.
- [x] Flashed firmware 0.8.6 and verified its version and USB protocol on hardware.
- [x] Reserved `D115`, `D113`, and `D111` on `PWM1` for the independently wired
  second RGB eye.
- [x] Added mirrored second-eye output through `PWM1` in firmware 0.7.0.
- [x] Added alternating yellow per-eye `ASKING` output in firmware 0.8.0.
- [x] Added an opposing per-eye `RUNNING` brightness pulse in firmware 0.8.1.
- [x] Limited `FINISHED` to three pulses before the idle pattern in firmware
  0.8.2.
- [x] Replaced the green/off `ASKING` counterpart with red in firmware 0.8.3.
- [x] Corrected `ASKING` to a fixed-color alternating blink in firmware 0.8.4.
- [x] Changed `ASKING` to alternate red on both eyes in firmware 0.8.5.

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
9. Validate WSL collector startup after a normal distribution restart and
   explicit simultaneous native Windows/WSL priority and recovery scenarios.

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

### 2026-11-25 — Public documentation hygiene

- Kept public documentation focused on project behavior and reproducible
  validation results.
- Strengthened contributor and agent guidance for environment-neutral progress
  entries and troubleshooting examples.

### 2026-11-25 — Successfully flashed firmware 0.8.6

- Built the 184,320-byte UF2 with TinyGo 0.44.0 and Go 1.27.4.
- Identified the application through USB metadata and its 0.8.5 handshake before
  requesting the 1200-baud bootloader reset. Verified bootloader VID/PID,
  matching UF2 disk metadata, and `nRF52840-nicenano` Board-ID before copying.
- Uploaded successfully while preserving the existing UF2 bootloader.
- Confirmed the 0.8.6 handshake and passed `Test-StatusLight.ps1`, including
  diagnostics, invalid-command rejection, all status commands, and keepalive.
- Did not start the host bridge. Visual animation, maximum-output electrical,
  and real USB/BLE handover validation remain open.

### 2026-11-25 — Full brightness range and handover confirmation

- Verified that the attached board runs firmware 0.8.5 with two RGB eyes.
- Raised the global PWM cap to 255/255 without changing configured host
  brightness or relative status dimming.
- Track completed USB/BLE full syncs and replay three blue flashes on handover,
  without standby-triggered flashes or restarting the status animation timer.
- Passed all three hardware-independent transport-selection tests, all 67 host
  tests, and host type checking. Built the 184,320-byte UF2 with TinyGo 0.44.0
  and Go 1.27.4; the build output is ignored by Git.
- Firmware upload and real USB/BLE handover validation remain pending.

### 2026-11-23 — Fixed automatic Windows OpenCode startup

- Kept SDK service discovery, authentication, and automatic startup, but use the
  fixed service command through `ComSpec`/`cmd.exe` with AutoRun disabled on
  Windows. macOS/Linux defaults and the discovery-only WSL collector are unchanged.
- Added allowlisted nested system error codes to connection diagnostics without
  printing cause messages, credentials, paths, or arbitrary code values.
- Added platform-option and diagnostic tests plus an isolated Windows cold-start,
  reuse, and recovery test with a fake npm `.cmd` shim in a path containing spaces.
  No real OpenCode service or hardware is stopped or accessed by these tests.
- Passed 67 tests, type checking, and build. The updated default adapter also
  connected to the existing live service and read its event stream/snapshot
  without hardware access or restarting OpenCode. A full real-service cold start
  and native macOS validation remain pending.

### 2026-11-23 — Diagnosed Windows OpenCode cold-start failure

- Traced `Failed to start server` to the default `Service.ensure()` call in
  `@opencode/client` 2.2.7. With this npm-installed Windows CLI, Node's direct
  `spawn("opencode", ...)` fails with `ENOENT`; version queries through `cmd.exe`
  and the native executable both succeed.
- The current OpenCode 2.3.0 service started after the reported failures.
  Read-only discovery, authenticated API health, and an adapter event-stream/
  snapshot smoke test against that existing service succeeded. No hardware was
  accessed and the service was not stopped or restarted during diagnosis.
- Proposed a Windows-aware launch command while preserving macOS behavior and
  automatic startup, plus privacy-safe cause codes and startup regression tests.
  Discovery-only behavior, as used by the WSL collector, is an alternative if
  automatic startup is not desired. No runtime code was changed.

### 2026-11-18 — Red-only ASKING blink

- Replaced the second eye's yellow/green appearance with red during `ASKING`.
- Kept the 500 ms alternating blink and switched the inactive eye off.
- Built and flashed firmware 0.8.5, confirmed its USB handshake, and verified
  both red/off half-cycles through separate left/right RGB diagnostics.
- Restarted the host bridge; physical visual validation remains open.

### 2026-11-18 — Corrected ASKING blink

- Assigned red permanently to the first eye and yellow to the second eye during
  `ASKING`.
- Alternated the active eye every 500 ms and switched the inactive eye off.
- Built and flashed firmware 0.8.4, confirmed its USB handshake, and verified
  both ASKING half-cycles through separate left/right RGB diagnostics.
- Restarted the host bridge; physical visual validation remains open.

### 2026-11-18 — Yellow/red ASKING swap

- Changed `ASKING` to show yellow on one eye and red on the other.
- Reversed the two colors every 500 ms without changing the one-second cycle.
- Built and flashed firmware 0.8.3, confirmed its USB handshake, and restarted
  the host bridge. Physical visual validation remains open.

### 2026-11-18 — Three-pulse FINISHED animation

- Kept the existing 1.6-second green pulse and limited `FINISHED` to three full
  cycles.
- Reused the idle renderer after 4.8 seconds, with its three-second pause first,
  while leaving logical state ownership with the host.
- Preserved the running idle pause when the host subsequently confirms the
  logical transition to `IDLE`.
- Built and flashed firmware 0.8.2, confirmed its USB handshake, and restarted
  the host bridge. Physical visual validation remains open.

### 2026-11-18 — Per-eye RUNNING brightness pulse

- Preserved the existing 4.8-second RUNNING color gradient.
- Added an eased opposing brightness pulse over the same cycle, ranging from 20%
  to 100% of the existing RUNNING level on each eye.
- Built and flashed firmware 0.8.1, confirmed its USB handshake, and restarted
  the host bridge. Physical visual validation remains open.

### 2026-11-18 — Alternating ASKING pattern

- Changed `ASKING` to a continuous one-second cycle: left eye yellow for 500 ms,
  then right eye yellow for 500 ms.
- Kept all other display phases mirrored and extended `DISPLAY` diagnostics with
  separate left/right RGB values.
- Firmware build validation succeeded; physical visual validation remains open.

### 2026-11-18 — Reserved second RGB eye wiring

- Assigned `D115`/`P1.15` to red, `D113`/`P1.13` to green, and `D111`/`P1.11`
  to blue, with the common cathode on ground.
- Kept three separate resistors and reserved `PWM1` so both eyes remain
  independently controllable.
- The user soldered the second common-cathode RGB LED with matching resistors.
- Firmware 0.7.0 mirrors the first eye on `PWM1`; build, flash, handshake, full
  display diagnostic, and visual validation of identical output on both eyes
  succeeded on the physical board.

### 2026-11-17 — Documented the additional WSL installation

- The user confirmed the native WSL-to-display setup works after installation.
  This does not yet establish full restart or concurrent-source recovery coverage.
- Added `docs/WSL_SETUP.md` with clearly separated Windows/WSL commands,
  prerequisites, V2 migration and scoped npm script permissions, collector
  installation, autostart verification, VS Code terminal checks, and maintenance.
- Made the extra per-distribution installation visible in the root quick start
  and linked the dedicated guide from both READMEs. No runtime or service
  configuration was changed for this documentation update.

### 2026-11-17 — Added native WSL collection and user-service autostart

- Confirmed that PowerShell working in a `\\wsl.localhost\...` directory still
  runs Windows OpenCode; a native WSL installation needs a separate input.
- Added a collector using the existing adapter/store, a privacy-minimized atomic
  file relay, size/schema/age validation, source namespacing, independent source
  cleanup, and non-extendable `FINISHED` deadlines.
- Added a repeatable, guarded installer that deploys only the JavaScript client
  runtime and a systemd user unit. Enabled the Ubuntu collector with lingering;
  confirmed it is enabled/running and waits without starting OpenCode itself.
- Started the native V2 service for a connection smoke test. Confirmed a fresh
  connected relay and a read-only combined Windows/WSL snapshot without hardware
  access; reinstallation and collector stop/start also succeeded.
- Passed 60 host tests, type checking, and build. Windows autostart and firmware
  were not changed. Full WSL restart and physical combined-source tests remain
  pending; the already-running Windows bridge must be restarted to load changes.

### 2026-11-17 — Installed Go and validated Bluetooth on this Windows host

- Installed Go 1.27.4 with WinGet and successfully built the native BLE helper.
- Ran `go test ./...` successfully; the helper currently has no Go test files.
- A short default-mode run connected to OpenCode 2.3.0 and discovered the
  `OCStatus` board over BLE with firmware 0.6.5. Protocol verification and full
  synchronization succeeded, with BLE active and the host status `running`.
- Stopped the smoke test cleanly. No persistent bridge process or startup task
  was configured, and the generated helper remains ignored by Git.

### 2026-11-17 — Diagnosed startup on a fresh Windows checkout

- Installed the locked host dependencies and passed all 44 tests, type checking,
  and the TypeScript build with Node.js 24.
- Confirmed discovery, authentication, and a live session snapshot against the
  local OpenCode 2.3.0 service; USB-only startup also succeeded without Go.
- Reproduced the Bluetooth build failure because Go was unavailable and the
  default mode's repeated `ENOENT` errors because the helper had not been built.
- Found no supported application or UF2 bootloader USB device present during
  diagnosis; the unrelated Intel serial port was not opened. Physical LED and
  Bluetooth validation on this machine remain blocked by setup/hardware.
- Documented the Go prerequisite, Windows USB-only startup, and the distinction
  between OpenCode and device connection messages. No runtime code was changed.

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
