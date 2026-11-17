# OpenCode Status Light

Eine externe LED-Statusanzeige für OpenCode-Sessions unter Windows. Ein lokaler
Host-Dienst beobachtet OpenCode, erkennt den Mikrocontroller automatisch über
USB-Serial oder Bluetooth LE und überträgt den aktuellen Zustand an dessen LEDs.

## Ziel

Auf einen Blick erkennen, ob OpenCode-Agenten arbeiten, auf eine Eingabe warten,
fertig sind, einen Fehler melden oder ob keine Session aktiv ist.

## Geplante Komponenten

- **Windows Host Bridge:** liest OpenCode-Events und verwaltet den Gesamtzustand
- **USB/BLE-Verbindung:** automatische Geräteerkennung, Handshake und Reconnect
- **Mikrocontroller-Firmware:** steuert zunächst die Board-LED, später externe LEDs
- **Dokumentation:** hält Features, Architektur, Entscheidungen und Fortschritt fest

## Dokumentation

- [Features](docs/FEATURES.md)
- [Architektur](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Proof of Concept](docs/POC.md)
- [Fortschritt](docs/PROGRESS.md)
- [Entscheidungen](docs/DECISIONS.md)

## Aktueller Stand

Firmware 0.3.0 läuft auf einem nice!nano-v2-kompatiblen Pro-Micro-nRF52840-
Board und bietet USB-CDC sowie Bluetooth LE. Die Host Bridge hält standardmäßig
USB als aktiven Primary und Bluetooth als verbundenes Backup im Standby. Jede
Verbindung wird anhand von Metadaten bzw. BLE-Service und zusätzlich per
Protokoll-Handshake verifiziert. Reale End-to-End-Läufe sowie kontrollierter
Failover zu BLE, Failback zu USB, USB-Reconnect und Firmware-Watchdog sind
bestätigt.

## Repository-Struktur

```text
host/       Windows Host Bridge und automatisierte Tests
firmware/   Mikrocontroller-Firmware und Hardware-Testwerkzeuge
docs/       Planung und Projektdokumentation
```

## Vorgesehener Technik-Stack

- TypeScript/Node.js für die Windows Host Bridge
- `@opencode/client` für OpenCode API und Event-Stream
- `serialport` für USB-Serial
- Go-Bluetooth/WinRT-Helper für Bluetooth LE unter Windows
- nice!nano-v2-kompatibles Pro-Micro-nRF52840-Board
- TinyGo für die nRF52840-Firmware
- zunächst Board-LED, später drei externe Low-Power-LEDs

Der Stack gilt bis zur ersten technischen Erprobung als vorläufig.
