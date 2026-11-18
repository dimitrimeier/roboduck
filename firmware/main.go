package main

import (
	"machine"
	"strconv"
	"strings"
	"time"
)

const (
	protocolVersion        = "1"
	firmwareVersion        = "0.8.5"
	lineBufferSize         = 96
	hostTimeout            = 15 * time.Second
	batteryADCMax          = 65520
	batteryADCMV           = 3000
	startupGradientSegment = 1100 * time.Millisecond
	startupDuration        = 2 * startupGradientSegment
	startupPause           = 500 * time.Millisecond
	batteryDisplay         = 1500 * time.Millisecond
	batteryPause           = time.Second
	connectFlashOn         = 120 * time.Millisecond
	connectFlashOff        = 120 * time.Millisecond
	demoConnecting         = 3 * time.Second
	usbThresholdMV         = 4400
	batteryThird1MV        = 3600
	batteryThird2MV        = 3900
	globalOutputMax        = 166 // 65% of 255, rounded to the nearest 8-bit value.
	runningOutputMax       = 38  // 15% of 255, rounded down.
	runningPulseMin        = 51  // Keep the dimmer eye at 20% relative brightness.
	runningGradientSegment = 1600 * time.Millisecond
	runningAnimationPeriod = 3 * runningGradientSegment
	idleFirstFlashMax      = 51 // 20% of 255.
	statusPulsePeriod      = 1600 * time.Millisecond
	finishedPulseCount     = 3
	finishedPulseDuration  = finishedPulseCount * statusPulsePeriod
	// The real board reported 4295 mV while a multimeter measured 4230 mV.
	supplyCalibrationNumerator   = 4230
	supplyCalibrationDenominator = 4295
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

type displayPhase uint8

const (
	phaseStartupColors displayPhase = iota
	phaseStartupPause
	phaseBatteryLevel
	phaseBatteryPause
	phaseConnecting
	phaseConnectionConfirmed
	phaseStatus
)

type batteryLevel uint8

const (
	batteryLow batteryLevel = iota
	batteryMedium
	batteryHigh
	batteryUnknownUSB
)

type rgbColor struct {
	red   uint8
	green uint8
	blue  uint8
}

type eyeColors struct {
	left  rgbColor
	right rgbColor
}

var (
	colorOff    = rgbColor{}
	colorRed    = rgbColor{red: 255}
	colorYellow = rgbColor{red: 255, green: 128}
	colorGreen  = rgbColor{green: 255}
	colorBlue   = rgbColor{blue: 255}
	// RUNNING deliberately avoids pure red, green, and blue so its animation
	// cannot be confused with the single-color startup and status signals.
	colorRunningPink      = rgbColor{red: 255, green: 48, blue: 112}
	colorRunningViolet    = rgbColor{red: 112, green: 48, blue: 255}
	colorRunningTurquoise = rgbColor{red: 48, green: 255, blue: 144}
)

type ledRenderer struct {
	leftPWM           *machine.PWM
	leftRedChannel    uint8
	leftGreenChannel  uint8
	leftBlueChannel   uint8
	rightPWM          *machine.PWM
	rightRedChannel   uint8
	rightGreenChannel uint8
	rightBlueChannel  uint8
	brightness        uint8
}

func newLEDRenderer() (*ledRenderer, error) {
	// Keep the clone's internal red user LED disabled. Only the external RGB
	// channels are part of the status display.
	machine.LED.Configure(machine.PinConfig{Mode: machine.PinOutput})
	machine.LED.Set(false)

	leftPWM := machine.PWM0
	if err := leftPWM.Configure(machine.PWMConfig{Period: uint64(2 * time.Millisecond)}); err != nil {
		return nil, err
	}
	leftRedChannel, err := leftPWM.Channel(machine.D104)
	if err != nil {
		return nil, err
	}
	leftGreenChannel, err := leftPWM.Channel(machine.D106)
	if err != nil {
		return nil, err
	}
	leftBlueChannel, err := leftPWM.Channel(machine.D011)
	if err != nil {
		return nil, err
	}

	rightPWM := machine.PWM1
	if err := rightPWM.Configure(machine.PWMConfig{Period: uint64(2 * time.Millisecond)}); err != nil {
		return nil, err
	}
	rightRedChannel, err := rightPWM.Channel(machine.D115)
	if err != nil {
		return nil, err
	}
	rightGreenChannel, err := rightPWM.Channel(machine.D113)
	if err != nil {
		return nil, err
	}
	rightBlueChannel, err := rightPWM.Channel(machine.D111)
	if err != nil {
		return nil, err
	}

	renderer := &ledRenderer{
		leftPWM:           leftPWM,
		leftRedChannel:    leftRedChannel,
		leftGreenChannel:  leftGreenChannel,
		leftBlueChannel:   leftBlueChannel,
		rightPWM:          rightPWM,
		rightRedChannel:   rightRedChannel,
		rightGreenChannel: rightGreenChannel,
		rightBlueChannel:  rightBlueChannel,
		brightness:        96,
	}
	renderer.renderRGB(colorOff)
	return renderer, nil
}

func (renderer *ledRenderer) write(pwm *machine.PWM, channel uint8, level uint8) {
	top := pwm.Top()
	scaled := uint32(uint64(level) * uint64(renderer.brightness) * globalOutputMax * uint64(top) /
		(255 * 255 * 255))
	pwm.Set(channel, scaled)
}

func (renderer *ledRenderer) renderRGB(color rgbColor) {
	renderer.renderEyes(eyeColors{left: color, right: color})
}

func (renderer *ledRenderer) renderEyes(colors eyeColors) {
	renderer.write(renderer.leftPWM, renderer.leftRedChannel, colors.left.red)
	renderer.write(renderer.leftPWM, renderer.leftGreenChannel, colors.left.green)
	renderer.write(renderer.leftPWM, renderer.leftBlueChannel, colors.left.blue)
	renderer.write(renderer.rightPWM, renderer.rightRedChannel, colors.right.red)
	renderer.write(renderer.rightPWM, renderer.rightGreenChannel, colors.right.green)
	renderer.write(renderer.rightPWM, renderer.rightBlueChannel, colors.right.blue)
}

func mirroredEyes(color rgbColor) eyeColors {
	return eyeColors{left: color, right: color}
}

func renderStatus(state displayState, now time.Duration) eyeColors {
	switch state {
	case stateOff:
		return mirroredEyes(colorOff)
	case stateIdle:
		return idleEyes(now)
	case stateFinished:
		return finishedEyes(now)
	case stateRunning:
		return runningEyes(now)
	case stateAsking:
		phase := now % time.Second
		if phase < 500*time.Millisecond {
			return eyeColors{left: colorRed, right: colorOff}
		}
		return eyeColors{left: colorOff, right: colorRed}
	case stateError:
		if now%(300*time.Millisecond) < 150*time.Millisecond {
			return mirroredEyes(colorRed)
		}
		return mirroredEyes(colorOff)
	}
	return mirroredEyes(colorOff)
}

func idleEyes(elapsed time.Duration) eyeColors {
	// Start with a full three-second pause, then show two short green flashes.
	const flashOn = 120 * time.Millisecond
	const flashOff = 120 * time.Millisecond
	const longPause = 3 * time.Second
	phase := elapsed % (2*flashOn + flashOff + longPause)
	if phase < longPause {
		return mirroredEyes(colorOff)
	}
	phase -= longPause
	if phase < flashOn {
		return mirroredEyes(scaleColor(colorGreen, idleFirstFlashMax))
	}
	if phase >= flashOn+flashOff && phase < 2*flashOn+flashOff {
		return mirroredEyes(colorGreen)
	}
	return mirroredEyes(colorOff)
}

func finishedEyes(elapsed time.Duration) eyeColors {
	if elapsed < finishedPulseDuration {
		return mirroredEyes(scaleColor(colorGreen, pulseLevel(elapsed)))
	}
	return idleEyes(elapsed - finishedPulseDuration)
}

func runningGradient(elapsed time.Duration) rgbColor {
	phase := elapsed % runningAnimationPeriod
	var color rgbColor
	if phase < runningGradientSegment {
		color = mixColor(colorRunningPink, colorRunningViolet, phase, runningGradientSegment)
	} else if phase < 2*runningGradientSegment {
		color = mixColor(colorRunningViolet, colorRunningTurquoise, phase-runningGradientSegment, runningGradientSegment)
	} else {
		color = mixColor(colorRunningTurquoise, colorRunningPink, phase-2*runningGradientSegment, runningGradientSegment)
	}
	return scaleColor(color, runningOutputMax)
}

func runningEyes(elapsed time.Duration) eyeColors {
	const halfPeriod = runningAnimationPeriod / 2
	phase := elapsed % runningAnimationPeriod
	transfer := phase
	if phase >= halfPeriod {
		transfer = runningAnimationPeriod - phase
	}

	progress := smoothProgress(transfer, halfPeriod)
	rangeSize := uint16(255 - runningPulseMin)
	rightLevel := runningPulseMin + uint8(rangeSize*progress/255)
	leftLevel := 255 - uint8(rangeSize*progress/255)
	color := runningGradient(elapsed)
	return eyeColors{
		left:  scaleColor(color, leftLevel),
		right: scaleColor(color, rightLevel),
	}
}

func smoothProgress(elapsed time.Duration, duration time.Duration) uint16 {
	// Smoothstep eases the brightness transfer at both ends of the pulse.
	x := uint64(elapsed) * 255 / uint64(duration)
	return uint16(x * x * (3*255 - 2*x) / (255 * 255))
}

func mixColor(from rgbColor, to rgbColor, elapsed time.Duration, duration time.Duration) rgbColor {
	return rgbColor{
		red:   mixChannel(from.red, to.red, elapsed, duration),
		green: mixChannel(from.green, to.green, elapsed, duration),
		blue:  mixChannel(from.blue, to.blue, elapsed, duration),
	}
}

func mixChannel(from uint8, to uint8, elapsed time.Duration, duration time.Duration) uint8 {
	start := int64(from)
	delta := int64(to) - start
	return uint8(start + delta*int64(elapsed)/int64(duration))
}

func scaleColor(color rgbColor, level uint8) rgbColor {
	return rgbColor{
		red:   uint8(uint16(color.red) * uint16(level) / 255),
		green: uint8(uint16(color.green) * uint16(level) / 255),
		blue:  uint8(uint16(color.blue) * uint16(level) / 255),
	}
}

type controller struct {
	renderer       *ledRenderer
	battery        *machine.ADC
	supply         *machine.ADC
	state          displayState
	stateStarted   time.Time
	phase          displayPhase
	phaseStarted   time.Time
	batteryLevel   batteryLevel
	supplyMV       uint32
	displayDemo    bool
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
		device.connect(now)
		writer("DEVICE OPENCODE_STATUS protocol=" + protocolVersion + " firmware=" + firmwareVersion + " leds=1")

	case "RESET_STATE":
		if len(fields) != 1 {
			writer("ERROR BAD_ARGUMENTS")
			return
		}
		device.touch(now)
		device.state = stateOff
		device.stateStarted = now
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
		if device.state != nextState {
			previousState := device.state
			device.state = nextState
			if previousState == stateFinished && nextState == stateIdle &&
				now.Sub(device.stateStarted) >= finishedPulseDuration {
				// Continue the idle pause that already began after the third
				// finished pulse instead of restarting it on the host update.
				device.stateStarted = device.stateStarted.Add(finishedPulseDuration)
			} else {
				device.stateStarted = now
			}
		}
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

	case "BATTERY":
		if len(fields) != 1 {
			writer("ERROR BAD_ARGUMENTS")
			return
		}
		raw := uint32(device.battery.Get())
		adcMV := (raw*batteryADCMV + batteryADCMax/2) / batteryADCMax
		// A canonical nice!nano uses 800 kOhm over 2 MOhm. The resulting
		// divider factor is 5/7, so the source voltage is ADC * 7/5.
		sourceMV := (adcMV*7 + 2) / 5
		writer("BATTERY raw=" + strconv.FormatUint(uint64(raw), 10) +
			" adc_mv=" + strconv.FormatUint(uint64(adcMV), 10) +
			" source_mv=" + strconv.FormatUint(uint64(sourceMV), 10))

	case "SUPPLY":
		if len(fields) != 1 {
			writer("ERROR BAD_ARGUMENTS")
			return
		}
		raw, adcMV, supplyMV := device.readSupply()
		writer("SUPPLY raw=" + strconv.FormatUint(uint64(raw), 10) +
			" adc_mv=" + strconv.FormatUint(uint64(adcMV), 10) +
			" supply_mv=" + strconv.FormatUint(uint64(supplyMV), 10))

	case "DISPLAY":
		if len(fields) != 1 {
			writer("ERROR BAD_ARGUMENTS")
			return
		}
		colors := device.displayColors(now)
		writer("DISPLAY phase=" + device.phase.String() +
			" battery=" + device.batteryLevel.String() +
			" supply_mv=" + strconv.FormatUint(uint64(device.supplyMV), 10) +
			" left_rgb=" + formatColor(colors.left) +
			" right_rgb=" + formatColor(colors.right))

	case "DISPLAY_DEMO":
		if len(fields) != 1 {
			writer("ERROR BAD_ARGUMENTS")
			return
		}
		device.touch(now)
		_, _, device.supplyMV = device.readSupply()
		device.batteryLevel = classifyBattery(device.supplyMV)
		device.displayDemo = true
		device.phase = phaseStartupColors
		device.phaseStarted = now
		writer("OK")

	default:
		writer("ERROR UNKNOWN_COMMAND")
	}
}

