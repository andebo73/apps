(function (root) {
  'use strict';

  const FORMAT = 'fdb-checklist';
  const VERSION = 1;
  let sequence = 0;
  const id = (prefix = 'item') => `${prefix}-${Date.now().toString(36)}-${(++sequence).toString(36)}`;
  const text = (value) => String(value == null ? '' : value).trim();

  function normalizeTags(value) {
    const values = Array.isArray(value) ? value : text(value).split(',');
    const seen = new Set();
    return values.map(text).filter((tag) => {
      const key = tag.toLocaleLowerCase('de');
      if (!tag || seen.has(key)) return false;
      seen.add(key); return true;
    });
  }

  function normalizeItem(value, index = 0) {
    const source = typeof value === 'string' ? { text: value } : (value || {});
    const label = text(source.text ?? source.label ?? source.name);
    if (!label) return null;
    return {
      id: text(source.id) || id(`item${index + 1}`),
      text: label,
      checked: Boolean(source.checked ?? source.done ?? false),
      quantity: text(source.quantity ?? source.amount),
      category: text(source.category ?? source.group),
      note: text(source.note ?? source.notes),
      tags: normalizeTags(source.tags ?? source.tag),
    };
  }

  function normalizeItems(items) {
    if (!Array.isArray(items)) throw new Error('Die Checkliste muss ein Feld "items" enthalten.');
    return items.map(normalizeItem).filter(Boolean);
  }

  function mergeProfileItems(currentItems, templateItems) {
    const current = normalizeItems(currentItems || []);
    const template = normalizeItems(templateItems || []);
    const byText = new Map(current.map((item) => [item.text.toLocaleLowerCase('de'), item]));
    for (const templateItem of template) {
      const key = templateItem.text.toLocaleLowerCase('de');
      const existing = byText.get(key);
      if (existing) {
        if (!existing.quantity) existing.quantity = templateItem.quantity;
        if (!existing.category) existing.category = templateItem.category;
        existing.tags = normalizeTags([...(existing.tags || []), ...templateItem.tags]);
        continue;
      }
      current.push(templateItem);
      byText.set(key, templateItem);
    }
    return current;
  }

  function normalizeList(value, fallbackTitle = 'Neue Checkliste') {
    const source = Array.isArray(value) ? { items: value } : (value || {});
    const categorySort = ['list', 'alphabetical', 'manual'].includes(source.categorySort) ? source.categorySort : 'list';
    const categoryOrder = [];
    const seenCategories = new Set();
    for (const value of Array.isArray(source.categoryOrder) ? source.categoryOrder : []) {
      const category = text(value);
      const key = category.toLocaleLowerCase('de');
      if (!category || seenCategories.has(key)) continue;
      seenCategories.add(key); categoryOrder.push(category);
    }
    return {
      format: FORMAT,
      version: VERSION,
      id: text(source.id) || id('list'),
      title: text(source.title) || fallbackTitle,
      profile: text(source.profile),
      items: normalizeItems(source.items || []),
      categorySort,
      categoryOrder,
      uncategorizedPosition: source.uncategorizedPosition === 'first' ? 'first' : 'last',
      createdAt: text(source.createdAt) || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function parseJson(input) {
    let value;
    try { value = JSON.parse(input); }
    catch { throw new Error('Das JSON ist nicht gültig.'); }
    if (value && value.format && value.format !== FORMAT) {
      throw new Error(`Unbekanntes Format: ${value.format}`);
    }
    return normalizeList(value);
  }

  function parseMarkdown(input) {
    const lines = String(input).split(/\r?\n/);
    let title = '';
    let category = '';
    const items = [];
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        if (heading[1].length === 1 && !title) title = text(heading[2]);
        else category = text(heading[2]);
        continue;
      }
      const match = line.match(/^[-*+]\s+(?:\[([ xX])\]\s*)?(.+)$/);
      if (!match) continue;
      let label = text(match[2]);
      let quantity = '';
      const tags = [];
      label = label.replace(/\s+#([\p{L}\p{N}_-]+)/gu, (_, tag) => { tags.push(tag.replace(/-/g, ' ')); return ''; }).trim();
      const quantityMatch = label.match(/^(\d+(?:[.,]\d+)?\s*(?:x|kg|g|l|ml|stk\.?|packungen?)?)\s+(.+)$/i);
      if (quantityMatch) {
        quantity = text(quantityMatch[1]);
        label = text(quantityMatch[2]);
      }
      const item = normalizeItem({ text: label, checked: /x/i.test(match[1] || ''), quantity, category, tags }, items.length);
      if (item) items.push(item);
    }
    if (!items.length) throw new Error('Im Markdown wurden keine Listeneinträge gefunden.');
    return normalizeList({ title: title || 'Importierte Checkliste', items });
  }

  function parseText(input) {
    const items = String(input).split(/\r?\n/)
      .map((line) => line.trim().replace(/^[-*+]\s+/, ''))
      .filter(Boolean).map((line, index) => normalizeItem(line, index)).filter(Boolean);
    if (!items.length) throw new Error('Der Text enthält keine Listeneinträge.');
    return normalizeList({ title: 'Importierte Checkliste', items });
  }

  function detectFormat(input) {
    const value = String(input).trim();
    if (/^[\[{]/.test(value)) return 'json';
    if (/^#{1,6}\s|^[-*+]\s+\[[ xX]\]/m.test(value)) return 'markdown';
    return 'text';
  }

  function parse(input, format = 'auto') {
    const selected = format === 'auto' ? detectFormat(input) : format;
    if (selected === 'json') return parseJson(input);
    if (selected === 'markdown') return parseMarkdown(input);
    if (selected === 'text') return parseText(input);
    throw new Error(`Nicht unterstütztes Importformat: ${selected}`);
  }

  function toJson(list) {
    return `${JSON.stringify(normalizeList(list), null, 2)}\n`;
  }

  function toMarkdown(list) {
    const value = normalizeList(list);
    const groups = new Map();
    value.items.forEach((item) => {
      const group = item.category || '';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(item);
    });
    const lines = [`# ${value.title}`, ''];
    for (const [category, items] of groups) {
      if (category) lines.push(`## ${category}`, '');
      for (const item of items) {
        const quantity = item.quantity ? `${item.quantity} ` : '';
        const note = item.note ? ` — ${item.note}` : '';
        const tags = item.tags.length ? ` ${item.tags.map((tag) => `#${tag.replace(/\s+/g, '-')}`).join(' ')}` : '';
        lines.push(`- [${item.checked ? 'x' : ' '}] ${quantity}${item.text}${note}${tags}`);
      }
      lines.push('');
    }
    return `${lines.join('\n').trimEnd()}\n`;
  }

  root.fdbChecklistModel = {
    FORMAT, VERSION, detectFormat, normalizeItem, normalizeItems, normalizeList, normalizeTags, mergeProfileItems,
    parse, parseJson, parseMarkdown, parseText, toJson, toMarkdown,
  };
})(typeof window !== 'undefined' ? window : globalThis);
