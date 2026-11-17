# Fortschritt

Zuletzt aktualisiert: 2026-11-12

## Aktueller Status

**Phase:** Proof of Concept / PoC 1

Der Host-Kern, die OpenCode-Anbindung und die Konsolenausgabe sind ohne USB
implementiert. Automatisierte Tests sind erfolgreich; die verschiedenen realen
OpenCode-Ereignisse müssen noch systematisch manuell erzeugt und protokolliert
werden. Es existiert noch keine Firmware.

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
- [x] 23 automatisierte Tests sowie Typecheck und Build erfolgreich ausgeführt.

## Als Nächstes

1. Die realen Eventfälle aus PoC 1 mit `npm run dev` systematisch prüfen.
2. Ergebnisse und eventuelle Abweichungen des OpenCode-Verhaltens dokumentieren.
3. Danach PoC 2 mit zusätzlichen Grenz- und Reihenfolgetests abschließen.
4. Erst danach ein vorhandenes oder günstiges Entwicklungsboard für den
   lötfreien USB-Test auswählen.
5. Bei erfolgreichem End-to-End-PoC die finale LED-Hardware festlegen.

## Offene Fragen

- Raspberry Pi Pico/Pico 2 oder welches Arduino-Modell?
- Einzelne RGB-LED, LED-Ring oder LED-Streifen?
- Eine Gesamtanzeige oder eine LED pro Session im MVP?
- Wie lange soll `FINISHED` sichtbar bleiben?
- Sollen Berechtigungsanfragen eine eigene Farbe statt `ASKING` erhalten?

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