func (device *controller) connect(now time.Time) {
	device.touch(now)
	if device.phase == phaseConnecting && !device.displayDemo {
		device.phase = phaseConnectionConfirmed
		device.phaseStarted = now
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
		device.phase = phaseConnecting
		device.phaseStarted = now
	}
}

func (device *controller) updateDisplay(now time.Time) {
	confirmationStep := connectFlashOn + connectFlashOff
	confirmationDuration := 3 * confirmationStep

	switch device.phase {
	case phaseStartupColors:
		if now.Sub(device.phaseStarted) >= startupDuration {
			device.phase = phaseStartupPause
			device.phaseStarted = device.phaseStarted.Add(startupDuration)
		}
	case phaseStartupPause:
		if now.Sub(device.phaseStarted) >= startupPause {
			device.phase = phaseBatteryLevel
			device.phaseStarted = device.phaseStarted.Add(startupPause)
		}
	case phaseBatteryLevel:
		if now.Sub(device.phaseStarted) >= batteryDisplay {
			device.phase = phaseBatteryPause
			device.phaseStarted = device.phaseStarted.Add(batteryDisplay)
		}
	case phaseBatteryPause:
		if now.Sub(device.phaseStarted) >= batteryPause {
			if device.displayDemo {
				device.phase = phaseConnecting
			} else if device.linked {
				device.phase = phaseConnectionConfirmed
			} else {
				device.phase = phaseConnecting
			}
			device.phaseStarted = now
		}
	case phaseConnecting:
		if device.displayDemo && now.Sub(device.phaseStarted) >= demoConnecting {
			device.phase = phaseConnectionConfirmed
			device.phaseStarted = now
		}
	case phaseConnectionConfirmed:
		if now.Sub(device.phaseStarted) >= confirmationDuration {
			device.phase = phaseStatus
			device.phaseStarted = now
			device.stateStarted = now
			device.displayDemo = false
		}
	}

	device.renderer.renderEyes(device.displayColors(now))
}

