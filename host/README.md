# Host bridge

The host bridge observes the local OpenCode service, derives a privacy-minimized
aggregate status, and sends it to the status light over USB serial or Bluetooth
Low Energy.

## Requirements

- Windows 10/11 or macOS
- Node.js 22 or newer
- OpenCode V2 with a local background service
- A Pro Micro nRF52840 board running the firmware from `../firmware/`
- Go 1.25 or newer to build the BLE helper
- Xcode Command Line Tools on macOS (`xcode-select --install`)

## Install and run

```sh
cd host
npm install
npm run build:bluetooth
npm run dev
```

For a compiled run:

```sh
npm run build
npm start
```

Stop with `Ctrl+C`.

## Privacy-preserving output

The application writes JSON Lines such as:

```json
{"timestamp":"2026-11-16T15:30:00.000Z","kind":"configuration","transportMode":"both","transports":["usb","bluetooth"]}
{"timestamp":"2026-11-12T12:00:03.000Z","kind":"event","event":"permission.asked","sessionId":"ses_...","sessionStatus":"asking","overallStatus":"asking"}
{"timestamp":"2026-11-16T12:15:43.884Z","kind":"serial_connected","path":"COM6","firmware":"0.6.5","leds":1,"status":"running","role":"active"}
```

Prompts, form contents, resources, file contents, provider contents, and
OpenCode error text are not included. Output is limited to time, event type,
session ID, transport metadata, and derived state. The example port above is
illustrative; no port name is hard-coded.

## Configuration

Environment variables:

| Variable | Default | Meaning |
|---|---:|---|
| `OPENCODE_STATUS_TRANSPORT` | `both` | `both`, `usb`, or `bluetooth` |
| `OPENCODE_STATUS_BRIGHTNESS` | `128` | Logical brightness from 0 to 255 |
| `OPENCODE_STATUS_FINISHED_HOLD_MS` | `5000` | Hold time, capped at five seconds |
| `OPENCODE_STATUS_POLL_INTERVAL_MS` | `5000` | OpenCode snapshot reconciliation interval |

POSIX shell example:

```sh
OPENCODE_STATUS_TRANSPORT=usb OPENCODE_STATUS_BRIGHTNESS=96 npm run dev
```

PowerShell example:

```powershell
$env:OPENCODE_STATUS_TRANSPORT = "usb"
$env:OPENCODE_STATUS_BRIGHTNESS = "96"
npm run dev
```

`npm run dev:bluetooth` is a shortcut for Bluetooth-only mode.

## Transport behavior

### USB

The bridge lists ports but does not open them indiscriminately. It currently
considers only the validated application VID/PID `239A:0029`; the UF2 bootloader
`239A:00B3` and unrelated Bluetooth COM ports are ignored. Every candidate must
respond correctly to `HELLO 1` before receiving:

```text
RESET_STATE
BRIGHTNESS <0-255>
SET 0 <complete aggregate state>
SYNC_COMPLETE
```

The port name is discovered dynamically. `PING`/`PONG` checks the connection
every five seconds. Reconnect always performs a new full synchronization.

### Bluetooth LE

The helper in `ble-helper/` uses WinRT on Windows and CoreBluetooth on macOS. It
must be built on the target operating system. No Bluetooth driver replacement or
manual pairing is required for the current PoC. macOS may request Bluetooth
permission for the terminal or development environment.

Discovery filters by `OCStatus` and the project-specific 128-bit GATT service.
The address is discovered dynamically and is never configuration. The same
`HELLO 1` handshake, full sync, keepalive, timeout, and reconnect rules apply.

In the default `both` mode, USB is active and BLE is standby. BLE stays verified
with keepalives but receives no status commands while USB is available. USB
disconnect activates BLE and triggers full sync; USB reconnect synchronizes and
takes priority again.

## Quality checks

```sh
npm test
npm run check
npm run build
```

The automated host tests require neither OpenCode nor hardware.

## Layout

```text
src/core/                 Pure state model
src/ports/                Input and output interfaces
src/application/          Reconnect, synchronization, and orchestration
src/adapters/opencode/    SDK, snapshots, and event normalization
src/adapters/console/     Privacy-minimized JSON output
src/adapters/serial/      Cross-platform serial transport
src/adapters/bluetooth/   Native BLE helper lifecycle
ble-helper/               Go GATT client using WinRT/CoreBluetooth
test/                     Unit and application tests with fakes
```

## Manual smoke tests

### USB

1. Connect the flashed board and ensure it is not waiting in the UF2 bootloader.
2. Set transport to `usb` and run `npm run dev`.
3. Wait for `serial_connected` and a synchronized status.
4. Start an OpenCode task and observe the RGB LED.
5. Unplug and reconnect the board; it must recover without a configured port.

### Bluetooth

1. Start current firmware; USB may be used only for power.
2. Run `npm run dev:bluetooth`.
3. Wait for `bluetooth_connected`; no `serial_connected` should appear.
4. Exercise `RUNNING`, `ASKING`, and `FINISHED`.
5. Disconnect USB only when a suitable, correctly polarized 3.7 V single-cell
   battery is connected.

### Failover

1. Run `npm run dev` without setting a transport variable.
2. Wait for USB role `active` and Bluetooth role `standby`.
3. Interrupt USB while keeping the board powered.
4. Confirm Bluetooth changes to `active` and status updates continue.
5. Restore USB and confirm roles return to USB active/Bluetooth standby.
