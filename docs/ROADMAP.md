# Roadmap

## Phase 0 – Anforderungen und Hardware festlegen

- [ ] Mikrocontroller auswählen.
- [ ] LED-Typ und Anzahl festlegen.
- [ ] Gesamtstatus oder eine LED pro Session für den MVP entscheiden.
- [ ] Farb- und Animationsschema bestätigen.
- [ ] Beispielgerät unter Windows auslesen und VID/PID/Produktdaten notieren.

**Ergebnis:** Verbindliche MVP-Hardware und Anzeigeform.

## Phase 0.5 – Proof of Concept

- [ ] OpenCode-API und relevante Events ohne Hardware beobachten.
- [ ] Zustandsableitung mit synthetischen bzw. aufgezeichneten Events testen.
- [ ] Serial-Protokoll zunächst mit einem simulierten Gerät testen.
- [ ] Mikrocontroller nur per USB und ohne gelötete externe LEDs testen.
- [ ] End-to-End-Durchstich mit eingebauter Board-LED durchführen.
- [ ] Reconnect und einen mindestens zweistündigen Lauf testen.
- [ ] Go/No-Go-Entscheidung dokumentieren.

Details und Abnahmekriterien stehen in [POC.md](POC.md).

**Ergebnis:** Die kritischen technischen Annahmen sind vor Aufbau der finalen
Hardware praktisch bestätigt oder als Blocker dokumentiert.

## Phase 1 – Serial-Prototyp

- [ ] Firmware-Grundprojekt anlegen.
- [ ] `HELLO`/`DEVICE`-Handshake implementieren.
- [ ] `RESET_STATE`, `SET`, `PING` und Fehlerantworten implementieren.
- [ ] LED-Zustände und einfache Animationen implementieren.
- [ ] Kleines Host-Testprogramm für Portsuche und Befehle erstellen.
- [ ] Abziehen, erneutes Anschließen und wechselnde COM-Ports testen.

**Ergebnis:** Der Host findet das Gerät automatisch und kann LEDs zuverlässig
steuern.

## Phase 2 – OpenCode anbinden

- [ ] TypeScript-Hostprojekt strukturieren.
- [ ] Lokalen OpenCode-Service ermitteln und authentifiziert verbinden.
- [ ] Aktive Sessions einlesen.
- [ ] Relevante Events abonnieren.
- [ ] Session-Zustandsmaschine implementieren.
- [ ] Vollständige Resynchronisation nach Reconnect implementieren.
- [ ] Zustände an den Serial-Prototyp koppeln.

**Ergebnis:** Reale OpenCode-Aktivität steuert die Anzeige.

## Phase 3 – Robustheit

- [ ] Backoff und Reconnect für OpenCode implementieren.
- [ ] `PING`/`PONG` und Serial-Timeouts implementieren.
- [ ] Blockierte und fremde Ports testen.
- [ ] Standby/Aufwachen unter Windows testen.
- [ ] Verhalten bei OpenCode- und Firmware-Updates testen.
- [ ] Strukturierte, datenschutzfreundliche Logs ergänzen.

**Ergebnis:** Mehrstündiger Betrieb ohne manuelle Überwachung.

## Phase 4 – Bedienung und Installation

- [ ] Konfigurationsdatei definieren.
- [ ] Windows-Autostart einrichten.
- [ ] Optionales Tray-Symbol bewerten bzw. umsetzen.
- [ ] Build- und Installationsanleitung schreiben.
- [ ] Gehäuse und finale Verkabelung dokumentieren.

**Ergebnis:** Alltagstaugliche Installation.

## Später

- [ ] Mehrere Sessions auf mehreren LEDs darstellen.
- [ ] Subagenten separat darstellen.
- [ ] OLED, Taster oder weitere Ausgabegeräte prüfen.
