# Firmware

Firmware 0.4.0 unterstützt auf dem nice!nano-v2-kompatiblen
Pro-Micro-nRF52840-Board gleichzeitig USB-CDC und Bluetooth LE. Beide
Transportwege verwenden dasselbe Statusprotokoll und steuern die über `P0.15`
programmierbare Board-LED. Zwei zukünftige RGB-Augen werden bereits logisch
simuliert, erscheinen auf der einfarbigen Board-LED aber nur als Helligkeit.

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

## Simulierter Start- und Verbindungsablauf

Firmware 0.4.0 rendert nicht blockierend folgenden Ablauf für beide Augen
identisch:

1. Rot, Gelb und Grün werden je 600 ms angezeigt, mit je 200 ms Pause.
2. Der beim Start über `VDDH/5` gemessene Versorgungswert wird dreimal langsam
   in seiner Akkufarbe geblinkt (600 ms an, 600 ms aus):
   - Rot unter 3,60 V
   - Gelb von 3,60 V bis unter 3,90 V
   - Grün ab 3,90 V
   - Gelb als „unbekannt“, wenn über 4,40 V eine USB-Versorgung erkannt wird
3. Blau pulsiert, bis ein gültiger `HELLO 1`-Handshake über USB oder BLE
   empfangen wurde.
4. Drei kurze blaue Blinker bestätigen die Verbindung.
5. Danach gelten die vorhandenen Statusmuster. Deren endgültige RGB-Farben sind
   bewusst noch ein TODO.

Bei 15 Sekunden ohne Hostaktivität wird kein alter Status weiter angezeigt;
die Firmware kehrt stattdessen zum blauen Verbindungspulsieren zurück. Ein
bereits während der Startsequenz erkannter Host wird nach der Akkuanzeige direkt
mit den drei kurzen Blinkern bestätigt.

Die Akkustufen sind eine vorläufige lineare Drittelung von 3,30 bis 4,20 V und
keine präzise Kapazitätsmessung. Bei USB kann dieser Board-Clone über `VDDH/5`
nicht gleichzeitig die echte Akkuspannung bestimmen.

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
BATTERY
SUPPLY
DISPLAY
```

Der Handshake antwortet beispielsweise mit:

```text
DEVICE OPENCODE_STATUS protocol=1 firmware=0.4.0 leds=1
```

Die maximale Befehlslänge beträgt 95 Byte ohne Zeilenende. Unbekannte oder
ungültige Befehle werden mit `ERROR <code>` abgelehnt.

`BATTERY` liest den für nice!nano vorgesehenen Akku-ADC `P0.04` (`AIN2`) und
liefert beispielsweise:

```text
BATTERY raw=8672 adc_mv=397 source_mv=556
```

`source_mv` verwendet den Spannungsteiler des originalen nice!nano mit dem
Faktor 7/5. Bei kompatiblen Clones muss dieser Wert mit einem angeschlossenen
Akku und einem Multimeter kalibriert werden. Ohne Akku ist der Messwert durch
die Ladeschaltung bzw. einen offenen Messeingang beeinflusst und stellt weder
die USB-Spannung noch einen Akkustand dar. Die USB-5-V-Schiene wird nicht direkt
an den ADC gelegt.

Beim konkret geprüften Clone blieb `source_mv` auch im reinen Akkubetrieb nur
bei ungefähr 0,51–0,59 V. Das Board läuft dabei nachweislich über BLE weiter,
der Akku ist also aktiv. Dieser Clone führt die Akkuspannung folglich nicht wie
ein originales nice!nano über den erwarteten Teiler an `P0.04`; der ausgegebene
Wert darf auf dieser Hardware nicht als Akkuspannung interpretiert werden.

`SUPPLY` liest stattdessen den internen nRF52840-Kanal `VDDH/5`, für den keine
GPIO-Verbindung erforderlich ist:

```text
SUPPLY raw=18752 adc_mv=859 supply_mv=4230
```

Dieser Kanal lieferte auf dem realen Clone bei USB-Versorgung etwa 4,91 V und
unmittelbar danach im reinen Akkubetrieb stabil 4,295 V. Damit eignet er sich
grundsätzlich zur Akkuspannungsschätzung ohne zusätzliche Verdrahtung. Vor der
Umrechnung in Prozent wurde der Wert gegen eine Multimetermessung von 4,230 V
kalibriert. Firmware 0.3.3 korrigiert die zuvor gemeldeten 4,295 V deshalb mit
dem Faktor `4230/4295` beziehungsweise ungefähr 0,98487. Der Faktor gilt für das
konkret geprüfte Board; nRF52840-ADC und interne Referenz können zwischen
Exemplaren abweichen.

Nach dem Flashen von Firmware 0.3.3 ergaben drei BLE-Abfragen im reinen
Akkubetrieb 4,220 V, 4,230 V und 4,230 V. Die Kalibrierung stimmt damit bis auf
10 mV mit der gleichzeitig verwendeten Multimeterreferenz von 4,230 V überein.

`DISPLAY` macht die RGB-Simulation abfragbar, ohne ungefragte Diagnosezeilen in
den USB-/BLE-Anforderungsablauf einzustreuen. Beispiel:

```text
DISPLAY phase=CONNECTING battery=HIGH supply_mv=4230 rgb=0,0,147
```

Die Werte beschreiben die aktuell simulierte Farbe vor Anwendung der globalen
Helligkeit. Beide zukünftigen Augen verwenden vorerst denselben Wert.

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

## Spätere externe RGB-Augen

Vorgesehen sind zwei 4-Pin-RGB-LEDs mit gemeinsamer Kathode. Damit beide Augen
später unabhängig steuerbar bleiben, werden sechs getrennte PWM-Ausgänge
eingeplant: Rot, Grün und Blau pro Auge. Vorerst erhalten alle drei Kanäle
beider Augen jeweils identische Softwarewerte.

Jeder der sechs Farbkanäle benötigt einen eigenen Vorwiderstand; auch identisch
angesteuerte Kanäle dürfen keinen gemeinsamen Widerstand verwenden. Die beiden
gemeinsamen Kathoden kommen an Masse. Konkrete GPIO-Pins, Widerstände und eine
eventuell nötige Treiberstufe werden erst nach Vorliegen von Durchlassspannung
und gewünschtem Strom je Farbe festgelegt. Die GPIO-Logik arbeitet mit 3,3 V;
ein Kanal mit bis zu 4 V Durchlassspannung kann daran nicht zuverlässig
leuchten. Direktansteuerung ist nur bei einem für das nRF52840 sicheren kleinen
Kanal- und Gesamtstrom zulässig; andernfalls werden geeignete Source-Treiber
verwendet.
