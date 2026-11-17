# Fortschritt

Zuletzt aktualisiert: 2026-11-16

## Aktueller Status

**Phase:** Proof of Concept / PoC 1

Der Host-Kern, die OpenCode-Anbindung und die Konsolenausgabe sind ohne USB
implementiert. Ein nice!nano-v2-kompatibles Pro-Micro-nRF52840-Board wurde unter
Windows identifiziert. Firmware und Hostadapter laufen mit dem realen Board über
USB-CDC und Bluetooth LE. Gerätefilter, Handshake, Vollsynchronisation und reale
OpenCode-End-to-End-Läufe waren über beide Transportwege erfolgreich.
Der neue Standardmodus hält USB als Primary und BLE als warmes Backup verbunden.
Kontrollierter Failover und Failback, physischer USB-Reconnect und
Firmware-Watchdog sind praktisch bestätigt.

## Erledigt

- [x] Technische Machbarkeit auf Basis der OpenCode API und des Event-Streams
  bewertet.
- [x] Grundarchitektur Host Bridge → USB-Serial → Mikrocontroller festgelegt.
- [x] Automatische Portsuche mit Metadatenfilter und Handshake vorgesehen.
- [x] Logischen Reset und vollständige Synchronisation nach Verbindung definiert.
- [x] MVP-Features und spätere Erweiterungen dokumentiert.
- [x] Roadmap erstellt.
- [x] Risikobasierten Proof-of-Concept-Plan mit Go/No-Go-Kriterien erstellt.
- [x] Lokales Git-Repository vorbereitet.
- [x] Testbare Host-Struktur aus Core, Ports, Anwendung und Adaptern angelegt.
- [x] Aktive Sessions sowie offene Formulare und Berechtigungen als Start-Snapshot
  angebunden.
- [x] Relevante OpenCode-Events datenschutzarm normalisiert.
- [x] Zustandsmodell mit Gesamtpriorität und zeitlich begrenztem `FINISHED`
  implementiert.
- [x] Reconnect mit exponentiellem Backoff implementiert.
- [x] Periodische Snapshot-Abstimmung für Änderungen ohne Live-Event
  implementiert.
- [x] Konsolenausgabe als JSON Lines implementiert.
- [x] OpenCode-Adapter erfolgreich mit dem lokalen Service verbunden und einen
  Snapshot mit einer aktiven Session geladen.
- [x] 39 automatisierte Hosttests sowie Typecheck und Build erfolgreich ausgeführt.
- [x] Pro-Micro-nRF52840-Board anhand von USB- und UF2-Metadaten identifiziert.
- [x] Firmware-Grundprojekt mit Handshake, Befehlsparser und LED-Mustern angelegt.
- [x] Sicheres Windows-Testskript mit Metadatenfilter und Handshake angelegt.
- [x] TinyGo-Firmware gebaut, per UF2 geflasht und serielles Protokoll am realen
  Board erfolgreich getestet.
- [x] Alle sechs Zustandsmuster an der roten Board-LED visuell bestätigt.
- [x] Serial-Ausgabe mit Metadatenfilter, Handshake, Vollsynchronisation,
  `PING`/`PONG` und Reconnect implementiert.
- [x] OpenCode-Gesamtstatus in einem realen End-to-End-Lauf an das Board
  übertragen.
- [x] Firmware-Watchdog setzt einen veralteten Status nach 15 Sekunden ohne
  Hostaktivität auf `OFF`.
- [x] Board im laufenden Betrieb abgezogen, automatisch wiedererkannt und mit
  dem aktuellen Hoststatus vollständig resynchronisiert.
- [x] Firmware 0.3.0 mit eigenem BLE-GATT-Dienst und weiterhin funktionsfähigem
  USB-CDC gebaut und geflasht.
- [x] Windows-BLE-Helper über WinRT, Service-/Namensfilter und Protokoll-
  Handshake implementiert.
- [x] Reale BLE-Verbindung mit `HELLO`, Vollsynchronisation, `RUNNING` und
  `PING`/`PONG` sowie OpenCode-End-to-End-Synchronisation bestätigt.
- [x] USB als aktiven Primary und BLE als verbundenen Standby betrieben;
  Failover zu BLE und Failback zu USB real kontrolliert bestätigt.

## Als Nächstes

1. Mit Akku einen echten USB-Kabelausfall bei verbundenem BLE-Standby testen.
2. Im normalen Ablauf noch `IDLE` und `OFF` vollständig beobachten.
3. Wechselnde COM-Port-Nummer und einen real blockierten Port testen.
4. PoC 2 mit zusätzlichen Grenz- und Reihenfolgetests abschließen.
5. Mindestens zweistündigen Primary/Backup-Langzeittest durchführen.
6. Bei erfolgreichem Langzeittest die drei externen LEDs samt Vorwiderständen
   festlegen und verdrahten.

## Offene Fragen

