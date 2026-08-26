(function () {
  'use strict';

  const model = window.fdbChecklistModel;
  const STORAGE_KEY = 'fdb_apps_checklist_v1';
  const SHOPPING_PROFILE_VERSION = 2;
  const $ = (id) => document.getElementById(id);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const newId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  const builtinProfiles = [{
    id: 'shopping',
    name: 'Einkaufsliste',
    builtin: true,
    items: [
      { text: 'Äpfel', quantity: '1 kg', category: 'Obst & Gemüse', tags: ['Frisch', 'Snack'] },
      { text: 'Bananen', quantity: '1 Bund', category: 'Obst & Gemüse', tags: ['Frisch', 'Snack'] },
      { text: 'Zitronen', quantity: '2', category: 'Obst & Gemüse', tags: ['Frisch', 'Kochen'] },
      { text: 'Kartoffeln', quantity: '1,5 kg', category: 'Obst & Gemüse', tags: ['Basis', 'Kochen'] },
      { text: 'Zwiebeln', quantity: '1 Netz', category: 'Obst & Gemüse', tags: ['Basis', 'Kochen'] },
      { text: 'Karotten', quantity: '1 Bund', category: 'Obst & Gemüse', tags: ['Frisch', 'Kochen'] },
      { text: 'Paprika', quantity: '3', category: 'Obst & Gemüse', tags: ['Frisch', 'Kochen'] },
      { text: 'Tomaten', quantity: '500 g', category: 'Obst & Gemüse', tags: ['Frisch', 'Salat'] },
      { text: 'Gurke', quantity: '1', category: 'Obst & Gemüse', tags: ['Frisch', 'Salat'] },
      { text: 'Blattsalat', quantity: '1', category: 'Obst & Gemüse', tags: ['Frisch', 'Salat'] },
      { text: 'Brot', quantity: '1', category: 'Backwaren', tags: ['Basis', 'Frühstück'] },
      { text: 'Brötchen', quantity: '6', category: 'Backwaren', tags: ['Frühstück'] },
      { text: 'Milch', quantity: '2 l', category: 'Kühlregal', tags: ['Basis', 'Frühstück'] },
      { text: 'Butter', quantity: '1 Packung', category: 'Kühlregal', tags: ['Basis', 'Frühstück'] },
      { text: 'Naturjoghurt', quantity: '4 Becher', category: 'Kühlregal', tags: ['Frühstück', 'Snack'] },
      { text: 'Käse', quantity: '1 Packung', category: 'Kühlregal', tags: ['Frühstück'] },
      { text: 'Eier', quantity: '10', category: 'Kühlregal', tags: ['Basis', 'Kochen'] },
      { text: 'Aufschnitt', quantity: '1 Packung', category: 'Kühlregal', tags: ['Frühstück'] },
      { text: 'Hackfleisch oder Tofu', quantity: '500 g', category: 'Fleisch & Alternativen', tags: ['Kochen', 'Wochenplan'] },
      { text: 'Hähnchen oder Alternative', quantity: '500 g', category: 'Fleisch & Alternativen', tags: ['Kochen', 'Wochenplan'] },
      { text: 'Nudeln', quantity: '500 g', category: 'Vorräte', tags: ['Basis', 'Kochen'] },
      { text: 'Reis', quantity: '500 g', category: 'Vorräte', tags: ['Basis', 'Kochen'] },
      { text: 'Tomatenstücke', quantity: '2 Dosen', category: 'Vorräte', tags: ['Basis', 'Kochen'] },
      { text: 'Kidneybohnen', quantity: '1 Dose', category: 'Vorräte', tags: ['Kochen', 'Wochenplan'] },
      { text: 'Haferflocken', quantity: '500 g', category: 'Vorräte', tags: ['Frühstück', 'Basis'] },
      { text: 'Mehl', quantity: '1 kg', category: 'Vorräte', tags: ['Basis', 'Backen'] },
      { text: 'Kaffee oder Tee', quantity: '1 Packung', category: 'Vorräte', tags: ['Frühstück'] },
      { text: 'Tiefkühlgemüse', quantity: '1 Packung', category: 'Tiefkühl', tags: ['Vorrat', 'Kochen'] },
      { text: 'Mineralwasser', quantity: '1 Kasten', category: 'Getränke', tags: ['Getränke'] },
      { text: 'Saft', quantity: '1 Flasche', category: 'Getränke', tags: ['Getränke', 'Frühstück'] },
      { text: 'Nüsse', quantity: '1 Packung', category: 'Snacks', tags: ['Snack', 'Vorrat'] },
      { text: 'Schokolade', quantity: '1 Tafel', category: 'Snacks', tags: ['Snack'] },
      { text: 'Toilettenpapier', quantity: '1 Packung', category: 'Haushalt', tags: ['Haushalt', 'Vorrat'] },
      { text: 'Spülmittel', quantity: '1 Flasche', category: 'Haushalt', tags: ['Haushalt'] },
      { text: 'Müllbeutel', quantity: '1 Rolle', category: 'Haushalt', tags: ['Haushalt', 'Vorrat'] },
    ],
  }];

  function freshItems(items) {
    return model.normalizeItems(items.map((item) => ({ ...item, id: '', checked: false })));
  }

  function listFromProfile(profile) {
    return model.normalizeList({ title: profile.name, profile: profile.id, items: freshItems(profile.items) });
  }

  function defaultState() {
    const active = listFromProfile(builtinProfiles[0]);
    return { active, customProfiles: [], hideCompleted: false, tagFilters: [], viewMode: 'edit',
      savedLists: { 'profile:shopping': clone(active) },
      builtinProfileVersions: { shopping: SHOPPING_PROFILE_VERSION } };
  }

  function normalizeProfile(profile) {
    const name = String(profile?.name || '').trim();
    if (!name) return null;
    return { id: String(profile.id || newId('profile')), name, builtin: false, items: model.normalizeItems(profile.items || []) };
  }

  function normalizeState(value) {
    const fallback = defaultState();
    try {
      const savedLists = {};
      if (value?.savedLists && typeof value.savedLists === 'object') {
        for (const [key, list] of Object.entries(value.savedLists)) {
          try { savedLists[key] = model.normalizeList(list); } catch (_) {}
        }
      }
      const normalized = {
        active: model.normalizeList(value?.active || fallback.active),
        customProfiles: Array.isArray(value?.customProfiles) ? value.customProfiles.map(normalizeProfile).filter(Boolean) : [],
        hideCompleted: Boolean(value?.hideCompleted),
        tagFilters: model.normalizeTags(value?.tagFilters || []),
        viewMode: value?.viewMode === 'read' ? 'read' : 'edit',
        savedLists,
        builtinProfileVersions: { ...(value?.builtinProfileVersions || {}) },
      };
      const shoppingVersion = Number(normalized.builtinProfileVersions.shopping || 0);
      if (shoppingVersion < SHOPPING_PROFILE_VERSION) {
        if (normalized.active.profile === 'shopping') normalized.active.items = model.mergeProfileItems(normalized.active.items, builtinProfiles[0].items);
        if (normalized.savedLists['profile:shopping']) normalized.savedLists['profile:shopping'].items = model.mergeProfileItems(normalized.savedLists['profile:shopping'].items, builtinProfiles[0].items);
      }
      normalized.builtinProfileVersions.shopping = SHOPPING_PROFILE_VERSION;
      if (!Object.keys(normalized.savedLists).length) normalized.savedLists[draftKey(normalized.active)] = clone(normalized.active);
      return normalized;
    } catch { return fallback; }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalizeState(JSON.parse(raw)) : defaultState();
    } catch { return defaultState(); }
  }

  let state = load();
  let editingItemId = null;
  const allProfiles = () => [...builtinProfiles, ...state.customProfiles];
  const activeProfile = () => allProfiles().find((profile) => profile.id === state.active.profile);
  function draftKey(list) { return list.profile ? `profile:${list.profile}` : 'free'; }

  function save() {
    state.active.updatedAt = new Date().toISOString();
    state.savedLists = state.savedLists || {};
    state.savedLists[draftKey(state.active)] = clone(state.active);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function announce(message, error = false) {
    const element = $('statusMessage');
    element.textContent = message;
    element.style.color = error ? 'var(--qrx-danger)' : 'var(--qrx-success)';
    clearTimeout(announce.timer);
    announce.timer = setTimeout(() => { element.textContent = ''; }, 4500);
  }

  function button(label, title, action, danger = false) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'cl-icon-btn';
    if (danger) element.style.color = 'var(--qrx-danger)';
    element.textContent = label;
    element.title = title;
    element.setAttribute('aria-label', title);
    element.addEventListener('click', action);
    return element;
  }

  function renderProfiles() {
    const select = $('profileSelect');
    select.replaceChildren();
    const none = document.createElement('option');
    none.value = '';
    none.textContent = 'Kein Profil · freie Liste';
    select.appendChild(none);
    for (const profile of allProfiles()) {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = `${profile.name}${profile.builtin ? ' · mitgeliefert' : ''}`;
      select.appendChild(option);
    }
    select.value = allProfiles().some((profile) => profile.id === state.active.profile) ? state.active.profile : '';
  }

  function renderCategories() {
    const categories = [...new Set(state.active.items.map((item) => item.category).filter(Boolean))].sort();
    $('categorySuggestions').replaceChildren(...categories.map((category) => {
      const option = document.createElement('option'); option.value = category; return option;
    }));
  }

  function renderTagFilters() {
    const tags = model.normalizeTags(state.active.items.flatMap((item) => item.tags || []))
      .sort((a, b) => a.localeCompare(b, 'de'));
    const available = new Set(tags.map((tag) => tag.toLocaleLowerCase('de')));
    state.tagFilters = state.tagFilters.filter((tag) => available.has(tag.toLocaleLowerCase('de')));
    const selected = new Set(state.tagFilters.map((tag) => tag.toLocaleLowerCase('de')));
    const host = $('tagFilterButtons'); host.replaceChildren();
    for (const tag of tags) {
      const key = tag.toLocaleLowerCase('de');
      const control = document.createElement('button');
      control.type = 'button'; control.className = `cl-tag${selected.has(key) ? ' is-active' : ''}`;
      control.textContent = tag; control.setAttribute('aria-pressed', String(selected.has(key)));
      control.addEventListener('click', () => {
        if (selected.has(key)) state.tagFilters = state.tagFilters.filter((value) => value.toLocaleLowerCase('de') !== key);
        else state.tagFilters.push(tag);
        save(); render();
      });
      host.appendChild(control);
    }
    $('tagFilters').hidden = tags.length === 0;
    $('clearTagFilters').hidden = state.tagFilters.length === 0;
  }

  function renderProgress() {
    const total = state.active.items.length;
    const done = state.active.items.filter((item) => item.checked).length;
    $('progressText').textContent = `${done} von ${total} erledigt`;
    $('progressBar').style.width = `${total ? Math.round(done / total * 100) : 0}%`;
  }

  function render() {
    const readMode = state.viewMode === 'read';
    document.querySelector('.cl-app').classList.toggle('is-read-mode', readMode);
    $('readMode').checked = readMode;
    $('readMode').setAttribute('aria-label', readMode ? 'Edit-Modus aktivieren' : 'Read-Modus aktivieren');
    $('listTitle').readOnly = readMode;
    $('listTitle').value = state.active.title;
    $('hideCompleted').checked = state.hideCompleted;
    renderProfiles();
    renderCategories();
    renderTagFilters();
    renderProgress();

    const selectedTags = new Set(state.tagFilters.map((tag) => tag.toLocaleLowerCase('de')));
    const visible = state.active.items.filter((item) => {
      if (state.hideCompleted && item.checked) return false;
      if (!selectedTags.size) return true;
      return (item.tags || []).some((tag) => selectedTags.has(tag.toLocaleLowerCase('de')));
    });
    const groups = new Map();
    visible.forEach((item) => {
      const category = item.category || 'Ohne Kategorie';
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(item);
    });

    const container = $('listGroups');
    container.replaceChildren();
    for (const [category, items] of groups) {
      const section = document.createElement('section'); section.className = 'cl-group';
      const heading = document.createElement('h2'); heading.textContent = category; section.appendChild(heading);
      const list = document.createElement('ul'); list.className = 'cl-list';
      for (const item of items) {
        const row = document.createElement('li'); row.className = `cl-item${item.checked ? ' is-done' : ''}`;
        const check = document.createElement('input'); check.type = 'checkbox'; check.className = 'cl-item-check'; check.checked = item.checked;
        check.setAttribute('aria-label', `${item.text} erledigt`);
        check.addEventListener('change', () => {
          item.checked = check.checked;
          row.classList.toggle('is-done', item.checked);
          save();
          renderProgress();
          if (state.hideCompleted && item.checked) row.remove();
        });
        const main = document.createElement('div'); main.className = 'cl-item-main';
        const line = document.createElement('div'); line.className = 'cl-item-line';
        const name = document.createElement('span'); name.className = 'cl-item-name'; name.textContent = item.text; line.appendChild(name);
        if (item.quantity) { const quantity = document.createElement('span'); quantity.className = 'cl-item-quantity'; quantity.textContent = item.quantity; line.appendChild(quantity); }
        main.appendChild(line);
        if (item.note) { const note = document.createElement('span'); note.className = 'cl-item-note'; note.textContent = item.note; main.appendChild(note); }
        if (item.tags?.length) {
          const tags = document.createElement('div'); tags.className = 'cl-item-tags';
          item.tags.forEach((tag) => { const chip = document.createElement('span'); chip.className = 'cl-item-tag'; chip.textContent = tag; tags.appendChild(chip); });
          main.appendChild(tags);
        }
        row.append(check, main);
        if (!readMode) {
          const actions = document.createElement('div'); actions.className = 'cl-actions';
          actions.append(
            button('✎', `${item.text} bearbeiten`, () => editItem(item)),
            button('↑', `${item.text} nach oben`, () => moveItem(item.id, -1)),
            button('↓', `${item.text} nach unten`, () => moveItem(item.id, 1)),
            button('×', `${item.text} löschen`, () => deleteItem(item.id), true),
          );
          row.appendChild(actions);
        }
        list.appendChild(row);
      }
      section.appendChild(list); container.appendChild(section);
    }
  }

  function editItem(item) {
    editingItemId = item.id;
    $('editText').value = item.text;
    $('editQuantity').value = item.quantity;
    $('editCategory').value = item.category;
    $('editTags').value = item.tags.join(', ');
    $('editNote').value = item.note;
    $('editError').textContent = '';
    $('editDialog').showModal();
    $('editText').focus();
  }

  function moveItem(itemId, delta) {
    const index = state.active.items.findIndex((item) => item.id === itemId);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= state.active.items.length) return;
    [state.active.items[index], state.active.items[target]] = [state.active.items[target], state.active.items[index]];
    save(); render();
  }

  function deleteItem(itemId) {
    state.active.items = state.active.items.filter((item) => item.id !== itemId);
    save(); render(); announce('Eintrag gelöscht.');
  }

  function createProfile(name, items) {
    const profile = normalizeProfile({ id: newId('profile'), name, items: clone(items) });
    state.customProfiles.push(profile); save(); render(); return profile;
  }

  function replaceWithProfile(profile) {
    state.active = listFromProfile(profile);
    state.tagFilters = [];
    state.hideCompleted = false;
    save(); render();
    announce(`Neue Liste aus „${profile.name}“ erstellt.`);
  }

  function switchToProfile(profile) {
    save();
    const stored = state.savedLists[`profile:${profile.id}`];
    state.active = stored ? model.normalizeList(clone(stored)) : listFromProfile(profile);
    state.tagFilters = [];
    state.hideCompleted = false;
    save(); render();
    announce(`Arbeitsstand „${profile.name}“ geladen.`);
  }

  function switchToFreeList() {
    save();
    const stored = state.savedLists.free;
    state.active = stored ? model.normalizeList(clone(stored)) : model.normalizeList({ title: 'Neue Checkliste', profile: '', items: [] });
    state.tagFilters = [];
    state.hideCompleted = false;
    save(); render();
    announce('Freie Checkliste geladen.');
  }

  function setMenu(open) {
    $('sideMenu').classList.toggle('is-open', open);
    $('menuBackdrop').hidden = !open;
    $('menuToggle').setAttribute('aria-expanded', String(open));
    $('menuToggle').setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  }

  function renderProfileManager() {
    const host = $('profileList'); host.replaceChildren();
    for (const profile of allProfiles()) {
      const row = document.createElement('div'); row.className = 'cl-profile-row';
      const info = document.createElement('div');
      const name = document.createElement('strong'); name.textContent = profile.name;
      const meta = document.createElement('small'); meta.textContent = `${profile.items.length} Einträge · ${profile.builtin ? 'mitgeliefert' : 'eigenes Profil'}`;
      info.append(name, meta);
      const actions = document.createElement('div'); actions.className = 'cl-actions';
      actions.append(button('⧉', `${profile.name} duplizieren`, () => {
        createProfile(`${profile.name} – Kopie`, profile.items); renderProfileManager(); announce('Profil dupliziert.');
      }));
      if (!profile.builtin) actions.append(button('×', `${profile.name} löschen`, () => {
        if (!confirm(`Profil „${profile.name}“ löschen?`)) return;
        state.customProfiles = state.customProfiles.filter((candidate) => candidate.id !== profile.id);
        delete state.savedLists[`profile:${profile.id}`];
        if (state.active.profile === profile.id) state.active.profile = '';
        save(); render(); renderProfileManager(); announce('Profil gelöscht.');
      }, true));
      row.append(info, actions); host.appendChild(row);
    }
  }

  function download(content, filename, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  }

  function slug() {
    return state.active.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'checkliste';
  }

  $('addForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const item = model.normalizeItem({ text: $('itemText').value, quantity: $('itemQuantity').value, category: $('itemCategory').value, tags: $('itemTags').value });
    if (!item) return;
    state.active.items.push(item); $('itemText').value = ''; $('itemQuantity').value = ''; $('itemTags').value = ''; $('itemText').focus();
    save(); render(); announce('Eintrag hinzugefügt.');
  });
  $('saveEdit').addEventListener('click', (event) => {
    event.preventDefault();
    const item = state.active.items.find((candidate) => candidate.id === editingItemId);
    const label = $('editText').value.trim();
    if (!item) { $('editError').textContent = 'Der Eintrag wurde nicht gefunden.'; return; }
    if (!label) { $('editError').textContent = 'Bitte eine Bezeichnung eingeben.'; $('editText').focus(); return; }
    Object.assign(item, {
      text: label,
      quantity: $('editQuantity').value.trim(),
      category: $('editCategory').value.trim(),
      tags: model.normalizeTags($('editTags').value),
      note: $('editNote').value.trim(),
    });
    editingItemId = null;
    $('editDialog').close();
    save(); render(); announce('Eintrag aktualisiert.');
  });
  $('editDialog').addEventListener('close', () => { editingItemId = null; $('editError').textContent = ''; });
  $('listTitle').addEventListener('change', () => { state.active.title = $('listTitle').value.trim() || 'Neue Checkliste'; save(); render(); });
  $('hideCompleted').addEventListener('change', () => { state.hideCompleted = $('hideCompleted').checked; save(); render(); });
  $('readMode').addEventListener('change', () => {
    state.viewMode = $('readMode').checked ? 'read' : 'edit';
    setMenu(false);
    save(); render();
    announce(state.viewMode === 'read' ? 'Read-Ansicht aktiviert.' : 'Edit-Ansicht aktiviert.');
  });
  $('clearTagFilters').addEventListener('click', () => { state.tagFilters = []; save(); render(); });
  $('profileSelect').addEventListener('change', () => {
    if (!$('profileSelect').value) { switchToFreeList(); return; }
    const profile = allProfiles().find((candidate) => candidate.id === $('profileSelect').value);
    if (!profile) return;
    switchToProfile(profile);
  });
  $('newBlankList').addEventListener('click', () => {
    save();
    state.active = model.normalizeList({ title: 'Neue Checkliste', profile: '', items: [] });
    state.tagFilters = [];
    state.hideCompleted = false;
    save(); render();
    $('listTitle').focus(); $('listTitle').select();
    announce('Neue leere Checkliste erstellt.');
  });
  $('newFromProfile').addEventListener('click', () => {
    const profile = allProfiles().find((candidate) => candidate.id === $('profileSelect').value);
    if (!profile) { announce('Bitte zuerst ein Profil auswählen.', true); return; }
    replaceWithProfile(profile);
  });
  $('saveProfile').addEventListener('click', () => {
    const name = prompt('Name des neuen Profils', state.active.title); if (!name?.trim()) return;
    const profile = createProfile(name.trim(), state.active.items); state.active.profile = profile.id; save(); render(); announce('Profil gespeichert.');
  });
  $('manageProfiles').addEventListener('click', () => { renderProfileManager(); $('profilesDialog').showModal(); });
  $('resetList').addEventListener('click', () => {
    const profile = activeProfile();
    if (!confirm(profile ? `Liste auf das Profil „${profile.name}“ zurücksetzen?` : 'Alle Häkchen entfernen?')) return;
    if (profile) state.active = listFromProfile(profile);
    else state.active.items.forEach((item) => { item.checked = false; });
    save(); render(); announce('Liste zurückgesetzt.');
  });
  $('openImport').addEventListener('click', () => { $('importError').textContent = ''; $('importDialog').showModal(); });
  $('importFile').addEventListener('change', async () => {
    const file = $('importFile').files[0]; if (!file) return;
    $('importText').value = await file.text();
    if (/\.json$/i.test(file.name)) $('importFormat').value = 'json';
    else if (/\.(md|markdown)$/i.test(file.name)) $('importFormat').value = 'markdown';
    else $('importFormat').value = 'text';
  });
  $('confirmImport').addEventListener('click', (event) => {
    event.preventDefault(); $('importError').textContent = '';
    try {
      const imported = model.parse($('importText').value, $('importFormat').value);
      if ($('importTarget').value === 'profile') {
        createProfile(imported.title, imported.items); announce('Profil importiert.');
      } else {
        state.active = imported; state.tagFilters = []; save(); render(); announce(`${imported.items.length} Einträge importiert.`);
      }
      $('importDialog').close(); $('importText').value = ''; $('importFile').value = '';
    } catch (error) { $('importError').textContent = error.message; }
  });
  $('exportJson').addEventListener('click', () => download(model.toJson(state.active), `${slug()}.json`, 'application/json;charset=utf-8'));
  $('exportMarkdown').addEventListener('click', () => download(model.toMarkdown(state.active), `${slug()}.md`, 'text/markdown;charset=utf-8'));
  $('menuToggle').addEventListener('click', () => setMenu(!$('sideMenu').classList.contains('is-open')));
  $('menuClose').addEventListener('click', () => setMenu(false));
  $('menuBackdrop').addEventListener('click', () => setMenu(false));
  $('sideMenu').querySelectorAll('.cl-menu-btn').forEach((control) => control.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); });

  window.qurixApp.serializeState = () => clone(state);
  window.qurixApp.hydrateState = (snapshot) => { state = normalizeState(snapshot); save(); render(); announce('Momentaufnahme wiederhergestellt.'); };

  render();
})();
