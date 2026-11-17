# Hinweise für Coding-Agenten

## Projektkontext

Dieses Repository entwickelt eine Windows-Bridge und Mikrocontroller-Firmware
für eine externe OpenCode-Statusanzeige.

## Vor der Arbeit

1. `README.md` lesen.
2. `docs/PROGRESS.md` lesen.
3. Nur die für die Aufgabe relevanten Dokumente unter `docs/` hinzuziehen.

## Arbeitsregeln

- Änderungen klein, nachvollziehbar und plattformgerecht für Windows halten.
- Keine COM-Port-Nummer, Zugangsdaten oder lokalen absoluten Pfade fest codieren.
- Andere Serial-Geräte niemals ungeprüft ansprechen; Geräte per Metadaten
  vorfiltern und anschließend per Handshake verifizieren.
- Der Host ist die maßgebliche Zustandsquelle; die Firmware ist nur Anzeige.
- Nach relevanter Arbeit `docs/PROGRESS.md` aktualisieren.
- Neue Architekturentscheidungen kurz in `docs/DECISIONS.md` festhalten.
- Geheimnisse, Build-Ausgaben und lokale Gerätekonfigurationen nicht committen.
