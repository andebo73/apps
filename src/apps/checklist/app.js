(function () {
  'use strict';

  const model = window.fdbChecklistModel;
  const STORAGE_KEY = 'fdb_apps_checklist_v1';
  const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const DRIVE_API = 'https://www.googleapis.com/drive/v3';
  const GOOGLE_CLIENT_ID = '62330084475-ijkku75lsnci3cf5ipm272mod6t8dnva.apps.googleusercontent.com';
  const DRIVE_LAYOUT_VERSION = 2;
  const SHOPPING_PROFILE_VERSION = 2;
  const $ = (id) => document.getElementById(id);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const newId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  function checklistFingerprint(list) {
    const comparable = clone(list);
    delete comparable.updatedAt;
    const source = JSON.stringify(comparable);
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

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

  function normalizeDriveBinding(value = {}) {
    return {
      clientId: GOOGLE_CLIENT_ID,
      fileId: String(value?.fileId || ''),
      fileName: String(value?.fileName || ''),
      fileVersion: String(value?.fileVersion || ''),
      syncedFingerprint: String(value?.syncedFingerprint || ''),
      dirty: Boolean(value?.dirty),
      lastSync: String(value?.lastSync || ''),
      shared: Boolean(value?.shared),
    };
  }

  function normalizeDriveLibrary(value = {}) {
    return { rootFolderId: String(value?.rootFolderId || ''), checklistFolderId: String(value?.checklistFolderId || '') };
  }

  function defaultState() {
    const active = listFromProfile(builtinProfiles[0]);
    return { active, customProfiles: [], hideCompleted: false, tagFilters: [], viewMode: 'edit',
      drive: normalizeDriveBinding(), driveBindings: {}, driveLibrary: normalizeDriveLibrary(), driveLayoutVersion: DRIVE_LAYOUT_VERSION,
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
      const active = model.normalizeList(value?.active || fallback.active);
      const activeKey = draftKey(active);
      if (savedLists[activeKey]) savedLists[activeKey].id = active.id;
      const listIds = new Set([active.id]);
      for (const [key, list] of Object.entries(savedLists)) {
        if (key === activeKey) continue;
        if (listIds.has(list.id)) list.id = newId('list');
        listIds.add(list.id);
      }
      const resetDriveLayout = Number(value?.driveLayoutVersion || 0) < DRIVE_LAYOUT_VERSION;
      const driveBindings = {};
      if (!resetDriveLayout && value?.driveBindings && typeof value.driveBindings === 'object') {
        for (const [listId, binding] of Object.entries(value.driveBindings)) driveBindings[listId] = normalizeDriveBinding(binding);
      }
      const normalized = {
        active,
        customProfiles: Array.isArray(value?.customProfiles) ? value.customProfiles.map(normalizeProfile).filter(Boolean) : [],
        hideCompleted: Boolean(value?.hideCompleted),
        tagFilters: model.normalizeTags(value?.tagFilters || []),
        viewMode: value?.viewMode === 'read' ? 'read' : 'edit',
        drive: clone(driveBindings[active.id] || normalizeDriveBinding()),
        driveBindings,
        driveLibrary: resetDriveLayout ? normalizeDriveLibrary() : normalizeDriveLibrary(value?.driveLibrary),
        driveLayoutVersion: DRIVE_LAYOUT_VERSION,
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
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  if (state.drive.fileVersion && !state.drive.syncedFingerprint && !state.drive.dirty) {
    state.drive.syncedFingerprint = checklistFingerprint(state.active);
  }
  let editingItemId = null;
  const driveRuntime = {
    accessToken: '', expiresAt: 0, tokenClient: null, syncing: false,
    timer: null, pollTimer: null, revision: state.drive.dirty ? 1 : 0,
    retryDelay: 3000, conflict: false, lastStatus: '', lastKind: '', pendingInvite: null,
    pendingAuthorizedAction: null,
  };
  const allProfiles = () => [...builtinProfiles, ...state.customProfiles];
  function draftKey(list) { return list.profile ? `profile:${list.profile}` : 'free'; }

  function storeActiveDriveBinding() {
    state.driveBindings = state.driveBindings || {};
    state.driveBindings[state.active.id] = clone(state.drive);
  }

  function activateDriveBinding() {
    clearTimeout(driveRuntime.timer);
    driveRuntime.conflict = false;
    state.drive = clone(state.driveBindings?.[state.active.id] || normalizeDriveBinding());
    driveRuntime.revision = state.drive.dirty ? 1 : 0;
    if (state.drive.fileId) {
      setDriveStatus('Drive-Verbindung dieser Liste geladen.', hasValidDriveToken() ? 'connected' : '');
      if (hasValidDriveToken()) { refreshDriveIfChanged(); scheduleDriveSync(250); }
    }
    else setDriveStatus('Diese Liste ist noch nicht mit Google Drive verbunden.');
  }

  function save(options = {}) {
    const listChanged = !options.remote && !options.localOnly;
    if (listChanged) state.active.updatedAt = new Date().toISOString();
    state.savedLists = state.savedLists || {};
    state.savedLists[draftKey(state.active)] = clone(state.active);
    if (!options.remote) {
      const fingerprint = checklistFingerprint(state.active);
      state.drive.dirty = state.drive.syncedFingerprint
        ? fingerprint !== state.drive.syncedFingerprint
        : state.drive.dirty || listChanged;
      if (listChanged) driveRuntime.revision += 1;
      if (state.drive.dirty) updateDriveQuickStatus('Ausstehende Änderungen', 'busy');
    }
    storeActiveDriveBinding();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
    if ($('profileBadges')) renderProfileBadges();
    if (!options.remote && state.drive.dirty) scheduleDriveSync();
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

  function comparableProfileItems(items) {
    return model.normalizeItems(items || []).map((item) => ({
      text: item.text, quantity: item.quantity, category: item.category, note: item.note,
      tags: [...item.tags].map((tag) => tag.toLocaleLowerCase('de')).sort(),
    }));
  }

  function profileIsChanged(profile, list) {
    if (!profile?.builtin || !list) return false;
    return JSON.stringify(comparableProfileItems(list.items)) !== JSON.stringify(comparableProfileItems(profile.items));
  }

  function statusesForList(profile, list, binding, active = false) {
    const statuses = [];
    if (profile?.builtin) statuses.push({ label: 'Standard', kind: 'standard' });
    else if (profile) statuses.push({ label: 'Eigene Vorlage', kind: 'custom' });
    else statuses.push({ label: 'Freie Liste', kind: 'custom' });
    if (profileIsChanged(profile, list)) statuses.push({ label: 'Angepasst', kind: 'changed' });
    if (binding?.shared) statuses.push({ label: 'Freigegeben', kind: 'shared' });
    else if (binding?.fileId) statuses.push({ label: 'Synchronisiert', kind: 'synced' });
    if (active && driveRuntime.conflict) statuses.push({ label: 'Konflikt', kind: 'conflict' });
    else if (binding?.fileId && binding?.dirty) statuses.push({ label: 'Änderungen offen', kind: 'pending' });
    return statuses;
  }

  function profileList(profile) {
    if (state.active.profile === profile.id) return state.active;
    return state.savedLists?.[`profile:${profile.id}`] || null;
  }

  function renderProfileBadges() {
    const profile = allProfiles().find((candidate) => candidate.id === state.active.profile) || null;
    const statuses = statusesForList(profile, state.active, state.drive, true);
    $('profileBadges').replaceChildren(...statuses.map(({ label, kind }) => {
      const badge = document.createElement('span');
      badge.className = `cl-profile-badge is-${kind}`;
      badge.textContent = label;
      return badge;
    }));
    $('driveListAction').hidden = Boolean(state.drive.fileId);
  }

  function renderProfiles() {
    const select = $('profileSelect');
    select.replaceChildren();
    const none = document.createElement('option');
    none.value = '';
    const freeList = state.active.profile ? state.savedLists?.free : state.active;
    const freeBinding = freeList ? (freeList.id === state.active.id ? state.drive : state.driveBindings?.[freeList.id]) : null;
    const freeStatuses = statusesForList(null, freeList, freeBinding);
    none.textContent = `Kein Profil · ${freeStatuses.map((status) => status.label).join(' · ')}`;
    select.appendChild(none);
    for (const profile of allProfiles()) {
      const option = document.createElement('option');
      option.value = profile.id;
      const list = profileList(profile);
      const binding = list ? (list.id === state.active.id ? state.drive : state.driveBindings?.[list.id]) : null;
      const statuses = statusesForList(profile, list, binding);
      option.textContent = `${profile.name} · ${statuses.map((status) => status.label).join(' · ')}`;
      select.appendChild(option);
    }
    select.value = allProfiles().some((profile) => profile.id === state.active.profile) ? state.active.profile : '';
    renderProfileBadges();
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
        save({ localOnly: true }); render();
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
    updateDriveQuickStatus();
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
    state.customProfiles.push(profile); save({ localOnly: true }); render(); return profile;
  }

  function replaceWithProfile(profile) {
    const listId = state.active.profile === profile.id ? state.active.id : '';
    state.active = listFromProfile(profile);
    if (listId) state.active.id = listId;
    activateDriveBinding();
    state.tagFilters = [];
    state.hideCompleted = false;
    save(); render();
    announce(`Neue Liste aus „${profile.name}“ erstellt.`);
  }

  function switchToProfile(profile) {
    save({ localOnly: true });
    const stored = state.savedLists[`profile:${profile.id}`];
    state.active = stored ? model.normalizeList(clone(stored)) : listFromProfile(profile);
    activateDriveBinding();
    state.tagFilters = [];
    state.hideCompleted = false;
    save({ localOnly: true }); render();
    announce(`Arbeitsstand „${profile.name}“ geladen.`);
  }

  function switchToFreeList() {
    save({ localOnly: true });
    const stored = state.savedLists.free;
    state.active = stored ? model.normalizeList(clone(stored)) : model.normalizeList({ title: 'Neue Checkliste', profile: '', items: [] });
    activateDriveBinding();
    state.tagFilters = [];
    state.hideCompleted = false;
    save({ localOnly: true }); render();
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
      const meta = document.createElement('small'); meta.textContent = `${profile.items.length} Einträge · ${profile.builtin ? 'Standard' : 'Eigene Vorlage'}`;
      info.append(name, meta);
      const actions = document.createElement('div'); actions.className = 'cl-actions';
      actions.append(button('⧉', `${profile.name} duplizieren`, () => {
        createProfile(`${profile.name} – Kopie`, profile.items); renderProfileManager(); announce('Profil dupliziert.');
      }));
      if (!profile.builtin) actions.append(button('×', `${profile.name} löschen`, () => {
        if (!confirm(`Profil „${profile.name}“ löschen?`)) return;
        const activeProfileDeleted = state.active.profile === profile.id;
        state.customProfiles = state.customProfiles.filter((candidate) => candidate.id !== profile.id);
        delete state.savedLists[`profile:${profile.id}`];
        if (activeProfileDeleted) state.active.profile = '';
        save(activeProfileDeleted ? {} : { localOnly: true }); render(); renderProfileManager(); announce('Profil gelöscht.');
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

  function bytesToBase64Url(bytes) {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function base64UrlToBytes(value) {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(base64);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  async function encodeSharedList(list) {
    const source = new TextEncoder().encode(JSON.stringify({ version: 1, list }));
    if (!window.CompressionStream) return `j.${bytesToBase64Url(source)}`;
    const stream = new Blob([source]).stream().pipeThrough(new CompressionStream('gzip'));
    return `g.${bytesToBase64Url(new Uint8Array(await new Response(stream).arrayBuffer()))}`;
  }

  async function decodeSharedList(payload) {
    const separator = payload.indexOf('.');
    const encoding = payload.slice(0, separator);
    let bytes = base64UrlToBytes(payload.slice(separator + 1));
    if (encoding === 'g') {
      if (!window.DecompressionStream) throw new Error('Dieser Browser kann den komprimierten Link nicht öffnen.');
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else if (encoding !== 'j') throw new Error('Das Format des geteilten Links ist unbekannt.');
    const shared = JSON.parse(new TextDecoder().decode(bytes));
    if (shared?.version !== 1) throw new Error('Die Version des geteilten Links wird nicht unterstützt.');
    return model.normalizeList(shared.list);
  }

  async function openShareDialog() {
    const error = $('shareError'); error.textContent = '';
    const host = $('shareQr'); host.replaceChildren();
    try {
      const payload = await encodeSharedList(state.active);
      const url = new URL(window.location.href); url.hash = `share=${payload}`;
      $('shareUrl').value = url.href;
      const code = window.qrcode(0, 'M');
      code.addData(url.href, 'Byte'); code.make();
      host.innerHTML = code.createSvgTag(5, 4);
      host.querySelector('svg')?.setAttribute('aria-hidden', 'true');
    } catch (shareError) {
      error.textContent = shareError.message || 'Die Liste konnte nicht geteilt werden.';
    }
    $('shareDialog').showModal();
  }

  async function importSharedList() {
    const match = window.location.hash.match(/^#share=(.+)$/);
    if (!match) return false;
    try {
      save({ localOnly: true });
      state.active = await decodeSharedList(match[1]);
      state.active.profile = '';
      activateDriveBinding();
      state.tagFilters = [];
      state.hideCompleted = false;
      state.viewMode = 'read';
      history.replaceState(null, '', `${location.pathname}${location.search}`);
      save();
      announce(`Geteilte Liste „${state.active.title}“ geöffnet.`);
      return true;
    } catch (error) {
      announce(error.message || 'Der geteilte Link konnte nicht geöffnet werden.', true);
      return false;
    }
  }

  function encodeDriveInvite(invite) {
    return bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ version: 1, ...invite })));
  }

  function readDriveInvite() {
    const match = window.location.hash.match(/^#drive-invite=([A-Za-z0-9_-]+)$/);
    if (!match) return false;
    try {
      const invite = JSON.parse(new TextDecoder().decode(base64UrlToBytes(match[1])));
      if (invite?.version !== 1 || !invite.fileId) {
        throw new Error('Der Einladungslink ist unvollständig oder ungültig.');
      }
      driveRuntime.pendingInvite = {
        fileId: String(invite.fileId), shared: true,
      };
      return true;
    } catch (error) {
      announce(error.message || 'Der Einladungslink konnte nicht geöffnet werden.', true);
      history.replaceState(null, '', `${location.pathname}${location.search}`);
      return false;
    }
  }

  function setDriveStatus(message, kind = '') {
    driveRuntime.lastStatus = message;
    driveRuntime.lastKind = kind;
    $('driveStatus').textContent = message;
    $('driveIndicator').className = `cl-drive-indicator${kind ? ` is-${kind}` : ''}`;
    $('driveError').textContent = kind === 'error' ? message : '';
    const connected = hasValidDriveToken();
    $('connectDrive').textContent = driveRuntime.pendingInvite
      ? 'Einladung mit Google-Konto annehmen'
      : (connected ? 'Google Drive ist verbunden' : 'Google Drive verbinden');
    $('connectDrive').disabled = connected && !driveRuntime.pendingInvite;
    $('syncDriveNow').disabled = false;
    $('loadDriveNow').disabled = !state.drive.fileId;
    $('overwriteDrive').disabled = !state.drive.fileId;
    $('createDriveInvite').disabled = !connected || !state.drive.fileId;
    updateDriveShareState();
    updateDriveQuickStatus(message, kind);
  }

  function updateDriveQuickStatus(message = '', kind = '') {
    const control = $('driveQuickStatus');
    if (!control) return;
    const connected = hasValidDriveToken();
    const configured = Boolean(state.drive.fileId || connected);
    control.hidden = !configured;
    if (!kind && driveRuntime.conflict) kind = 'error';
    const indicator = control.querySelector('.cl-drive-indicator');
    indicator.className = `cl-drive-indicator${kind ? ` is-${kind}` : ''}`;
    let label = 'Drive · verbinden';
    if (connected && state.drive.dirty) label = 'Drive · ausstehend';
    else if (connected) label = 'Drive · aktuell';
    if (kind === 'busy') label = 'Drive · synchronisiert …';
    if (kind === 'error') label = driveRuntime.conflict ? 'Drive · Konflikt' : 'Drive · Fehler';
    control.lastElementChild.textContent = label;
    control.title = message || label;
    control.setAttribute('aria-label', `${label}. Google-Drive-Dialog öffnen`);
  }

  function driveHeaders(json = false) {
    const headers = { Authorization: `Bearer ${driveRuntime.accessToken}` };
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
  }

  function hasValidDriveToken() {
    return Boolean(driveRuntime.accessToken && driveRuntime.expiresAt > Date.now() + 60000);
  }

  async function driveRequest(url, options = {}) {
    const response = await fetch(url, options);
    if (response.status === 401) {
      driveRuntime.accessToken = '';
      driveRuntime.expiresAt = 0;
      throw new Error('Die Google-Anmeldung ist abgelaufen. Bitte erneut verbinden.');
    }
    if (!response.ok) {
      let detail = '';
      try { detail = (await response.json())?.error?.message || ''; } catch (_) {}
      throw new Error(detail || `Google Drive antwortet mit Status ${response.status}.`);
    }
    if (response.status === 204) return null;
    return response.json();
  }

  function driveFileBody() {
    return JSON.stringify({ format: 'fdb-checklist-drive', version: 1, list: state.active }, null, 2);
  }

  function driveFileName() {
    const title = state.active.title.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Checkliste';
    return `${title}.fdb-checklist.json`;
  }

  async function findDriveFolder(name, parentId) {
    const escapedName = name.replace(/'/g, "\\'");
    const query = `name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`;
    const result = await driveRequest(`${DRIVE_API}/files?q=${encodeURIComponent(query)}&spaces=drive&fields=files(id,name)&pageSize=1`, { headers: driveHeaders() });
    return result.files?.[0] || null;
  }

  async function createDriveLibraryFolder(name, parentId) {
    return driveRequest(`${DRIVE_API}/files?fields=id,name`, {
      method: 'POST', headers: driveHeaders(true),
      body: JSON.stringify({ name, parents: [parentId], mimeType: 'application/vnd.google-apps.folder' }),
    });
  }

  async function ensureDriveLibrary() {
    state.driveLibrary = normalizeDriveLibrary(state.driveLibrary);
    if (!state.driveLibrary.rootFolderId) {
      const root = await findDriveFolder('FDB Apps', 'root') || await createDriveLibraryFolder('FDB Apps', 'root');
      state.driveLibrary.rootFolderId = root.id;
    }
    if (!state.driveLibrary.checklistFolderId) {
      const folder = await findDriveFolder('Checklisten', state.driveLibrary.rootFolderId)
        || await createDriveLibraryFolder('Checklisten', state.driveLibrary.rootFolderId);
      state.driveLibrary.checklistFolderId = folder.id;
    }
    save({ remote: true });
    return state.driveLibrary.checklistFolderId;
  }

  async function createDriveFile() {
    const uploadRevision = driveRuntime.revision;
    const uploadFingerprint = checklistFingerprint(state.active);
    const body = driveFileBody();
    const form = new FormData();
    const checklistFolderId = await ensureDriveLibrary();
    form.append('metadata', new Blob([JSON.stringify({
      name: driveFileName(), parents: [checklistFolderId], mimeType: 'application/json',
      appProperties: { fdbApp: 'checklist', listId: state.active.id, formatVersion: '1' },
    })], { type: 'application/json' }));
    form.append('file', new Blob([body], { type: 'application/json' }));
    const file = await driveRequest('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,version,modifiedTime', {
      method: 'POST', headers: driveHeaders(), body: form,
    });
    state.drive.fileId = file.id;
    state.drive.fileName = file.name || driveFileName();
    state.drive.fileVersion = String(file.version || '');
    state.drive.syncedFingerprint = uploadFingerprint;
    state.drive.dirty = checklistFingerprint(state.active) !== uploadFingerprint || driveRuntime.revision !== uploadRevision;
    state.drive.lastSync = new Date().toISOString();
    save({ remote: true });
    if (state.drive.dirty) scheduleDriveSync();
    return file;
  }

  async function findDriveFile() {
    const checklistFolderId = await ensureDriveLibrary();
    const listId = state.active.id.replace(/'/g, "\\'");
    const query = `'${checklistFolderId}' in parents and appProperties has { key='listId' and value='${listId}' } and trashed = false`;
    const result = await driveRequest(`${DRIVE_API}/files?q=${encodeURIComponent(query)}&spaces=drive&fields=files(id,name,version,modifiedTime)&orderBy=modifiedTime desc&pageSize=1`, {
      headers: driveHeaders(),
    });
    return result.files?.[0] || null;
  }

  async function readDriveFile(fileId) {
    const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`, { headers: driveHeaders() });
    if (!response.ok) throw new Error(`Die Drive-Datei konnte nicht gelesen werden (${response.status}).`);
    const document = await response.json();
    if (document?.format !== 'fdb-checklist-drive' || document?.version !== 1) throw new Error('Die Drive-Datei ist keine unterstützte FDB-Checkliste.');
    return model.normalizeList(document.list);
  }

  async function pullDriveFile(file) {
    clearTimeout(driveRuntime.timer);
    state.active = await readDriveFile(file.id);
    driveRuntime.revision += 1;
    driveRuntime.conflict = false;
    state.drive.fileId = file.id;
    state.drive.fileName = String(file.name || state.drive.fileName || '');
    state.drive.fileVersion = String(file.version || '');
    state.drive.syncedFingerprint = checklistFingerprint(state.active);
    state.drive.dirty = false;
    state.drive.lastSync = new Date().toISOString();
    save({ remote: true });
    render();
    setDriveStatus('Drive-Stand geladen.', 'connected');
  }

  async function acceptDriveInvite() {
    const invite = driveRuntime.pendingInvite;
    if (!invite) return false;
    setDriveStatus('Freigegebene Liste wird geöffnet …', 'busy');
    const remote = await driveRequest(`${DRIVE_API}/files/${encodeURIComponent(invite.fileId)}?fields=id,name,version,modifiedTime`, { headers: driveHeaders() });
    save({ localOnly: true });
    await pullDriveFile(remote);
    driveRuntime.pendingInvite = null;
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    $('driveInviteNotice').hidden = true;
    $('driveDialog').close();
    announce(`Gemeinsame Liste „${state.active.title}“ verbunden.`);
    return true;
  }

  async function uploadDriveFile() {
    if (!driveRuntime.accessToken || !state.drive.fileId || driveRuntime.syncing) return;
    driveRuntime.syncing = true;
    const uploadRevision = driveRuntime.revision;
    const uploadFingerprint = checklistFingerprint(state.active);
    const body = driveFileBody();
    let nextDelay = 1200;
    setDriveStatus('Synchronisierung läuft …', 'busy');
    try {
      const remote = await driveRequest(`${DRIVE_API}/files/${encodeURIComponent(state.drive.fileId)}?fields=id,name,version,modifiedTime`, { headers: driveHeaders() });
      if (state.drive.fileVersion && String(remote.version || '') !== state.drive.fileVersion && state.drive.dirty) {
        throw new Error('Die Liste wurde auf einem anderen Gerät geändert. Bitte den Drive-Stand laden oder die lokale Liste bewusst überschreiben.');
      }
      let updated = await driveRequest(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(state.drive.fileId)}?uploadType=media&fields=id,name,version,modifiedTime`, {
        method: 'PATCH', headers: driveHeaders(true), body,
      });
      const desiredName = driveFileName();
      if (state.drive.fileName !== desiredName) {
        updated = await driveRequest(`${DRIVE_API}/files/${encodeURIComponent(state.drive.fileId)}?fields=id,name,version,modifiedTime`, {
          method: 'PATCH', headers: driveHeaders(true), body: JSON.stringify({ name: desiredName }),
        });
      }
      state.drive.fileName = updated.name || desiredName;
      state.drive.fileVersion = String(updated.version || '');
      state.drive.syncedFingerprint = uploadFingerprint;
      state.drive.dirty = checklistFingerprint(state.active) !== uploadFingerprint || driveRuntime.revision !== uploadRevision;
      state.drive.lastSync = new Date().toISOString();
      driveRuntime.retryDelay = 3000;
      driveRuntime.conflict = false;
      save({ remote: true });
      setDriveStatus(state.drive.dirty ? 'Neuere Änderungen werden anschließend synchronisiert …' : `Synchronisiert um ${new Date().toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}.`, state.drive.dirty ? 'busy' : 'connected');
    } catch (error) {
      driveRuntime.conflict = /anderen Gerät geändert|Drive und lokale Liste/.test(error.message);
      setDriveStatus(error.message, 'error');
      if (driveRuntime.accessToken && state.drive.dirty && !driveRuntime.conflict) {
        nextDelay = driveRuntime.retryDelay;
        driveRuntime.retryDelay = Math.min(driveRuntime.retryDelay * 2, 30000);
      }
    } finally {
      driveRuntime.syncing = false;
      if (state.drive.dirty && !driveRuntime.conflict) scheduleDriveSync(nextDelay);
    }
  }

  function scheduleDriveSync(delay = 1200) {
    clearTimeout(driveRuntime.timer);
    if (!driveRuntime.accessToken || !state.drive.fileId || !state.drive.dirty || driveRuntime.conflict) return;
    driveRuntime.timer = setTimeout(uploadDriveFile, delay);
  }

  function startDrivePolling() {
    clearInterval(driveRuntime.pollTimer);
    driveRuntime.pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) refreshDriveIfChanged();
    }, 10000);
  }

  async function connectDriveList() {
    setDriveStatus('Drive-Ablage und Listendatei werden geprüft …', 'busy');
    const file = await findDriveFile();
    if (!file) {
      await createDriveFile();
      setDriveStatus(`Neue Datei „${driveFileName()}“ angelegt und synchronisiert.`, 'connected');
      return;
    }
    state.drive.fileId = file.id;
    const remoteChanged = state.drive.fileVersion && String(file.version || '') !== state.drive.fileVersion;
    if (!state.drive.fileVersion || remoteChanged) {
      const loadRemote = confirm('Für diese Liste wurde eine Drive-Datei gefunden. Den Drive-Stand laden?\n\n„Abbrechen“ behält den lokalen Stand; er wird noch nicht überschrieben.');
      if (loadRemote) { await pullDriveFile(file); return; }
      state.drive.fileVersion = String(file.version || '');
      state.drive.syncedFingerprint = checklistFingerprint(state.active);
      save({ remote: true });
      setDriveStatus('Lokaler Stand beibehalten. Mit „Jetzt synchronisieren“ kann er hochgeladen werden.', 'connected');
      return;
    }
    setDriveStatus('Mit Google Drive verbunden.', 'connected');
    if (!state.drive.syncedFingerprint) {
      state.drive.syncedFingerprint = checklistFingerprint(state.active);
      save({ remote: true });
    }
    scheduleDriveSync();
  }

  function requestDriveAuthorization(action) {
    if (hasValidDriveToken()) {
      Promise.resolve(action()).catch((error) => setDriveStatus(error.message, 'error'));
      return;
    }
    if (!window.google?.accounts?.oauth2) throw new Error('Google Identity Services konnte nicht geladen werden.');
    driveRuntime.pendingAuthorizedAction = action;
    driveRuntime.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: async (token) => {
        if (token.error) {
          driveRuntime.pendingAuthorizedAction = null;
          setDriveStatus(token.error_description || token.error, 'error'); return;
        }
        driveRuntime.accessToken = token.access_token;
        driveRuntime.expiresAt = Date.now() + Number(token.expires_in || 3600) * 1000;
        driveRuntime.conflict = false;
        startDrivePolling();
        setDriveStatus('Mit Google verbunden.', 'connected');
        try {
          const authorizedAction = driveRuntime.pendingAuthorizedAction;
          driveRuntime.pendingAuthorizedAction = null;
          if (authorizedAction) await authorizedAction();
          updateDriveShareState();
        } catch (error) {
          if (driveRuntime.pendingInvite) activateDriveBinding();
          setDriveStatus(error.message === 'The user does not have sufficient permissions for this file.'
            ? 'Dieses Google-Konto hat keinen Zugriff auf die eingeladene Liste. Bitte mit dem freigegebenen Konto anmelden.'
            : error.message, 'error');
        }
      },
    });
    driveRuntime.tokenClient.requestAccessToken({ prompt: '' });
  }

  async function createDriveInvite() {
    const emailAddress = $('driveShareEmail').value.trim();
    $('driveInviteError').textContent = '';
    $('driveInviteResult').hidden = true;
    if (!emailAddress || !$('driveShareEmail').checkValidity()) {
      $('driveInviteError').textContent = 'Bitte eine gültige Google-E-Mail-Adresse eingeben.';
      $('driveShareEmail').focus();
      return;
    }
    const button = $('createDriveInvite');
    button.disabled = true;
    setDriveStatus('Drive-Zugriff wird erteilt …', 'busy');
    try {
      await driveRequest(`${DRIVE_API}/files/${encodeURIComponent(state.drive.fileId)}/permissions?sendNotificationEmail=true&fields=id`, {
        method: 'POST', headers: driveHeaders(true),
        body: JSON.stringify({ type: 'user', role: 'writer', emailAddress }),
      });
      const url = new URL(window.location.href);
      url.hash = `drive-invite=${encodeDriveInvite({ fileId: state.drive.fileId })}`;
      $('driveInviteUrl').value = url.href;
      $('driveInviteResult').hidden = false;
      setDriveStatus(`Zugriff für ${emailAddress} erteilt.`, 'connected');
      state.drive.shared = true;
      save({ remote: true });
      announce('Einladungslink erstellt.');
    } catch (error) {
      $('driveInviteError').textContent = error.message || 'Die Einladung konnte nicht erstellt werden.';
      setDriveStatus('Die Drive-Freigabe ist fehlgeschlagen.', 'error');
    } finally {
      button.disabled = !hasValidDriveToken() || !state.drive.fileId;
    }
  }

  async function syncDriveNow() {
    if (!state.drive.fileId) {
      try { await connectDriveList(); } catch (error) { setDriveStatus(error.message, 'error'); }
      return;
    }
    await uploadDriveFile();
  }

  async function loadDriveNow() {
    if (state.drive.dirty && !confirm('Lokale Änderungen verwerfen und den Drive-Stand laden?')) return;
    try {
      const remote = await driveRequest(`${DRIVE_API}/files/${encodeURIComponent(state.drive.fileId)}?fields=id,name,version,modifiedTime`, { headers: driveHeaders() });
      await pullDriveFile(remote);
      announce('Drive-Stand geladen.');
    } catch (error) { setDriveStatus(error.message, 'error'); }
  }

  async function overwriteDrive() {
    if (!confirm('Die aktuelle Drive-Datei mit dem lokalen Stand überschreiben? Änderungen vom anderen Gerät gehen dabei verloren.')) return;
    try {
      const remote = await driveRequest(`${DRIVE_API}/files/${encodeURIComponent(state.drive.fileId)}?fields=id,name,version`, { headers: driveHeaders() });
      state.drive.fileVersion = String(remote.version || '');
      state.drive.dirty = true;
      driveRuntime.conflict = false;
      await uploadDriveFile();
    } catch (error) { setDriveStatus(error.message, 'error'); }
  }

  async function refreshDriveIfChanged() {
    if (!driveRuntime.accessToken || !state.drive.fileId || driveRuntime.syncing) return;
    try {
      const remote = await driveRequest(`${DRIVE_API}/files/${encodeURIComponent(state.drive.fileId)}?fields=id,name,version,modifiedTime`, { headers: driveHeaders() });
      if (String(remote.version || '') === state.drive.fileVersion) return;
      if (state.drive.dirty) {
        driveRuntime.conflict = true;
        setDriveStatus('Drive und lokale Liste wurden geändert. Öffne Google Drive und entscheide, welchen Stand du behalten möchtest.', 'error');
        return;
      }
      await pullDriveFile(remote);
      announce('Neueren Stand aus Google Drive geladen.');
    } catch (error) { setDriveStatus(error.message, 'error'); }
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
  $('hideCompleted').addEventListener('change', () => { state.hideCompleted = $('hideCompleted').checked; save({ localOnly: true }); render(); });
  $('readMode').addEventListener('change', () => {
    state.viewMode = $('readMode').checked ? 'read' : 'edit';
    setMenu(false);
    save({ localOnly: true }); render();
    announce(state.viewMode === 'read' ? 'Read-Ansicht aktiviert.' : 'Edit-Ansicht aktiviert.');
  });
  $('clearTagFilters').addEventListener('click', () => { state.tagFilters = []; save({ localOnly: true }); render(); });
  $('profileSelect').addEventListener('change', () => {
    if (!$('profileSelect').value) { switchToFreeList(); return; }
    const profile = allProfiles().find((candidate) => candidate.id === $('profileSelect').value);
    if (!profile) return;
    switchToProfile(profile);
  });
  $('newBlankList').addEventListener('click', () => {
    save({ localOnly: true });
    state.active = model.normalizeList({ title: 'Neue Checkliste', profile: '', items: [] });
    activateDriveBinding();
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
    save({ localOnly: true });
    const profile = normalizeProfile({ id: newId('profile'), name: name.trim(), items: clone(state.active.items) });
    state.customProfiles.push(profile);
    state.active = model.normalizeList({ ...clone(state.active), id: '', profile: profile.id });
    activateDriveBinding();
    save({ localOnly: true }); render();
    announce('Profil gespeichert. Die neue Profil-Liste kann unabhängig synchronisiert werden.');
  });
  $('manageProfiles').addEventListener('click', () => { renderProfileManager(); $('profilesDialog').showModal(); });
  $('shareList').addEventListener('click', openShareDialog);
  function updateDriveShareState() {
    const ready = Boolean(hasValidDriveToken() && state.drive.fileId);
    if (!$('driveShareForm')) return;
    $('driveShareForm').hidden = !ready;
    $('connectDriveForShare').hidden = ready;
    $('createDriveInvite').disabled = !ready;
  }
  function openDriveShareDialog() {
    $('driveInviteResult').hidden = true;
    $('driveInviteError').textContent = '';
    updateDriveShareState();
    $('driveShareDialog').showModal();
  }
  function openDriveDialog() {
    $('driveInviteNotice').hidden = !driveRuntime.pendingInvite;
    $('driveInviteResult').hidden = true;
    $('driveInviteError').textContent = '';
    setDriveStatus(
      driveRuntime.lastStatus || (hasValidDriveToken() ? 'Mit Google Drive verbunden.' : 'Nicht verbunden'),
      driveRuntime.lastKind || (hasValidDriveToken() ? 'connected' : ''),
    );
    $('driveDialog').showModal();
  }
  $('driveSync').addEventListener('click', openDriveDialog);
  $('shareDriveList').addEventListener('click', openDriveShareDialog);
  $('driveQuickStatus').addEventListener('click', openDriveDialog);
  $('connectDrive').addEventListener('click', () => {
    const action = driveRuntime.pendingInvite
      ? async () => { state.drive = normalizeDriveBinding(driveRuntime.pendingInvite); await acceptDriveInvite(); }
      : async () => {
        if (state.drive.fileId) await refreshDriveIfChanged();
        setDriveStatus('Google Drive ist verbunden.', 'connected');
      };
    try { requestDriveAuthorization(action); } catch (error) { setDriveStatus(error.message, 'error'); }
  });
  $('connectDriveForShare').addEventListener('click', () => {
    try { requestDriveAuthorization(connectDriveList); } catch (error) { setDriveStatus(error.message, 'error'); }
  });
  $('driveListAction').addEventListener('click', () => {
    try { requestDriveAuthorization(connectDriveList); } catch (error) { setDriveStatus(error.message, 'error'); }
  });
  $('syncDriveNow').addEventListener('click', () => {
    try { requestDriveAuthorization(syncDriveNow); } catch (error) { setDriveStatus(error.message, 'error'); }
  });
  $('loadDriveNow').addEventListener('click', () => {
    try { requestDriveAuthorization(loadDriveNow); } catch (error) { setDriveStatus(error.message, 'error'); }
  });
  $('overwriteDrive').addEventListener('click', () => {
    try { requestDriveAuthorization(overwriteDrive); } catch (error) { setDriveStatus(error.message, 'error'); }
  });
  $('createDriveInvite').addEventListener('click', createDriveInvite);
  $('copyDriveInvite').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('driveInviteUrl').value);
      announce('Einladungslink kopiert.');
    } catch { $('driveInviteUrl').select(); announce('Bitte den markierten Link kopieren.', true); }
  });
  $('copyShareUrl').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('shareUrl').value);
      announce('Link kopiert.');
    } catch { $('shareUrl').select(); announce('Bitte den markierten Link kopieren.', true); }
  });
  $('resetList').addEventListener('click', () => {
    if (!confirm('Alle Häkchen entfernen? Einträge und Änderungen bleiben erhalten.')) return;
    state.active.items.forEach((item) => { item.checked = false; });
    save(); render(); announce('Alle Häkchen entfernt.');
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
      } else if ($('importTarget').value === 'append') {
        const appendedItems = model.normalizeItems(imported.items.map((item) => ({ ...item, id: '' })));
        state.active.items.push(...appendedItems);
        state.tagFilters = [];
        save(); render(); announce(`${appendedItems.length} Einträge zur aktuellen Checkliste hinzugefügt.`);
      } else {
        state.active = imported; activateDriveBinding(); state.tagFilters = []; save(); render(); announce(`${imported.items.length} Einträge importiert.`);
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
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshDriveIfChanged(); });
  window.addEventListener('focus', refreshDriveIfChanged);
  window.addEventListener('online', () => { refreshDriveIfChanged(); scheduleDriveSync(250); });

  window.qurixApp.serializeState = () => {
    const snapshot = clone(state);
    snapshot.drive = defaultState().drive;
    return snapshot;
  };
  window.qurixApp.hydrateState = (snapshot) => {
    const localDrive = clone(state.drive);
    const localDriveBindings = clone(state.driveBindings || {});
    state = normalizeState(snapshot);
    state.drive = localDrive;
    state.driveBindings = localDriveBindings;
    save(); render(); announce('Momentaufnahme wiederhergestellt.');
  };

  const hasDriveInvite = readDriveInvite();
  importSharedList().finally(() => {
    render();
    if (hasDriveInvite) openDriveDialog();
  });
})();
