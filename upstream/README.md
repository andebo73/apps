# qurix-Upstream

Dieses Verzeichnis beschreibt den versionierten Framework-Snapshot, der aus
dem qurix-Apps-Projekt uebernommen wird. Der Snapshot liegt in seinen normalen
Projektpfaden (`src/shell`, `src/shared`, `src/themes` und `tools`), damit der
Build unveraendert und ohne Zugriff auf den Upstream funktioniert.

## Befehle

```powershell
npm run upstream:check
npm run upstream:apply
```

`upstream:check` vergleicht den eingecheckten Snapshot mit dem aktuellen
Upstream und schreibt nichts. Exitcode 1 bedeutet, dass Aenderungen vorliegen.

`upstream:apply` aktualisiert ausschliesslich die in `manifest.json`
aufgefuehrten Pfade und schreibt Revision, Zeitpunkt und Dateihashes zurueck.
Wenn eine Snapshot-Datei seit dem letzten Sync lokal geaendert wurde, wird der
Vorgang abgebrochen. Solche Anpassungen gehoeren entweder in FDB-eigene Dateien
oder zuerst in den qurix-Upstream.

Eine abweichende Quelle kann einmalig angegeben werden:

```powershell
node tools/sync-upstream.mjs --check --source D:/pfad/zu/qurix/apps
```

FDB-eigene Bereiche wie `src/apps`, `src/portal` und `src/themes/fdb*` stehen
nicht in der Allowlist und werden vom Werkzeug nicht veraendert.

