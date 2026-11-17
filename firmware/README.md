# Firmware

Firmware 0.3.0 unterstützt auf dem nice!nano-v2-kompatiblen
Pro-Micro-nRF52840-Board gleichzeitig USB-CDC und Bluetooth LE. Beide
Transportwege verwenden dasselbe Statusprotokoll und steuern die über `P0.15`
programmierbare Board-LED.

## Hardware

- Board-ID des geprüften Boards: `nRF52840-nicenano`
- UF2-Bootloader: 0.6.0
- rote Benutzer-LED: `P0.15`, aktiv High
- USB-Bootloader: VID `239A`, PID `00B3`
- USB-Anwendungsfirmware: VID `239A`, PID `0029`

Build, UF2-Flash sowie USB- und BLE-Protokolltests wurden am 16. November 2026
mit Go 1.27.3, TinyGo 0.44.0 und `tinygo.org/x/bluetooth` 0.17.0 erfolgreich auf
dem realen Board ausgeführt.

Beim geprüften Clone ist die rote LED die programmierbare Benutzer-LED. Die
blaue LED blinkt unabhängig von der Firmware und gehört zur Ladeschaltung; sie
ist nicht als normale GPIO-Status-LED steuerbar. Diese Farbzuordnung ist
gegenüber einem originalen nice!nano vertauscht. Das blaue Blinken ohne Akku
wird nicht von Bluetooth verursacht.

## Unterstützte Anzeige auf einer einfarbigen Board-LED

| Zustand | Muster |
|---|---|
| `OFF` | aus |
| `IDLE` | schwach an |
| `FINISHED` | dauerhaft an |
| `RUNNING` | langsam pulsierend |
| `ASKING` | Doppelblitz |
| `ERROR` | schnell blinkend |

Farben werden erst mit den externen LEDs ergänzt.

## Build mit TinyGo

Voraussetzungen:

- Go 1.25 oder neuer
- TinyGo 0.44 oder neuer

Aus `firmware/` bauen:

```powershell
tinygo build -target=nicenano -o build/opencode-status-light.uf2 .
```

Zum Flashen `RST` zweimal kurz mit `GND` verbinden. Sobald Windows das Laufwerk
`NICENANO` anzeigt, die UF2-Datei darauf kopieren:

```powershell
Copy-Item ./build/opencode-status-light.uf2 D:/
```

Der Laufwerksbuchstabe ist nur ein Beispiel und muss vorher geprüft werden.
Alternativ kann TinyGo das erkannte UF2-Laufwerk selbst verwenden:

```powershell
tinygo flash -target=nicenano .
```

Der vorhandene UF2-Bootloader wird dabei nicht überschrieben.

## Protokoll

Die Firmware implementiert Version 1 des zeilenbasierten Protokolls:

```text
HELLO 1
RESET_STATE
SET 0 <OFF|IDLE|FINISHED|RUNNING|ASKING|ERROR>
BRIGHTNESS <0-255>
SYNC_COMPLETE
PING
```

Der Handshake antwortet beispielsweise mit:

```text
DEVICE OPENCODE_STATUS protocol=1 firmware=0.3.0 leds=1
```

Die maximale Befehlslänge beträgt 95 Byte ohne Zeilenende. Unbekannte oder
ungültige Befehle werden mit `ERROR <code>` abgelehnt.

Nach einem erfolgreichen Host-Befehl erwartet die Firmware spätestens nach 15
Sekunden weitere Aktivität. Bleiben Statusbefehle und `PING` aus, wechselt die
Anzeige selbstständig auf `OFF`. Dadurch bleibt nach einem Host-Absturz kein
veralteter Agentenstatus dauerhaft sichtbar. Dieses Verhalten wurde am realen
Board praktisch bestätigt.

## Bluetooth LE

Die Firmware wirbt ohne vorherige Windows-Kopplung als `OCStatus`. Zur
technischen Vorfilterung wird ausschließlich der projektspezifische GATT-Dienst
verwendet:

```text
Service: 78B13697-8A60-4161-A989-69661675E94A
RX:      5657F6C0-13B2-4535-8F85-14CACF398B5F  (Host → Board)
TX:      E41A114E-C190-4278-AA26-72C8563ADF58  (Board → Host)
```

Erst nach dem zusätzlichen `HELLO 1`-Handshake sendet die Host Bridge
Statusbefehle. Lange Antworten werden in BLE-Pakete aufgeteilt; Empfang,
Parsing und Versand sind über feste Ringpuffer vom SoftDevice-Callback
entkoppelt.

Die Verbindung ist im aktuellen PoC nicht gekoppelt oder verschlüsselt. Der
Handshake identifiziert das Protokoll, ist aber keine kryptografische
Authentifizierung. Über BLE werden weiterhin nur abstrahierte LED-Zustände und
keine OpenCode-Inhalte übertragen.

## Test unter Windows

Nach dem Flashen in PowerShell aus dem Repository-Stamm ausführen:

```powershell
./firmware/tools/Test-StatusLight.ps1
```

Das Skript verwendet keine fest codierte COM-Port-Nummer. Es filtert zuerst
nach der USB-Kennung der nice!nano-Anwendungsfirmware, bestätigt das Gerät per
`HELLO`-Handshake, prüft gültige sowie ungültige Befehle und durchläuft erst
danach alle LED-Muster. Ob die Muster richtig aussehen, muss visuell bestätigt
werden; das kann der serielle Protokolltest nicht erkennen.

## Spätere externe LEDs

Die drei vorhandenen Low-Power-LEDs werden nicht direkt ohne Vorwiderstand an
GPIO-Pins angeschlossen. Vor der Verdrahtung werden Farbe, Durchlassspannung und
Nennstrom jeder LED benötigt. Daraus ergeben sich Vorwiderstände und die
geeigneten Pins. Die GPIO-Logik arbeitet mit 3,3 V; eine LED mit bis zu 4 V
Durchlassspannung kann daran möglicherweise nicht zuverlässig leuchten.