func (device *controller) displayColors(now time.Time) eyeColors {
	elapsed := now.Sub(device.phaseStarted)
	switch device.phase {
	case phaseStartupColors:
		if elapsed < startupGradientSegment {
			return mirroredEyes(mixColor(colorRed, colorYellow, elapsed, startupGradientSegment))
		}
		return mirroredEyes(mixColor(colorYellow, colorGreen, elapsed-startupGradientSegment, startupGradientSegment))
	case phaseStartupPause, phaseBatteryPause:
		return mirroredEyes(colorOff)
	case phaseBatteryLevel:
		return mirroredEyes(device.batteryLevel.color())
	case phaseConnecting:
		return mirroredEyes(scaleColor(colorBlue, pulseLevel(elapsed)))
	case phaseConnectionConfirmed:
		if elapsed%(connectFlashOn+connectFlashOff) < connectFlashOn {
			return mirroredEyes(colorBlue)
		}
		return mirroredEyes(colorOff)
	case phaseStatus:
		return renderStatus(device.state, now.Sub(device.stateStarted))
	default:
		return mirroredEyes(colorOff)
	}
}

func formatColor(color rgbColor) string {
	return strconv.FormatUint(uint64(color.red), 10) + "," +
		strconv.FormatUint(uint64(color.green), 10) + "," +
		strconv.FormatUint(uint64(color.blue), 10)
}

