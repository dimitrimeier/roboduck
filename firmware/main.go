package main

import (
	"machine"
	"strconv"
	"strings"
	"time"
)

const (
	protocolVersion = "1"
	firmwareVersion = "0.3.0"
	lineBufferSize  = 96
	hostTimeout     = 15 * time.Second
)

type responseWriter func(string)

type displayState uint8

const (
	stateOff displayState = iota
	stateIdle
	stateFinished
	stateRunning
	stateAsking
	stateError
)

type ledRenderer struct {
	pwm        *machine.PWM
	channel    uint8
	brightness uint8
}

func newLEDRenderer() (*ledRenderer, error) {
	pwm := machine.PWM0
	if err := pwm.Configure(machine.PWMConfig{Period: uint64(2 * time.Millisecond)}); err != nil {
		return nil, err
	}

	channel, err := pwm.Channel(machine.LED)
	if err != nil {
		return nil, err
	}

	renderer := &ledRenderer{
		pwm:        pwm,
		channel:    channel,
		brightness: 96,
	}
	renderer.write(0)
	return renderer, nil
}

func (renderer *ledRenderer) write(level uint8) {
	top := renderer.pwm.Top()
	scaled := uint32(uint64(level) * uint64(renderer.brightness) * uint64(top) / (255 * 255))
	renderer.pwm.Set(renderer.channel, scaled)
}

func (renderer *ledRenderer) render(state displayState, now time.Duration) {
	switch state {
	case stateOff:
		renderer.write(0)
	case stateIdle:
		renderer.write(24)
	case stateFinished:
		renderer.write(255)
	case stateRunning:
		const period = 1600 * time.Millisecond
		const halfPeriod = period / 2
		phase := now % period
		triangle := phase
		if phase >= halfPeriod {
			triangle = period - phase
		}
		level := 32 + uint8(223*triangle/halfPeriod)
		renderer.write(level)
	case stateAsking:
		phase := now % time.Second
		on := phase < 120*time.Millisecond || (phase >= 220*time.Millisecond && phase < 340*time.Millisecond)
		if on {
			renderer.write(255)
		} else {
			renderer.write(0)
		}
	case stateError:
		if now%(300*time.Millisecond) < 150*time.Millisecond {
			renderer.write(255)
		} else {
			renderer.write(0)
		}
	}
}

type controller struct {
	renderer       *ledRenderer
	state          displayState
	serialReceiver lineReceiver
	bleReceiver    lineReceiver
	bleTX          bluetoothCharacteristic
	bleIncoming    [128]byte
	bleIncomingGet uint8
	bleIncomingPut uint8
	bleResponses   [8]string
	bleResponseGet uint8
	bleResponsePut uint8
	blePayload     []byte
	bleNextWrite   time.Time
	linked         bool
	lastSeen       time.Time
}

type lineReceiver struct {
	line     [lineBufferSize]byte
	length   int
	overflow bool
}

func (device *controller) readSerial() {
	for machine.Serial.Buffered() > 0 {
		current, err := machine.Serial.ReadByte()
		if err != nil {
			return
		}
		device.serialReceiver.accept(current, writeSerialLine, func(line string) {
			device.processLine(line, time.Now(), writeSerialLine)
		})
	}
}

func (receiver *lineReceiver) accept(current byte, writer responseWriter, process func(string)) {
	switch current {
	case '\r':
		return
	case '\n':
		if receiver.overflow {
			writer("ERROR LINE_TOO_LONG")
		} else {
			process(string(receiver.line[:receiver.length]))
		}
		receiver.length = 0
		receiver.overflow = false
		return
	}

	if receiver.overflow {
		return
	}
	if receiver.length >= len(receiver.line)-1 {
		receiver.overflow = true
		return
	}

	receiver.line[receiver.length] = current
	receiver.length++
}

func (device *controller) processLine(line string, now time.Time, writer responseWriter) {
	fields := strings.Fields(line)
	if len(fields) == 0 {
		return
	}

	switch fields[0] {
	case "HELLO":
		if len(fields) != 2 {
			writer("ERROR BAD_ARGUMENTS")
			return
		}
		if fields[1] != protocolVersion {
			writer("ERROR PROTOCOL_VERSION")
			return
		}
		device.touch(now)
		writer("DEVICE OPENCODE_STATUS protocol=" + protocolVersion + " firmware=" + firmwareVersion + " leds=1")

	case "RESET_STATE":
		if len(fields) != 1 {
			writer("ERROR BAD_ARGUMENTS")
			return
		}
		device.touch(now)
		device.state = stateOff
		writer("OK")

	case "SET":
		if len(fields) != 3 {
			writer("ERROR BAD_ARGUMENTS")
			return
		}
		if fields[1] != "0" {
			writer("ERROR LED_INDEX")
			return
		}
		nextState, ok := parseState(fields[2])
		if !ok {
			writer("ERROR STATE")
			return
		}
		device.touch(now)
		device.state = nextState
		writer("OK")

	case "BRIGHTNESS":
		if len(fields) != 2 {
			writer("ERROR BAD_ARGUMENTS")
			return
		}
		value, err := strconv.ParseUint(fields[1], 10, 8)
		if err != nil {
			writer("ERROR BAD_ARGUMENTS")
			return
		}
		device.touch(now)
		device.renderer.brightness = uint8(value)
		writer("OK")

	case "SYNC_COMPLETE":
		if len(fields) != 1 {
			writer("ERROR BAD_ARGUMENTS")
			return
		}
		device.touch(now)
		writer("OK")

	case "PING":
		if len(fields) != 1 {
			writer("ERROR BAD_ARGUMENTS")
			return
		}
		device.touch(now)
		writer("PONG")

	default:
		writer("ERROR UNKNOWN_COMMAND")
	}
}

func (device *controller) touch(now time.Time) {
	device.linked = true
	device.lastSeen = now
}

func (device *controller) expireHost(now time.Time) {
	if device.linked && now.Sub(device.lastSeen) >= hostTimeout {
		device.linked = false
		device.state = stateOff
	}
}

func parseState(value string) (displayState, bool) {
	switch value {
	case "OFF":
		return stateOff, true
	case "IDLE":
		return stateIdle, true
	case "FINISHED":
		return stateFinished, true
	case "RUNNING":
		return stateRunning, true
	case "ASKING":
		return stateAsking, true
	case "ERROR":
		return stateError, true
	default:
		return stateOff, false
	}
}

func writeSerialLine(value string) {
	machine.Serial.Write([]byte(value))
	machine.Serial.WriteByte('\n')
}

func main() {
	renderer, err := newLEDRenderer()
	if err != nil {
		machine.LED.Configure(machine.PinConfig{Mode: machine.PinOutput})
		for {
			machine.LED.Set(true)
			time.Sleep(100 * time.Millisecond)
			machine.LED.Set(false)
			time.Sleep(100 * time.Millisecond)
		}
	}

	device := controller{
		renderer: renderer,
		state:    stateOff,
	}
	_ = device.enableBluetooth()
	startedAt := time.Now()
	for {
		now := time.Now()
		device.readSerial()
		device.readBluetooth()
		device.flushBluetooth(now)
		device.expireHost(now)
		device.renderer.render(device.state, now.Sub(startedAt))
		time.Sleep(time.Millisecond)
	}
}
