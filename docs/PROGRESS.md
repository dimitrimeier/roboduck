# Fortschritt

Zuletzt aktualisiert: 2026-11-12

## Aktueller Status

**Phase:** Planung / Phase 0

Das lokale Repository und die initiale Projektdokumentation wurden angelegt.
Es existiert noch keine Host- oder Firmware-Implementierung.

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

## Als Nächstes

1. PoC 1 aus `docs/POC.md` durchführen: OpenCode-Events ohne Hardware prüfen.
2. Zustandsmodell mit synthetischen Ereignissen testen.
3. Erst danach ein vorhandenes oder günstiges Entwicklungsboard für den
   lötfreien USB-Test auswählen.
4. Bei erfolgreichem End-to-End-PoC die finale LED-Hardware festlegen.

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
