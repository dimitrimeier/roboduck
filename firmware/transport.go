package main

type commandTransport uint8

const (
	transportNone commandTransport = iota
	transportUSB
	transportBLE
)

// transportTracker follows the host's full synchronizations, not physical
// connection events: a connected BLE standby is not an active status source.
type transportTracker struct {
	active commandTransport
}

func (tracker *transportTracker) completeSync(source commandTransport) bool {
	if source != transportUSB && source != transportBLE {
		return false
	}
	changed := tracker.active != transportNone && tracker.active != source
	tracker.active = source
	return changed
}
