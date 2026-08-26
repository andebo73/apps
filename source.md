# Rueckmeldungen an den qurix-Upstream

Punkte, die bevorzugt im qurix-Master geloest werden sollen, damit FDB Apps die
Verbesserung beim naechsten Sync uebernehmen kann.

## Offen

- [ ] Produkt-/Markenname fuer Standard-`<title>`, sichtbare Shell-Texte,
  Exportdateinamen und Metadaten zentral konfigurierbar machen; derzeit setzt
  `tools/build.mjs` den Standardtitel auf `<App-Name> – qurix`.
- [ ] Maschinenlesbare Framework-Version oder Upstream-Manifest bereitstellen,
  damit Downstream-Snapshots eindeutig auf einen qurix-Stand verweisen koennen.
- [ ] Generische Frameworktests klar von qurix-App-spezifischen Tests trennen,
  um selektive Downstream-Uebernahme zu vereinfachen.
- [ ] Eine offizielle Build-Erweiterung fuer Markenname, Header und Footer
  vorsehen. FDB Apps nutzt derzeit eine konfliktfreie Nachbearbeitung der
  generierten Dateien, weil die qurix-Shell sichtbares Branding fest einbettet.

## Erledigt

Noch keine.
