# FDB Apps

FDB Apps wird eine Sammlung lokaler, eigenstaendiger HTML-WebApps. Technische
Grundlage ist das bestehende qurix-Apps-Framework. Solange beide Projekte
parallel entwickelt werden, bleibt qurix der fachliche und technische Upstream.

Der aktuelle Stand ist die Projektinitialisierung. Der Umsetzungsplan steht in
[`PLAN.md`](PLAN.md); offene Aufgaben, Beobachtungen und Rueckmeldungen an den
Upstream werden getrennt in `backlog.md`, `findings.md` und `source.md` gepflegt.

## Entwicklung

```powershell
npm run build           # erzeugt dist/index.html und spaeter alle Apps
npm test                # prueft den lokalen Framework-Snapshot
npm run upstream:check  # zeigt neue qurix-Frameworkaenderungen an
npm run upstream:apply  # uebernimmt freigegebene Upstream-Pfade
```

Der aktuell uebernommene qurix-Stand und die geschuetzten Dateihashes stehen in
[`upstream/manifest.json`](upstream/manifest.json).

Sichtbares Branding wird nach dem qurix-Build durch `tools/build-fdb.mjs`
angewendet. Marke und Links stehen in `brand.config.json`; das vorlaeufige
Design-Token-Set liegt in `src/themes/fdb.css`. Die technischen `qrx-*`-Namen
bleiben als stabile Framework-Schnittstelle erhalten.

Das lokale Verzeichnis `_work/` ist fuer temporaere oder private Artefakte
reserviert und wird vollstaendig von Git ignoriert.
