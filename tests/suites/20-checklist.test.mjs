import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = readFileSync(join(ROOT, 'src', 'apps', 'checklist', 'model.js'), 'utf8');
const appSource = readFileSync(join(ROOT, 'src', 'apps', 'checklist', 'app.js'), 'utf8');
const contentSource = readFileSync(join(ROOT, 'src', 'apps', 'checklist', 'content.html'), 'utf8');
const cssSource = readFileSync(join(ROOT, 'src', 'apps', 'checklist', 'app.css'), 'utf8');
const configSource = readFileSync(join(ROOT, 'src', 'apps', 'checklist', 'app.config.json'), 'utf8');
const context = { Date, console };
vm.createContext(context);
vm.runInContext(source, context);
const model = context.fdbChecklistModel;
const plain = (value) => JSON.parse(JSON.stringify(value));

test('checklist JSON is normalized and round-trips', () => {
  const parsed = model.parseJson(JSON.stringify({
    format: 'fdb-checklist', version: 1, title: 'Reise',
    items: [{ name: 'Pass', done: true, group: 'Dokumente', tags: ['Wichtig', 'Reise'] }, 'Ladekabel'],
  }));
  assert.equal(parsed.title, 'Reise');
  assert.equal(parsed.items.length, 2);
  assert.deepEqual(
    plain(parsed.items.map((item) => [item.text, item.checked, item.category, item.tags])),
    [['Pass', true, 'Dokumente', ['Wichtig', 'Reise']], ['Ladekabel', false, '', []]],
  );
  const again = model.parseJson(model.toJson(parsed));
  assert.equal(again.id, parsed.id);
  assert.deepEqual(
    plain(again.items.map((item) => [item.text, item.checked, item.category, item.tags])),
    [['Pass', true, 'Dokumente', ['Wichtig', 'Reise']], ['Ladekabel', false, '', []]],
  );
});

test('Markdown imports title, categories, quantities and checks', () => {
  const parsed = model.parseMarkdown(`# Wocheneinkauf

## Obst & Gemüse
- [ ] 2x Paprika #Frisch #Angebot
- [x] Äpfel

## Kühlregal
- [ ] 2 l Milch
`);
  assert.equal(parsed.title, 'Wocheneinkauf');
  assert.deepEqual(
    plain(parsed.items.map((item) => [item.text, item.quantity, item.category, item.checked, item.tags])),
    [
      ['Paprika', '2x', 'Obst & Gemüse', false, ['Frisch', 'Angebot']],
      ['Äpfel', '', 'Obst & Gemüse', true, []],
      ['Milch', '2 l', 'Kühlregal', false, []],
    ],
  );
});

test('plain text creates one item per non-empty line', () => {
  const parsed = model.parse('Milch\n\nBrot\nÄpfel', 'auto');
  assert.equal(parsed.title, 'Importierte Checkliste');
  assert.deepEqual(plain(parsed.items.map((item) => item.text)), ['Milch', 'Brot', 'Äpfel']);
});

