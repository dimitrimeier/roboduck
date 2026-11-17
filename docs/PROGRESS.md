# Fortschritt

Zuletzt aktualisiert: 2026-11-17

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
Der Host ist zusätzlich für macOS vorbereitet: USB nutzt weiterhin `serialport`,
BLE denselben Go-Helper über CoreBluetooth. Build, automatisierte Tests und ein
realer Hardwarelauf auf macOS stehen noch aus.

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
- [x] Firmware-Watchdog verwirft einen veralteten Status nach 15 Sekunden ohne
  Hostaktivität; seit Firmware 0.4.0 folgt das blaue Verbindungspulsieren.
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
- [x] Akku-ADC des realen Clone-Boards über `P0.04` ausgelesen und als
  Diagnosebefehl `BATTERY` in Firmware 0.3.1 ergänzt.
- [x] Interne `VDDH/5`-Messung als `SUPPLY` in Firmware 0.3.2 ergänzt und über
  USB sowie im reinen Akkubetrieb über BLE bestätigt.
- [x] `VDDH/5` gegen 4,230 V Multimeterwert kalibriert und Korrekturfaktor in
  Firmware 0.3.3 hinterlegt.
- [x] Start-, Akku- und Verbindungssequenz für zwei zunächst gespiegelte
  RGB-Augen in Firmware 0.4.0 simuliert und per `DISPLAY` diagnostizierbar gemacht.
- [x] Nicht blockierenden `DISPLAY_DEMO`-Ablauf und sicheres Windows-Logskript
  zum Prüfen der RGB-Phasen vor der Verdrahtung ergänzt.
- [x] Erstes externes Common-Cathode-RGB-Auge auf `D104`, `D106` und `D011`
  in Firmware 0.5.0 über Hardware-PWM angebunden.
- [x] Physische LED-Ausgabe in Firmware 0.5.1 global auf 80 Prozent begrenzt.
- [x] Initialisierung und RGB-Statusmuster in Firmware 0.6.0 überarbeitet,
  interne rote LED deaktiviert und bekannte Idle-Sessions dauerhaft erhalten.
- [x] Maximale relative Helligkeit von `RUNNING` in Firmware 0.6.1 auf
  15 Prozent reduziert.
- [x] Globale physische Ausgangsgrenze in Firmware 0.6.2 von 80 auf etwa
  65 Prozent reduziert.
- [x] Initialen Rot-Gelb-Grün-Funktionstest in Firmware 0.6.3 als weichen
  2,2-sekündigen Farbverlauf umgesetzt.
- [x] `RUNNING`-Verlauf in Firmware 0.6.4 vollständig auf Mischfarben umgestellt.
- [x] Idle-Doppelblinken in Firmware 0.6.5 auf 20 Prozent beim ersten und volle
  global begrenzte Helligkeit beim zweiten Blinker gestuft.
- [x] Separaten Branch `feature/macos-host` angelegt und Hostskripte,
  BLE-Helper-Auswahl sowie Dokumentation für macOS/CoreBluetooth portiert.

## Als Nächstes

1. Akku-Prozentstufen und Hysterese auf Basis der kalibrierten `VDDH/5`-Messung
   festlegen und über die Entladekurve praktisch prüfen.
2. Mit Akku einen echten USB-Kabelausfall bei verbundenem BLE-Standby testen.
3. Im normalen Ablauf noch `IDLE` und `OFF` vollständig beobachten.
4. Wechselnde COM-Port-Nummer und einen real blockierten Port testen.
5. PoC 2 mit zusätzlichen Grenz- und Reihenfolgetests abschließen.
6. Mindestens zweistündigen Primary/Backup-Langzeittest durchführen.
7. Durchlassspannungen der zwei Common-Cathode-RGB-LEDs bestimmen, danach für
   10 mA je Kanal sechs Vorwiderstände, PWM-Pins und Source-Treiber festlegen.
8. BLE-Helper auf einem Mac nativ bauen und USB, BLE-only sowie automatischen
   Failover/Failback mit dem realen Board prüfen.

## Offene Fragen

- Welche Durchlassspannungen haben die sechs Farbkanäle der zwei
  Common-Cathode-RGB-LEDs?
- Welche Versorgung, sechs GPIO-Pins, Vorwiderstände und Source-Treiber werden
  für 10 mA je Kanal und die später unabhängig steuerbaren Augen verwendet?
- Eine Gesamtanzeige oder eine LED pro Session im MVP?
- Sollen Berechtigungsanfragen eine eigene Farbe statt `ASKING` erhalten?
- Soll BLE später Kopplung und verschlüsselte Characteristics verlangen?

