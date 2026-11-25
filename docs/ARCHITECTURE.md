# Architecture

## Overview

```text
OpenCode background service
          │ HTTP API + live event stream
          ▼
Windows/macOS host bridge
  ├─ OpenCode adapter
  ├─ state management
  ├─ device discovery
  └─ shared protocol state
          │ USB CDC or Bluetooth LE/GATT
          ▼
Microcontroller firmware
  ├─ protocol parser
  ├─ connection watchdog
  └─ LED renderer
```

## Host bridge

The host starts as a normal background application. Startup integration or a
service can be considered after the prototype.

The implementation in `host/` follows a ports-and-adapters structure. The core
does not depend on OpenCode, USB, or BLE. The OpenCode adapter immediately
normalizes SDK events into minimal internal events. Console and device output
are separate adapters. USB and BLE share protocol and synchronization behavior.

By default, both transports run concurrently. USB is primary; BLE remains a
connected warm standby. Transport reconnect is independent of OpenCode
reconnect, and the most recent aggregate host state is always available for a
new full synchronization.

### OpenCode adapter

- Connects through `@opencode/client` to the local OpenCode service using its
  discovery and authentication mechanism.
- Reuses or automatically starts the shared background service with
  `Service.ensure()`. On Windows, the fixed `opencode serve --service` command
  runs through `ComSpec` (or `cmd.exe`) with AutoRun disabled, so npm `.cmd` shims
  work without a manually started TUI. Other platforms keep the SDK default.
- Loads current state at startup and after reconnect.
- Observes execution, idle, permission, form, and session lifecycle events.
- Reduces external data to event type, session ID, timestamp, and technically
  required request IDs.
- Periodically reconciles the active-session snapshot because not every change
  emits a live event.
- Emits internal `host.session.inactive` or `host.session.reconciled` events only
  when a difference exists.
- Preserves `FINISHED` until its timeout and then keeps the known session as
  `IDLE`; explicit deletion or archival still removes it.

The OpenCode event stream is live-only, so every reconnect requires a complete
snapshot. Some relevant endpoints are experimental and may require adaptation
after OpenCode updates.

### Native WSL collector

An optional WSL collector observes the separate native Linux service with the
same OpenCode adapter and state model. A lingering `systemd --user` service
starts the collector when its distribution boots. It only discovers an existing
OpenCode service; it does not start OpenCode just because WSL started.

The collector atomically replaces a versioned JSON file on the Windows
filesystem once per second. It contains only connection state, a heartbeat
timestamp, session IDs, derived statuses, and `FINISHED` deadlines. No OpenCode
credentials or content cross the boundary. The runtime has no serial or BLE
dependencies and never owns hardware.

The Windows bridge reads its per-user relay directory without invoking WSL or
opening network listeners. Each file is a distinct source; local and relayed
session IDs are namespaced before aggregation. Source snapshots, reconnects,
and expiry affect only that source. Files are size/schema checked, and missing,
invalid, disconnected, or ten-second-old sources are removed. A `FINISHED`
deadline expires even if the collector stops writing. Only the Windows bridge
sends the merged state to USB/BLE. Private standalone OpenCode servers are not
observed by the collector.

### State management

The host keeps one state per session and derives either aggregate state or
individual LED states. `FINISHED` is held for at most five seconds and then
becomes `IDLE`. Device connectivity does not own this state, allowing any newly
connected device to synchronize immediately.

### USB discovery

1. Enumerate ports at a moderate interval.
2. Select plausible candidates from USB metadata.
3. Open candidates one at a time and perform a bounded handshake.
4. Accept only the expected protocol identity.
5. Close on disconnect and resume discovery.

The tested TinyGo application identifies as VID/PID `239A:0029` with product
description `nice!nano`. The UF2 bootloader uses `239A:00B3` and is not a status
device candidate. Metadata is never sufficient by itself; the
`HELLO 1`/`DEVICE OPENCODE_STATUS` handshake is mandatory.

The bridge must not blindly open every serial port because doing so can disturb
unrelated devices. Port names such as `COM6` or `/dev/cu.usbmodem...` are
discovered dynamically and never configured in source code.

### BLE discovery and failover

A Go helper uses WinRT on Windows and CoreBluetooth on macOS. It filters by the
local name `OCStatus` and project service
`78B13697-8A60-4161-A989-69661675E94A`, discovers the address dynamically,
subscribes to notifications, and exchanges line-oriented requests with the Node
host through local JSON Lines. The protocol handshake remains mandatory.

The Node host selects `.exe` on Windows and an extensionless binary on macOS.
The macOS helper must be built natively because its CoreBluetooth bindings do
not support cross-compilation from Windows.

