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

## 2026-11-12 – Entkoppelter Host mit Ports und Adaptern

**Status:** Angenommen

OpenCode-Quelle, Zustandsverwaltung, Ablaufsteuerung und Ausgaben werden durch
kleine Schnittstellen getrennt. Das Kernmodell importiert weder das OpenCode-SDK
noch spätere Serial-Bibliotheken.

**Begründung:** Eventfolgen, Reconnect und Zeitverhalten lassen sich ohne
OpenCode-Service oder Hardware automatisiert testen. Der spätere Serial-Adapter
kann ergänzt werden, ohne die Zustandslogik umzubauen.

## 2026-11-12 – Datenschutzarme interne OpenCode-Events

**Status:** Angenommen

Der OpenCode-Adapter übernimmt ausschließlich Eventtyp, Session-ID,
Zeitstempel und technisch erforderliche Request-IDs. Prompt-, Formular-,
Ressourcen- und Providerinhalte werden nicht in das Kernmodell oder die normale
Konsolenausgabe übernommen.

**Begründung:** Die Anzeige benötigt nur Zustände. Eine frühe Normalisierung
reduziert das Risiko, sensible Inhalte versehentlich zu protokollieren oder über
USB zu übertragen.

## 2026-11-12 – Unterbrechung wird als Idle dargestellt

**Status:** Vorläufig angenommen

Eine durch Benutzer, Shutdown, Superseding oder Inaktivität unterbrochene
Ausführung wird als `IDLE` und nicht als `ERROR` dargestellt.

**Begründung:** Eine Unterbrechung ist nicht zwingend ein technischer Fehler.
Diese Darstellung wird im praktischen PoC geprüft.

## 2026-11-12 – Live-Events durch periodische Abstimmung ergänzen

**Status:** Angenommen

Zusätzlich zum OpenCode-Event-Stream wird der aktive Snapshot standardmäßig alle
fünf Sekunden neu geladen. Nur tatsächliche Differenzen erzeugen interne
Host-Events. Das Intervall ist konfigurierbar.

**Begründung:** Der praktische Test zeigte, dass beim Inaktivwerden bzw.
Schließen einer Session kein passendes Live-Event eintreffen muss. Ohne
Abstimmung bleibt der lokale Zustand bis zum Neustart fälschlich auf `IDLE`.
Polling bleibt ein Fallback; unveränderte Ergebnisse erzeugen kein Log-Rauschen.
