# Entscheidungen

Kurze Aufzeichnung verbindlicher technischer Entscheidungen. Neue Einträge
erhalten Datum, Status, Entscheidung und Begründung.

## 2026-11-12 – Host als maßgebliche Zustandsquelle

**Status:** Angenommen

Die Windows Host Bridge hält den vollständigen Session- und Anzeigezustand. Der
Mikrocontroller rendert nur den zuletzt synchronisierten Zustand.

**Begründung:** Nach einem Firmware-Neustart oder erneuten Anschließen kann der
Host die Anzeige vollständig wiederherstellen, ohne auf neue OpenCode-Events zu
warten.

## 2026-11-12 – Geräteerkennung mit Filter und Handshake

**Status:** Angenommen

Serialports werden zunächst anhand ihrer USB-Metadaten gefiltert. Ein Gerät wird
erst nach erfolgreichem, versioniertem Handshake verwendet.

**Begründung:** VID/PID sind bei Entwicklungsboards und USB-Serial-Chips nicht
immer eindeutig. Der Handshake verhindert, dass fremde Geräte Befehle erhalten.

## 2026-11-12 – Logischer statt hardwareabhängiger Reset

**Status:** Angenommen

Nach einer Verbindung sendet der Host `RESET_STATE` und danach einen kompletten
Snapshot. Ein DTR/RTS-Hardware-Reset ist keine Voraussetzung.

**Begründung:** Das Verhalten beim Öffnen eines COM-Ports unterscheidet sich je
nach Mikrocontroller und Bootloader.

## 2026-11-12 – Zeilenbasiertes Protokoll für den Prototyp

**Status:** Vorläufig angenommen

Der erste Prototyp verwendet ein einfaches, versioniertes Textprotokoll.

**Begründung:** Es ist mit einem Serial-Monitor leicht zu testen und auf kleinen
Mikrocontrollern unkompliziert zu implementieren. Nach dem Prototyp wird geprüft,
ob Prüfsummen oder ein binäres Framing notwendig sind.

## 2026-11-12 – Entkoppelter Host mit Ports und Adaptern

**Status:** Angenommen

OpenCode-Quelle, Zustandsverwaltung, Ablaufsteuerung und Ausgaben werden durch
kleine Schnittstellen getrennt. Das Kernmodell importiert weder das OpenCode-SDK
noch spätere Serial-Bibliotheken.

**Begründung:** Eventfolgen, Reconnect und Zeitverhalten lassen sich ohne
OpenCode-Service oder Hardware automatisiert testen. Der spätere Serial-Adapter
kann ergänzt werden, ohne die Zustandslogik umzubauen.

## 2026-11-12 – Datenschutzarme interne OpenCode-Events

**Status:** Angenommen

Der OpenCode-Adapter übernimmt ausschließlich Eventtyp, Session-ID,
Zeitstempel und technisch erforderliche Request-IDs. Prompt-, Formular-,
Ressourcen- und Providerinhalte werden nicht in das Kernmodell oder die normale
Konsolenausgabe übernommen.

**Begründung:** Die Anzeige benötigt nur Zustände. Eine frühe Normalisierung
reduziert das Risiko, sensible Inhalte versehentlich zu protokollieren oder über
USB zu übertragen.

## 2026-11-12 – Unterbrechung wird als Idle dargestellt

**Status:** Vorläufig angenommen

Eine durch Benutzer, Shutdown, Superseding oder Inaktivität unterbrochene
Ausführung wird als `IDLE` und nicht als `ERROR` dargestellt.

**Begründung:** Eine Unterbrechung ist nicht zwingend ein technischer Fehler.
Diese Darstellung wird im praktischen PoC geprüft.

## 2026-11-12 – Live-Events durch periodische Abstimmung ergänzen

**Status:** Angenommen

Zusätzlich zum OpenCode-Event-Stream wird der aktive Snapshot standardmäßig alle
fünf Sekunden neu geladen. Nur tatsächliche Differenzen erzeugen interne
Host-Events. Das Intervall ist konfigurierbar.

**Begründung:** Der praktische Test zeigte, dass beim Inaktivwerden bzw.
Schließen einer Session kein passendes Live-Event eintreffen muss. Ohne
Abstimmung bleibt der lokale Zustand bis zum Neustart fälschlich auf `IDLE`.
Polling bleibt ein Fallback; unveränderte Ergebnisse erzeugen kein Log-Rauschen.

