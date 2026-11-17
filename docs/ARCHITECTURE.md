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
  └─ gemeinsamer Protokollzustand
          │
          │ USB CDC oder Bluetooth LE/GATT
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
Adapter-Struktur. Der reine Kern kennt weder OpenCode noch USB oder BLE. Die
OpenCode-spezifischen Eventdaten werden direkt am Adapter auf minimale interne
Events reduziert. Konsolen- und Geräteausgabe sind getrennte Ausgabeadapter.
USB und Bluetooth nutzen dieselbe Protokoll- und Synchronisationslogik; der
Host startet standardmäßig beide Adapter. USB ist Primary, BLE bleibt als warm
verbundenes Backup im Standby. Beide laufen unabhängig vom OpenCode-Reconnect
und halten immer den zuletzt vom Host abgeleiteten Gesamtstatus zur möglichen
Synchronisation bereit.

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

Die Zustandsverwaltung ist unabhängig von der Geräteverbindung. Dadurch kann
ein neu angeschlossenes Gerät sofort vollständig synchronisiert werden.

### Geräteerkennung

1. Serialports in einem moderaten Intervall auflisten, zunächst etwa alle zwei
   Sekunden.
2. Nur plausible USB-Geräte anhand ihrer Metadaten als Kandidaten auswählen.
3. Kandidaten einzeln öffnen und einen zeitlich begrenzten Handshake ausführen.
4. Ausschließlich ein Gerät mit der erwarteten Kennung akzeptieren.
5. Bei Trennung Verbindung schließen und Suche fortsetzen.

Nach erfolgreichem Handshake sendet der Host einen logischen Reset, Helligkeit,
den vollständigen aktuellen Gesamtstatus und `SYNC_COMPLETE`. Laufende
Statuswechsel werden danach als `SET 0 <STATE>` übertragen. Ein `PING`/`PONG`
alle fünf Sekunden erkennt getrennte Verbindungen; nach jedem Reconnect wird
erneut vollständig synchronisiert.

Das Öffnen aller vorhandenen Ports ohne Vorfilterung soll vermieden werden, da
dies andere Geräte beeinflussen kann. Die konkrete Kombination aus VID/PID,
Produktstring und Seriennummer wird nach Auswahl der Hardware festgelegt.

Für das nice!nano-kompatible PoC-Board ist die TinyGo-Anwendungsfirmware unter
Windows als VID/PID `239A:0029` mit der USB-Produktbeschreibung `nice!nano`
bestätigt. Der UF2-Bootloader verwendet dagegen `239A:00B3` und ist kein
Kandidat für Statusbefehle. Auch nach diesem Metadatenfilter bleibt der
`HELLO 1`/`DEVICE OPENCODE_STATUS`-Handshake zwingend.

Für Bluetooth filtert ein Go-Helper über die Windows-WinRT-API zunächst auf den
lokalen Namen `OCStatus` und den projektspezifischen GATT-Dienst
`78B13697-8A60-4161-A989-69661675E94A`. Er entdeckt die BLE-Adresse dynamisch,
abonniert die TX-Characteristic und reicht nur zeilenweise
Protokollanforderungen und -antworten per JSON Lines an den Node-Host weiter.
Auch hier bleibt der Protokoll-Handshake zwingend.

Der Standardmodus `both` startet USB- und BLE-Verbindung parallel. Jeder Adapter
führt Suche, Handshake, Keepalive und Reconnect unabhängig aus. Solange USB
verfügbar ist, sendet nur USB Statusbefehle; BLE bleibt mit `PING`/`PONG`
verifiziert. Beim USB-Disconnect aktiviert der Koordinator BLE und erzwingt dort
eine vollständige Synchronisation. Nach einem USB-Reconnect synchronisiert USB
den aktuellen Zustand und übernimmt wieder; BLE geht zurück in den Standby. Die
Einzelmodi `usb` und `bluetooth` bleiben für Diagnose verfügbar.

## Transportprotokoll