- Welche Farben, Durchlassspannungen und Nennströme haben die drei externen LEDs?
- Welche GPIO-Pins und Vorwiderstände werden für die externen LEDs verwendet?
- Eine Gesamtanzeige oder eine LED pro Session im MVP?
- Wie lange soll `FINISHED` sichtbar bleiben?
- Sollen Berechtigungsanfragen eine eigene Farbe statt `ASKING` erhalten?
- Soll BLE später Kopplung und verschlüsselte Characteristics verlangen?

## Arbeitsnotizen

Neue Arbeitseinheiten hier kurz mit Datum, Ergebnis und nächstem Schritt
ergänzen. Ausführliche technische Beschreibungen gehören in das jeweils
passende Dokument, nicht in diese Datei.

### 2026-11-12 – PoC-Host ohne USB

- **Ergebnis:** Implementierung abgeschlossen, reale Eventmatrix noch offen.
- **Umgebung:** Windows, Node.js 24.19.0, OpenCode 2.2.7,
  `@opencode/client` 2.2.7.
- **Beobachtung:** Event-Stream und Start-Snapshot konnten mit dem lokalen
  OpenCode-Service verbunden werden. Der Snapshot erkannte eine aktive Session.
  Die Anwendung wurde anschließend vom Nutzer praktisch ausgeführt und als
  funktionsfähig bestätigt.
- **Automatisierung:** 16 Tests bestanden; Typecheck und Build erfolgreich.
- **Nächster Schritt:** Start, Abschluss, Frage, Berechtigung, Unterbrechung,
  Fehler und parallele Sessions live beobachten.

### 2026-11-12 – Fehlendes Inaktiv-Event kompensiert

- **Beobachtung:** Im realen Test wurden `session.execution.started`,
  `session.execution.succeeded` und der zeitgesteuerte Wechsel von `FINISHED` zu
  `IDLE` korrekt erkannt. Beim Schließen bzw. Inaktivwerden der Session kam kein
  weiteres OpenCode-Live-Event; erst ein Neustart ergab `OFF`.
- **Änderung:** Die bestehende Verbindung lädt nun standardmäßig alle fünf
  Sekunden einen neuen aktiven Snapshot. Bei einer Differenz wird ein
  synthetisches Host-Event erzeugt.
- **Schutzregel:** `FINISHED` bleibt bis zum Ende seiner Haltezeit sichtbar und
  wird nicht durch einen frühen Poll entfernt.
- **Automatisierung:** 23 Tests decken jetzt zusätzlich Snapshot-Differenzen,
  Inaktiv-Erkennung und die `FINISHED`-Haltezeit ab.
- **Nächster Schritt:** Praktisch prüfen, ob nach dem Timer-Übergang innerhalb
  von fünf Sekunden `host.session.inactive` und anschließend `OFF` erscheinen.

### 2026-11-16 – nRF52840-Board und Firmware-PoC ausgeführt

- **Hardware:** nice!nano-v2-kompatibler Pro Micro nRF52840; UF2-Bootloader
  0.6.0, Board-ID `nRF52840-nicenano`, Bootloader-VID/PID `239A:00B3`.
- **Ergebnis:** USB-CDC-Firmware mit Protokollversion 1 und nicht blockierenden
  Mustern für die einfarbige Benutzer-LED an `P0.15` gebaut und per UF2
  geflasht. Bluetooth ist bewusst nicht enthalten.
- **Umgebung:** Windows, Go 1.27.3, TinyGo 0.44.0; Anwendung als VID/PID
  `239A:0029` und beim Test dynamisch als COM6 eingebunden.
- **Test:** `HELLO`, `RESET_STATE`, alle sechs `SET`-Zustände, `BRIGHTNESS`,
  `PING`/`PONG`, `SYNC_COMPLETE` und mehrere Fehlerantworten wurden vom realen
  Board korrekt bestätigt.
- **Sichtprüfung:** Die rote LED reagierte auf `P0.15`; schwaches Leuchten,
  Pulsieren, Doppelblitz, Dauerlicht, schnelles Blinken und Aus waren erkennbar.
  Die blaue LED blinkt unabhängig von der Firmware und ist bei diesem Clone die
  nicht per GPIO steuerbare Ladeanzeige.
- **Sicherheit:** Das Testskript filtert die erwartete USB-Anwendungskennung und
  sendet Statusbefehle erst nach erfolgreichem Geräte-Handshake. Eine
  COM-Port-Nummer ist nicht fest codiert.
- **Offen:** Abziehen, Reconnect und wechselnde COM-Port-Nummer prüfen.
- **Nächster Schritt:** Den Serial-Adapter der Host Bridge implementieren und
  anschließend den Reconnect praktisch testen.

### 2026-11-16 – Host Bridge per USB-Serial verbunden

- **Implementierung:** Serialport-Suche filtert auf die bestätigte
  Anwendungskennung `239A:0029`. Nur ein gültiger Protokoll-Handshake erlaubt
  weitere Befehle; COM-Nummern werden nicht fest codiert.
- **Synchronisation:** Nach Connect und Reconnect folgen `RESET_STATE`,
  Helligkeit, vollständiger Gesamtstatus und `SYNC_COMPLETE`. Anschließend
  werden nur Statusänderungen übertragen.