## 2026-11-16 – Pro Micro nRF52840 als PoC-Board

**Status:** Angenommen

Für den USB- und LED-Prototyp wird ein nice!nano-v2-kompatibles Pro-Micro-
nRF52840-Board verwendet. Die erste Firmware nutzt nur USB-CDC und die
steuerbare Board-LED an `P0.15`. Bluetooth bleibt im USB-PoC deaktiviert und
wird später als alternative Verbindung getrennt bewertet.

**Begründung:** Das vorhandene Board besitzt natives USB, einen bestätigten
Adafruit-UF2-Bootloader und eine lötfrei nutzbare Status-LED. So können
Handshake, Geräteerkennung und Reconnect vor der Verdrahtung externer LEDs
getestet werden. Eine getrennte Bluetooth-Stufe hält den kabelgebundenen
Basispfad klein und diagnostizierbar.

## 2026-11-16 – TinyGo-Firmware für den ersten PoC

**Status:** Vorläufig angenommen

Die erste Firmware wird mit TinyGo für das offizielle Board-Target `nicenano`
gebaut. Das Statusprotokoll und der LED-Renderer enthalten keine
Bluetooth-Abhängigkeit.

**Begründung:** Das Board-Target entspricht der ausgelesenen Board-ID, stellt
USB-CDC sowie den korrekten LED-Pin bereit und erzeugt direkt eine UF2-Datei.
Der zuerst geprüfte nRFMicro-Arduino-Core 1.0.2 erzeugte mit der aktuellen
Arduino CLI 1.6.0 wegen seines Paketnamens keinen gültigen FQBN und wird daher
nicht zur Projektbasis. Vor dem Bluetooth-Ausbau wird TinyGos nRF52-BLE-Support
gesondert praktisch bewertet.

## 2026-11-16 – Anzeige fällt ohne Hostaktivität auf OFF zurück

**Status:** Angenommen

Die Host Bridge überwacht die gewählte USB- oder BLE-Verbindung alle fünf
Sekunden mit `PING`/`PONG`. Empfängt die Firmware 15 Sekunden lang weder einen
Statusbefehl noch einen Ping, setzt sie die Anzeige selbstständig auf `OFF`.

**Begründung:** Der Host bleibt die maßgebliche Zustandsquelle. Bei einem
Host-Absturz oder einer unterbrochenen USB-Verbindung darf die Firmware einen
alten Zustand wie `RUNNING` oder `ERROR` nicht unbegrenzt weiter anzeigen. Das
Zeitfenster toleriert einzelne verzögerte Pings, ohne einen veralteten Status
dauerhaft sichtbar zu lassen.

## 2026-11-16 – Bluetooth LE als explizit wählbarer Transport

**Status:** Ersetzt durch USB-Primary mit Bluetooth-Standby

Firmware 0.3.0 stellt das vorhandene Statusprotokoll parallel über USB-CDC und
einen eigenen BLE-GATT-Dienst bereit. Die Host Bridge öffnet pro Lauf genau
einen Transport; `usb` bleibt Standard, `bluetooth` wird über Konfiguration
ausgewählt. Automatischer Parallelbetrieb oder stiller Wechsel ist zunächst
ausgeschlossen.

Unter Windows übernimmt ein kleiner Go-Helper den nativen WinRT-GATT-Zugriff
und tauscht mit dem Node-Host ausschließlich strukturierte lokale JSON-Nachrichten
aus. BLE-Kandidaten werden anhand von Name und eigenem Service vorgefiltert und
anschließend mit `HELLO 1` verifiziert. Eine BLE-Adresse wird nicht fest
gespeichert.

**Begründung:** TinyGos `nicenano`-Target enthält bereits Nordic S140 und wurde
am realen Board erfolgreich mit `tinygo.org/x/bluetooth` getestet. WinRT nutzt
den normalen Windows-Bluetooth-Treiber, ohne ihn für eine HCI-Bibliothek ersetzen
zu müssen. Die explizite Transportwahl verhindert konkurrierende Reset- und
Statusbefehle über USB und Funk. Der aktuelle offene GATT-Zugriff dient nur dem
lokalen PoC; der Handshake ist Geräteidentifikation, keine kryptografische
Authentifizierung.

## 2026-11-16 – USB-Primary mit Bluetooth-Standby als Standard

**Status:** Angenommen