func pulseLevel(elapsed time.Duration) uint8 {
	const halfPeriod = statusPulsePeriod / 2
	phase := elapsed % statusPulsePeriod
	triangle := phase
	if phase >= halfPeriod {
		triangle = statusPulsePeriod - phase
	}
	return 24 + uint8(231*triangle/halfPeriod)
}

func (device *controller) readSupply() (raw uint32, adcMV uint32, supplyMV uint32) {
	raw = uint32(device.supply.Get())
	adcMV = (raw*batteryADCMV + batteryADCMax/2) / batteryADCMax
	// The nRF52840 exposes VDDH internally divided by five as an SAADC input.
	uncalibratedMV := adcMV * 5
	supplyMV = (uncalibratedMV*supplyCalibrationNumerator + supplyCalibrationDenominator/2) /
		supplyCalibrationDenominator
	return
}

func classifyBattery(supplyMV uint32) batteryLevel {
	switch {
	case supplyMV > usbThresholdMV:
		return batteryUnknownUSB
	case supplyMV < batteryThird1MV:
		return batteryLow
	case supplyMV < batteryThird2MV:
		return batteryMedium
	default:
		return batteryHigh
	}
}

func (level batteryLevel) color() rgbColor {
	switch level {
	case batteryLow:
		return colorRed
	case batteryHigh:
		return colorGreen
	default:
		return colorYellow
	}
}