test('Markdown export retains groups and checked state', () => {
  const markdown = model.toMarkdown({
    title: 'Packliste',
    items: [
      { text: 'Pass', checked: true, category: 'Dokumente' },
      { text: 'Socken', quantity: '4x', category: 'Kleidung', tags: ['Wichtig', 'Handgepäck'] },
    ],
  });
  assert.match(markdown, /^# Packliste/m);
  assert.match(markdown, /^## Dokumente/m);
  assert.match(markdown, /^- \[x\] Pass/m);
  assert.match(markdown, /^- \[ \] 4x Socken/m);
  assert.match(markdown, /#Wichtig #Handgepäck/);
});

test('tags normalize comma-separated input without case-insensitive duplicates', () => {
  assert.deepEqual(plain(model.normalizeTags('Bio, Angebot, bio,  Regional ')), ['Bio', 'Angebot', 'Regional']);
});

test('profile migration preserves existing state and adds new template items', () => {
  const merged = model.mergeProfileItems(
    [{ text: 'Milch', quantity: '1 l', checked: true }, { text: 'Eigener Artikel', tags: ['Privat'] }],
    [{ text: 'Milch', quantity: '2 l', category: 'Kühlregal', tags: ['Basis'] }, { text: 'Brot', category: 'Backwaren', tags: ['Basis'] }],
  );
  assert.deepEqual(plain(merged.map((item) => ({
    text: item.text, quantity: item.quantity, checked: item.checked, category: item.category, tags: item.tags,
  }))), [
    { text: 'Milch', quantity: '1 l', checked: true, category: 'Kühlregal', tags: ['Basis'] },
    { text: 'Eigener Artikel', quantity: '', checked: false, category: '', tags: ['Privat'] },
    { text: 'Brot', quantity: '', checked: false, category: 'Backwaren', tags: ['Basis'] },
  ]);
});

test('empty or invalid imports fail with useful errors', () => {
  assert.throws(() => model.parseJson('{nope'), /nicht gültig/);
  assert.throws(() => model.parseMarkdown('# Nur eine Überschrift'), /keine Listeneinträge/);
  assert.throws(() => model.parseText('\n\n'), /keine Listeneinträge/);
});

test('imports can append items without replacing the active checklist identity', () => {
  assert.match(contentSource, /option value="append">Zur aktuellen Checkliste hinzufügen/);
  const handler = appSource.match(/\$\('confirmImport'\)\.addEventListener\('click',[\s\S]+?\n  \}\);/)?.[0] || '';
  assert.match(handler, /importTarget'\)\.value === 'append'/);
  assert.match(handler, /imported\.items\.map\(\(item\) => \(\{ \.\.\.item, id: '' \}\)\)/);
  assert.match(handler, /state\.active\.items\.push\(\.\.\.appendedItems\)/);
});

test('read mode is switchable, persisted and removes editing controls', () => {
  assert.match(contentSource, /id="readMode"[^>]+role="switch"/);
  assert.match(appSource, /viewMode: 'edit'/);
  assert.match(appSource, /value\?\.viewMode === 'read'/);
  assert.match(appSource, /if \(!readMode\)/);
  assert.match(cssSource, /\.cl-app\.is-read-mode \.cl-add-form/);
  assert.match(cssSource, /\.cl-app\.is-read-mode \.cl-item-note/);
});

test('checking an item updates in place without rebuilding the list', () => {
  assert.match(appSource, /row\.classList\.toggle\('is-done', item\.checked\)/);
  assert.match(appSource, /renderProgress\(\)/);
  assert.doesNotMatch(contentSource, /id="emptyState"/);
});

test('mobile menu is layered above its backdrop', () => {
  const menuLayer = Number(cssSource.match(/\.cl-side-menu\{position:fixed;z-index:(\d+)/)?.[1]);
  const backdropLayer = Number(cssSource.match(/\.cl-menu-backdrop\{position:fixed;z-index:(\d+)/)?.[1]);
  assert.ok(menuLayer > backdropLayer, `menu layer ${menuLayer} must be above backdrop ${backdropLayer}`);
});

test('sharing uses an embedded URL fragment and local QR generation', () => {
  assert.match(contentSource, /id="shareList"/);
  assert.match(contentSource, /id="shareList"[^>]+aria-label="Liste teilen"/);
  assert.match(contentSource, /id="shareQr"/);
  assert.match(appSource, /url\.hash = `share=\$\{payload\}`/);
  assert.match(appSource, /window\.qrcode\(0, 'M'\)/);
  assert.match(appSource, /state\.viewMode = 'read'/);
  assert.doesNotMatch(appSource, /api\.qrserver|quickchart|chart\.googleapis/i);
});

test('reset list only clears checks while profile restart restores its template', () => {
  const resetHandler = appSource.match(/\$\('resetList'\)\.addEventListener\('click',[\s\S]+?\n  \}\);/)?.[0] || '';
  assert.match(resetHandler, /state\.active\.items\.forEach/);
  assert.match(resetHandler, /item\.checked = false/);
  assert.doesNotMatch(resetHandler, /listFromProfile|state\.active\s*=/);
  assert.match(appSource, /function replaceWithProfile\(profile\)[\s\S]+?state\.active = listFromProfile\(profile\)/);
});

test('Google Drive sync uses least-privilege browser authorization and conflict controls', () => {
  assert.match(configSource, /https:\/\/accounts\.google\.com\/gsi\/client/);
  assert.match(appSource, /https:\/\/www\.googleapis\.com\/auth\/drive\.file/);
  assert.match(appSource, /fileVersion/);
  assert.match(appSource, /Die Liste wurde auf einem anderen Gerät geändert/);
  assert.match(contentSource, /id="loadDriveNow"/);
  assert.match(contentSource, /id="overwriteDrive"/);
  assert.doesNotMatch(appSource, /client_secret|refresh_token/i);
});

test('Drive autosync preserves in-flight edits, retries failures and polls remote changes', () => {
  assert.match(contentSource, /id="driveQuickStatus"/);
  assert.match(appSource, /uploadRevision = driveRuntime\.revision/);
  assert.match(appSource, /state\.drive\.dirty = checklistFingerprint\(state\.active\) !== uploadFingerprint \|\| driveRuntime\.revision !== uploadRevision/);
  assert.match(appSource, /retryDelay: 3000/);
  assert.match(appSource, /Math\.min\(driveRuntime\.retryDelay \* 2, 30000\)/);
  assert.match(appSource, /setInterval\([\s\S]+?10000\)/);
  assert.match(appSource, /window\.addEventListener\('online'/);
});

test('Drive sharing creates a least-privilege invitation link with automatic setup', () => {
  assert.match(contentSource, /id="shareDriveList"/);
  assert.match(contentSource, /id="driveShareDialog"/);
  assert.match(contentSource, /id="driveShareEmail"[^>]+type="email"/);
  assert.match(contentSource, /id="createDriveInvite"/);
  assert.match(contentSource, /id="driveInviteUrl"/);
  assert.match(appSource, /\/permissions\?sendNotificationEmail=true/);
  assert.match(appSource, /role: 'writer'/);
  assert.match(appSource, /url\.hash = `drive-invite=\$\{encodeDriveInvite/);
  assert.match(appSource, /driveRuntime\.pendingInvite[\s\S]+?await acceptDriveInvite\(\)/);
  assert.doesNotMatch(appSource, /drive-invite=.*accessToken/);
  assert.doesNotMatch(contentSource, /id="driveClientId"/);
  assert.match(appSource, /const GOOGLE_CLIENT_ID = '62330084475-[^']+\.apps\.googleusercontent\.com'/);
  assert.match(appSource, /url\.hash = `drive-invite=\$\{encodeDriveInvite\(\{ fileId:/);
});

test('each checklist keeps an independent Drive binding', () => {
  assert.match(appSource, /driveBindings: \{\}/);
  assert.match(appSource, /state\.driveBindings\[state\.active\.id\] = clone\(state\.drive\)/);
  assert.match(appSource, /state\.drive = clone\(state\.driveBindings\?\.\[state\.active\.id\]/);
  assert.match(appSource, /function switchToProfile\(profile\)[\s\S]+?activateDriveBinding\(\)[\s\S]+?save\(\{ localOnly: true \}\)/);
  assert.match(appSource, /function switchToFreeList\(\)[\s\S]+?activateDriveBinding\(\)[\s\S]+?save\(\{ localOnly: true \}\)/);
  assert.match(appSource, /driveLayoutVersion: DRIVE_LAYOUT_VERSION/);
});

test('Drive uses one FDB Apps checklist library and shares individual files', () => {
  assert.match(appSource, /findDriveFolder\('FDB Apps', 'root'\)/);
  assert.match(appSource, /findDriveFolder\('Checklisten', state\.driveLibrary\.rootFolderId\)/);
  assert.match(appSource, /\.fdb-checklist\.json/);
  assert.match(appSource, /appProperties: \{ fdbApp: 'checklist', listId: state\.active\.id/);
  assert.match(appSource, /files\/\$\{encodeURIComponent\(state\.drive\.fileId\)\}\/permissions/);
  assert.doesNotMatch(contentSource, /id="driveFolderId"|id="createDriveFolder"/);
});

test('Drive authorization is global and valid tokens are reused for list actions', () => {
  assert.match(contentSource, /id="driveListAction"[^>]*>Mit Drive synchronisieren/);
  assert.match(contentSource, /id="connectDrive"[^>]*>Google Drive verbinden/);
  assert.match(appSource, /function hasValidDriveToken\(\)/);
  assert.match(appSource, /if \(hasValidDriveToken\(\)\) \{[\s\S]+?action\(\)/);
  assert.match(appSource, /requestDriveAuthorization\(connectDriveList\)/);
  assert.match(appSource, /pendingAuthorizedAction/);
  assert.doesNotMatch(appSource, /shareSetup/);
});

test('profile selector and active list expose clear status badges', () => {
  assert.match(contentSource, /id="profileBadges"/);
  assert.match(appSource, /label: 'Standard'/);
  assert.match(appSource, /label: 'Angepasst'/);
  assert.match(appSource, /label: 'Eigene Vorlage'/);
  assert.match(appSource, /label: 'Freigegeben'/);
  assert.match(appSource, /label: 'Synchronisiert'/);
  assert.match(appSource, /label: 'Änderungen offen'/);
  assert.match(appSource, /label: 'Konflikt'/);
  assert.match(appSource, /function profileIsChanged/);
  assert.doesNotMatch(appSource, /mitgeliefert/);
});

test('saving a reusable profile gives its working list an independent identity', () => {
  const handler = appSource.match(/\$\('saveProfile'\)\.addEventListener\('click',[\s\S]+?\n  \}\);/)?.[0] || '';
  assert.match(handler, /save\(\{ localOnly: true \}\)/);
  assert.match(handler, /state\.active = model\.normalizeList\(\{ \.\.\.clone\(state\.active\), id: '', profile: profile\.id \}\)/);
  assert.match(handler, /activateDriveBinding\(\)/);
  assert.doesNotMatch(handler, /state\.active\.profile = profile\.id/);
});

test('legacy duplicate list identities are separated during state normalization', () => {
  assert.match(appSource, /const listIds = new Set\(\[active\.id\]\)/);
  assert.match(appSource, /if \(listIds\.has\(list\.id\)\) list\.id = newId\('list'\)/);
});

test('local view settings do not dirty or synchronize the Drive checklist', () => {
  const readHandler = appSource.match(/\$\('readMode'\)\.addEventListener\('change',[\s\S]+?\n  \}\);/)?.[0] || '';
  const hideHandler = appSource.match(/\$\('hideCompleted'\)\.addEventListener\('change',[^\n]+/)?.[0] || '';
  assert.match(readHandler, /save\(\{ localOnly: true \}\)/);
  assert.match(hideHandler, /save\(\{ localOnly: true \}\)/);
  assert.match(appSource, /delete comparable\.updatedAt/);
  assert.match(appSource, /syncedFingerprint/);
});
