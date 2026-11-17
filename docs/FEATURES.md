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

Vorläufiges Farbschema:

| Zustand | Anzeige |
|---|---|
| `RUNNING` | Blau, pulsierend |
| `ASKING` | Gelb, blinkend |
| `FINISHED` | Grün, zeitlich begrenzt |
| `ERROR` | Rot, blinkend |
| `IDLE` | Weiß, schwach |
| `OFF` | Aus |

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
