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

- Two RGB eyes are planned and initially mirror each other.
- Wiring should allow independent control later.
- Startup: a 2.2-second red-to-yellow-to-green fade, 500 ms off, 1.5 seconds of
  battery color, and one second off.
- USB power prevents battery measurement on the tested board, so yellow means
  “unknown” in that case.
- Until host handshake: blue pulse; after handshake: three short blue flashes.
- `RUNNING`: warm pink, violet, and turquoise-green fade at 15% relative
  brightness; pure primary colors are avoided.
- `ASKING`: yellow and green double flash.
- `FINISHED`: green pulse for at most five seconds before `IDLE`.
- `IDLE`: one short green flash at 20%, one at full globally limited brightness,
  then a three-second pause.
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
