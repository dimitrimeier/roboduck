# Architecture decisions

This file records accepted technical decisions. New entries should include a
date, status, decision, and rationale.

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

Two common-cathode RGB LEDs reserve six independent channels and six resistors.
They normally mirror each other, but status patterns may control them separately.
Final pins, resistors, and source drivers depend on measured forward voltage and
supply. The intended design point is 10 mA per channel; GPIOs should drive
suitable output stages rather than supply the final current directly.

## 2026-11-17 — Startup, connection, and status display

**Status:** Accepted

Firmware runs an RGB self-test, shows battery level, pulses blue while waiting
for a handshake, and confirms connection with three blue flashes. Host states
then use mixed-color running fade, alternating yellow asking flashes, green
finished pulse, and green idle double flash. The internal red board LED remains
off.

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

## 2026-11-18 — Second RGB eye pin assignment

**Status:** Implemented for the reduced-current prototype

The second common-cathode eye uses `D115`/`P1.15` for red, `D113`/`P1.13` for
green, and `D111`/`P1.11` for blue. Each channel keeps its own resistor and the
common cathode connects to ground. The three pins are reserved for `PWM1`,
leaving both eyes electrically independent even while firmware mirrors them.

These pins avoid the battery ADC, VCC control, internal LED, and the board's
default UART, I²C, SPI, and NFC assignments. Direct GPIO wiring remains only a
reduced-current prototype; the final 10 mA design still requires source drivers.

Firmware 0.7.0 configures the right eye on `PWM1` and mirrors the logical RGB
value already sent to the left eye on `PWM0`. The protocol continues to report
`leds=1` because independent per-eye commands are intentionally deferred.

## 2026-11-18 — Alternating ASKING pattern

**Status:** Implemented

Firmware 0.8.0 uses the independent PWM outputs for `ASKING`: the left eye is
yellow for 500 ms, followed by the right eye for 500 ms, in a continuous cycle.
Other states remain mirrored. The protocol still exposes one aggregate display,
while `DISPLAY` reports separate `left_rgb` and `right_rgb` diagnostic values.

## 2026-11-18 — Opposing RUNNING brightness pulse

**Status:** Implemented

Firmware 0.8.1 preserves the existing 4.8-second pink-violet-turquoise color
gradient and adds an eased brightness transfer between the two eyes over the
same period. One eye moves from full RUNNING brightness to 20% while the other
moves from 20% to full brightness, then the direction reverses. The 15% relative
RUNNING output limit remains in effect before this per-eye modulation.

## 2026-11-18 — Three-pulse FINISHED animation

**Status:** Implemented

Firmware 0.8.2 limits `FINISHED` rendering to exactly three unchanged green
1.6-second pulses. After 4.8 seconds it delegates to the existing `IDLE`
double-flash renderer without changing the logical state; the host remains the
authoritative source and still sends the subsequent state transition.

The idle cycle begins with its three-second dark pause before showing the two
existing 120 ms green flashes. This ensures the third finished pulse is followed
by a clear pause rather than an immediate idle flash. When the host subsequently
sends `IDLE`, firmware preserves the progress of that pause instead of restarting
the visual cycle.

## 2026-11-18 — Yellow/red ASKING swap

**Status:** Implemented

Firmware 0.8.3 replaces the non-yellow `ASKING` eye with red. For the first
500 ms the left eye is yellow and the right eye red; for the next 500 ms the
colors are reversed. This repeats as a continuous one-second cycle.

## 2026-11-18 — Fixed-color alternating ASKING blink

**Status:** Implemented; supersedes the 0.8.3 color swap

Firmware 0.8.4 assigns a fixed color to each eye during `ASKING`: the first eye
is red and the second eye is yellow. Only one eye is active at a time, alternating
every 500 ms in a continuous one-second cycle.

## 2026-11-18 — Red-only alternating ASKING blink

**Status:** Implemented; supersedes the 0.8.4 color assignment

Firmware 0.8.5 renders both eyes red during their respective `ASKING` half-cycle.
Only one eye remains active at a time, alternating every 500 ms.
