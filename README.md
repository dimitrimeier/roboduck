# OpenCode Status Light

Eine externe LED-Statusanzeige für OpenCode-Sessions unter Windows. Ein lokaler
Host-Dienst beobachtet OpenCode, erkennt den Mikrocontroller automatisch über
USB-Serial und überträgt den aktuellen Zustand an dessen LEDs.

## Ziel

Auf einen Blick erkennen, ob OpenCode-Agenten arbeiten, auf eine Eingabe warten,
fertig sind, einen Fehler melden oder ob keine Session aktiv ist.

## Geplante Komponenten

- **Windows Host Bridge:** liest OpenCode-Events und verwaltet den Gesamtzustand
- **USB-Serial-Verbindung:** automatische Geräteerkennung, Handshake und Reconnect
- **Mikrocontroller-Firmware:** steuert RGB- bzw. WS2812-LEDs
- **Dokumentation:** hält Features, Architektur, Entscheidungen und Fortschritt fest

## Dokumentation

- [Features](docs/FEATURES.md)
- [Architektur](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Proof of Concept](docs/POC.md)
- [Fortschritt](docs/PROGRESS.md)
- [Entscheidungen](docs/DECISIONS.md)

## Aktueller Stand

Der testbare Host-Kern und der OpenCode-Beobachter ohne USB sind implementiert.
Die realen Eventfälle aus PoC 1 werden als Nächstes praktisch verifiziert.
Hardware, LED-Anzahl und die genaue Darstellung mehrerer Sessions sind noch
nicht endgültig festgelegt.

## Repository-Struktur

```text
host/       Windows Host Bridge und automatisierte Tests
firmware/   Mikrocontroller-Firmware (später)
docs/       Planung und Projektdokumentation
```

## Vorgesehener Technik-Stack

- TypeScript/Node.js für die Windows Host Bridge
- `@opencode/client` für OpenCode API und Event-Stream
- `serialport` für USB-Serial
- Raspberry Pi Pico/Pico 2 oder Arduino als Mikrocontroller
- WS2812B/NeoPixel oder einzelne RGB-LEDs

Der Stack gilt bis zur ersten technischen Erprobung als vorläufig.
