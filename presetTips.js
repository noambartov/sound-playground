// presetTips.js - a small tips panel at the bottom of the screen while a preset plays ("Try moving ... to get ..."),
// and whenever the Tooltips button is switched on (then with the canvas tips, after the last preset's tips if one is
// still on the canvas). Switching Tooltips off hides it, and while Tooltips is off presets open no tips.
// Tips come from helpData: playTips[preset] when written, else the recipe's steps, else the module's controls and tips.
// After the preset's own tips come general canvas tips (moving around, zoom, selecting, cables, menus, the guide),
// worded for touch or mouse. A pulsing ring marks what the current tip talks about (window.playTipTargets, CANVAS_TIPS;
// a preset tip without a written target points at the first control on the canvas its text names, autoTarget()).
// English by default; a button switches to Hebrew (shared with the empty-canvas text, localStorage 'sp_intro_lang').
(function () {
  'use strict';

  const LANG_KEY = 'sp_intro_lang';
  const UI = {
    en: { count: (i, n) => `Tip ${i} of ${n}`, next: 'Next tip', lang: 'עברית', close: 'Close tips',
      nextLesson: (n, title) => `That's the lesson. Next up, lesson ${n}: ${title}.`, loadNext: n => `Start lesson ${n}`,
      allDone: 'You finished all six lessons. Open the guide and try the Recipes, from Beginner up.', openGuide: 'Open the guide' },
    he: { count: (i, n) => `טיפ ${i} מתוך ${n}`, next: 'לטיפ הבא', lang: 'English', close: 'סגירת הטיפים',
      nextLesson: (n, title) => `סיימתם את השיעור. הבא בתור, שיעור ${n}: ${title}.`, loadNext: n => `לשיעור ${n}`,
      allDone: 'סיימתם את כל ששת השיעורים. פתחו את ספר העזרה ונסו את המתכונים, מהקלים לקשים.', openGuide: 'פתיחת ספר העזרה' }
  };

  // target: a CSS selector on the page, or 'module|Label' (the control labelled Label on the first module of that type),
  // or 'module|.selector' (the parent of the first match inside that module's card)
  const CANVAS_TIPS = [
    { target: null,
      touch: { en: 'The canvas has no edges: move around it with two fingers.', he: 'לקנבס אין קצוות: זזים בו עם שתי אצבעות.' },
      mouse: { en: 'The canvas has no edges: hold Space or Cmd and drag to move around it.', he: 'לקנבס אין קצוות: מחזיקים Space או Cmd וגוררים כדי לזוז בו.' } },
    { target: '.zoom-controls',
      touch: { en: 'Pinch with two fingers to zoom in and out, or use - and + in the top bar.', he: 'צובטים בשתי אצבעות כדי להתקרב ולהתרחק, או משתמשים ב- - ו-+ בסרגל העליון.' },
      mouse: { en: 'Zoom with the mouse wheel, or with - and + in the top bar.', he: 'מתקרבים ומתרחקים בגלגלת העכבר, או ב- - ו-+ בסרגל העליון.' } },
    { target: null,
      touch: { en: 'Drag a finger across empty space to select several modules, then drag one of them to move them all together.', he: 'גוררים אצבע על שטח ריק כדי לבחור כמה מודולים, ואז גוררים אחד מהם כדי להזיז את כולם יחד.' },
      mouse: { en: 'Drag across empty space to select several modules, then drag one of them to move them all together. Shift adds to the selection.', he: 'גוררים על שטח ריק כדי לבחור כמה מודולים, ואז גוררים אחד מהם כדי להזיז את כולם יחד. Shift מוסיף לבחירה.' } },
    { target: '.port.connected',
      touch: { en: 'To connect modules, drag from one jack to another. Tap a cable to select it, and tap it again to delete it.', he: 'כדי לחבר מודולים, גוררים משקע לשקע. נגיעה בכבל מסמנת אותו, ונגיעה נוספת מוחקת אותו.' },
      mouse: { en: 'To connect modules, drag from one jack to another. Click a cable to select it, and click it again to delete it.', he: 'כדי לחבר מודולים, גוררים משקע לשקע. לחיצה על כבל מסמנת אותו, ולחיצה נוספת מוחקת אותו.' } },
    { target: '.toolbar .panel-drag-handle',
      touch: { en: 'You can move the menus: drag the Modules menu by its title, and the top bar by Move.', he: 'אפשר להזיז את התפריטים: גוררים את תפריט Modules מהכותרת שלו, ואת הסרגל העליון מ-Move.' },
      mouse: { en: 'You can move the menus: drag the Modules menu by its title, and the top bar by Move. Double-click puts them back.', he: 'אפשר להזיז את התפריטים: גוררים את תפריט Modules מהכותרת שלו, ואת הסרגל העליון מ-Move. לחיצה כפולה מחזירה אותם למקום.' } },
    { target: '#help-btn',
      touch: { en: 'For anything else, open the guide with ?. With Tooltips on, touching a jack explains it.', he: 'לכל השאר, פותחים את ספר העזרה ב-?. כש-Tooltips דלוק, נגיעה בשקע מסבירה אותו.' },
      mouse: { en: 'For anything else, open the guide with ?. With Tooltips on, resting the mouse on a jack explains it.', he: 'לכל השאר, פותחים את ספר העזרה ב-?. כש-Tooltips דלוק, עמידה עם העכבר על שקע מסבירה אותו.' } }
  ];

  function isTouch() {
    return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  }

  let panel = null;
  let ring = null;
  let ringTarget = null;
  let presetKey = null;   // the last preset loaded, kept until the canvas is emptied
  let presetIds = null;   // the module ids that preset added (see tipModules)
  let open = false;
  let index = 0;

  function getLang() {
    try { return localStorage.getItem(LANG_KEY) === 'he' ? 'he' : 'en'; } catch (e) { return 'en'; }
  }

  function setLang(lang) {
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    render();
  }

  // Each tip is { text, target }
  function tipsFor(key, lang) {
    const data = window.helpData && window.helpData[lang];
    if (!data) return [];
    let own = [];
    let targets = [];
    if (data.playTips && data.playTips[key]) {
      own = data.playTips[key];
      targets = (window.playTipTargets && window.playTipTargets[key]) || [];
    } else {
      const recipe = (data.recipes || []).find(r => r.preset === key);
      const mod = (data.modules || []).find(m => m.preset === key);
      if (recipe && recipe.steps && recipe.steps.length) own = recipe.steps;
      else if (mod) own = [...(mod.controls || []), ...(mod.tips || [])];
    }
    // A Learn-tab lesson ends with a tip that leads to the next lesson (help.js window.helpBook.loadLesson),
    // or after the last lesson to the guide
    const lessons = data.lessons || [];
    const li = lessons.findIndex(l => l.preset === key);
    const lessonEnd = [];
    if (li >= 0) {
      const ui = UI[lang];
      const next = lessons[li + 1];
      lessonEnd.push(next
        ? { text: ui.nextLesson(li + 2, next.title), target: null,
            action: { label: ui.loadNext(li + 2), run: () => window.helpBook && window.helpBook.loadLesson(next.preset) } }
        : { text: ui.allDone, target: '#help-btn',
            action: { label: ui.openGuide, run: () => { const b = document.getElementById('help-btn'); if (b) b.click(); } } });
    }
    const kind = isTouch() ? 'touch' : 'mouse';
    return [
      ...own.map((text, i) => ({ text, target: targets[i] || null, auto: true })),
      ...lessonEnd,
      ...CANVAS_TIPS.map(t => ({ text: t[kind][lang], target: t.target }))
    ];
  }

  // The modules the tips may point at: the ones the current preset added (presets are added next to what is
  // already on the canvas, so another module of the same type may stand alone nearby), else every module
  function tipModules() {
    const all = Object.values((window.synthApp && window.synthApp.modules) || {});
    const own = presetIds ? all.filter(m => presetIds.includes(m.id)) : [];
    return own.length ? own : all;
  }

  // Finds the element a tip points at (see CANVAS_TIPS for the target forms)
  function resolveTarget(target) {
    if (!target) return null;
    if (target.indexOf('|') < 0) {
      // e.g. .port.connected: inside the preset's own modules first
      for (const m of tipModules()) { const hit = m.card && m.card.querySelector(target); if (hit) return hit; }
      return document.querySelector(target);
    }
    const [type, what] = target.split('|');
    const m = tipModules().find(x => x.type === type) || Object.values((window.synthApp && window.synthApp.modules) || {}).find(x => x.type === type);
    const card = m && m.card;
    if (!card) return null;
    if (what.charAt(0) === '.') {
      const hit = card.querySelector(what);
      return hit ? hit.parentElement : null;
    }
    const want = what.toLowerCase();
    const label = [...card.querySelectorAll('label, span, div')].find(el => {
      const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim().toLowerCase();
      return own.replace(/:$/, '') === want;
    });
    let box = label;
    while (box && box !== card && !box.querySelector('input, select')) box = box.parentElement;
    return box && box !== card ? box : label;
  }

  // Every control on the canvas that has a visible name: { name, box, card, module words }
  // box = the smallest group around the name that holds its slider / menu / button
  function canvasControls() {
    const out = [];
    tipModules().forEach(m => {
      const card = m.card;
      if (!card) return;
      const header = card.querySelector('.node-header');
      const words = ((header ? header.textContent : '') + ' ' + m.type).toLowerCase();
      card.querySelectorAll('label, span, div, button, strong, b').forEach(el => {
        if (el.closest('.port, .ports-row, .node-header')) return;
        let name = el.tagName === 'BUTTON' ? el.textContent
          : [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('');
        name = name.split(':')[0].replace(/\s+/g, ' ').trim();
        if (name.length < 2 || name.length > 28 || !/[a-z]/i.test(name) || /^\d/.test(name)) return;
        let box = el;
        while (box && box !== card && !(box.matches('button, select') || box.querySelector('input, select, button'))) box = box.parentElement;
        if (!box || box === card || !box.getBoundingClientRect().width) return;   // hidden controls can't be ringed
        out.push({ name: name.toLowerCase(), box, words });
      });
    });
    return out;
  }

  // The jacks on the canvas: { name (as printed, upper case), box (the jack with its label), words }
  function canvasJacks() {
    const out = [];
    tipModules().forEach(m => {
      const card = m.card;
      if (!card) return;
      const header = card.querySelector('.node-header');
      const words = ((header ? header.textContent : '') + ' ' + m.type).toLowerCase();
      card.querySelectorAll('.port').forEach(port => {
        const box = port.parentElement;
        const name = (box ? box.textContent : '').replace(/\s+/g, ' ').trim();
        if (name.length >= 2 && name.length <= 16 && name === name.toUpperCase()) out.push({ name, box, words });
      });
    });
    return out;
  }

  // The control or jack a tip's text talks about, when the tip has no written target (or it is not on the canvas):
  // the name that appears first in the text (whole word; a longer name wins at the same spot, e.g. Master Volume
  // over Volume; on the module the text names when several modules have it). Control names match in any case,
  // jack names only as printed in capitals (IN, CV, CUT MOD), so ordinary words like "in" never match.
  // Nothing named: the module the text names, else the module the preset is about (its help-book page, or demo-<type>).
  function autoTarget(text, key) {
    const lower = ' ' + text.toLowerCase() + ' ';
    const raw = ' ' + text + ' ';
    const esc = n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let best = null;
    const consider = (c, hay, name) => {
      const hit = new RegExp('(^|[^A-Za-z0-9])' + esc(name) + '(?![A-Za-z0-9])').exec(hay);
      if (!hit) return;
      const pos = hit.index + hit[1].length;
      const named = c.words.split(/[^a-z0-9]+/).some(w => w.length > 2 && lower.includes(w)) ? 1 : 0;
      const score = [pos, -name.length, -named];
      if (!best || score[0] < best.score[0] || (score[0] === best.score[0] && (score[1] < best.score[1] || (score[1] === best.score[1] && score[2] < best.score[2]))))
        best = { score, box: c.box, name };
    };
    canvasControls().forEach(c => consider(c, lower, c.name));
    canvasJacks().forEach(c => consider(c, raw, c.name));
    if (best) return best;
    const mods = tipModules().filter(m => m.card);
    const named = mods.find(m => {
      const header = m.card.querySelector('.node-header');
      const title = (header ? header.textContent : '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3);
      return [m.type, ...title].some(w => lower.includes(w.toLowerCase()));
    });
    const page = window.helpData && window.helpData.en && (window.helpData.en.modules || []).find(p => p.preset === key);
    const about = page ? page.type : (key || '').replace(/^demo-/, '');
    const plain = t => t.toLowerCase().replace(/[^a-z]/g, '');
    const own = mods.find(m => plain(m.type) === plain(about));
    const m = named || own;
    return m ? { box: m.card, name: m.type } : null;
  }

  // A pulsing ring around the target, kept in place every frame (modules move, the view zooms)
  function placeRing() {
    if (!ring) return;
    const el = ringTarget && document.contains(ringTarget) ? ringTarget : null;
    const r = el ? el.getBoundingClientRect() : null;
    if (!r || !r.width) { ring.hidden = true; }
    else {
      ring.hidden = false;
      const pad = 6;
      ring.style.left = (r.left - pad) + 'px';
      ring.style.top = (r.top - pad) + 'px';
      ring.style.width = (r.width + pad * 2) + 'px';
      ring.style.height = (r.height + pad * 2) + 'px';
    }
    if (ringTarget) requestAnimationFrame(placeRing);
  }

  function pointAt(target, text) {
    if (!ring) {
      ring = document.createElement('div');
      ring.className = 'tip-ring';
      ring.hidden = true;
      document.body.appendChild(ring);
    }
    const wasRunning = !!ringTarget;
    let label = target;
    ringTarget = target && resolveTarget(target);
    if (!ringTarget && text) {
      const auto = autoTarget(text, presetKey);
      ringTarget = auto && auto.box;
      label = auto && auto.name;
    }
    ring.dataset.label = ringTarget ? (label || '') : '';
    if (!ringTarget) { ring.hidden = true; return; }
    if (!wasRunning) requestAnimationFrame(placeRing);
  }

  function tooltipsOn() {
    return !document.body.classList.contains('tooltips-disabled');
  }

  function render() {
    if (!panel || !open) return;
    const lang = getLang();
    const tips = tipsFor(presetKey, lang);
    if (!tips.length) { hide(); return; }
    index = index % tips.length;
    const ui = UI[lang];
    panel.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
    panel.querySelector('.preset-tips-count').textContent = ui.count(index + 1, tips.length);
    panel.querySelector('.preset-tips-text').textContent = tips[index].text;
    pointAt(tips[index].target, tips[index].auto ? tips[index].text : null);
    const action = tips[index].action;
    const actionBtn = panel.querySelector('.preset-tips-action');
    actionBtn.hidden = !action;
    actionBtn.textContent = action ? action.label : '';
    actionBtn.onclick = action ? action.run : null;
    panel.querySelector('.preset-tips-next').textContent = ui.next;
    panel.querySelector('.preset-tips-next').hidden = tips.length < 2;
    panel.querySelector('.preset-tips-lang').textContent = ui.lang;
    panel.querySelector('.preset-tips-close').setAttribute('aria-label', ui.close);
    panel.hidden = false;
    document.body.classList.add('preset-tips-open');
    document.body.style.setProperty('--preset-tips-h', panel.offsetHeight + 'px');
  }

  function hide() {
    if (panel) panel.hidden = true;
    open = false;
    ringTarget = null;
    if (ring) ring.hidden = true;
    document.body.classList.remove('preset-tips-open');
  }

  function build() {
    panel = document.createElement('div');
    panel.id = 'preset-tips';
    panel.className = 'preset-tips notice-panel';
    panel.setAttribute('role', 'status');
    panel.hidden = true;
    panel.innerHTML = `
      <div class="preset-tips-head">
        <span class="preset-tips-count"></span>
        <button type="button" class="preset-tips-lang"></button>
        <button type="button" class="preset-tips-close">&times;</button>
      </div>
      <p class="preset-tips-text"></p>
      <div class="preset-tips-buttons">
        <button type="button" class="tool-btn preset-tips-action" hidden></button>
        <button type="button" class="tool-btn preset-tips-next"></button>
      </div>`;
    panel.querySelector('.preset-tips-next').addEventListener('click', () => { index++; render(); });
    panel.querySelector('.preset-tips-lang').addEventListener('click', () => setLang(getLang() === 'he' ? 'en' : 'he'));
    panel.querySelector('.preset-tips-close').addEventListener('click', hide);
    // Typing on the panel must not play the Keyboard module
    panel.addEventListener('keydown', e => e.stopPropagation());
    document.body.appendChild(panel);
    const layer = document.getElementById('modules-layer');
    if (layer) new MutationObserver(() => {
      if (window.synthApp && Object.keys(window.synthApp.modules || {}).length === 0) { presetKey = null; presetIds = null; hide(); }
    }).observe(layer, { childList: true });
  }

  // Called after a preset is loaded (help.js, onboarding.js); key = null shows the canvas tips only.
  // ids = the module ids the preset added (loadPatchData's return), so rings land on the preset's own modules
  function show(key, ids) {
    if (!panel) build();
    if (key) { presetKey = key; presetIds = Array.isArray(ids) && ids.length ? ids.slice() : null; }
    if (!tooltipsOn()) return;
    open = true;
    index = 0;
    render();
    setTimeout(render, 400);
  }

  // The Tooltips button (app.js toggleTooltips) switches the panel on and off with the jack hints
  function onTooltips(enabled) {
    if (enabled) show(presetKey);
    else hide();
  }

  window.presetTips = { show, hide, onTooltips };
})();