## Arbeitsnotizen

Neue Arbeitseinheiten hier kurz mit Datum, Ergebnis und nächstem Schritt
ergänzen. Ausführliche technische Beschreibungen gehören in das jeweils
passende Dokument, nicht in diese Datei.

### 2026-11-17 – Host auf macOS portiert

- **Branch:** `feature/macos-host` trennt die Mac-Portierung vom bisherigen
  Windows-Stand.
- **Implementierung:** Plattformneutrale Node-Skripte ersetzen die
  PowerShell-Abhängigkeit beim BLE-Build und Bluetooth-only-Start. Der Host
  wählt auf macOS das erweiterungslose native Helper-Binary und auf Windows
  weiterhin die `.exe`.
- **BLE:** Derselbe gefilterte Go-GATT-Client verwendet auf macOS das von
  `tinygo.org/x/bluetooth` bereitgestellte CoreBluetooth-Backend. Servicefilter,
  `HELLO 1`, Vollsynchronisation, Keepalive und Reconnect bleiben unverändert.
- **Sicherheit:** USB-Kandidaten werden weiterhin per VID/PID vorgefiltert und
  danach per Handshake verifiziert; BLE weiterhin per Name, Service und
  Handshake. Es werden keine festen Ports oder BLE-Adressen eingeführt.
- **Automatisierung:** 44 Hosttests, Typecheck, TypeScript-Build, Go-Test und
  nativer Windows-Build des neuen plattformneutralen Buildskripts sind
  erfolgreich.
- **Offen:** CoreBluetooth kann nicht unter Windows für macOS gebaut oder real
  getestet werden. Native Builds und Hardwaretests müssen auf einem Mac folgen.

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

### 2026-11-16 – Akku-ADC diagnostisch ausgelesen

- **Werkzeuge:** Go 1.27.4 und TinyGo 0.44.0 unter Windows eingerichtet.
- **Firmware:** Version 0.3.1 ergänzt den Protokollbefehl `BATTERY` für den
  nice!nano-Akku-Messkanal `P0.04` (`AIN2`). Ausgegeben werden ADC-Rohwert,
  Spannung am ADC und die mit dem originalen 7/5-Spannungsteiler hochgerechnete
  Quellspannung.
- **Realer Test:** Firmware gebaut, per UF2 geflasht und auf COM6 verifiziert.
  Ohne angeschlossenen Akku lagen wiederholte Messungen stabil bei etwa
  395–400 mV am ADC beziehungsweise nominell 553–560 mV am Akkuanschluss.
- **Bewertung:** Der Kanal ist auf dem Clone per Firmware auslesbar. Der
  USB-Betrieb erzeugt dort keine messbaren 5 V; der Leerlaufwert ohne Akku ist
  kein Ladezustand und wird vermutlich von der Ladeschaltung beeinflusst.
- **Nächster Schritt:** Mit angeschlossenem 1S-LiPo gleichzeitig `BATTERY` und
  die reale Akkuspannung per Multimeter messen, um Teilerfaktor und Grenzwerte
  des Clones zu kalibrieren.

### 2026-11-16 – Akku-ADC über BLE mit realem Akku geprüft

- **Testaufbau:** USB getrennt, Board ausschließlich aus dem angeschlossenen
  Akku versorgt und über den projektspezifischen BLE-GATT-Dienst verbunden.
- **Verbindung:** BLE-Handshake bestätigte Firmware 0.3.1; drei
  `BATTERY`-Abfragen wurden transportneutral beantwortet.
- **Messwerte:** `source_mv` lag nur zwischen 507 und 585 mV, obwohl das Board
  nachweislich im Akkubetrieb lief. Erwartet wären bei einem originalen
  nice!nano-Spannungsteiler ungefähr 3.0 bis 4.2 V.
- **Bewertung:** Der geprüfte Clone führt die Akkuspannung nicht wie erwartet
  über einen 7/5-Spannungsteiler an `P0.04`. Dieser ADC-Kanal ist daher auf dem
  vorhandenen Board nicht für eine Ladezustandsschätzung verwendbar.
- **Nächster Schritt:** Nach kurzem USB-Reconnect eine Diagnose-Firmware für den
  internen nRF52840-Kanal `VDDH/5` flashen. Falls auch dieser nur die geregelte
  Versorgung und nicht die Akkuspannung sieht, ist eine externe Messverdrahtung
  erforderlich.

