# Architektur

## Übersicht

```text
OpenCode Background Service
          │
          │ HTTP API + Live-Event-Stream
          ▼
Windows Host Bridge
  ├─ OpenCode-Adapter
  ├─ Zustandsverwaltung
  ├─ Geräteerkennung
  └─ Serial-Protokoll
          │
          │ USB CDC / virtueller COM-Port
          ▼
Mikrocontroller-Firmware
  ├─ Protokollparser
  ├─ Verbindungsüberwachung
  └─ LED-Renderer
```

## Host Bridge

Die Host Bridge soll als normale Hintergrundanwendung beginnen. Eine spätere
Ausführung über Windows-Autostart oder als Dienst wird erst nach dem Prototyp
entschieden.

Die aktuelle Implementierung liegt in `host/` und verwendet eine Ports-und-
Adapter-Struktur. Der reine Kern kennt weder OpenCode noch USB. Die
OpenCode-spezifischen Eventdaten werden direkt am Adapter auf minimale interne
Events reduziert. Eine Konsolenausgabe ist der erste Ausgabeadapter; Serial
wird später als zusätzlicher Adapter ergänzt.

### OpenCode-Adapter

- Verbindet sich über `@opencode/client` mit dem lokalen OpenCode-Service.
- Verwendet die Service-Erkennung und deren Authentifizierungsheader.
- Liest beim Start bzw. Reconnect den aktuellen Zustand ein.
- Abonniert relevante Events, unter anderem:
  - `session.execution.started`
  - `session.execution.succeeded`
  - `session.execution.failed`
  - `session.execution.interrupted`
  - `session.idle`
  - `permission.asked`
  - `permission.replied`
  - `form.created`
  - `form.replied`
  - `form.cancelled`
  - `session.deleted`
- Der OpenCode-Event-Stream ist live-only. Nach jeder Neuverbindung ist daher
  eine vollständige Resynchronisation erforderlich.
- Weil nicht jeder Wechsel aus der aktiven Session-Menge ein Live-Event erzeugt,
  wird der aktive Snapshot zusätzlich periodisch abgefragt. Nur erkannte
  Differenzen werden als interne Events `host.session.inactive` bzw.
  `host.session.reconciled` weitergegeben.
- Ein fehlender Snapshot-Eintrag entfernt `FINISHED` nicht vor Ablauf seiner
  Haltezeit. Nach dem Wechsel zu `IDLE` entfernt der nächste Poll die Session.
- Die relevanten OpenCode-Endpunkte sind teilweise experimentell; Updates
  können Anpassungen notwendig machen.

### Zustandsverwaltung

Der Host hält einen Zustand pro Session und leitet daraus den anzuzeigenden
Gesamtzustand oder einzelne LED-Zustände ab. `FINISHED` wird für eine
konfigurierbare Zeit gehalten und wechselt danach zu `IDLE`.

Die Zustandsverwaltung ist unabhängig von der Serial-Verbindung. Dadurch kann
ein neu angeschlossenes Gerät sofort vollständig synchronisiert werden.

### Geräteerkennung

1. Serialports in einem moderaten Intervall auflisten, zunächst etwa alle zwei
   Sekunden.
2. Nur plausible USB-Geräte anhand ihrer Metadaten als Kandidaten auswählen.
3. Kandidaten einzeln öffnen und einen zeitlich begrenzten Handshake ausführen.
4. Ausschließlich ein Gerät mit der erwarteten Kennung akzeptieren.
5. Bei Trennung Verbindung schließen und Suche fortsetzen.

Das Öffnen aller vorhandenen Ports ohne Vorfilterung soll vermieden werden, da
dies andere Geräte beeinflussen kann. Die konkrete Kombination aus VID/PID,
Produktstring und Seriennummer wird nach Auswahl der Hardware festgelegt.

## Serial-Protokoll

Für den Prototyp ist ein versioniertes, zeilenbasiertes Textprotokoll geplant.
Es ist leicht mit einem Serial-Monitor zu untersuchen und benötigt auf dem
Mikrocontroller wenig Speicher.

### Beispielablauf

```text
HOST -> HELLO 1
MCU  -> DEVICE OPENCODE_STATUS protocol=1 firmware=0.1 leds=8
HOST -> RESET_STATE
MCU  -> OK
HOST -> SET 0 RUNNING
MCU  -> OK
HOST -> SYNC_COMPLETE
MCU  -> OK
```

### Geplante Befehle

```text
HELLO <protocol-version>
RESET_STATE
SET <led-index> <state>
BRIGHTNESS <0-255>
SYNC_COMPLETE
PING
```

Geplante Antworten:

```text
DEVICE OPENCODE_STATUS protocol=<n> firmware=<version> leds=<count>
OK
PONG
ERROR <code>
```

Ein Protokollparser darf unbekannte Befehle nicht als gültig bestätigen. Die
maximale Zeilenlänge und Timeouts werden bei der Firmware-Implementierung
festgelegt.

## Reset-Verhalten

`RESET_STATE` bedeutet einen logischen Anzeigenreset. Ein Hardware-Reset über
DTR/RTS ist nicht erforderlich und soll nicht als gemeinsame Voraussetzung für
unterschiedliche Boards verwendet werden. Falls ein Board beim Öffnen des Ports
automatisch neu startet, wartet die Host Bridge vor dem Handshake auf dessen
Bootphase.

## Fehler- und Reconnect-Strategie

- Serial-Fehler: Port schließen, Gerät verwerfen, Suche neu starten.
- Ausbleibendes `PONG`: Verbindung als verloren behandeln.
- OpenCode-Stream beendet: mit Backoff neu verbinden und Zustand neu einlesen.
- Host-Neustart: OpenCode- und Gerätezustand vollständig neu aufbauen.
- Firmware-Neustart: Handshake und vollständige Synchronisation wiederholen.

## Sicherheits- und Datenschutzgrenzen

- Über Serial werden nur abstrahierte Zustände, keine Prompts oder Dateiinhalte
  übertragen.
- Die lokale OpenCode-Service-Authentifizierung wird verwendet; Zugangsdaten
  werden nicht fest codiert.
- Fremde Serial-Geräte werden nicht dauerhaft geöffnet oder beschrieben.
