package main

import (
	"time"

	"tinygo.org/x/bluetooth"
)

const bluetoothLocalName = "OCStatus"

var (
	statusServiceUUID = bluetooth.NewUUID([16]byte{
		0x78, 0xb1, 0x36, 0x97, 0x8a, 0x60, 0x41, 0x61,
		0xa9, 0x89, 0x69, 0x66, 0x16, 0x75, 0xe9, 0x4a,
	})
	statusRXUUID = bluetooth.NewUUID([16]byte{
		0x56, 0x57, 0xf6, 0xc0, 0x13, 0xb2, 0x45, 0x35,
		0x8f, 0x85, 0x14, 0xca, 0xcf, 0x39, 0x8b, 0x5f,
	})
	statusTXUUID = bluetooth.NewUUID([16]byte{
		0xe4, 0x1a, 0x11, 0x4e, 0xc1, 0x90, 0x42, 0x78,
		0xaa, 0x26, 0x72, 0xc8, 0x56, 0x3a, 0xdf, 0x58,
	})
)

// bluetoothCharacteristic keeps main.go independent of the Bluetooth package.
type bluetoothCharacteristic = bluetooth.Characteristic

func (device *controller) enableBluetooth() error {
	adapter := bluetooth.DefaultAdapter
	if err := adapter.Enable(); err != nil {
		return err
	}

	var rx bluetooth.Characteristic
	if err := adapter.AddService(&bluetooth.Service{
		UUID: statusServiceUUID,
		Characteristics: []bluetooth.CharacteristicConfig{
			{
				Handle: &rx,
				UUID:   statusRXUUID,
				Flags: bluetooth.CharacteristicWritePermission |
					bluetooth.CharacteristicWriteWithoutResponsePermission,
				WriteEvent: func(_ bluetooth.Connection, _ int, value []byte) {
					device.receiveBluetooth(value)
				},
			},
			{
				Handle: &device.bleTX,
				UUID:   statusTXUUID,
				Flags: bluetooth.CharacteristicNotifyPermission |
					bluetooth.CharacteristicReadPermission,
			},
		},
	}); err != nil {
		return err
	}

	advertisement := adapter.DefaultAdvertisement()
	if err := advertisement.Configure(bluetooth.AdvertisementOptions{
		LocalName:    bluetoothLocalName,
		ServiceUUIDs: []bluetooth.UUID{statusServiceUUID},
	}); err != nil {
		return err
	}

	return advertisement.Start()
}

func (device *controller) receiveBluetooth(value []byte) {
	for _, current := range value {
		next := (device.bleIncomingPut + 1) % uint8(len(device.bleIncoming))
		if next == device.bleIncomingGet {
			return
		}
		device.bleIncoming[device.bleIncomingPut] = current
		device.bleIncomingPut = next
	}
}

func (device *controller) readBluetooth() {
	for device.bleIncomingGet != device.bleIncomingPut {
		current := device.bleIncoming[device.bleIncomingGet]
		device.bleIncomingGet = (device.bleIncomingGet + 1) % uint8(len(device.bleIncoming))
		device.bleReceiver.accept(current, device.queueBluetoothLine, func(line string) {
			device.processLine(line, time.Now(), transportBLE, device.queueBluetoothLine)
		})
	}
}

func (device *controller) queueBluetoothLine(value string) {
	next := (device.bleResponsePut + 1) % uint8(len(device.bleResponses))
	if next == device.bleResponseGet {
		return
	}
	device.bleResponses[device.bleResponsePut] = value
	device.bleResponsePut = next
}

func (device *controller) flushBluetooth(now time.Time) {
	if now.Before(device.bleNextWrite) {
		return
	}

	if len(device.blePayload) == 0 {
		if device.bleResponseGet == device.bleResponsePut {
			return
		}
		value := device.bleResponses[device.bleResponseGet]
		device.bleResponses[device.bleResponseGet] = ""
		device.bleResponseGet = (device.bleResponseGet + 1) % uint8(len(device.bleResponses))
		device.blePayload = append([]byte(value), '\n')
	}

	length := len(device.blePayload)
	if length > 20 {
		length = 20
	}
	if _, err := device.bleTX.Write(device.blePayload[:length]); err != nil {
		device.bleNextWrite = now.Add(5 * time.Millisecond)
		return
	}

	device.blePayload = device.blePayload[length:]
	device.bleNextWrite = now.Add(5 * time.Millisecond)
}
