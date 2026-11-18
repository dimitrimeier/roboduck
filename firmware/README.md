# Firmware

Firmware 0.7.0 supports USB CDC and Bluetooth LE concurrently on the tested
nice!nano-v2-compatible Pro Micro nRF52840 board. Both transports use the same
status protocol. The programmable internal red LED at `P0.15` is disabled. The
two external common-cathode RGB eyes are driven by six separate hardware PWM
channels. They currently mirror one logical display while remaining electrically
independent for future per-eye control.

## Tested hardware

- Board ID: `nRF52840-nicenano`
- UF2 bootloader: 0.6.0
- Red user LED: `P0.15`, active high, disabled by this firmware
- USB bootloader VID/PID: `239A:00B3`
- USB application VID/PID: `239A:0029`
- Toolchain used for physical validation: Go 1.27.3, TinyGo 0.44.0,
  `tinygo.org/x/bluetooth` 0.17.0

On the tested clone, the blue LED belongs to the charging circuit and cannot be
controlled as a normal GPIO status LED. Its blinking is unrelated to Bluetooth.

## Display states

| State | Pattern |
|---|---|
| `OFF` | Off |
| `IDLE` | Short green at 20%, short green at full globally limited brightness, then 3 s off |
| `FINISHED` | Green pulse |
| `RUNNING` | Warm pink → violet → turquoise-green fade at 15% relative brightness |
| `ASKING` | Yellow flash followed by green flash |
| `ERROR` | Fast red blink |

The internal red board LED remains off in every phase.

## Startup and connection sequence

The renderer is non-blocking:

1. Red fades to yellow in 1.1 seconds, then yellow to green in 1.1 seconds.
2. The display remains off for 500 ms.
3. Startup supply is shown for 1.5 seconds: red below 3.60 V, yellow below
   3.90 V, green from 3.90 V, or yellow “unknown” when USB supply above 4.40 V
   is detected.
4. The display remains off for one second.
5. Blue pulses until a valid `HELLO 1` arrives over USB or BLE.
6. Three short blue flashes confirm connection.
7. The normal status pattern begins.

After 15 seconds without host activity, stale status is discarded and the blue
connection pulse returns. Battery thresholds are preliminary coarse levels, not
precise state-of-charge measurement. While USB is connected, this board cannot
simultaneously measure actual battery voltage through `VDDH/5`.

## Build and flash with TinyGo

Requirements: Go 1.25 or newer and TinyGo 0.44 or newer.

From `firmware/`:

```powershell
tinygo build -target=nicenano -o build/opencode-status-light.uf2 .
```

To enter the UF2 bootloader, briefly connect `RST` to `GND` twice. Verify the
mounted drive before copying; the drive letter below is only an example:

```powershell
Copy-Item ./build/opencode-status-light.uf2 D:/
```

Alternatively, let TinyGo locate the UF2 drive:

```powershell
tinygo flash -target=nicenano .
```

The existing UF2 bootloader is not overwritten.

## Protocol

Firmware implements version 1 of the line-oriented protocol:

```text
HELLO 1
RESET_STATE
SET 0 <OFF|IDLE|FINISHED|RUNNING|ASKING|ERROR>
BRIGHTNESS <0-255>
SYNC_COMPLETE
PING
BATTERY
SUPPLY
DISPLAY
DISPLAY_DEMO
```

Example handshake response:

```text
DEVICE OPENCODE_STATUS protocol=1 firmware=0.7.0 leds=1
```

Commands are limited to 95 bytes excluding the line ending. Unknown or invalid
commands return `ERROR <code>`.

### Supply diagnostics

`BATTERY` reads the divider expected on `P0.04`/`AIN2` on an original
nice!nano:

```text
BATTERY raw=8672 adc_mv=397 source_mv=556
```

On the tested clone, `source_mv` remains around 0.51–0.59 V even on battery and
must not be interpreted as battery voltage. It may also float without a battery.

`SUPPLY` instead reads the internal nRF52840 `VDDH/5` channel:

```text
SUPPLY raw=18752 adc_mv=859 supply_mv=4230
```

The tested board reported approximately 4.91 V on USB and 4.295 V on battery
before calibration. Firmware applies the board-specific factor `4230/4295`,
measured against a 4.230 V multimeter reference. This factor may differ between
boards and should not be treated as universal calibration.

### Display diagnostics

`DISPLAY` reports the current logical phase and RGB color without unsolicited
protocol output:

```text
DISPLAY phase=CONNECTING battery=HIGH supply_mv=4230 rgb=0,0,147
```

`DISPLAY_DEMO` restarts the diagnostic sequence and keeps connection search
visible for three seconds before confirmation flashes. It does not block USB,
BLE, or the parser.

## Bluetooth LE

Firmware advertises as `OCStatus` without requiring pairing in the current PoC:

```text
Service: 78B13697-8A60-4161-A989-69661675E94A
RX:      5657F6C0-13B2-4535-8F85-14CACF398B5F  (host → board)
TX:      E41A114E-C190-4278-AA26-72C8563ADF58  (board → host)
```

The host filters by service and name and must still complete `HELLO 1` before
sending status commands. Ring buffers keep GATT callbacks separate from parsing
and transmission. BLE is currently unpaired and unencrypted; the handshake is
device identification, not cryptographic authentication. Only abstract status
values are transmitted.

## Safe Windows hardware tests

From the repository root after flashing:

```powershell
./firmware/tools/Test-StatusLight.ps1
```

To inspect the startup phases as timestamped protocol output, stop the host
bridge first and run:

```powershell
./firmware/tools/Watch-DisplayPhases.ps1
```

Both scripts pre-filter by the validated USB application identifier and require
the handshake before issuing commands. They contain no fixed COM port. Visual
appearance must still be confirmed by a person.

## RGB wiring

Two four-pin common-cathode RGB LEDs are planned. Six separate PWM channels and
six separate resistors are required to allow later independent control. The
cathodes connect to ground. Final resistors and source drivers must be selected
after measuring forward voltage. The intended final point is 10 mA per channel;
the nRF52840 GPIOs should provide PWM control signals rather than directly
supply that current.

Current first-eye prototype:

| Channel | Board pin | nRF52840 | Connection |
|---|---|---|---|
| Red | `D104` / `104` | `P1.04` | GPIO → resistor → red anode |
| Green | `D106` / `106` | `P1.06` | GPIO → resistor → green anode |
| Blue | `D011` / `011` | `P0.11` | GPIO → resistor → blue anode |
| Common | `GND` | Ground | Common cathode |

Current second-eye prototype wiring:

| Channel | Board pin | nRF52840 | Connection |
|---|---|---|---|
| Red | `D115` / `115` | `P1.15` | GPIO → resistor → red anode |
| Green | `D113` / `113` | `P1.13` | GPIO → resistor → green anode |
| Blue | `D111` / `111` | `P1.11` | GPIO → resistor → blue anode |
| Common | `GND` | Ground | Common cathode |

These pins use `PWM1`, while the first eye uses `PWM0`. Firmware 0.7.0 writes the
same logical RGB value to both peripherals, so both eyes mirror each other while
remaining available for later independent control. The handshake still reports
`leds=1` because the protocol exposes one logical mirrored display.

All six channels use a 2 ms period and are not inverted. Firmware
globally limits physical output to 166/255 (about 65%); resistors remain the
actual current limit. This direct prototype intentionally operates below the
planned 10 mA and is not the final electrical design.

Both eyes were physically validated with firmware 0.7.0. The user confirmed
identical startup colors, supply indication, connection pulse, and confirmation
flashes on the left and right LEDs.