Die Host Bridge hält ohne besondere Konfiguration USB-CDC und Bluetooth LE
gleichzeitig verbunden. USB ist der bevorzugte aktive Kanal. BLE bleibt nach
Handshake mit `PING`/`PONG` überwacht im Standby und erhält keine Statusbefehle,
solange USB verfügbar ist. Bei USB-Ausfall aktiviert der Host BLE und führt dort
eine vollständige Synchronisation durch. Nach USB-Reconnect übernimmt USB nach
eigener Vollsynchronisation wieder. `OPENCODE_STATUS_TRANSPORT=usb` bzw.
`bluetooth` bleibt für Diagnose verfügbar; `both` ist der Standard.

**Begründung:** USB soll im Normalbetrieb deterministisch Vorrang haben, während
BLE ohne erneute Suche sofort übernehmen kann. Getrennte Verbindungsloops halten
das Backup warm, ein Koordinator erlaubt aber immer nur einem Kanal
Statusbefehle. Der reale Test mit Firmware 0.3.0 bestätigte USB `active`, BLE
`standby`, die Aktivierung von BLE nach kontrolliertem USB-Fehler und den
automatischen Wechsel zurück zu USB nach Reconnect.

## 2026-11-16 – Akkuspannung über internen VDDH-Kanal

**Status:** Angenommen

Auf dem geprüften nice!nano-kompatiblen Clone wird die Versorgungsspannung über
den internen nRF52840-SAADC-Eingang `VDDH/5` gemessen. Der Diagnosebefehl
`SUPPLY` liefert ADC-Rohwert, Spannung am internen Eingang und kalibrierte
Versorgungsspannung. Der board-spezifische Faktor `4230/4295` korrigiert die
unkalibrierten 4,295 V auf die gleichzeitig per Multimeter gemessenen 4,230 V.
Der beim originalen nice!nano erwartete Akku-Spannungsteiler an `P0.04` wird auf
diesem Clone nicht zur Ladezustandsbestimmung verwendet.

**Begründung:** Reale Tests ergaben für `P0.04` auch im Akkubetrieb nur ungefähr
0,5 V. `VDDH/5` unterschied dagegen USB mit etwa 4,91 V zuverlässig vom Akku
mit unkalibriert 4,295 V. Nach der Kalibrierung meldeten drei BLE-Abfragen im
reinen Akkubetrieb 4,220 V, 4,230 V und 4,230 V bei einer Multimeterreferenz von
4,230 V. Damit ist eine grobe Ladezustandsschätzung ohne zusätzliche
Verdrahtung möglich. Prozentstufen und Hysterese werden getrennt festgelegt und
dürfen nicht als präzise Kapazitätsmessung verstanden werden.

## 2026-11-16 – Zwei getrennt verdrahtete RGB-Augen

**Status:** Vorläufig angenommen

Zwei 4-Pin-RGB-LEDs mit gemeinsamer Kathode werden als Augen verwendet. Die
Firmware spiegelt ihre Ausgabe zunächst, die spätere Verdrahtung reserviert aber
Rot, Grün und Blau je Auge separat. Damit bleiben beide Augen später unabhängig
steuerbar. Jeder der sechs Kanäle erhält einen eigenen Vorwiderstand.

**Begründung:** Gemeinsam verdrahtete Farbkanäle würden GPIOs sparen, eine
spätere unabhängige Darstellung aber nur durch Neuverdrahtung ermöglichen.
Konkrete Pins, Widerstände und Treiber hängen noch von Durchlassspannung und
gewünschtem Kanalstrom der LEDs ab.

## 2026-11-16 – Start- und Verbindungsanzeige in der Firmware

**Status:** Angenommen

Vor dem Hoststatus zeigt die Firmware einen RGB-Funktionstest, danach dreimal
das gemessene Akkudrittel und anschließend bis zum Handshake ein blaues Pulsieren.
Ein gültiger USB- oder BLE-Handshake wird mit drei kurzen blauen Blinkern
bestätigt. Die Drittelgrenzen sind vorläufig 3,60 V und 3,90 V; eine erkannte
USB-Versorgung über 4,40 V wird gelb als „Akkustand unbekannt“ dargestellt. Bei
Host-Timeout kehrt die Anzeige in die Verbindungssuche zurück.

**Begründung:** Die Firmware kennt Boot, lokale Versorgung und
Transportaktivität unmittelbar und kann diese Phasen ohne Hostverbindung
anzeigen. Der Host bleibt weiterhin alleinige Quelle des nachfolgenden
OpenCode-Status. Die Statusfarben selbst werden später festgelegt.
