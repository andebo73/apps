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
