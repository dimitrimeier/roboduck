# Proof-of-Concept-Plan

## Ziel

Vor Kauf, Verkabelung oder Verlöten der finalen Anzeige werden die kritischen
Annahmen einzeln geprüft:

1. OpenCode liefert die benötigten Zustandsinformationen zuverlässig.
2. Mehrere Sessions lassen sich in ein eindeutiges Anzeigemodell überführen.
3. Ein Windows-Programm erkennt das richtige USB-Serial-Gerät automatisch.
4. Reconnect und vollständige Synchronisation funktionieren.
5. Die gesamte Kette bleibt über mehrere Stunden stabil.

Der PoC soll keine fertige Oberfläche, Installation oder schöne Hardware sein.
Wegwerfcode ist erlaubt, solange Ergebnisse und Abweichungen dokumentiert
werden. Wiederverwendbare Teile dürfen später in `host/` bzw. `firmware/`
übernommen werden.

## Grundsatz

Jede Stufe isoliert möglichst nur ein Risiko. Erst wenn eine Stufe ihre
Abnahmekriterien erfüllt, wird die nächste begonnen. Externe LEDs werden für den
PoC nicht verlötet; die eingebaute LED eines Entwicklungsboards reicht für den
End-to-End-Nachweis.

## PoC 1 – OpenCode-Beobachter ohne Hardware

### Fragestellung

Können wir die benötigten Zustände über den lokalen OpenCode-Service erkennen,
ohne Logs oder TUI-Ausgaben zu parsen?

### Aufbau

- Kleines TypeScript-Konsolenprogramm.
- Verbindung über `@opencode/client` und `@opencode/client/service`.
- Beim Start aktive Sessions auslesen.
- Relevante Events mit Zeitstempel, Session-ID und Eventtyp ausgeben.
- Keine Prompt-Inhalte oder Dateiinhalte protokollieren.

### Tests

- Eine normale Aufgabe starten und erfolgreich beenden.
- Eine Aufgabe erzeugen, die eine Frage oder ein Formular stellt.
- Eine Berechtigungsanfrage auslösen.
- Eine Ausführung unterbrechen.
- Wenn kontrolliert möglich, einen Fehlerfall auslösen.
- Zwei Sessions gleichzeitig ausführen.
- OpenCode-Event-Verbindung trennen und erneut aufbauen.

### Abnahmekriterien

- [ ] Start, Abschluss, Fehler/Unterbrechung und Idle sind eindeutig erkennbar.
- [ ] Frage/Formular und Berechtigungsanfrage sind eindeutig erkennbar.
- [ ] Events können sicher einer Session zugeordnet werden.
- [ ] Aktive Sessions lassen sich nach Programmstart wiederherstellen.
- [ ] Nach Reconnect kann der Zustand ohne verpasste Events neu aufgebaut werden.

### Go/No-Go

**Go:** Alle für das MVP nötigen Zustände sind über API und Events ableitbar.

**Anpassen:** Falls einzelne Zustände fehlen, wird das MVP-Farbschema reduziert
oder eine dokumentierte Ersatzregel verwendet.

**No-Go:** Der aktive Zustand lässt sich nur durch unzuverlässiges Parsen von
Terminaltext oder privaten Daten ableiten.

## PoC 2 – Zustandsmaschine ohne Hardware

### Fragestellung

Erzeugt dieselbe Eventfolge immer denselben LED-Zustand, auch bei mehreren
Sessions und verspäteten Ereignissen?

### Aufbau

- Reiner Zustands-Reducer ohne OpenCode- oder Serial-Abhängigkeit.
- Synthetische Eventfolgen als automatisierte Tests.
- Optional anonymisierte Eventtypen und Zeitstempel aus PoC 1 als Fixtures.

### Tests

- `RUNNING → FINISHED → IDLE` mit Ablaufzeit für `FINISHED`.
- `RUNNING → ASKING → RUNNING → FINISHED`.
- Fehler und Unterbrechung.
- Zwei oder mehr Sessions mit der Prioritätsregel.
- Gelöschte oder archivierte Session.
- Doppeltes, unbekanntes oder in anderer Reihenfolge eintreffendes Event.
- Vollständiger Snapshot ersetzt veralteten lokalen Zustand.

### Abnahmekriterien

- [ ] Tests decken alle MVP-Zustände ab.
- [ ] Prioritäten sind deterministisch.
- [ ] Ein vollständiger Snapshot stellt den korrekten Zustand wieder her.
- [ ] Unbekannte Events führen weder zu einem Absturz noch zu falschem Alarm.

## PoC 3 – Serial-Protokoll simulieren

### Fragestellung

Funktionieren Handshake, Timeouts und vollständige Synchronisation unabhängig
von echter Hardware?

### Aufbau

- Serial-Transport hinter einer kleinen Schnittstelle kapseln.
- Zunächst ein In-Memory-Testgerät verwenden.
- Das Testgerät kann Antworten verzögern, verwerfen oder Fehler liefern.

Ein virtueller Windows-COM-Port ist optional. Er ist nicht erforderlich, wenn
dafür zusätzliche Treiber mit administrativen Rechten installiert werden
müssten. Die echte USB-Schicht wird in PoC 4 geprüft.

