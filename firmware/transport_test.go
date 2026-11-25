package main

import "testing"

func TestTransportSynchronization(t *testing.T) {
	for _, initial := range []commandTransport{transportUSB, transportBLE} {
		tracker := transportTracker{}
		if tracker.completeSync(initial) {
			t.Fatal("initial sync must use the existing startup confirmation")
		}
		if tracker.active != initial {
			t.Fatal("initial sync did not select its source")
		}
		if tracker.completeSync(initial) {
			t.Fatal("same-transport resync must not replay confirmation")
		}

		other := transportUSB
		if initial == transportUSB {
			other = transportBLE
		}
		if !tracker.completeSync(other) || tracker.active != other {
			t.Fatal("handover must select and confirm the new transport")
		}
		if tracker.completeSync(other) {
			t.Fatal("duplicate sync must not replay confirmation")
		}
		if !tracker.completeSync(initial) || tracker.active != initial {
			t.Fatal("reverse handover must also confirm the new transport")
		}
	}
}

func TestInvalidTransportDoesNotChangeActiveSource(t *testing.T) {
	tracker := transportTracker{active: transportBLE}
	for _, source := range []commandTransport{transportNone, commandTransport(255)} {
		if tracker.completeSync(source) || tracker.active != transportBLE {
			t.Fatal("invalid source changed the active transport")
		}
	}
}

func TestTransportExpiryStartsFresh(t *testing.T) {
	tracker := transportTracker{active: transportUSB}
	tracker = transportTracker{} // The host watchdog clears transport history.
	if tracker.completeSync(transportBLE) || tracker.active != transportBLE {
		t.Fatal("recovery must use the connecting phase's confirmation")
	}
}
