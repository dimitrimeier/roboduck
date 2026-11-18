# Features

## MVP requirements

### Observe OpenCode state

- Load active sessions at startup.
- Subscribe to live events from the local OpenCode service.
- Derive `RUNNING`, `ASKING`, `FINISHED`, `ERROR`, `IDLE`, and `OFF`.
- Treat permission requests and forms as `ASKING`.
- Reconnect and fully synchronize after a connection loss.

### Discover the USB device safely

- Periodically enumerate available serial ports.
- Pre-filter candidates by USB metadata such as VID, PID, product name, and
  serial number.
- Accept a device only after a successful protocol handshake.
- Tolerate changing COM port names and reconnect without restarting the host.
- Safely skip blocked and unrelated ports.

### Synchronize state

- Send `RESET_STATE` after connecting.
- Always follow it with the complete current state.
- Send subsequent changes incrementally.
- Monitor the connection with `PING`/`PONG`.
- Keep the host as the authoritative state source.

### LED display

- Two RGB eyes mirror each other except for the alternating `ASKING` pattern.
- Separate PWM channels allow independent rendering where a pattern requires it.
- Startup: a 2.2-second red-to-yellow-to-green fade, 500 ms off, 1.5 seconds of
  battery color, and one second off.
- USB power prevents battery measurement on the tested board, so yellow means
  “unknown” in that case.
- Until host handshake: blue pulse; after handshake: three short blue flashes.
- `RUNNING`: warm pink, violet, and turquoise-green fade at 15% relative
  brightness, with brightness transferring smoothly between the eyes over a
  4.8-second cycle. The dimmer eye remains at least 20% of that level.
- `ASKING`: the first eye blinks red for 500 ms, followed by the second eye in
  red for 500 ms; the inactive eye remains off.
- `FINISHED`: exactly three green pulses over 4.8 seconds, followed by the
  unchanged `IDLE` double-flash pattern.
- `IDLE`: a three-second pause, one short green flash at 20%, then one at full
  globally limited brightness.
- The internal red board LED remains disabled.

Aggregate status priority:

```text
ERROR > ASKING > RUNNING > FINISHED > IDLE > OFF
```

## After the MVP

- Configurable colors, brightness, and animations.
- Aggregate status or one LED per session.
- Stable session-to-LED assignment.
- Separate indications for questions and permission requests.
- Windows startup integration and an optional tray icon.
- Validated local configuration file and privacy-preserving diagnostics.
- Battery percentages based on a measured discharge curve with hysteresis.

## Possible later features

- Separate subagent display.
- Sound, acknowledgement button, or OLED display.
- Firmware update support.
- Multiple display devices.

## Outside the first MVP

- Answering or controlling OpenCode requests from the microcontroller.
- Cloud connectivity.
- Storing prompts or session content on the microcontroller.
- A full Windows service installation before the prototype is validated.
