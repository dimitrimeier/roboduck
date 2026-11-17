# Roadmap

## Phase 0 – Anforderungen und Hardware festlegen

- [x] Mikrocontroller auswählen: nice!nano-kompatibler Pro Micro nRF52840.
- [ ] LED-Typ und Anzahl festlegen.
- [ ] Gesamtstatus oder eine LED pro Session für den MVP entscheiden.
- [ ] Farb- und Animationsschema bestätigen.
- [x] Beispielgerät unter Windows auslesen und VID/PID/Produktdaten notieren.

**Ergebnis:** Verbindliche MVP-Hardware und Anzeigeform.

## Phase 0.5 – Proof of Concept

- [ ] OpenCode-API und relevante Events ohne Hardware beobachten.
- [ ] Zustandsableitung mit synthetischen bzw. aufgezeichneten Events testen.
- [x] Serial-Protokoll zunächst mit einem simulierten Gerät testen.
- [x] Mikrocontroller nur per USB und ohne gelötete externe LEDs testen.
- [x] End-to-End-Durchstich mit eingebauter Board-LED durchführen.
- [x] USB-Reconnect mit vollständiger Synchronisation testen.
- [ ] Einen mindestens zweistündigen Lauf testen.
- [ ] Go/No-Go-Entscheidung dokumentieren.

Details und Abnahmekriterien stehen in [POC.md](POC.md).

**Ergebnis:** Die kritischen technischen Annahmen sind vor Aufbau der finalen
Hardware praktisch bestätigt oder als Blocker dokumentiert.

## Phase 1 – Serial-Prototyp

- [x] Firmware-Grundprojekt anlegen.
- [x] `HELLO`/`DEVICE`-Handshake implementieren.
- [x] `RESET_STATE`, `SET`, `PING` und Fehlerantworten implementieren.
- [x] LED-Zustände und einfache Animationen implementieren.
- [x] Kleines Host-Testprogramm für Portsuche und Befehle erstellen.
- [x] Abziehen und erneutes Anschließen testen.
- [ ] Wechselnde COM-Port-Nummer testen.

**Ergebnis:** Der Host findet das Gerät automatisch und kann LEDs zuverlässig
steuern.

## Phase 2 – OpenCode anbinden

- [x] TypeScript-Hostprojekt strukturieren.
- [x] Lokalen OpenCode-Service ermitteln und authentifiziert verbinden.
- [x] Aktive Sessions einlesen.
- [x] Relevante Events abonnieren.
- [x] Session-Zustandsmaschine implementieren.
- [x] Vollständige Resynchronisation nach Reconnect implementieren.
- [x] Zustände an den Serial-Prototyp koppeln.

**Ergebnis:** Reale OpenCode-Aktivität steuert die Anzeige.

## Phase 3 – Robustheit

- [x] Backoff und Reconnect für OpenCode implementieren.
- [x] `PING`/`PONG` und Serial-Timeouts implementieren.
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
- [x] Bluetooth LE als alternative Verbindung zu USB bewerten und prototypisch testen.
- [ ] OLED, Taster oder weitere Ausgabegeräte prüfen.
