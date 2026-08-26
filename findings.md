# Findings

Beobachtungen, Fehler und Auffaelligkeiten waehrend der Entwicklung.

## 2026-08-26 – Initialisierung

- Das qurix-Projekt trennt Shell, Themes, Apps, Portal und Build-Werkzeuge
  bereits klar; diese Grenze eignet sich als Grundlage fuer den FDB-Fork.
- Im qurix-Build ist der sichtbare Standardtitel noch fest als
  `<App-Name> – qurix` codiert. Fuer konfliktarme Mehrmarken-Nutzung sollte das
  konfigurierbar werden.
- Das FDB-Verzeichnis war bei der Initialisierung noch kein Git-Repository.
- Das qurix-Pages-Deployment baut mit Node 20 direkt aus `tools/build.mjs` und
  benoetigt fuer den Build keine installierten Pakete.
- Der erste Snapshot basiert auf qurix-Revision
  `d86620707ca0e906042e7f74868f8186d2696630` und umfasst 20 Allowlist-Dateien.
- Build und zwei lokale Frameworktests laufen ohne Abhaengigkeit vom
  qurix-Arbeitsverzeichnis; ein anschliessender Sync-Check ist leer.
- Das qurix-Arbeitsverzeichnis enthaelt ein unversioniertes `.claude/`. Es ist
  kein Bestandteil des Snapshots.
- Das FDB-Branding kann vollstaendig als lokale Build-Nachbearbeitung umgesetzt
  werden. Dadurch bleiben alle 20 Upstream-Dateien unveraendert und der
  Sync-Check weiterhin leer.
- Die technischen Namen `qrx-*` und `window.qurixApp` bleiben intern bestehen;
  im generierten Portal gibt es keine sichtbare qurix-Markennennung.
- Die Browsersteuerung dieser Umgebung blockiert lokale `file://`-Navigation.
  Eine automatische visuelle Kontrolle war deshalb nicht moeglich; Build,
  Markup- und Markenpruefung waren erfolgreich.
- Der Sync unterscheidet jetzt Updates, lokale Konflikte und Upstream-Loeschungen
  und dokumentiert jeden Lauf in `_work/upstream-sync-report.md`.
- Upstream-Loeschungen sind absichtlich zweistufig: normaler Apply blockiert;
  erst `upstream:apply:remove` entfernt eine lokal unveraenderte Datei.
- Ein inhaltlich leerer Apply schreibt das Manifest nicht neu. Die drei
  isolierten Sync-Szenarien und die zwei bestehenden Frameworktests sind gruen.
