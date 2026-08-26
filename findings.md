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
- Ein inhaltlich leerer Apply schreibt das Manifest nicht neu. Die vier
  isolierten Sync-Szenarien und die zwei bestehenden Frameworktests sind gruen.
- `upstream:verify` prueft alle Manifestdateien offline auf fehlende,
  veraenderte und unerwartete Dateien. Damit ist kein qurix-Zugriff in CI noetig.
- Der Markencheck entfernt Style-, Script- und Kommentarbereiche vor der Suche,
  sodass technische `qrx-*`-/`qurixApp`-Bezeichner erlaubt bleiben, sichtbare
  qurix-Marke aber fehlschlaegt.
- Die Quality-CI laeuft auf `master` und `main` sowie fuer Pull Requests. Sie
  deployt nicht und benoetigt nur lesenden Repository-Zugriff.
- Die Checklistenlogik liegt in einem eigenen Modellmodul. Dadurch lassen sich
  JSON-, Markdown- und Textimport sowie Exporte ohne Browser testen.
- Die erste App erzeugt eine eigenstaendige `dist/checklist.html`, nutzt das
  FDB-Theme und unterstuetzt sowohl lokale Speicherung als auch die
  Framework-Snapshot-Hooks.
- Eine automatisierte visuelle `file://`-Pruefung bleibt in der aktuellen
  Browserumgebung blockiert; Modell-, Build-, Branding- und Snapshottests sind
  erfolgreich.
- Tags werden rueckwaertskompatibel als Array je Eintrag gespeichert. Alte
  Listen ohne `tags` werden beim Laden automatisch mit einem leeren Array
  normalisiert.
- Markdown transportiert Tags als Hashtags; mehrere aktive UI-Filter sind als
  ODER-Verknuepfung umgesetzt, damit breite Einkaufsansichten praktikabel
  bleiben.
- Mitgelieferte Profile benoetigen eine eigene Versionsmigration: Andernfalls
  verdeckt eine aeltere, lokal gespeicherte aktive Liste neue Vorlageninhalte.
  Version 2 des Einkaufsprofils fuehrt fehlende Artikel und Tags zusammen, ohne
  vorhandene Haken, Mengen oder eigene Eintraege zu verlieren.
- Eintraege werden nun in einem responsiven Dialog mit allen Feldern gemeinsam
  bearbeitet; Abbrechen veraendert den Eintrag nicht und Speichern validiert die
  Bezeichnung vor der Uebernahme.
- "Neue Liste" war als erneute Kopie des ausgewaehlten Profils missverstaendlich
  und wirkte bei identischem Einkaufsprofil ohne sichtbaren Effekt. Leere Liste
  und Profilerzeugung sind deshalb nun getrennte Aktionen.
- Das Profil-Dropdown darf keinen vorherigen DOM-Auswahlwert gegen den
  Anwendungszustand priorisieren. Freie Listen haben nun explizit kein Profil;
  eine neue Auswahl wendet die Vorlage nach Bestaetigung direkt an.