func (level batteryLevel) String() string {
	switch level {
	case batteryLow:
		return "LOW"
	case batteryMedium:
		return "MEDIUM"
	case batteryHigh:
		return "HIGH"
	default:
		return "UNKNOWN_USB"
	}
}

func (phase displayPhase) String() string {
	switch phase {
	case phaseStartupColors:
		return "STARTUP_COLORS"
	case phaseStartupPause:
		return "STARTUP_PAUSE"
	case phaseBatteryLevel:
		return "BATTERY"
	case phaseBatteryPause:
		return "BATTERY_PAUSE"
	case phaseConnecting:
		return "CONNECTING"
	case phaseConnectionConfirmed:
		return "CONNECTED"
	default:
		return "STATUS"
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
		// The internal LED must remain disabled even if PWM initialization fails.
		machine.LED.Configure(machine.PinConfig{Mode: machine.PinOutput})
		machine.LED.Set(false)
		for {
			time.Sleep(time.Second)
		}
	}

	machine.InitADC()
	battery := machine.ADC{Pin: machine.AIN2}
	// Pin 254 is TinyGo's nRF52840-specific internal VDDH/5 ADC input.
	supply := machine.ADC{Pin: machine.Pin(254)}
	battery.Configure(machine.ADCConfig{
		Reference:  3000,
		Resolution: 12,
		SampleTime: 40,
		Samples:    16,
	})

	device := controller{
		renderer: renderer,
		battery:  &battery,
		supply:   &supply,
		state:    stateOff,
		phase:    phaseStartupColors,
	}
	device.phaseStarted = time.Now()
	device.stateStarted = device.phaseStarted
	_, _, device.supplyMV = device.readSupply()
	device.batteryLevel = classifyBattery(device.supplyMV)
	_ = device.enableBluetooth()
	for {
		now := time.Now()
		device.readSerial()
		device.readBluetooth()
		device.flushBluetooth(now)
		device.expireHost(now)
		device.updateDisplay(now)
		time.Sleep(time.Millisecond)
	}
}