### 2026-11-16 – Interne Versorgungsspannung erfolgreich gemessen

- **Firmware:** Version 0.3.2 ergänzt `SUPPLY`. Der Befehl liest den internen
  nRF52840-SAADC-Eingang `VDDH/5` und rechnet ihn auf die Versorgungsspannung
  hoch; eine externe GPIO-Verbindung ist dafür nicht erforderlich.
- **USB-Test:** Zwei Messungen ergaben 4,910 und 4,915 V. Damit erkennt der
  interne Kanal die USB-Versorgung plausibel.
- **Akku-/BLE-Test:** Nach Abziehen von USB blieb das Board per BLE erreichbar.
  Drei aufeinanderfolgende Messungen ergaben stabil 4,295 V, während `P0.04`
  weiterhin nur nominell 0,486 V meldete.
- **Bewertung:** `VDDH/5` folgt auf diesem Clone der jeweiligen Eingangsquelle
  und ermöglicht im kabellosen Betrieb eine Akkuspannungsschätzung ohne
  Zusatzverdrahtung. `P0.04` bleibt für diesen Zweck ungeeignet.
- **Nächster Schritt:** Akkuspannung parallel mit einem Multimeter messen, den
  ADC-Wert kalibrieren und danach robuste Prozentstufen mit Hysterese definieren.

### 2026-11-16 – Versorgungsspannung kalibriert

- **Referenz:** Bei einer Firmwareanzeige von 4,295 V wurden direkt am Akku mit
  dem Multimeter 4,230 V gemessen.
- **Abweichung:** Der unkalibrierte ADC-Wert lag 65 mV beziehungsweise etwa
  1,54 % zu hoch.
- **Firmware:** Version 0.3.3 multipliziert `SUPPLY` board-spezifisch mit
  `4230/4295` (ungefähr 0,98487). ADC-Rohwert und Spannung am internen
  `VDDH/5`-Eingang bleiben zur Diagnose in der Antwort enthalten.
- **Nächster Schritt:** Firmware 0.3.3 per USB flashen, den korrigierten Wert
  praktisch bestätigen und anschließend Prozentstufen mit Hysterese festlegen.

### 2026-11-16 – Kalibrierung über BLE bestätigt

- **Flash/Test:** Firmware 0.3.3 per USB geflasht, anschließend USB getrennt und
  `SUPPLY` dreimal über BLE im reinen Akkubetrieb abgefragt.
- **Messwerte:** 4,220 V, 4,230 V und 4,230 V bei einer Multimeterreferenz von
  4,230 V.
- **Bewertung:** Die board-spezifische Einpunktkalibrierung trifft die Referenz
  bis auf maximal 10 mV und ist für grobe Ladezustandsstufen ausreichend.
- **Nächster Schritt:** Prozentstufen und Hysterese festlegen und danach die
  Entladekurve praktisch über mehrere Spannungsbereiche beobachten.

### 2026-11-16 – RGB-Start- und Verbindungsablauf simuliert

- **Firmware:** Version 0.4.0 bildet nicht blockierend RGB-Funktionstest,
  Akku-Drittel, blaues Verbindungspulsieren, drei kurze Verbindungsblinker und
  anschließend die vorhandenen Statusmuster ab.
- **Akkuanzeige:** Vorläufige Grenzen sind 3,60 V und 3,90 V. Über 4,40 V wird
  USB erkannt und Gelb als „Akkustand unbekannt“ verwendet, weil `VDDH/5` dann
  nicht die Akkuspannung sieht.
- **Diagnose:** `DISPLAY` liefert Phase, Akkustufe, Startmesswert und simuliertes
  RGB. Die einfarbige Board-LED zeigt davon nur die Helligkeit. Firmware 0.4.1
  ergänzt `DISPLAY_DEMO` und `Watch-DisplayPhases.ps1`, um die komplette Sequenz
  mit Zeitstempeln vor der Verdrahtung zu protokollieren.
- **Verbindung:** Ein gültiger `HELLO 1`-Handshake über USB oder BLE bestätigt
  die Verbindung. Nach 15 Sekunden ohne Hostaktivität kehrt die Anzeige in die
  blaue Suchphase zurück, statt einen veralteten Status zu zeigen.
- **Hardwareplanung:** Zwei Common-Cathode-RGB-LEDs werden vorerst gespiegelt,
  aber für spätere unabhängige Steuerung mit sechs getrennten PWM-Kanälen und
  sechs getrennten Vorwiderständen vorgesehen. Die vorläufige maximale
  Helligkeit ist auf 10 mA je Farbkanal beziehungsweise 60 mA LED-Gesamtstrom
  bei gleichzeitigem Weiß festgelegt; die GPIOs sollen nur Treiber ansteuern.