### Tests

- Erfolgreicher und abgelehnter Handshake.
- Falsche Protokollversion.
- Handshake-Timeout.
- `RESET_STATE` gefolgt von vollständigem Snapshot.
- Abbruch mitten in der Synchronisation.
- Fehlendes `PONG`.
- Wiederverbindung mit erneutem vollständigem Snapshot.

### Abnahmekriterien

- [ ] Fremde oder inkompatible Geräte werden abgewiesen.
- [ ] Timeout und Reconnect blockieren das Programm nicht.
- [ ] Nach jeder Verbindung wird ein vollständiger Snapshot gesendet.
- [ ] Ein Verbindungsabbruch hinterlässt keinen irreführenden Host-Zustand.

## PoC 4 – Lötfreier USB-Mikrocontroller-Test

### Voraussetzung

Ein Entwicklungsboard mit USB und möglichst eingebauter LED, beispielsweise ein
Raspberry Pi Pico/Pico 2 oder ein Arduino-kompatibles Board. Es werden keine
externen LEDs benötigt.

### Fragestellung

Kann Windows das reale Gerät automatisch erkennen und nach Abziehen, Neustart
oder wechselnder COM-Port-Nummer wieder verbinden?

### Aufbau

- Minimale Firmware für Handshake, Reset, `SET`, `PING` und Board-LED.
- Hostscan über `serialport`.
- Vorfilterung anhand verfügbarer USB-Metadaten.
- Finale Bestätigung ausschließlich per Handshake.

### Tests

- Gerät erst nach Start der Host-Anwendung einstecken.
- Gerät während des Betriebs abziehen und erneut einstecken.
- Mikrocontroller neu starten.
- Host-Anwendung neu starten, während das Gerät verbunden bleibt.
- Einen fremden oder nicht antwortenden COM-Port bereitstellen, sofern möglich.
- Arduino Serial Monitor bzw. anderes Programm blockiert den Port.

### Abnahmekriterien

- [ ] Das richtige Gerät wird ohne fest codierte COM-Nummer erkannt.
- [ ] Ein fremdes Gerät erhält keine Zustandsbefehle.
- [ ] Nach Reconnect erfolgt Reset plus vollständiger Snapshot.
- [ ] Ein blockierter Port verursacht keinen Absturz und wird später erneut geprüft.
- [ ] Die Board-LED reagiert auf mindestens `RUNNING`, `ASKING` und `FINISHED`.

## PoC 5 – End-to-End und Langzeittest

### Fragestellung

Funktioniert die Kette OpenCode → Hostzustand → USB → Firmware im realistischen
mehrstündigen Betrieb?

### Aufbau

```text
OpenCode-Service
  → PoC-Host Bridge
  → USB-Serial
  → Mikrocontroller mit eingebauter LED
```

### Tests

- Reale OpenCode-Session starten, fragen lassen und beenden.
- Zwei Sessions parallel betreiben und Gesamtpriorität beobachten.
- Mikrocontroller während einer laufenden Session neu verbinden.
- OpenCode-Service bzw. Eventverbindung neu verbinden.
- Mindestens zwei Stunden laufen lassen.
- Wenn praktikabel: Windows sperren sowie Standby/Aufwachen testen.

### Abnahmekriterien

- [ ] Anzeige entspricht während der Tests dem erwarteten Gesamtzustand.
- [ ] Kein manueller Neustart nach normalem Reconnect nötig.
- [ ] Keine dauerhaft falsche Anzeige nach verpassten Events oder Board-Neustart.
- [ ] Keine unkontrolliert wachsenden Logs oder auffällige Ressourcennutzung.
- [ ] Zwei Stunden Betrieb ohne unbehandelten Absturz.

## Abschlussentscheidung

Nach PoC 5 wird in `DECISIONS.md` eine der folgenden Entscheidungen erfasst:

- **Go:** Architektur beibehalten und finale Hardware planen.
- **Go mit Änderungen:** Erkannte Grenzen dokumentieren und Architektur bzw.
  MVP-Umfang anpassen.
- **No-Go:** Blocker und getestete Alternativen festhalten; keine finale Hardware
  aufbauen.

Vor dem Löten sollten mindestens folgende Punkte entschieden sein:

- Board und verfügbare USB-Metadaten.
- LED-Typ, Anzahl, Stromversorgung und maximale Helligkeit.
- Gesamtstatus oder Einzelanzeige pro Session.
- Bestätigtes Zustands- und Farbschema.
- Erfolgreicher USB-Reconnect und End-to-End-Langzeittest.

## Ergebnisprotokoll je PoC

Für jede Stufe wird am Ende ein kurzer Eintrag in `PROGRESS.md` ergänzt:

```text
Datum:
PoC-Stufe:
Ergebnis: bestanden | teilweise bestanden | blockiert
Getestete Umgebung:
Beobachtungen:
Abweichungen vom Plan:
Nächster Schritt:
```

Größere Architekturänderungen werden zusätzlich in `DECISIONS.md` festgehalten.
