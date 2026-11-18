# OpenCode Status Light

An external LED status display for OpenCode sessions on Windows and macOS. A
local host bridge observes OpenCode, discovers the microcontroller over USB
serial or Bluetooth Low Energy, and sends the current aggregate state to its
LEDs.

> [!IMPORTANT]
> This project is an active hardware proof of concept. Interfaces, wiring, and
> behavior may still change. No license has been selected yet; all rights are
> reserved unless a license is added later.

## What it shows

The display indicates whether OpenCode agents are working, waiting for input,
finished, idle, reporting an error, or whether no relevant session is known.

```text
ERROR > ASKING > RUNNING > FINISHED > IDLE > OFF
```

## Components

- **Windows/macOS host bridge:** reads OpenCode events and owns the complete
  display state.
- **USB/BLE transport:** discovers devices, verifies them with a protocol
  handshake, reconnects, and performs full synchronization.
- **Microcontroller firmware:** renders the state on an nRF52840-based board.
- **Documentation:** records features, architecture, decisions, and progress.

## Current status

Firmware 0.7.0 runs on a nice!nano-v2-compatible Pro Micro nRF52840 board and
supports USB CDC and Bluetooth LE. By default, USB is the active primary
transport while BLE remains connected as a warm standby. Candidates are
filtered by USB metadata or the project-specific BLE service and are always
verified with the protocol handshake before receiving status commands.

End-to-end operation, USB reconnect, firmware watchdog behavior, and controlled
failover to BLE and failback to USB have been tested on Windows. The host also
supports macOS through `serialport` and CoreBluetooth, but a native macOS build
and hardware test are still pending.

Two external common-cathode RGB eyes are driven by six separate hardware PWM
channels and currently mirror one logical display. Startup, battery, connection,
and OpenCode states use non-blocking fades, blinks, and pulses. The internal red
board LED is disabled.

## Quick start

Requirements: Node.js 22 or newer, OpenCode V2 with its local background
service, and the supported board flashed with this repository's firmware.

```sh
cd host
npm install
npm run build:bluetooth
npm run dev
```

See [host/README.md](host/README.md) for host setup and
[firmware/README.md](firmware/README.md) for building, flashing, and wiring.

## Documentation

- [Features](docs/FEATURES.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Proof-of-concept plan](docs/POC.md)
- [Progress](docs/PROGRESS.md)
- [Architecture decisions](docs/DECISIONS.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

## Repository layout

```text
host/       Windows/macOS host bridge and automated tests
firmware/   Microcontroller firmware and hardware test tools
docs/       Planning and project documentation
```

## Technology

- TypeScript and Node.js
- `@opencode/client` for the OpenCode API and event stream
- `serialport` for USB serial
- A Go BLE helper using WinRT on Windows and CoreBluetooth on macOS
- TinyGo firmware for a nice!nano-v2-compatible nRF52840 board

## Privacy and device safety

The normal host output contains timestamps, event types, session IDs, and
derived states, but no prompts, form contents, file contents, or OpenCode error
messages. The bridge does not blindly open serial ports: it filters candidates
by metadata and requires a successful device handshake. BLE candidates are
filtered by name and service and require the same handshake.

## License

No license has been selected. Until a license file is added, the source is
available for inspection but no permission to copy, modify, or redistribute it
is granted.
