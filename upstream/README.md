# qurix-Upstream

Dieses Verzeichnis beschreibt den versionierten Framework-Snapshot, der aus
dem qurix-Apps-Projekt uebernommen wird. Der Snapshot liegt in seinen normalen
Projektpfaden (`src/shell`, `src/shared`, `src/themes` und `tools`), damit der
Build unveraendert und ohne Zugriff auf den Upstream funktioniert.

## Befehle

```powershell
npm run upstream:check
npm run upstream:apply
npm run upstream:apply:remove
```

`upstream:check` vergleicht den eingecheckten Snapshot mit dem aktuellen
Upstream und schreibt nichts. Exitcode 1 bedeutet, dass Aenderungen vorliegen.

`upstream:apply` aktualisiert ausschliesslich die in `manifest.json`
aufgefuehrten Pfade und schreibt Revision, Zeitpunkt und Dateihashes zurueck.
Wenn eine Snapshot-Datei seit dem letzten Sync lokal geaendert wurde, wird der
Vorgang abgebrochen. Solche Anpassungen gehoeren entweder in FDB-eigene Dateien
oder zuerst in den qurix-Upstream.

Jeder Lauf schreibt `_work/upstream-sync-report.md` mit Updates, lokalen
Konflikten und im Upstream entfernten Dateien. Eine Upstream-Loeschung wird von
`upstream:apply` nur gemeldet und blockiert den Apply-Lauf. Erst der separate
Befehl `upstream:apply:remove` entfernt sie, sofern die lokale Datei seit dem
letzten Sync unveraendert ist. Der Bericht sollte davor geprueft werden.

Ein Apply ohne inhaltliche oder Revisionsaenderung schreibt das Manifest nicht
neu. Wiederholte Apply-Laeufe sind damit idempotent; nur der ignorierte Bericht
erhaelt einen neuen Zeitstempel.

Hashes von validen UTF-8-Textdateien werden mit LF-Zeilenenden berechnet. Damit
liefert derselbe Snapshot unter Windows und auf Linux identische Ergebnisse.
Binaerdateien werden weiterhin unveraendert bytegenau gehasht.

Eine abweichende Quelle kann einmalig angegeben werden:

```powershell
node tools/sync-upstream.mjs --check --source D:/pfad/zu/qurix/apps
```

FDB-eigene Bereiche wie `src/apps`, `src/portal` und `src/themes/fdb*` stehen
nicht in der Allowlist und werden vom Werkzeug nicht veraendert.
