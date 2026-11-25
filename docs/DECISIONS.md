# Architecture decisions

This file records accepted technical decisions. New entries should include a
date, status, decision, and rationale.

## 2026-11-25 — Full PWM range and transport handover confirmation

**Status:** Accepted; 100% supersedes the 65% global output limit

Firmware 0.8.6 permits 255/255 PWM output on all six RGB channels. The host's
configured brightness and the 15% relative `RUNNING` limit remain unchanged;
the channel resistors must limit current safely at full duty.

Track the transport that completes `SYNC_COMPLETE`. A subsequent full sync on
the other transport replays the existing three blue flashes for 720 ms on both
eyes, then resumes status without restarting its animation timer. Ignore
standby handshakes/pings and same-transport resync for this indication. Keep
startup/demo sequences intact and clear transport history on watchdog expiry.

**Rationale:** The host already synchronizes on USB failback and BLE failover.
Using that signal confirms a working status transport without new protocol
commands, power-voltage heuristics, or treating BLE standby as active.

## 2026-11-23 — Windows-compatible automatic OpenCode service startup

**Status:** Accepted

Keep `Service.ensure()` as the hardware bridge's service lifecycle entrypoint.
Override only its Windows launch command with `ComSpec` (falling back to
`cmd.exe`) and `/d /s /c` followed by the fixed `opencode serve --service` command.
Do not interpolate user input or hard-code installation paths. Other platforms
retain the SDK default; the WSL collector still only discovers existing services.

**Rationale:** Node's direct process launch cannot resolve the npm-installed
Windows `.cmd` shim, while the command interpreter can. This preserves automatic
startup, SDK discovery/authentication, and healthy-service reuse without adding
a separate autostart service or requiring the user to start OpenCode first.

## 2026-11-17 — WSL collector with a local status-file relay

**Status:** Accepted

Keep hardware ownership in the Windows bridge and run a separate native Linux
collector as a lingering `systemd --user` service in each configured WSL
distribution. Relay only reduced state through atomically replaced, versioned
files in a per-user Windows directory. Merge sources with namespaced session IDs,
independent expiry, the existing priority order, and bounded `FINISHED` deadlines.
Do not configure Windows autostart as part of WSL setup.

**Rationale:** A service-owned collector can start independently of the manually
started Windows bridge. A local file avoids TCP exposure, changing WSL addresses,
cross-environment credentials, hardware forwarding, and launching stopped WSL
distributions for discovery. The collector reuses the tested OpenCode/state code
and discovers, but does not start, OpenCode. Node/OpenCode executable paths and
systemd units are generated locally, never committed.

## 2026-11-17 — Shared Windows and macOS host

**Status:** Accepted

The state model, OpenCode integration, USB serial path, transport coordination,
and device protocol are shared. The Go BLE helper uses WinRT on Windows and
CoreBluetooth on macOS, with a native binary built on each platform. USB remains
primary and BLE remains warm standby.

**Rationale:** Node.js, `serialport`, `@opencode/client`, and the Go BLE API are
cross-platform. Sharing behavior avoids a second state implementation.

## 2026-11-12 — Host is the authoritative state source

**Status:** Accepted

The host owns complete session and display state. Firmware only renders the
latest synchronized state. This lets the host recover the display after a
firmware restart without waiting for new OpenCode events.

## 2026-11-12 — Filtered discovery plus handshake

**Status:** Accepted

Serial devices are pre-filtered by metadata and accepted only after a versioned
handshake. BLE uses the equivalent name/service filter and handshake. VID/PID or
BLE advertising alone are not trusted identities.

## 2026-11-12 — Logical reset and line protocol

**Status:** Provisionally accepted

The host sends `RESET_STATE` followed by a complete snapshot rather than
requiring DTR/RTS reset. The prototype uses a versioned line-oriented text
protocol because it is easy to inspect and cheap to implement. Checksums or
binary framing may be reconsidered after the prototype.

## 2026-11-12 — Ports-and-adapters host

**Status:** Accepted

OpenCode input, state, orchestration, and outputs are separated by small
interfaces. The core imports neither the OpenCode SDK nor transport libraries,
allowing deterministic tests without services or hardware.

