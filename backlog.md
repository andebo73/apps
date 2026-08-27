# Backlog

Fortlaufende Aufgaben, die nicht sofort umgesetzt werden.

## Offen

- [ ] FDB-Branding (Farben, Typografie, Logo/Icon und Ziel-Domain) definieren.
- [ ] Langfristigen Upstream-Kanal festlegen: lokaler Pfad, Git-Remote oder
  veroeffentlichtes Framework-Paket.
- [ ] Entscheiden, ob `dist/` dauerhaft committed bleibt.
- [ ] Checklisten-App nach Praxistest bewerten: mehrere gespeicherte Listen,
  Inline-Bearbeitung und weitere mitgelieferte Profile priorisieren.
- [ ] Optionalen Druck-/PDF-Modus fuer Checklisten bewerten.

## Erledigt

- [x] Test-Suite ohne Shell-Glob plattformneutral unter Windows und Linux
  startbar machen.
- [x] Umschaltbare, persistierte Read-Ansicht fuer eine kompakte Checkliste
  ohne Bearbeitungsaktionen umsetzen.
- [x] Scrollposition beim Abhaken stabil halten und leeren Filterhinweis
  entfernen.
- [x] Mobiles Seitenmenue ueber dem dunklen Hintergrund klickbar darstellen.
- [x] Checklisten als komprimierten Link mit lokal erzeugtem QR-Code ohne
  zusaetzlichen Datendienst teilen.
- [x] Listen-Reset auf das Entfernen aller Haekchen begrenzen und den
  vollstaendigen Profil-Reset als separate Aktion beibehalten.
- [x] Optionale Google-Drive-Synchronisation mit App-Ordner, automatischem
  Speichern, Aktualisierung und Konfliktschutz umsetzen.
- [x] Drive-Synchronisation gegen Aenderungen waehrend laufender Uploads
  absichern, automatisch wiederholen und regelmaessig aktualisieren.
- [x] Lokale Ansichtseinstellungen vom Drive-Aenderungsstatus trennen und
  Konflikte anhand des tatsaechlichen Listeninhalts bewerten.
- [x] Upstream-Snapshot-Hashes fuer Windows- und Linux-Zeilenenden
  plattformunabhaengig machen.
- [x] GitHub-Pages-Deployment fuer `dist/` mit vorgeschalteten
  Qualitaetspruefungen einrichten.
- [x] Sekundaere Checklistenaktionen in eine Desktop-Seitenleiste und ein
  mobiles Burger-Menue verschieben.
- [x] Profilbezogene Arbeitsstaende automatisch speichern und ohne Rueckfrage
  zwischen ihnen wechseln.
- [x] Profilauswahl und aktive Liste synchronisieren; freie Listen zeigen kein
  veraltetes Profil und eine Profilauswahl erzeugt die passende neue Liste.
- [x] Leere neue Checklisten klar von neuen Listen aus einem Profil trennen.
- [x] Schrittweise Prompt-Abfragen durch einen vollstaendigen Dialog zur
  Bearbeitung von Checklisten-Eintraegen ersetzen.
- [x] Einkaufsprofil um typische Artikel fuer einen Wocheneinkauf erweitern.
- [x] Tags an Checklisten-Eintraegen und kombinierbare Tag-Filter ergaenzen.
- [x] Tags in JSON und als Hashtags im Markdown-Import/-Export unterstuetzen.
- [x] Erste FDB-App "Checkliste" planen, umsetzen und ins Portal aufnehmen.
- [x] Einkaufsprofil, Profile, Autospeichern sowie JSON-/Markdown-/Textimport
  fuer die Checklisten-App umsetzen.
- [x] GitHub Quality-CI fuer Snapshot, Tests, Build und Branding einrichten.
- [x] Offlinefaehige Integritaetspruefung des vendorten Snapshots ergaenzen.
- [x] `dist/` in CI frisch bauen und die erzeugten Dateien vor Deployment
  funktional und auf sichtbares Branding pruefen.
- [x] Sync-Bericht unter `_work/` fuer jeden Check/Apply-Lauf erzeugen.
- [x] Upstream-Loeschungen nur mit separater Removal-Freigabe anwenden.
- [x] Konflikt-, Removal- und Idempotenzverhalten automatisiert testen.
- [x] Sichtbares Portal-, Shell- und Titel-Branding auf FDB Apps umstellen.
- [x] Vorlaeufiges FDB-Theme auf Basis des stabilen Tokenvertrags anlegen.
- [x] FDB-Branding vom synchronisierten qurix-Snapshot isolieren.
- [x] Minimalen, eigenstaendig baubaren qurix-Framework-Snapshot uebernehmen.
- [x] Upstream-Manifest und konfliktgeschuetzten Check/Apply-Sync einrichten.
- [x] Projektartefakte und Initialisierungsplan anlegen.
