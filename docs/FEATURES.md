# Features

## MVP – Muss-Funktionen

### OpenCode-Zustände erfassen

- Aktive Sessions beim Start einlesen.
- Live-Events des lokalen OpenCode-Services abonnieren.
- Mindestens folgende Anzeigezustände ableiten:
  - `RUNNING`
  - `ASKING`
  - `FINISHED`
  - `ERROR`
  - `IDLE`
  - `OFF` (keine relevante Session)
- Berechtigungsanfragen und Formulare als `ASKING` behandeln.
- Nach Verbindungsabbrüchen erneut verbinden und vollständig synchronisieren.

### USB-Gerät automatisch erkennen

- Verfügbare Serialports unter Windows regelmäßig prüfen.
- Kandidaten nach USB-Metadaten wie VID, PID, Produktname und Seriennummer
  vorfiltern.
- Gerät erst nach erfolgreichem Protokoll-Handshake akzeptieren.
- Geänderte COM-Port-Nummern tolerieren.
- Abziehen und erneutes Anschließen ohne Neustart der Host-Anwendung behandeln.
- Blockierte oder fremde Ports sicher überspringen.

### Synchronisation

- Nach dem Verbinden `RESET_STATE` senden.
- Danach immer einen vollständigen Zustand übertragen.
- Laufende Änderungen anschließend inkrementell übertragen.
- Verbindung mit `PING`/`PONG` überwachen.
- Der Host bleibt die maßgebliche Zustandsquelle.

### LED-Anzeige

- Zwei RGB-Augen sind vorgesehen und zeigen vorerst dasselbe an.
- Die Verdrahtung soll eine spätere unabhängige Steuerung beider Augen erlauben.
- Beim Start: weicher Verlauf Rot → Gelb → Grün über insgesamt 2,2 Sekunden,
  500 ms Pause, danach die Akkufarbe 1,5 Sekunden dauerhaft und anschließend
  eine Sekunde Pause.
- Bei USB-Versorgung ist der Akkustand auf dem vorhandenen Board nicht messbar;
  Gelb kennzeichnet dann „unbekannt“.
- Bis zum Host-Handshake: Blau pulsierend; danach drei kurze blaue Blinker.
- `RUNNING`: zyklischer Verlauf aus warmem Pink, Violett und Türkisgrün bei
  15 % relativer Helligkeit. Reine Rot-, Grün- oder Blautöne werden vermieden.
- `ASKING`: Gelb und Grün als Doppelblitz mit unveränderten Leucht- und Pausenzeiten.
- `FINISHED`: Grün pulsierend, höchstens 5 Sekunden bis zum Wechsel auf `IDLE`.
- `IDLE`: erster kurzer grüner Blinker mit 20 % relativer Helligkeit, zweiter mit
  voller global begrenzter Helligkeit, danach drei Sekunden Pause; dauerhaft
  wiederholt.
- Die interne rote Board-LED bleibt deaktiviert.

Bei einer Gesamtanzeige gilt vorläufig diese Priorität:

```text
ERROR > ASKING > RUNNING > FINISHED > IDLE > OFF
```

## Soll-Funktionen nach dem MVP

- Konfigurierbare Farben, Helligkeit und Animationen.
- Wahlweise Gesamtstatus oder eine LED pro Session.
- Stabile Zuordnung von Sessions zu LED-Plätzen.
- Unterscheidung zwischen normaler Frage und Berechtigungsanfrage.
- Windows-Autostart.
- Tray-Symbol mit Verbindungs- und OpenCode-Status.
- Lokale Konfigurationsdatei mit validiertem Schema.
- Diagnosemodus für Serial- und OpenCode-Events.
- Verfeinerung der groben Akku-Drittel auf Basis einer gemessenen Entladekurve,
  mit Hysterese gegen springende Werte.

## Optionale spätere Funktionen

- Separate Darstellung von Subagenten.
- Akustisches Signal über den Mikrocontroller.
- Taster zum Stummschalten oder Quittieren einer Anzeige.
- OLED-Display mit Session-Namen.
- Firmware-Update-Unterstützung.
- Unterstützung mehrerer Anzeigegeräte.

## Nicht Teil des ersten MVP

- Steuerung oder Beantwortung von OpenCode-Anfragen am Mikrocontroller.
- Cloud-Verbindung.
- Speicherung von Prompts oder Session-Inhalten auf dem Mikrocontroller.
- Vollständige Windows-Dienstinstallation vor erfolgreichem Prototyp.