## 2026-11-12 — Privacy-minimized OpenCode events

**Status:** Accepted

Only event type, session ID, timestamp, and required request IDs enter the core
or normal output. Prompt, form, resource, provider, and file contents are
discarded at the adapter boundary to reduce accidental logging or transmission.

## 2026-11-12 — Interruption maps to idle

**Status:** Provisionally accepted

User interruption, shutdown, superseding, or inactivity maps to `IDLE`, not
`ERROR`, because interruption is not necessarily a technical failure.

## 2026-11-12 — Periodic snapshot reconciliation

**Status:** Accepted

The active snapshot is reloaded every five seconds by default. Only differences
emit internal events. This compensates for active-set changes that may not emit
a live event while avoiding log noise from unchanged results.

## 2026-11-16 — nice!nano-compatible nRF52840 and TinyGo

**Status:** Provisionally accepted

The PoC uses a nice!nano-v2-compatible Pro Micro nRF52840 and TinyGo's
`nicenano` target. It provides native USB, a validated UF2 bootloader, and BLE.
The first physical validation used the board LED before external RGB wiring.

## 2026-11-16 — Firmware discards stale host state

**Status:** Accepted

The host sends `PING` every five seconds. After 15 seconds without a valid status
command or ping, firmware discards the old state and shows the blue connection
pulse. A host crash must not leave `RUNNING` or `ERROR` displayed indefinitely.

## 2026-11-16 — USB primary with BLE warm standby

**Status:** Accepted; supersedes explicit single-transport default

Without special configuration, USB and BLE stay connected. USB is active while
BLE receives only keepalives. USB failure activates BLE with full sync; USB
reconnect synchronizes and takes priority again. `usb` and `bluetooth` modes
remain available for diagnostics.

## 2026-11-16 — Battery voltage through internal VDDH input

**Status:** Accepted for the tested board

The tested clone does not expose useful battery voltage through the expected
`P0.04` divider. `SUPPLY` therefore reads `VDDH/5` and applies the board-specific
factor `4230/4295`, calibrated against a multimeter. This provides coarse levels,
not precise state of charge, and may vary between boards.

## 2026-11-16 — Two independently wired RGB eyes

**Status:** Provisionally accepted

Two common-cathode RGB LEDs will initially mirror each other but reserve six
independent channels and six resistors. Final pins, resistors, and source drivers
depend on measured forward voltage and supply. The intended design point is
10 mA per channel; GPIOs should drive suitable output stages rather than supply
the final current directly.

## 2026-11-17 — Startup, connection, and status display

**Status:** Accepted

Firmware runs an RGB self-test, shows battery level, pulses blue while waiting
for a handshake, and confirms connection with three blue flashes. Host states
then use mixed-color running fade, yellow/green asking flashes, green finished
pulse, and green idle double flash. The internal red board LED remains off.

## 2026-11-17 — First RGB eye pin assignment

**Status:** Accepted for the prototype

The first common-cathode eye uses `D104`/`P1.04` for red, `D106`/`P1.06` for
green, and `D011`/`P0.11` for blue with separate resistors and non-inverted PWM.
The direct connection is a reduced-current test, not the final 10 mA circuit.

## 2026-11-17 — Global output limit

**Status:** Accepted; 65% supersedes the earlier 80% limit

Firmware 0.6.2 limits physical PWM output to 166/255 (about 65%) for every
startup, battery, connection, and status phase. The additional 15% relative
limit for `RUNNING` still applies.

## 2026-11-17 — Finalized prototype animation details

**Status:** Accepted

- Firmware 0.6.3 changed the 2.2-second RGB self-test to continuous
  red-to-yellow-to-green interpolation.
- `FINISHED` is held for no more than five seconds.
- Firmware 0.6.4 uses only warm pink (`255,48,112`), violet (`112,48,255`), and
  turquoise-green (`48,255,144`) control points for `RUNNING`.
- Firmware 0.6.5 renders the first idle flash at 20% relative brightness and the
  second at full logical brightness before the global limit.
