# Roadmap

## Phase 0 — Requirements and hardware

- [x] Select a microcontroller: nice!nano-compatible Pro Micro nRF52840.
- [ ] Finalize LED type and count.
- [ ] Decide between aggregate status and one LED per session for the MVP.
- [ ] Confirm the final color and animation scheme.
- [x] Inspect a sample device and record its USB metadata.

**Outcome:** agreed MVP hardware and display format.

## Phase 0.5 — Proof of concept

- [ ] Complete observation of the OpenCode API and all relevant events.
- [ ] Complete state derivation tests with edge cases and reordered events.
- [x] Test the serial protocol with a simulated device.
- [x] Test the microcontroller over USB without soldered external LEDs.
- [x] Complete an end-to-end path with a physical LED.
- [x] Test USB reconnect with full synchronization.
- [ ] Complete a run of at least two hours.
- [ ] Record the final go/no-go decision.

See [POC.md](POC.md) for details and acceptance criteria.

## Phase 1 — Device prototype

- [x] Create the firmware project.
- [x] Implement the `HELLO`/`DEVICE` handshake.
- [x] Implement reset, state, keepalive, and error responses.
- [x] Implement LED states and animations.
- [x] Create safe host-side device test tools.
- [x] Test unplug and reconnect.
- [ ] Test a changed COM port and a genuinely blocked port.

## Phase 2 — OpenCode integration

- [x] Structure the TypeScript host project.
- [x] Discover and authenticate to the local OpenCode service.
- [x] Load active sessions and subscribe to relevant events.
- [x] Implement the session state machine.
- [x] Fully resynchronize after reconnect.
- [x] Connect derived states to USB and BLE transports.

## Phase 3 — Reliability

- [x] Implement OpenCode reconnect with backoff.
- [x] Implement `PING`/`PONG` and transport timeouts.
- [ ] Test blocked and unrelated ports in realistic conditions.
- [ ] Test Windows lock, standby, and resume.
- [ ] Test behavior across OpenCode and firmware updates.
- [ ] Add bounded, structured, privacy-preserving logs.
- [ ] Complete a multi-hour USB-primary/BLE-backup test.

## Phase 4 — Installation and daily use

- [ ] Define a validated configuration file.
- [ ] Add optional startup integration.
- [ ] Evaluate an optional tray icon.
- [ ] Write build and installation instructions.
- [ ] Document the enclosure and final wiring.

## Later

- [ ] Display multiple sessions separately.
- [ ] Display subagents separately.
- [x] Prototype Bluetooth LE as an alternative transport.
- [ ] Evaluate an OLED, buttons, or additional output devices.
