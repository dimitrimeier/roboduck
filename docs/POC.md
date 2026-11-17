# Proof-of-concept plan

## Goal

Validate the critical assumptions before final hardware is purchased or
soldered:

1. OpenCode exposes the required state reliably.
2. Multiple sessions can be reduced to an unambiguous display state.
3. The host can safely discover the correct USB serial device.
4. Reconnect and full synchronization work.
5. The complete chain remains stable for several hours.

The PoC is not expected to provide a polished UI, installer, or enclosure.
Reusable work may move into `host/` and `firmware/`.

## Principle

Each stage should isolate one risk. Do not proceed until its acceptance criteria
are sufficiently met. A development board's built-in or directly connected LED
is enough for end-to-end validation.

## PoC 1 — OpenCode observer without hardware

**Question:** Can the required states be obtained from the local OpenCode
service without parsing logs or terminal output?

**Setup:** A small TypeScript console application using `@opencode/client`. It
loads active sessions and records only timestamps, session IDs, event types, and
derived states. It must not log prompts or file contents.

**Tests:** normal completion, question/form, permission request, interruption,
controlled failure, concurrent sessions, and event-stream reconnect.

**Acceptance criteria:**

- [ ] Start, completion, failure/interruption, and idle are unambiguous.
- [ ] Questions/forms and permission requests are unambiguous.
- [ ] Events can be assigned safely to sessions.
- [ ] Active state can be reconstructed after startup and reconnect.

**Go:** all MVP states can be derived. **Adjust:** reduce the display model or
document a fallback for missing signals. **No-go:** state requires unreliable
parsing of terminal text or private content.

## PoC 2 — State machine without hardware

Use a pure reducer and synthetic event sequences. Cover:

- `RUNNING → FINISHED → IDLE` and the `FINISHED` timeout.
- `RUNNING → ASKING → RUNNING → FINISHED`.
- Failure and interruption.
- Concurrent sessions and aggregate priority.
- Deleted or archived sessions.
- Duplicate, unknown, late, and reordered events.
- Replacement of stale local state by a complete snapshot.

**Acceptance criteria:**

- [ ] Every MVP state and priority is covered deterministically.
- [ ] A complete snapshot restores the correct state.
- [ ] Unknown events neither crash the host nor cause a false alarm.

## PoC 3 — Simulated serial protocol

Keep serial transport behind an interface and use an in-memory fake that can
delay, drop, or reject responses. Cover accepted and rejected handshakes,
protocol mismatch, timeout, reset plus full snapshot, interruption during sync,
missing `PONG`, and reconnect.

**Acceptance criteria:**

- [ ] Unrelated or incompatible devices are rejected.
- [ ] Timeout and reconnect do not block the application.
- [ ] Every connection receives a complete snapshot.
- [ ] Disconnect does not leave misleading host state.

## PoC 4 — Physical USB microcontroller

Use minimal firmware with handshake, reset, `SET`, `PING`, and an LED. Enumerate
ports with `serialport`, pre-filter by USB metadata, and require the handshake.

Test connection after host startup, unplug/replug, firmware restart, host restart,
an unrelated or non-responsive port where safe, and a port held by another
application.

**Acceptance criteria:**

- [x] The correct device is found without a hard-coded COM port.
- [x] An unrelated device receives no status commands.
- [x] Reconnect performs reset plus full synchronization.
- [ ] A blocked port causes no crash and is retried later.
- [x] A physical LED shows at least `RUNNING`, `ASKING`, and `FINISHED`.

## PoC 5 — End-to-end and endurance

```text
OpenCode service → host bridge → USB/BLE → microcontroller → RGB LED
```

Test a real session, concurrent sessions, microcontroller reconnect during work,
OpenCode reconnect, and at least two hours of operation. Where practical, test
Windows lock, standby, and resume.

**Acceptance criteria:**

- [ ] Display state remains correct throughout the test matrix.
- [ ] Normal reconnect never requires a manual restart.
- [ ] Missed events or board restarts never leave a permanently stale display.
- [ ] Logs and resource use remain bounded.
- [ ] Two hours pass without an unhandled failure.

## Final decision

After PoC 5, record **Go**, **Go with changes**, or **No-go** in
`DECISIONS.md`. Before final soldering, board metadata, LED electrical design,
display model, status colors, reconnect behavior, and the endurance result must
be known.

Record each stage in `PROGRESS.md` using:

```text
Date:
PoC stage:
Result: passed | partially passed | blocked
Test environment:
Observations:
Deviations:
Next step:
```
