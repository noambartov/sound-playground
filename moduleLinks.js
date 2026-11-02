// moduleLinks.js - Link: modules of the same type that move together, like one panel of a real
// polyphonic synth controlling every voice. Select 2+ modules of one type and press "Link N modules"
// (or "Unlink" when they are already one group). From then on, moving a slider, choosing in a menu
// or pressing a switch on one of them does the same on all the others in its group.
//
// How it works: the group letter is stored on the module entry (app.modules[id].link, saved in
// patches and undo snapshots as `link`). A document-level listener sees each 'input' / 'change'
// event and each button click inside a linked card, finds the same control in the other cards of
// the group (by element id with the module id swapped, or else by its position among the card's
// controls) and copies the value there, firing the same event so that module reacts as if touched.
// Nothing is changed inside the modules themselves, so any module type can be linked.

(function () {
  const COLORS = ['#0d9488', '#d97706', '#7c3aed', '#db2777', '#2563eb', '#65a30d', '#dc2626', '#0891b2'];
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let syncing = false;

  const app = () => window.synthApp;

  function colorFor(letter) {
    const i = LETTERS.indexOf(letter);
    return COLORS[(i < 0 ? 0 : i) % COLORS.length];
  }

  function cardOf(id) {
    return document.getElementById(`module_card_${id}`);
  }

  function members(letter, exceptId) {
    const a = app();
    if (!a || !letter) return [];
    return Object.values(a.modules).filter(m => m.link === letter && m.id !== exceptId).map(m => m.id);
  }

  function usedLetters() {
    const a = app();
    return new Set(a ? Object.values(a.modules).map(m => m.link).filter(Boolean) : []);
  }

  function freeLetter(taken = usedLetters()) {
    for (const l of LETTERS) if (!taken.has(l)) return l;
    return 'Z';
  }

  // Draws (or removes) the "LINK A" tag in the module's header
  function drawTag(id) {
    const a = app();
    const m = a && a.modules[id];
    const card = cardOf(id);
    if (!card) return;
    const header = card.querySelector('.node-header');
    let tag = card.querySelector('.link-tag');
    if (!m || !m.link) {
      if (tag) tag.remove();
      return;
    }
    if (!tag && header) {
      tag = document.createElement('span');
      tag.className = 'link-tag';
      const del = header.querySelector('.delete-module-btn');
      header.insertBefore(tag, del || null);
    }
    if (tag) {
      tag.textContent = `LINK ${m.link}`;
      tag.style.setProperty('--link-color', colorFor(m.link));
      tag.title = 'Linked: its controls move together with the other modules marked with this letter';
    }
  }

  function setLink(id, letter) {
    const a = app();
    const m = a && a.modules[id];
    if (!m) return;
    m.link = letter || '';
    if (!m.link) delete m.link;
    drawTag(id);
  }

  // A group of one is no group: its last member is unlinked
  function tidy(letter) {
    const left = members(letter);
    if (left.length === 1) setLink(left[0], '');
  }

  // ---- Copying a control to the other modules of the group ----
  const controlSelector = 'input, select';
  function controlsOf(card, selector) {
    return Array.from(card.querySelectorAll(selector)).filter(el =>
      !el.closest('.node-header') && el.type !== 'file' && !el.classList.contains('module-rename-input'));
  }

  function counterpart(el, srcId, srcCard, tgtId, tgtCard, selector) {
    if (el.id && el.id.endsWith(srcId)) {
      const found = document.getElementById(el.id.slice(0, -srcId.length) + tgtId);
      if (found && tgtCard.contains(found)) return found;
    }
    const idx = controlsOf(srcCard, selector).indexOf(el);
    if (idx < 0) return null;
    const list = controlsOf(tgtCard, selector);
    const cand = list[idx];
    return cand && cand.tagName === el.tagName && cand.type === el.type ? cand : null;
  }

  function copyValue(el, tgt, eventType) {
    if (el.type === 'checkbox' || el.type === 'radio') {
      if (tgt.checked === el.checked) return;
      tgt.checked = el.checked;
    } else {
      if (tgt.value === el.value && eventType !== 'change') return;
      tgt.value = el.value;
    }
    tgt.dispatchEvent(new Event(eventType, { bubbles: true }));
  }

  function linkedSource(el) {
    const card = el && el.closest && el.closest('.module-card');
    if (!card || el.closest('.node-header')) return null;
    const id = card.id.replace(/^module_card_/, '');
    const a = app();
    const m = a && a.modules[id];
    if (!m || !m.link) return null;
    return { id, card, others: members(m.link, id) };
  }

  function onValueEvent(e) {
    if (syncing) return;
    const el = e.target;
    if (!el || !el.matches || !el.matches(controlSelector) || el.type === 'file') return;
    const src = linkedSource(el);
    if (!src || !src.others.length) return;
    syncing = true;
    try {
      src.others.forEach(tid => {
        const tcard = cardOf(tid);
        const tgt = tcard && counterpart(el, src.id, src.card, tid, tcard, controlSelector);
        if (tgt) copyValue(el, tgt, e.type);
      });
    } finally {
      syncing = false;
    }
  }

  // Switches and button rows: a button whose "active" look now differs from its twin is pressed there too.
  // Buttons that do not change their look (Load, Clear ...) are never copied.
  function onClick(e) {
    if (syncing) return;
    const btn = e.target && e.target.closest && e.target.closest('button');
    if (!btn) return;
    const src = linkedSource(btn);
    if (!src || !src.others.length) return;
    syncing = true;
    try {
      src.others.forEach(tid => {
        const tcard = cardOf(tid);
        const tgt = tcard && counterpart(btn, src.id, src.card, tid, tcard, 'button');
        if (tgt && tgt.classList.contains('active') !== btn.classList.contains('active')) tgt.click();
      });
    } finally {
      syncing = false;
    }
  }

  document.addEventListener('input', onValueEvent);
  document.addEventListener('change', onValueEvent);
  document.addEventListener('click', onClick);

  // Copies every control of one module to another (when a group is formed)
  function copyAll(srcId, tgtId) {
    const srcCard = cardOf(srcId);
    const tgtCard = cardOf(tgtId);
    if (!srcCard || !tgtCard) return;
    syncing = true;
    try {
      controlsOf(srcCard, controlSelector).forEach(el => {
        const tgt = counterpart(el, srcId, srcCard, tgtId, tgtCard, controlSelector);
        if (!tgt) return;
        copyValue(el, tgt, el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input');
      });
      controlsOf(srcCard, 'button').forEach(btn => {
        if (!btn.classList.contains('module-toggle') && !btn.classList.contains('active')) return;
        const tgt = counterpart(btn, srcId, srcCard, tgtId, tgtCard, 'button');
        if (tgt && tgt.classList.contains('active') !== btn.classList.contains('active')) tgt.click();
      });
    } finally {
      syncing = false;
    }
  }

  // ---- The "Link N modules" / "Unlink N modules" button (shown with 2+ selected modules of one type) ----
  function selection() {
    const a = app();
    if (!a) return [];
    return Array.from(a.selectedNodeIds).filter(id => a.modules[id]);
  }

  function selectionInfo() {
    const a = app();
    const ids = selection();
    if (ids.length < 2) return null;
    const type = a.modules[ids[0]].type;
    if (ids.some(id => a.modules[id].type !== type)) return null;
    const letter = a.modules[ids[0]].link;
    const unlink = !!letter && ids.every(id => a.modules[id].link === letter);
    return { ids, unlink, letter };
  }

  function updateButton() {
    let btn = document.getElementById('link-selected-btn');
    if (!btn) return;
    if (!btn.dataset.wired) {
      btn.dataset.wired = '1';
      btn.addEventListener('click', () => {
        const info = selectionInfo();
        if (info) (info.unlink ? unlinkIds : linkIds)(info.ids);
        updateButton();
      });
    }
    const info = selectionInfo();
    btn.style.display = info ? 'block' : 'none';
    if (info) btn.textContent = `${info.unlink ? 'Unlink' : 'Link'} ${info.ids.length} modules`;
  }

  // Forms one group; the settings come from the module touched last (the one drawn on top)
  function linkIds(ids) {
    const a = app();
    const z = id => parseInt((cardOf(id) || {}).style?.zIndex || '0', 10) || 0;
    const source = ids.slice().sort((p, q) => z(q) - z(p))[0];
    const oldLetters = new Set(ids.map(id => a.modules[id].link).filter(Boolean));
    const taken = usedLetters();
    oldLetters.forEach(l => { if (members(l).every(id => ids.includes(id))) taken.delete(l); });
    const keep = a.modules[source].link;
    const letter = keep && !taken.has(keep) ? keep : freeLetter(taken);
    ids.forEach(id => setLink(id, letter));
    oldLetters.forEach(l => { if (l !== letter) tidy(l); });
    ids.forEach(id => { if (id !== source) copyAll(source, id); });
    a.showNotification(`Linked: moving a control on one of these ${ids.length} modules now moves all of them.`,
      `מקושרים: הזזת כפתור באחד מ-${ids.length} המודולים מזיזה את כולם.`);
    a.scheduleHistoryCapture();
  }

  function unlinkIds(ids) {
    const a = app();
    const letters = new Set(ids.map(id => a.modules[id].link).filter(Boolean));
    ids.forEach(id => setLink(id, ''));
    letters.forEach(tidy);
    a.showNotification('Unlinked: each module has its own controls again.', 'הקישור בוטל: לכל מודול שוב כפתורים משלו.');
    a.scheduleHistoryCapture();
  }

  // Called by app.js when a module is deleted (its group may be left with one member)
  function onDelete(id, letter) {
    if (letter) tidy(letter);
  }

  // Patches added next to the canvas (presets from the manual) get group letters not already in use
  function remapLetters(patchModules) {
    const map = {};
    const taken = usedLetters();
    (patchModules || []).forEach(m => {
      if (!m.link || map[m.link]) return;
      const l = freeLetter(taken);
      taken.add(l);
      map[m.link] = l;
    });
    return map;
  }

  window.moduleLinks = { setLink, drawTag, updateButton, onDelete, remapLetters, linkIds, unlinkIds, colorFor };
})();