- **Überwachung:** `PING`/`PONG` läuft alle fünf Sekunden. Firmware 0.2.0 setzt
  die rote LED nach 15 Sekunden ohne gültige Hostaktivität auf `OFF`.
- **Automatisierung:** 29 Tests decken jetzt zusätzlich Metadatenfilter,
  abgelehnten Handshake, blockierte Kandidaten, Vollsynchronisation,
  inkrementelle Änderungen, Keepalive und simulierten Reconnect ab.
- **Realer Test:** OpenCode meldete eine laufende Session; die Bridge verband
  COM6 per Handshake mit Firmware 0.2.0. Der Nutzer bestätigte anschließend die
  korrekte LED-Darstellung realer Übergänge für `RUNNING`, `ASKING` und
  `FINISHED`.
- **Reconnect:** Das Board wurde bei `RUNNING` physisch abgezogen. Die Bridge
  meldete `serial_disconnected`, erkannte es nach dem Wiedereinstecken erneut
  und synchronisierte `RUNNING`; die rote LED nahm das Pulsieren wieder auf.
- **Failsafe:** Nach absichtlichem Beenden der Hostverbindung ohne `OFF` ging
  die pulsierende rote LED nach ungefähr 15 Sekunden selbstständig aus.
- **Nächster Schritt:** Im manuellen Funktionstest noch `IDLE` und `OFF`
  beobachten. Einen echten `ERROR`-Fall nur kontrolliert erzeugen; anschließend
  wechselnde COM-Port-Nummer bzw. real blockierten Port prüfen und den
  mindestens zweistündigen Langzeittest starten.

### 2026-11-16 – Bluetooth LE integriert und real getestet

- **Firmware:** Version 0.3.0 aktiviert Nordic S140 und stellt einen eigenen
  GATT-Dienst unter dem Namen `OCStatus` bereit. USB-CDC bleibt parallel in der
  Firmware nutzbar. BLE-Empfang und Notifications werden außerhalb des
  SoftDevice-Callbacks über feste Ringpuffer verarbeitet.
- **Windows-Host:** Ein Go-Helper nutzt WinRT zum Scannen, Verbinden, Entdecken
  und Abonnieren der GATT-Characteristics. Der Node-Host kann BLE mit
  `OPENCODE_STATUS_TRANSPORT=bluetooth` für isolierte Tests auswählen.
- **Sichere Auswahl:** Name und eigener 128-Bit-Service werden vorgefiltert,
  danach bleibt `HELLO 1` verpflichtend. Die beobachtete BLE-Adresse wird nicht
  fest konfiguriert.
- **Realer Protokolltest:** `HELLO`, `RESET_STATE`, `BRIGHTNESS`, `SET 0
  RUNNING`, `SYNC_COMPLETE` und `PING/PONG` liefen über BLE erfolgreich. Ein
  anschließender USB-Handshake bestätigte, dass USB weiterhin funktioniert.
- **End-to-End:** Der Host erkannte eine reale laufende OpenCode-Session und
  meldete `bluetooth_connected` mit Firmware 0.3.0 und Status `RUNNING`.
- **Manueller BLE-Test:** `npm run dev:bluetooth` startete den bereits gebauten
  Helper ohne Go-Laufzeitabhängigkeit. Der Nutzer bestätigte das sichtbare
  Pulsieren für `RUNNING`, den Doppelblitz für `ASKING` und das Dauerlicht für
  `FINISHED` über BLE.
- **Automatisierung:** 39 Hosttests, Typecheck, TypeScript-Build, Go-Helper-Test
  und beide Go-Builds sind erfolgreich.
- **Nächster Schritt:** Mit geeignetem Akku optional vollständig kabellos
  testen; danach BLE-Reconnect und den geplanten Langzeittest durchführen.

### 2026-11-16 – USB-Primary und Bluetooth-Standby als Standard

- **Änderung:** Ohne `OPENCODE_STATUS_TRANSPORT` startet `npm run dev` beide
  Verbindungen, wählt aber USB als `active` und BLE als `standby`. Die Einzelmodi
  bleiben erhalten.
- **Standby:** BLE führt Handshake und `PING`/`PONG` aus, erhält bei verfügbarem
  USB aber keine Reset-, Helligkeits- oder Statusbefehle.
- **Failover:** Ein kontrollierter USB-Fehler schaltete BLE unmittelbar auf
  `active`; dort wurde der aktuelle Status vollständig synchronisiert.
- **Failback:** Nach erneuter USB-Verfügbarkeit synchronisierte COM6 `RUNNING`
  und wurde wieder `active`; BLE wechselte zurück auf `standby`.
- **Trennungserkennung:** Verbindungen melden ein eigenes Disconnect-Signal,
  sodass der Wechsel nicht bis zum nächsten Keepalive warten muss.
- **Automatisierung:** 39 Hosttests decken Standardmodus, Primary-Auswahl,
  warmen Standby, Vollsynchronisation bei Aktivierung, sofortige Trennung und
  Diagnosemodi ab.
- **Nächster Schritt:** Mit Akku einen echten physischen USB-Kabelausfall testen
  und danach den Langzeittest mit Primary/Backup durchführen.
