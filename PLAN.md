# Initialisierungsplan fuer FDB Apps

## Zielbild

FDB Apps uebernimmt das modulare, local-first Single-File-Konzept von qurix:
Quellmodule werden durch einen abhaengigkeitsfreien Node-Build zu jeweils einer
selbststaendigen HTML-Datei zusammengesetzt, die per `file://` und auf einem
statischen Host funktioniert. qurix bleibt vorerst der Upstream fuer
wiederverwendbare Konzepte, Build-Code, Shell, Tests und technische Regeln.

FDB-spezifisch sind Marke, Theme, Portaltexte, App-Auswahl und die privaten Apps.
Ein Sync darf diese Dateien nie ungeprueft ueberschreiben.

## Geplante Struktur

```text
.
|-- .github/workflows/       # Build, Tests und spaeter GitHub Pages
|-- _work/                   # lokal, vollstaendig von Git ignoriert
|-- dist/                    # generierte, deploybare Single-File-Apps
|-- src/
|   |-- apps/                # ausschliesslich FDB-Apps
|   |-- portal/              # FDB-Portal und FDB-Texte
|   |-- shell/               # vendorter Snapshot aus qurix
|   `-- themes/
|       |-- fdb.css          # FDB-Branding, lokal gepflegt
|       `-- fdb.fonts.html   # optionale FDB-Schriften
|-- tests/                   # uebernommene Frameworktests + FDB-App-Tests
|-- tools/                   # Build und kontrollierter Upstream-Sync
|-- upstream/
|   |-- manifest.json        # Quelle, Revision und Dateiklassen
|   `-- README.md            # Sync-Ablauf und Konfliktregeln
|-- backlog.md
|-- findings.md
|-- source.md
|-- package.json
`-- README.md
```

## Wiederverwendungs- und Sync-Strategie

Das Framework wird als versionierter Snapshot im FDB-Repository eingecheckt.
Damit bleiben Builds lokal und in CI reproduzierbar, auch wenn der qurix-Pfad
nicht vorhanden oder das Upstream-Repository nicht erreichbar ist.

Ein Sync-Werkzeug soll nur explizit freigegebene Pfade uebernehmen:

- `src/shell/`, generische Module aus `src/shared/`, `tools/` und generische
  Tests kommen aus qurix.
- `src/themes/fdb*`, `src/portal/`, `src/apps/` und FDB-spezifische Tests bleiben
  im FDB-Repository und werden nie automatisch ersetzt.
- `upstream/manifest.json` speichert mindestens Repository/Quellpfad,
  Commit-ID, Sync-Zeitpunkt und die uebernommenen Pfade.
- Der Sync laeuft zuerst im Pruefmodus und erzeugt einen Diff. Erst eine
  ausdrueckliche Apply-Option schreibt Dateien.
- Nach jedem Apply laufen Build und Tests. Abweichungen werden in `findings.md`,
  generische Verbesserungen fuer qurix in `source.md` dokumentiert.

Die bestehenden `qrx-*` CSS- und JavaScript-Schnittstellen bleiben zunaechst
erhalten. Sie sind technische API-Namen, keine sichtbare Marke. Eine sofortige
Umbenennung wuerde Updates unnoetig konflikttraechtig machen. Sichtbare Texte,
Seitentitel, Metadaten, Farben, Schriften und Links werden dagegen konsequent auf
"FDB Apps" umgestellt.

## Umsetzung in Phasen

Status: Phasen 1 bis 4 wurden am 2026-08-26 abgeschlossen. Der Snapshot umfasst
20 Allowlist-Dateien aus qurix-Revision
`d86620707ca0e906042e7f74868f8186d2696630`. Das sichtbare FDB-Branding liegt in
einer lokalen Build-Schicht und veraendert keine synchronisierte Datei. Build,
Tests, Marken-Scan und Sync-Check sind erfolgreich. Der Sync schreibt Berichte,
blockiert lokale Konflikte und verlangt fuer Upstream-Loeschungen eine separate
Freigabe. Die Quality-CI prueft Snapshot, Tests, Build, Branding und committed
Build-Ausgaben ohne ein Deployment auszufuehren. Als Naechstes folgt Phase 5.

### 1. Upstream-Basis erfassen

- qurix-Commit und relevante Verzeichnisse in einem Manifest festhalten.
- Shell, Build-Werkzeuge, benoetigte Shared-Module und einen minimalen Satz
  Frameworktests uebernehmen.
- Ein minimales `package.json` fuer Build, Test, Sync-Check und Sync-Apply
  anlegen.

Abnahme: Ein unveraenderter Framework-Build laeuft aus dem FDB-Repository ohne
Zugriff auf das qurix-Arbeitsverzeichnis.

### 2. FDB-Branding isolieren

- `fdb.css` mit demselben `--qrx-*` Tokenvertrag wie das qurix-Theme anlegen.
- Portal-Konfiguration und sichtbare Shell-Texte auf "FDB Apps" ausrichten.
- Harte qurix-Markennennungen im generischen Build identifizieren. Wo Branding
  heute fest im Framework steckt, zuerst einen Eintrag in `source.md` anlegen
  und die Konfigurierbarkeit moeglichst im qurix-Upstream umsetzen.

Abnahme: Die generierte Portalseite enthaelt keine sichtbare qurix-Marke; ein
Theme- oder Framework-Update erfordert keine Aenderung an einer FDB-App.

### 3. Reproduzierbaren Sync bauen

- Allowlist-basiertes Sync-Werkzeug mit `--check` und `--apply` implementieren.
- Lokalen Pfad als Entwicklungsquelle erlauben; optional spaeter Git-URL und
  Revision unterstuetzen.
- Konflikt- und Pruefbericht unter `_work/` erzeugen.

Abnahme: `sync --check` veraendert keine Datei; `sync --apply` beruehrt keine
FDB-eigenen Pfade; ein zweiter Lauf ist ohne Upstream-Aenderung leer.

### 4. Qualitaet und Deployment

- Buildtest, Marken-Check und grundlegenden Browser-Smoke-Test uebernehmen.
- GitHub Action fuer Build und Tests einrichten; Pages-Deployment erst nach
  Festlegung des Ziel-Repositories aktivieren.
- Generierte Dateien in `dist/` wie im Upstream als deploybare Artefakte
  behandeln.

Abnahme: CI baut alle Ausgaben, Tests sind gruen und keine Datei aus `_work/`
ist versioniert.

### 5. Erste FDB-App

- App-Scope und Datenhaltung festlegen.
- App unter `src/apps/<app>/` nach dem qurix-Modulvertrag erstellen.
- App in das FDB-Portal aufnehmen und `file://`, Export ohne Daten sowie Export
  mit Daten pruefen.

## Entscheidungen vor Phase 2

- FDB-Farbwelt, Typografie, Logo/Icon und Ziel-Domain.
- Name und Funktionsumfang der ersten App.
- Ob `dist/` committed oder ausschliesslich durch CI erzeugt wird; vorerst gilt
  analog zu qurix: committed.
- Ob der qurix-Upstream langfristig per lokalem Pfad, Git-Remote oder
  veroeffentlichtem Framework-Paket synchronisiert werden soll.

## Naechster konkreter Schritt

Phase 5 vorbereiten: Scope, Datenhaltung und Exportverhalten der ersten FDB-App
festlegen und die App anschliessend nach dem bestehenden Modulvertrag umsetzen.
