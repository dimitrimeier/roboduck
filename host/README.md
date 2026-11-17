# Host Bridge

Die Host Bridge beobachtet den lokalen OpenCode-Service und leitet daraus einen
datenschutzarmen Anzeigezustand ab. Diese erste Ausbaustufe besitzt bewusst noch
keinen USB-Adapter.

## Voraussetzungen

- Windows
- Node.js 22 oder neuer
- OpenCode V2 mit lokalem Background Service

## Installation

```powershell
cd host
npm install
```

## Ausführen

Während der Entwicklung:

```powershell
npm run dev
```

Kompilierte Variante:

```powershell
npm run build
npm start
```

Beenden mit `Ctrl+C`.

Die Anwendung gibt JSON Lines aus, beispielsweise:

```json
{"timestamp":"2026-11-12T12:00:00.000Z","kind":"connected","overallStatus":"running","sessions":1}
{"timestamp":"2026-11-12T12:00:03.000Z","kind":"event","event":"permission.asked","sessionId":"ses_...","sessionStatus":"asking","overallStatus":"asking"}
```

Es werden keine Prompts, Formularinhalte, Ressourcen oder Fehlermeldungen aus
OpenCode-Events ausgegeben. Die Ausgabe enthält nur Zeit, Eventtyp, Session-ID
und abgeleitete Zustände.

## Konfiguration

Die Dauer des Zustands `FINISHED` beträgt standardmäßig 60 Sekunden. Für einen
kurzen Test kann sie über eine Umgebungsvariable geändert werden:

```powershell
$env:OPENCODE_STATUS_FINISHED_HOLD_MS = "5000"
npm run dev
```

## Qualitätsprüfungen

```powershell
npm test
npm run check
npm run build
```

Die Tests benötigen weder OpenCode noch USB-Hardware. Der echte OpenCode-Adapter
wird im manuellen PoC zusätzlich gegen den lokalen Service geprüft.

## Aufbau

```text
src/core/                 Reines Zustandsmodell, ohne SDK- oder I/O-Abhängigkeit
src/ports/                Schnittstellen für Eingabe und Ausgabe
src/application/          Reconnect- und Ablaufsteuerung
src/adapters/opencode/    OpenCode SDK, Snapshot und Event-Normalisierung
src/adapters/console/     Datenschutzarme JSON-Ausgabe
test/                     Unit- und Anwendungstests mit Fakes
```

Der spätere Serial-Adapter kann als zusätzliche Ausgabe ergänzt werden, ohne
den OpenCode-Adapter oder die Zustandsmaschine mit Hardwaredetails zu koppeln.

## Manueller PoC 1

1. `npm run dev` starten.
2. In OpenCode eine normale Aufgabe starten und abschließen.
3. Eine Frage bzw. ein Formular und eine Berechtigungsanfrage beobachten.
4. Eine Ausführung unterbrechen und, wenn kontrolliert möglich, einen Fehler
   auslösen.
5. Zwei Sessions parallel ausführen.
6. OpenCode-Service oder Host Bridge neu verbinden und den Start-Snapshot prüfen.
7. Ergebnisse in `../docs/PROGRESS.md` dokumentieren.
