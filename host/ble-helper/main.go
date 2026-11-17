package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"tinygo.org/x/bluetooth"
)

const deviceName = "OCStatus"

var (
	serviceUUID = mustParseUUID("78B13697-8A60-4161-A989-69661675E94A")
	rxUUID      = mustParseUUID("5657F6C0-13B2-4535-8F85-14CACF398B5F")
	txUUID      = mustParseUUID("E41A114E-C190-4278-AA26-72C8563ADF58")
	errNotFound = errors.New("OpenCode status light was not found")
)

type inputMessage struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

type outputMessage struct {
	Type    string `json:"type"`
	Address string `json:"address,omitempty"`
	Name    string `json:"name,omitempty"`
	Value   string `json:"value,omitempty"`
	Code    string `json:"code,omitempty"`
	Message string `json:"message,omitempty"`
}

type candidate struct {
	address bluetooth.Address
	name    string
}

func main() {
	scanTimeout := flag.Duration("scan-timeout", 10*time.Second, "BLE scan timeout")
	flag.Parse()

	encoder := json.NewEncoder(os.Stdout)
	if err := run(*scanTimeout, encoder); err != nil {
		code := "connection_failed"
		if errors.Is(err, errNotFound) {
			code = "not_found"
		}
		_ = encoder.Encode(outputMessage{Type: "error", Code: code, Message: err.Error()})
		os.Exit(1)
	}
}

func run(scanTimeout time.Duration, encoder *json.Encoder) error {
	adapter := bluetooth.DefaultAdapter
	if err := adapter.Enable(); err != nil {
		return fmt.Errorf("enable Bluetooth adapter: %w", err)
	}

	connectionStates := make(chan bluetooth.ConnectionState, 4)
	adapter.SetConnectionStateHandler(func(_ bluetooth.Device, state bluetooth.ConnectionState) {
		select {
		case connectionStates <- state:
		default:
		}
	})

	result, err := findDevice(adapter, scanTimeout)
	if err != nil {
		return err
	}

	device, err := adapter.Connect(result.address, bluetooth.ConnectionParams{
		ConnectionTimeout: bluetooth.NewDuration(15 * time.Second),
		Priority:          bluetooth.ConnectionPriorityPowerSaving,
	})
	if err != nil {
		return fmt.Errorf("connect to %s: %w", result.address.String(), err)
	}
	defer device.Disconnect() //nolint:errcheck

	services, err := device.DiscoverServices([]bluetooth.UUID{serviceUUID})
	if err != nil {
		return fmt.Errorf("discover status service: %w", err)
	}
	if len(services) != 1 {
		return errors.New("status service discovery returned an unexpected result")
	}

	characteristics, err := services[0].DiscoverCharacteristics([]bluetooth.UUID{rxUUID, txUUID})
	if err != nil {
		return fmt.Errorf("discover status characteristics: %w", err)
	}
	if len(characteristics) != 2 {
		return errors.New("status characteristic discovery returned an unexpected result")
	}
	rx := characteristics[0]
	tx := characteristics[1]

	responses := make(chan string, 8)
	var responseBuffer lineBuffer
	if err := tx.EnableNotifications(func(value []byte) {
		for _, line := range responseBuffer.append(value) {
			select {
			case responses <- line:
			default:
			}
		}
	}); err != nil {
		return fmt.Errorf("enable status notifications: %w", err)
	}
	defer tx.EnableNotifications(nil) //nolint:errcheck

	if err := encoder.Encode(outputMessage{
		Type:    "ready",
		Address: result.address.String(),
		Name:    result.name,
	}); err != nil {
		return err
	}

	commands := make(chan inputMessage)
	inputErrors := make(chan error, 1)
	go readCommands(commands, inputErrors)

	for {
		select {
		case command := <-commands:
			switch command.Type {
			case "close":
				return nil
			case "request":
				if command.Value == "" || strings.ContainsAny(command.Value, "\r\n") {
					return errors.New("invalid request value")
				}
				if err := writeCommand(rx, command.Value+"\n"); err != nil {
					return fmt.Errorf("write status request: %w", err)
				}
			default:
				return fmt.Errorf("unknown helper command %q", command.Type)
			}

		case response := <-responses:
			if err := encoder.Encode(outputMessage{Type: "response", Value: response}); err != nil {
				return err
			}

		case state := <-connectionStates:
			if !state.Connected {
				message := "Bluetooth device disconnected"
				if state.Err != nil {
					message += ": " + state.Err.Error()
				}
				_ = encoder.Encode(outputMessage{Type: "disconnected", Message: message})
				return nil
			}

		case err := <-inputErrors:
			if err == nil {
				return nil
			}
			return fmt.Errorf("read helper input: %w", err)
		}
	}
}

func findDevice(adapter *bluetooth.Adapter, timeout time.Duration) (candidate, error) {
	var (
		mu       sync.Mutex
		found    *candidate
		timedOut bool
	)

	timer := time.AfterFunc(timeout, func() {
		mu.Lock()
		timedOut = found == nil
		mu.Unlock()
		_ = adapter.StopScan()
	})

	err := adapter.Scan(func(adapter *bluetooth.Adapter, result bluetooth.ScanResult) {
		if result.AdvertisementPayload == nil || result.LocalName() != deviceName ||
			!result.HasServiceUUID(serviceUUID) {
			return
		}

		mu.Lock()
		if found == nil {
			found = &candidate{address: result.Address, name: result.LocalName()}
		}
		mu.Unlock()
		_ = adapter.StopScan()
	})
	timer.Stop()
	if err != nil {
		return candidate{}, fmt.Errorf("scan for status light: %w", err)
	}

	mu.Lock()
	defer mu.Unlock()
	if found == nil {
		if timedOut {
			return candidate{}, errNotFound
		}
		return candidate{}, errors.New("Bluetooth scan stopped before a status light was found")
	}
	return *found, nil
}

func writeCommand(characteristic bluetooth.DeviceCharacteristic, value string) error {
	data := []byte(value)
	maximum := 20
	if mtu, err := characteristic.GetMTU(); err == nil && mtu > 3 {
		maximum = int(mtu) - 3
	}

	for len(data) > 0 {
		length := len(data)
		if length > maximum {
			length = maximum
		}
		if _, err := characteristic.Write(data[:length]); err != nil {
			return err
		}
		data = data[length:]
	}
	return nil
}

func readCommands(commands chan<- inputMessage, inputErrors chan<- error) {
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		var command inputMessage
		if err := json.Unmarshal(scanner.Bytes(), &command); err != nil {
			inputErrors <- err
			return
		}
		commands <- command
	}
	inputErrors <- scanner.Err()
}

type lineBuffer struct {
	mu    sync.Mutex
	value string
}

func (buffer *lineBuffer) append(value []byte) []string {
	buffer.mu.Lock()
	defer buffer.mu.Unlock()

	buffer.value += string(value)
	if len(buffer.value) > 512 && !strings.Contains(buffer.value, "\n") {
		buffer.value = ""
		return nil
	}

	var lines []string
	for {
		newline := strings.IndexByte(buffer.value, '\n')
		if newline < 0 {
			return lines
		}
		line := strings.TrimSuffix(buffer.value[:newline], "\r")
		buffer.value = buffer.value[newline+1:]
		if line != "" {
			lines = append(lines, line)
		}
	}
}

func mustParseUUID(value string) bluetooth.UUID {
	uuid, err := bluetooth.ParseUUID(value)
	if err != nil {
		panic(err)
	}
	return uuid
}
