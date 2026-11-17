# Host Bridge

Die Host Bridge beobachtet den lokalen OpenCode-Service, leitet daraus einen
datenschutzarmen Gesamtstatus ab und überträgt ihn per USB-Serial oder
Bluetooth LE an das Statuslicht.

## Voraussetzungen

- Windows
- Node.js 22 oder neuer
- OpenCode V2 mit lokalem Background Service
- Pro-Micro-nRF52840-Board mit der Firmware aus `../firmware/`
- für den Bau des Windows-BLE-Helpers: Go 1.25 oder neuer

## Installation

```powershell
cd .\host
npm install
```

## Ausführen

Während der Entwicklung:

```powershell
npm run dev
```

Kompilierte Variante:

```powershell
npm run build
npm start
```

Beenden mit `Ctrl+C`.

Die Anwendung gibt JSON Lines aus, beispielsweise:

```json
{"timestamp":"2026-11-16T15:30:00.000Z","kind":"configuration","transportMode":"both","transports":["usb","bluetooth"]}
{"timestamp":"2026-11-12T12:00:00.000Z","kind":"connected","overallStatus":"running","sessions":1}
{"timestamp":"2026-11-12T12:00:03.000Z","kind":"event","event":"permission.asked","sessionId":"ses_...","sessionStatus":"asking","overallStatus":"asking"}
{"timestamp":"2026-11-16T12:15:43.884Z","kind":"serial_connected","path":"COM6","firmware":"0.3.0","leds":1,"status":"running","role":"active"}
{"timestamp":"2026-11-16T15:03:38.405Z","kind":"bluetooth_connected","path":"Bluetooth OCStatus (...)","firmware":"0.3.0","leds":1,"status":"running","role":"standby"}
```

Es werden keine Prompts, Formularinhalte, Ressourcen oder Fehlermeldungen aus
OpenCode-Events ausgegeben. Die Ausgabe enthält nur Zeit, Eventtyp, Session-ID
und abgeleitete Zustände.

## Konfiguration

Die Dauer des Zustands `FINISHED` beträgt standardmäßig 60 Sekunden. Für einen
kurzen Test kann sie über eine Umgebungsvariable geändert werden:

```powershell
$env:OPENCODE_STATUS_FINISHED_HOLD_MS = "5000"
npm run dev
```

Zusätzlich gleicht die Anwendung den Zustand standardmäßig alle fünf Sekunden
mit der OpenCode-API ab. Dadurch werden Änderungen erkannt, für die kein
Live-Event gesendet wurde. Das Intervall lässt sich für Tests anpassen:

```powershell
$env:OPENCODE_STATUS_POLL_INTERVAL_MS = "2000"
npm run dev
```

Bei einer erkannten Abweichung entstehen synthetische Events:

- `host.session.inactive`: Eine zuvor bekannte Session ist nicht mehr aktiv.
- `host.session.reconciled`: Eine aktive Session oder ihre offenen Anfragen
  wurden über den Snapshot neu erkannt.

Unveränderte Poll-Ergebnisse erzeugen weder Events noch Logausgaben. Eine
Session in `FINISHED` bleibt zunächst für ihre konfigurierte Haltezeit sichtbar
und wird erst danach durch die Abstimmung entfernt.

Die LED-Helligkeit liegt standardmäßig bei 128 von 255:

```powershell
$env:OPENCODE_STATUS_BRIGHTNESS = "96"
npm run dev
```

Standardmäßig hält die Bridge USB und Bluetooth gleichzeitig verbunden. USB ist
der bevorzugte aktive Transport; Bluetooth bleibt als überwachtes Backup im
Standby. Voraussetzung ist, dass der BLE-Helper nach Quelländerungen einmal
gebaut wurde:

```powershell
npm run build:bluetooth
npm run dev
```

Zur Laufzeit benötigt der bereits gebaute Helper kein Go. Für Diagnose und
isolierte Tests kann ein einzelner Transport gewählt werden:

```powershell
$env:OPENCODE_STATUS_TRANSPORT = "usb"
npm run dev

$env:OPENCODE_STATUS_TRANSPORT = "bluetooth"
npm run dev
```

Erlaubt sind `both` (USB-Primary mit BLE-Backup, Standard), `usb` und
`bluetooth`. `npm run dev:bluetooth` ist eine Kurzform für den
Bluetooth-only-Modus.

## USB-Geräteerkennung

Die Bridge listet verfügbare Ports auf, öffnet aber nicht wahllos alle Geräte.
Für den aktuellen PoC werden nur Ports mit der bestätigten Anwendungskennung
VID/PID `239A:0029` betrachtet. Der UF2-Bootloader `239A:00B3` und fremde
Bluetooth-COM-Ports werden nicht geöffnet.

Jeder Kandidat muss anschließend auf `HELLO 1` mit einer gültigen
`DEVICE OPENCODE_STATUS`-Antwort reagieren. Erst danach sendet die Bridge:

```text
RESET_STATE
BRIGHTNESS <0-255>
SET 0 <vollständiger Gesamtstatus>
SYNC_COMPLETE
```