Der Prototyp verwendet über USB und BLE dasselbe versionierte, zeilenbasierte
Textprotokoll. Es ist leicht zu untersuchen und benötigt auf dem Mikrocontroller
wenig Speicher. BLE teilt längere Zeilen transparent in GATT-Pakete auf.

### Beispielablauf

```text
HOST -> HELLO 1
MCU  -> DEVICE OPENCODE_STATUS protocol=1 firmware=0.3.3 leds=1
HOST -> RESET_STATE
MCU  -> OK
HOST -> SET 0 RUNNING
MCU  -> OK
HOST -> SYNC_COMPLETE
MCU  -> OK
```

### Unterstützte Befehle

```text
HELLO <protocol-version>
RESET_STATE
SET <led-index> <state>
BRIGHTNESS <0-255>
SYNC_COMPLETE
PING
BATTERY
SUPPLY
DISPLAY
```

Unterstützte Antworten:

```text
DEVICE OPENCODE_STATUS protocol=<n> firmware=<version> leds=<count>
OK
PONG
BATTERY raw=<n> adc_mv=<n> source_mv=<n>
SUPPLY raw=<n> adc_mv=<n> supply_mv=<n>
DISPLAY phase=<phase> battery=<level> supply_mv=<n> rgb=<r>,<g>,<b>
ERROR <code>
```

`BATTERY` ist ein Diagnosebefehl für den beim originalen nice!nano an `P0.04`
erwarteten Spannungsteiler. Dieser Pfad bildet auf dem geprüften Clone nicht die
Akkuspannung ab. Maßgeblich ist daher `SUPPLY`: Der nRF52840 misst `VDDH` über
seinen internen Teiler `VDDH/5`, ohne einen externen GPIO oder zusätzliche
Verdrahtung. `supply_mv` wird mit dem am realen Board gegen ein Multimeter
bestimmten Faktor `4230/4295` kalibriert.

Der LED-Renderer besitzt vor dem eigentlichen Hoststatus eigene, nicht
blockierende Phasen: RGB-Funktionstest, Akku-Drittel, blaues
Verbindungspulsieren und drei kurze Verbindungsblinker. `DISPLAY` erlaubt die
Diagnose der simulierten RGB-Ausgabe. Beide geplanten RGB-Augen werden zunächst
gespiegelt; sechs getrennte PWM-Kanäle halten eine spätere unabhängige
Ansteuerung ohne Neuverdrahtung offen. Die endgültigen Statusfarben bleiben ein
TODO.

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

- USB- oder BLE-Fehler: Verbindung schließen, Gerät verwerfen, Suche neu starten.
- USB-Ausfall bei verfügbarem BLE: BLE aktivieren und vollständig synchronisieren.
- USB-Reconnect: USB synchronisieren und wieder als Primary auswählen.
- Ausbleibendes `PONG`: Verbindung als verloren behandeln.
- Fehlende Hostaktivität: Firmware verwirft nach 15 Sekunden den alten Status
  und kehrt zum blauen Verbindungspulsieren zurück.
- OpenCode-Stream beendet: mit Backoff neu verbinden und Zustand neu einlesen.
- Host-Neustart: OpenCode- und Gerätezustand vollständig neu aufbauen.
- Firmware-Neustart: Handshake und vollständige Synchronisation wiederholen.

## Sicherheits- und Datenschutzgrenzen

- Über USB und BLE werden nur abstrahierte Zustände, keine Prompts oder
  Dateiinhalte übertragen.
- Die lokale OpenCode-Service-Authentifizierung wird verwendet; Zugangsdaten
  werden nicht fest codiert.
- Fremde Serial-Geräte werden nicht dauerhaft geöffnet oder beschrieben.
- BLE-Kandidaten werden auf eigenen Service und Namen vorgefiltert; fremde
  GATT-Geräte erhalten keine Schreibzugriffe.
- BLE ist im aktuellen PoC offen und ungekoppelt. Der Protokoll-Handshake
  identifiziert das Gerät, stellt aber keine kryptografische Authentifizierung
  dar.
