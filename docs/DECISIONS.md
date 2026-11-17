# Entscheidungen

Kurze Aufzeichnung verbindlicher technischer Entscheidungen. Neue Einträge
erhalten Datum, Status, Entscheidung und Begründung.

## 2026-11-12 – Host als maßgebliche Zustandsquelle

**Status:** Angenommen

Die Windows Host Bridge hält den vollständigen Session- und Anzeigezustand. Der
Mikrocontroller rendert nur den zuletzt synchronisierten Zustand.

**Begründung:** Nach einem Firmware-Neustart oder erneuten Anschließen kann der
Host die Anzeige vollständig wiederherstellen, ohne auf neue OpenCode-Events zu
warten.

## 2026-11-12 – Geräteerkennung mit Filter und Handshake

**Status:** Angenommen

Serialports werden zunächst anhand ihrer USB-Metadaten gefiltert. Ein Gerät wird
erst nach erfolgreichem, versioniertem Handshake verwendet.

**Begründung:** VID/PID sind bei Entwicklungsboards und USB-Serial-Chips nicht
immer eindeutig. Der Handshake verhindert, dass fremde Geräte Befehle erhalten.

## 2026-11-12 – Logischer statt hardwareabhängiger Reset

**Status:** Angenommen

Nach einer Verbindung sendet der Host `RESET_STATE` und danach einen kompletten
Snapshot. Ein DTR/RTS-Hardware-Reset ist keine Voraussetzung.

**Begründung:** Das Verhalten beim Öffnen eines COM-Ports unterscheidet sich je
nach Mikrocontroller und Bootloader.

## 2026-11-12 – Zeilenbasiertes Protokoll für den Prototyp

**Status:** Vorläufig angenommen

Der erste Prototyp verwendet ein einfaches, versioniertes Textprotokoll.

**Begründung:** Es ist mit einem Serial-Monitor leicht zu testen und auf kleinen
Mikrocontrollern unkompliziert zu implementieren. Nach dem Prototyp wird geprüft,
ob Prüfsummen oder ein binäres Framing notwendig sind.