- **Validierung:** TinyGo-Build für `nicenano` erfolgreich. Der reale visuelle
  RGB-Test bleibt bis zur sicheren Festlegung von Strom, Widerständen und Pins
  offen.
- **Realer Diagnoselauf:** Firmware 0.4.1 wurde auf das Board geflasht und über
  COM6 per Handshake bestätigt. `Watch-DisplayPhases.ps1` protokollierte den
  vollständigen Ablauf: RGB-Test, drei gelbe Akku-Unbekannt-Blinker bei 4,836 V
  USB-Versorgung, blaues Pulsieren, drei kurze blaue Blinker und Statusphase.
- **Erstes externes RGB-Auge:** Firmware 0.5.0 wurde gebaut, geflasht und auf
  COM6 per Handshake bestätigt. Der Diagnoseablauf meldete bei 4,826 V
  USB-Versorgung alle erwarteten RGB-Werte. Der Nutzer bestätigte Rot, Gelb,
  Grün, die gelbe Akku-Unbekannt-Anzeige, blaues Pulsieren und die drei kurzen
  blauen Verbindungsblinker visuell als korrekt.
- **Globale Dimmung:** Firmware 0.5.1 begrenzt jede physische PWM-Ausgabe auf
  80 Prozent des vorherigen Maximums. Build, Flash, vollständiger Diagnoseablauf
  und anschließender USB-Handshake der Host Bridge mit Firmware 0.5.1 waren
  erfolgreich.
- **Anzeigeablauf 0.6.0:** Startpausen, 1,5-sekündige dauerhafte Akkuanzeige,
  RGB-Statusmuster und deaktivierte interne rote LED implementiert. Die
  Snapshot-Abstimmung erhält bekannte Idle-Sessions, damit das Doppelblinkmuster
  dauerhaft sichtbar bleibt. TinyGo-Build, TypeScript-Check und -Build sowie 40
  Hosttests waren erfolgreich. Firmware 0.6.0 wurde real geflasht; Handshake,
  Initialisierungstiming und vollständiger Status-Protokolltest auf COM6 waren
  erfolgreich. Die visuelle Bestätigung der neuen Statusfarben steht noch aus.
- **FINISHED-Haltezeit:** Standard und Obergrenze auf fünf Sekunden gesetzt.
  Kürzere Werte bleiben über `OPENCODE_STATUS_FINISHED_HOLD_MS` möglich; höhere
  Werte werden auf fünf Sekunden begrenzt.
- **RUNNING-Helligkeit:** Der damalige Rot-Blau-Grün-Verlauf ist in Firmware 0.6.1 auf
  maximal 15 Prozent relativer Helligkeit begrenzt. Andere Zustände blieben bei
  dieser Änderung unverändert.
- **Globale Dimmung 0.6.2:** Die feste physische Ausgangsgrenze wurde von 204
  auf 166 von 255 Stufen reduziert, entsprechend rund 65 Prozent. Die relative
  15-Prozent-Grenze des `RUNNING`-Verlaufs bleibt zusätzlich aktiv.
- **Weicher Startverlauf 0.6.3:** Die bisherigen dunklen Zwischenpausen zwischen
  Rot, Gelb und Grün wurden durch lineare RGB-Übergänge ersetzt. Die gesamte
  Testphase bleibt 2,2 Sekunden lang; alle nachfolgenden Phasen behalten ihr
  Timing. Firmware 0.6.3 wurde real geflasht; der zeitgestempelte Diagnoselauf
  bestätigte den lückenlosen Verlauf und die unveränderten Folgephasen auf COM6.
- **RUNNING-Mischfarben 0.6.4:** Reine rote, blaue und grüne Wendepunkte wurden
  durch warmes Pink, Violett und Türkisgrün ersetzt. Zyklusdauer und relative
  15-Prozent-Helligkeitsgrenze bleiben unverändert.
- **Idle-Helligkeitsstufe 0.6.5:** Der erste grüne Blinker nutzt 20 Prozent
  relative Helligkeit, der zweite die volle durch Hostwert und globale Grenze
  skalierte Helligkeit. Das bisherige Timing bleibt unverändert. Der Nutzer hat
  den aktuellen Gesamtstand auf der realen RGB-LED visuell geprüft und als gut
  funktionierend bestätigt.
