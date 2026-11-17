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
- Beim Start: Rot, Gelb und Grün als Funktionstest, danach drei langsame Blinker
  in Rot/Gelb/Grün für das gemessene Akkudrittel.
- Bei USB-Versorgung ist der Akkustand auf dem vorhandenen Board nicht messbar;
  Gelb kennzeichnet dann „unbekannt“.
- Bis zum Host-Handshake: Blau pulsierend; danach drei kurze blaue Blinker.
- Die endgültigen RGB-Farben der OpenCode-Zustände sind noch festzulegen.

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