Die COM-Port-Nummer wird nie fest codiert. Alle fünf Sekunden prüft
`PING`/`PONG` die Verbindung. Nach einem Fehler oder Abziehen schließt die
Bridge die Verbindung, sucht erneut und überträgt nach dem Reconnect immer den
vollständigen aktuellen Hoststatus.

## Bluetooth-Geräteerkennung

Der kleine Go-Helper unter `ble-helper/` verwendet die normalen Windows-WinRT-
Bluetooth-APIs. Ein Austausch des Bluetooth-Treibers und eine manuelle Kopplung
in den Windows-Einstellungen sind nicht erforderlich.

Die Suche filtert zuerst auf den Namen `OCStatus` und den projektspezifischen
128-Bit-GATT-Dienst. Die BLE-Adresse wird nur protokolliert und nicht fest
konfiguriert. Nach dem Verbinden muss das Board zusätzlich den gleichen
`HELLO 1`-Handshake wie über USB bestehen. Danach gelten Vollsynchronisation,
`PING`/`PONG`, Timeout und Reconnect für beide Transportwege gleich.

USB und Bluetooth führen Suche, Handshake, Verbindungsüberwachung und Reconnect
unabhängig aus. Solange USB verfügbar ist, erhält nur USB die Statusbefehle;
Bluetooth prüft seine Standby-Verbindung mit `PING`/`PONG`. Bei einem USB-
Disconnect wird das bereits verbundene BLE-Backup sofort aktiv und führt vor
dem ersten Statusupdate eine vollständige Synchronisation aus. Nach einem
erfolgreichen USB-Reconnect synchronisiert USB den aktuellen Zustand und BLE
kehrt in den Standby zurück.

## Qualitätsprüfungen

```powershell
npm test
npm run check
npm run build
```

Die Tests benötigen weder OpenCode noch USB-Hardware. Der echte OpenCode-Adapter
wird im manuellen PoC zusätzlich gegen den lokalen Service geprüft.

## Aufbau

```text
src/core/                 Reines Zustandsmodell, ohne SDK- oder I/O-Abhängigkeit
src/ports/                Schnittstellen für Eingabe und Ausgabe
src/application/          Reconnect- und Ablaufsteuerung
src/adapters/opencode/    OpenCode SDK, Snapshot und Event-Normalisierung
src/adapters/console/     Datenschutzarme JSON-Ausgabe
src/adapters/serial/      Windows-Serialport und zeilenbasierte Antworten
src/adapters/bluetooth/   Start und Überwachung des Windows-BLE-Helpers
ble-helper/               Go/WinRT-GATT-Client für den eigenen Statusdienst
test/                     Unit- und Anwendungstests mit Fakes
```

Der Serial-Adapter ist als zusätzliche Ausgabe ergänzt, ohne den OpenCode-
Adapter oder die Zustandsmaschine mit Hardwaredetails zu koppeln.

## Manueller USB-Test

1. Board anschließen und sicherstellen, dass die Firmware nicht im
   `NICENANO`-Bootloader wartet.
2. Für einen isolierten Test `OPENCODE_STATUS_TRANSPORT=usb` setzen und
   `npm run dev` starten.
3. Auf `serial_connected` mit Firmwareversion und synchronisiertem Status achten.
4. Eine OpenCode-Aufgabe starten und die rote LED beobachten.
5. Board abziehen und erneut anschließen; die Bridge muss ohne feste
   COM-Port-Nummer wieder verbinden und den aktuellen Zustand wiederherstellen.

## Manueller Bluetooth-Test

1. Firmware 0.3.0 starten; USB darf dabei nur als Stromversorgung dienen.
2. Im Hostordner `npm run dev:bluetooth` starten.
3. Auf `bluetooth_connected` mit Firmware `0.3.0` achten. Es darf in diesem Lauf
   kein `serial_connected` erscheinen.
4. Eine OpenCode-Aufgabe und eine Rückfrage starten; `RUNNING`, `ASKING` und
   `FINISHED` an der roten LED prüfen.
5. Für einen vollständig kabellosen Test das Board nur dann von USB trennen,
   wenn ein geeigneter, korrekt gepolter 3,7-V-Einzellenakku angeschlossen ist.

## Manueller Failover-Test

1. Keine Transportvariable setzen und `npm run dev` starten.
2. `serial_connected` mit Rolle `active` und `bluetooth_connected` mit Rolle
   `standby` abwarten.
3. USB unterbrechen, während das Board weiterhin mit Strom versorgt wird.
4. `bluetooth_role_changed` mit Rolle `active` abwarten und Statusänderungen
   testen.
5. USB wiederherstellen: USB muss wieder `active`, Bluetooth wieder `standby`
   werden.

## Manueller PoC 1

1. `npm run dev` starten.
2. In OpenCode eine normale Aufgabe starten und abschließen.
3. Eine Frage bzw. ein Formular und eine Berechtigungsanfrage beobachten.
4. Eine Ausführung unterbrechen und, wenn kontrolliert möglich, einen Fehler
   auslösen.
5. Zwei Sessions parallel ausführen.
6. OpenCode-Service oder Host Bridge neu verbinden und den Start-Snapshot prüfen.
7. Ergebnisse in `../docs/PROGRESS.md` dokumentieren.