In `both` mode, each transport independently performs discovery, handshake,
keepalive, and reconnect. Only USB sends status commands while available. On USB
disconnect, the coordinator activates BLE and performs a full synchronization.
After USB reconnect and synchronization, USB becomes active again and BLE
returns to standby. Diagnostic modes `usb` and `bluetooth` remain available.

Firmware tracks the source of valid `SYNC_COMPLETE` commands. A completed sync
on a different active transport replays the three blue connection flashes;
standby handshakes and keepalives do not change the active source. The initial
sync uses the existing startup confirmation, and watchdog expiry clears
transport history. Cable insertion/removal is confirmed by the host's actual
failback/failover, not inferred from battery voltage or USB power alone.

## Device protocol

USB and BLE use the same versioned, line-oriented text protocol. BLE fragments
long lines into GATT packets transparently.

```text
HOST -> HELLO 1
MCU  -> DEVICE OPENCODE_STATUS protocol=1 firmware=0.8.6 leds=1
HOST -> RESET_STATE
MCU  -> OK
HOST -> BRIGHTNESS 128
MCU  -> OK
HOST -> SET 0 RUNNING
MCU  -> OK
HOST -> SYNC_COMPLETE
MCU  -> OK
```

Supported commands:

```text
HELLO <protocol-version>
RESET_STATE
SET <led-index> <state>
BRIGHTNESS <0-255>
SYNC_COMPLETE
PING
BATTERY
SUPPLY
DISPLAY
DISPLAY_DEMO
```

Supported responses:

```text
DEVICE OPENCODE_STATUS protocol=<n> firmware=<version> leds=<count>
OK
PONG
BATTERY raw=<n> adc_mv=<n> source_mv=<n>
SUPPLY raw=<n> adc_mv=<n> supply_mv=<n>
DISPLAY phase=<phase> battery=<level> supply_mv=<n> left_rgb=<r>,<g>,<b> right_rgb=<r>,<g>,<b>
ERROR <code>
```

`BATTERY` diagnoses the original nice!nano divider expected on `P0.04`; it does
not represent battery voltage on the tested clone. `SUPPLY` uses the nRF52840
internal `VDDH/5` input and applies the measured board-specific calibration
factor `4230/4295`.

Unknown commands must never receive a success response. The firmware limits
line length and applies bounded timeouts.

## Display pipeline

Before rendering host state, the non-blocking firmware renderer runs a
red-yellow-green self-test, battery indication, blue connection pulse, and
connection confirmation flashes. `DISPLAY` exposes both rendered RGB values for
diagnostics; `DISPLAY_DEMO` safely replays the phases.

The left common-cathode RGB eye uses `PWM0` on `D104`/`P1.04` (red),
`D106`/`P1.06` (green), and `D011`/`P0.11` (blue). The right eye uses `PWM1` on
`D115`/`P1.15` (red), `D113`/`P1.13` (green), and `D111`/`P1.11` (blue). Both
cathodes connect to GND. `RUNNING` keeps its color gradient and adds opposing
per-eye brightness modulation. `ASKING` alternates red/off between the eyes
every 500 ms. Other phases remain mirrored. The internal red LED is disabled.

The host remains authoritative for the logical `FINISHED` timeout. The firmware
renders three 1.6-second green pulses, then reuses the normal `IDLE` renderer,
starting with its three-second dark pause. A subsequent host transition to
`IDLE` preserves that pause. Transport confirmation flashes temporarily replace
the status display for 720 ms without restarting its animation timer.

Color, configured brightness, and a fixed global output limit are multiplied
before PWM output. Firmware 0.8.6 raises the global limit from approximately
65% to 100%. Host brightness and the 15% relative `RUNNING` limit remain in
effect. Resistors remain the electrical current limit at full PWM duty.

## Reset and recovery

`RESET_STATE` is a logical display reset. DTR/RTS hardware reset is not a shared
requirement. If opening a port resets a board, the host allows its boot phase to
finish before handshaking.

- USB/BLE error: close, discard the connection, and resume discovery.
- USB failure with BLE available: activate BLE and fully synchronize.
- USB reconnect: synchronize USB and select it as primary again.
- Missing `PONG`: treat the transport as disconnected.
- No host activity for 15 seconds: discard stale state and return to the blue
  connection pulse.
- OpenCode stream ends: reconnect with backoff and reload the snapshot.
- Host or firmware restart: repeat handshake and full synchronization.

## Security and privacy boundaries

- Only abstract status values are sent over USB and BLE, never prompts or file
  contents.
- Local OpenCode authentication is used; credentials are not hard-coded.
- Unrelated serial devices are neither persistently opened nor written to.
- BLE candidates are filtered by name and service before handshake.
- BLE is currently unpaired and unencrypted. The handshake identifies the
  protocol device but is not cryptographic authentication.
