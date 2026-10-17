// help.js - the manual ("book"): five tabs built from helpData.js, jack tables from portGuide.js.
// Tabs: Learn (intro + graded lessons + good to know), Recipes (presets by level), Modules (list + detail panel),
// Troubleshooting, Shortcuts.
// The search box filters cards across all tabs. English by default; Hebrew is optional (RTL).
(function () {
  let currentLang = 'en';
  let activeTab = 'start';
  let activeModule = null;
  let query = '';
  const DONE_KEY = 'sp_lessons_done';

  const GROUP_ORDER = ['sources', 'controllers', 'processors', 'modulation', 'output'];
  // Sidebar group title -> manual group, for modules that have no manual entry yet
  const SIDEBAR_GROUPS = {
    'sound sources': 'sources', 'controllers & sequencing': 'controllers', 'processors & effects': 'processors',
    'modulation': 'modulation', 'output & monitoring': 'output'
  };

  function injectModalStyles() {
    if (document.getElementById('help-custom-css')) return;
    const style = document.createElement('style');
    style.id = 'help-custom-css';
    style.textContent = `
      #help-modal {
        position: fixed; inset: 0; width: 100vw; height: 100vh;
        background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);
        align-items: center; justify-content: center;
        z-index: 999999; box-sizing: border-box;
      }
      #help-modal .modal-content {
        background: var(--panel-bg); color: var(--text-color);
        border: 1px solid var(--panel-border);
        width: 980px; max-width: 94vw; height: 86vh; max-height: 86vh;
        border-radius: 12px; display: flex; flex-direction: column; overflow: hidden;
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); box-sizing: border-box;
        padding: 20px 22px; font-family: system-ui, -apple-system, sans-serif; position: relative;
      }
      #help-modal[dir="rtl"] { direction: rtl; text-align: right; }
      #help-modal[dir="ltr"] { direction: ltr; text-align: left; }
      #help-modal #help-search-input {
        width: 100%; box-sizing: border-box; padding: 8px 12px; border-radius: 6px; font-size: 14px;
        border: 1px solid var(--btn-border); background: var(--bg-color); color: var(--text-color);
      }
      #help-modal #help-nav-tabs { display: flex; flex-wrap: wrap; gap: 6px; padding: 0; margin: 0; border: none; background: none; }
      #help-modal .book-tab {
        padding: 6px 12px; border-radius: 999px; font-size: 13px; cursor: pointer;
        border: 1px solid var(--btn-border); background: var(--btn-bg); color: var(--text-color);
      }
      #help-modal .book-tab:hover { border-color: var(--btn-hover-border); }
      #help-modal .book-tab.active { background: var(--primary-color); border-color: var(--primary-color); color: #ffffff; font-weight: 600; }
      body.dark-theme #help-modal .book-tab.active { color: #0f172a; }
      #help-modal #help-tab-content {
        flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden;
        padding: 4px 2px; margin-top: 14px; width: 100%; box-sizing: border-box;
        background: none; border: none; color: var(--text-color);
      }
      #help-modal .book-stack { display: flex; flex-direction: column; gap: 14px; }
      #help-modal .book-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
      #help-modal .help-card {
        background: var(--subtle-bg); border: 1px solid var(--panel-border); border-radius: 8px;
        padding: 14px 16px; margin: 0; box-sizing: border-box; color: var(--text-color); box-shadow: none;
      }
      #help-modal .help-card h3, #help-modal .help-card h4 { margin: 0 0 8px; color: var(--text-color); font-size: 15px; }
      #help-modal .help-card p { margin: 0 0 8px; line-height: 1.5; color: var(--text-color); }
      #help-modal .help-list { margin: 0; padding-inline-start: 20px; line-height: 1.55; }
      #help-modal .help-list li { margin-bottom: 4px; }
      #help-modal .book-sub { margin: 12px 0 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted-text); }
      #help-modal .book-summary { font-size: 15px; line-height: 1.5; margin: 0 0 10px; }
      #help-modal .book-note { border-inline-start: 3px solid var(--primary-color); padding: 6px 10px; margin: 0 0 10px; color: var(--muted-text); }
      #help-modal kbd {
        display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 0.85em; font-family: inherit;
        border: 1px solid var(--btn-border); background: var(--btn-bg); color: var(--text-color);
      }
      #help-modal .tag { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 0.78em; font-weight: 600; white-space: nowrap; }
      #help-modal .tag-audio { background: #dcfce7; color: #166534; }
      #help-modal .tag-gate { background: #fef9c3; color: #854d0e; }
      #help-modal .tag-cv { background: #dbeafe; color: #1e40af; }
      #help-modal .chip-demo { display: inline-block; padding: 0 5px; border-radius: 4px; font-size: 0.78em; font-weight: 700; }
      #help-modal .chip-in { background: var(--panel-bg); color: var(--text-color); border: 1px solid var(--muted-text); }
      #help-modal .chip-out { background: var(--primary-color); color: #ffffff; border: 1px solid var(--primary-color); }
      body.dark-theme #help-modal .chip-out { color: #0f172a; }

      /* Modules tab: list on the side, detail panel */
      #help-modal .book-modules { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 16px; align-items: start; }
      #help-modal .book-mod-list { display: flex; flex-direction: column; gap: 2px; position: sticky; top: 0; }
      #help-modal .book-mod-group { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted-text); margin: 10px 0 4px; }
      #help-modal .book-mod-group:first-child { margin-top: 0; }
      #help-modal .book-mod-btn {
        text-align: start; padding: 6px 10px; border-radius: 6px; font-size: 13px; cursor: pointer;
        border: 1px solid transparent; background: none; color: var(--text-color);
      }
      #help-modal .book-mod-btn:hover { background: var(--subtle-bg); }
      #help-modal .book-mod-btn.active { background: var(--subtle-bg); border-color: var(--primary-color); font-weight: 600; }
      #help-modal .book-mod-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
      #help-modal .book-mod-head h3 { margin: 0; font-size: 18px; }
      #help-modal .book-ports { width: 100%; border-collapse: collapse; font-size: 13px; }
      #help-modal .book-ports td { padding: 6px 6px; border-top: 1px solid var(--panel-border); vertical-align: top; line-height: 1.45; }
      #help-modal .book-ports td.book-port-name { white-space: nowrap; font-weight: 700; width: 1%; }
      #help-modal .book-ports .book-port-where { color: var(--muted-text); font-size: 12px; margin-top: 2px; }

      #help-modal .preset-btn {
        padding: 6px 12px; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 600;
        border: 1px solid var(--primary-color); background: var(--primary-color); color: #ffffff;
      }
      body.dark-theme #help-modal .preset-btn { color: #0f172a; }
      #help-modal .book-link-btn {
        padding: 5px 10px; border-radius: 6px; font-size: 12px; cursor: pointer;
        border: 1px solid var(--btn-border); background: var(--btn-bg); color: var(--text-color);
      }
      #help-modal .book-recipe .preset-btn { margin-top: 10px; }
      #help-modal .book-result-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted-text); margin-bottom: 4px; }

      /* Learn tab: numbered lessons */
      #help-modal .book-lessons-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; }
      #help-modal .book-lessons-head h3 { margin: 0; font-size: 18px; }
      #help-modal .book-progress { font-size: 13px; color: var(--muted-text); }
      #help-modal .book-lesson { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 12px; align-items: start; }
      #help-modal .book-lesson-num {
        width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 14px; border: 1px solid var(--panel-border); background: var(--panel-bg); color: var(--text-color);
      }
      #help-modal .book-lesson.is-done .book-lesson-num { border-color: var(--primary-color); color: var(--primary-color); }
      #help-modal .book-lesson-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
      #help-modal .book-lesson-title h4 { margin: 0; }
      #help-modal .book-chip {
        display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 600;
        border: 1px solid var(--panel-border); color: var(--muted-text); background: var(--panel-bg);
      }
      #help-modal .book-lesson .preset-btn { margin-top: 10px; }
      #help-modal .book-recipe-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
      #help-modal .book-recipe-head h4 { margin: 0; }
      #help-modal .book-section-title { margin: 8px 0 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted-text); }

      @media (max-width: 720px) {
        #help-modal .modal-content { padding: 14px; height: 92vh; max-height: 92vh; }
        #help-modal .book-grid { grid-template-columns: 1fr; }
        #help-modal .book-modules { grid-template-columns: 1fr; }
        #help-modal .book-mod-list { position: static; flex-direction: row; flex-wrap: wrap; gap: 4px; }
        #help-modal .book-mod-group { display: none; }
        #help-modal .book-mod-btn { border-color: var(--panel-border); }
      }
    `;
    document.head.appendChild(style);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function lang() {
    return (window.helpData && window.helpData[currentLang]) || null;
  }

  // Every module in the manual: the written entries plus any Sidebar module that has none yet,
  // listed in its Sidebar group with its jacks (every module should get a written entry, see architecture.md)
  function moduleEntries(data) {
    const list = (data.modules || []).slice();
    const known = new Set(list.map(m => m.type));
    document.querySelectorAll('.add-module-btn[data-type]').forEach(btn => {
      const type = btn.dataset.type;
      if (known.has(type)) return;
      known.add(type);
      const titleEl = btn.closest('.sidebar-group') && btn.closest('.sidebar-group').querySelector('.sidebar-group-title');
      const group = SIDEBAR_GROUPS[((titleEl && titleEl.textContent) || '').trim().toLowerCase()] || 'controllers';
      list.push({ type, group, name: btn.textContent.trim() || type, controls: [], tips: [] });
    });
    return list;
  }

  // Jacks of a module type from portGuide (same source as the jack hints); Hebrew text from helpData.he.ports
  function portsFor(type, dir) {
    const pg = window.portGuide;
    if (!pg || !pg.GUIDE) return [];
    const prefix = `${type}:${dir}:`;
    const he = currentLang === 'he' && window.helpData.he ? (window.helpData.he.ports || {}) : {};
    const keys = Object.keys(pg.GUIDE).filter(k => k.indexOf(prefix) === 0);
    const names = keys.map(k => pg.GUIDE[k].name || k.slice(prefix.length).toUpperCase());
    return keys.map((k, i) => {
      const g = pg.GUIDE[k];
      const tr = he[k] || {};
      // Several jacks with the same label (e.g. a Drum Machine IN per row): show the jack's title instead
      const repeated = names.indexOf(names[i]) !== names.lastIndexOf(names[i]);
      return {
        name: repeated && g.title ? g.title : names[i],
        signal: g.signal || 'CV',
        text: tr.text || g.text || '',
        where: tr.where || (dir === 'in' ? g.from : g.to) || ''
      };
    });
  }

  function portsTable(ports, ui, dir) {
    if (!ports.length) return `<p style="color: var(--muted-text); margin: 0;">${esc(ui.none)}</p>`;
    const whereLabel = dir === 'in' ? ui.from : ui.to;
    return `<table class="book-ports">${ports.map(p => `
      <tr>
        <td class="book-port-name">${esc(p.name)}</td>
        <td><span class="tag tag-${esc(p.signal.toLowerCase())}">${esc(p.signal)}</span></td>
        <td>${esc(p.text)}${p.where ? `<div class="book-port-where">${esc(whereLabel)}: ${esc(p.where)}</div>` : ''}</td>
      </tr>`).join('')}</table>`;
  }

  function hasPreset(key) {
    return !!(key && window.presetData && window.presetData[key]);
  }

  function moduleDetailHTML(m, ui) {
    const list = items => `<ul class="help-list">${items.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
    let html = `<div class="help-card book-mod-detail">
      <div class="book-mod-head"><h3>${esc(m.name)}</h3>
        ${hasPreset(m.preset) ? `<button class="preset-btn" data-preset="${esc(m.preset)}">${esc(ui.tryIt)}</button>` : ''}
      </div>`;
    if (m.summary) html += `<p class="book-summary">${esc(m.summary)}</p>`;
    if (m.controls && m.controls.length) html += `<div class="book-sub">${esc(ui.controls)}</div>${list(m.controls)}`;
    html += `<div class="book-sub">${esc(ui.inputs)}</div>${portsTable(portsFor(m.type, 'in'), ui, 'in')}`;
    html += `<div class="book-sub">${esc(ui.outputs)}</div>${portsTable(portsFor(m.type, 'out'), ui, 'out')}`;
    if (m.tips && m.tips.length) html += `<div class="book-sub">${esc(ui.tips)}</div>${list(m.tips)}`;
    return html + `</div>`;
  }

  function modulesTabHTML(data) {
    const ui = data.ui;
    const mods = moduleEntries(data);
    if (!mods.find(m => m.type === activeModule)) activeModule = mods.length ? mods[0].type : null;
    let listHTML = '';
    GROUP_ORDER.forEach(g => {
      const inGroup = mods.filter(m => (GROUP_ORDER.includes(m.group) ? m.group : 'controllers') === g);
      if (!inGroup.length) return;
      listHTML += `<div class="book-mod-group">${esc(ui.groups[g] || g)}</div>`;
      listHTML += inGroup.map(m => `<button class="book-mod-btn${m.type === activeModule ? ' active' : ''}" data-module="${esc(m.type)}">${esc(m.name)}</button>`).join('');
    });
    const current = mods.find(m => m.type === activeModule);
    return `<div class="book-modules">
      <nav class="book-mod-list">${listHTML}</nav>
      <div>${current ? moduleDetailHTML(current, ui) : ''}</div>
    </div>`;
  }

  function lessonsDone() {
    try { return JSON.parse(localStorage.getItem(DONE_KEY) || '[]'); } catch (e) { return []; }
  }

  function markLessonDone(key) {
    const done = lessonsDone();
    if (done.includes(key)) return;
    done.push(key);
    try { localStorage.setItem(DONE_KEY, JSON.stringify(done)); } catch (e) {}
  }

  function lessonCardHTML(ls, i, ui, done) {
    const isDone = done.includes(ls.preset);
    return `<div class="help-card book-lesson${isDone ? ' is-done' : ''}">
      <div class="book-lesson-num">${i + 1}</div>
      <div>
        <div class="book-lesson-title"><h4>${esc(ui.lesson)} ${i + 1}: ${esc(ls.title)}</h4>${isDone ? `<span class="book-chip">${esc(ui.done)}</span>` : ''}</div>
        <p>${esc(ls.learn)}</p>
        <div class="book-sub">${esc(ui.tryThis)}</div>
        <ol class="help-list">${(ls.steps || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol>
        ${hasPreset(ls.preset) ? `<button class="preset-btn" data-preset="${esc(ls.preset)}" data-lesson="1">${esc(ui.loadLesson)}</button>` : ''}
      </div>
    </div>`;
  }

  // Learn tab: what a modular synth is, the numbered lessons, then the reference cards (sections.start)
  function learnTabHTML(data) {
    const ui = data.ui;
    const lessons = data.lessons || [];
    const done = lessonsDone();
    const count = lessons.filter(ls => done.includes(ls.preset)).length;
    return `<div class="book-stack">
      ${data.sections.intro || ''}
      <div class="book-lessons-head"><h3>${esc(ui.lessonsTitle)}</h3><span class="book-progress">${esc(ui.progress(count, lessons.length))}</span></div>
      <p style="margin:0; color: var(--muted-text); line-height: 1.5;">${esc(ui.lessonsIntro)}</p>
      ${lessons.map((ls, i) => lessonCardHTML(ls, i, ui, done)).join('')}
      <div class="help-card"><h4>${esc(ui.whatNext)}</h4><p>${esc(ui.whatNextText)}</p></div>
      <div class="book-section-title">${esc(ui.goodToKnow)}</div>
      ${data.sections.start || ''}
    </div>`;
  }

  function recipeCardHTML(r, ui) {
    const level = (ui.levels || [])[r.level] || '';
    return `<div class="help-card book-recipe">
      <div class="book-recipe-head"><h4>${esc(r.title)}</h4>${level ? `<span class="book-chip">${esc(level)}</span>` : ''}</div>
      <div class="book-sub">${esc(ui.youLearn)}</div>
      <p>${esc(r.learn)}</p>
      <div class="book-sub">${esc(ui.howToPlay)}</div>
      <ol class="help-list">${(r.steps || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      ${hasPreset(r.preset) ? `<button class="preset-btn" data-preset="${esc(r.preset)}">${esc(ui.loadRecipe)}</button>` : ''}
    </div>`;
  }

  function recipesTabHTML(data) {
    // Easy to hard; recipes without a level go last, otherwise the written order stays
    const sorted = (data.recipes || []).map((r, i) => ({ r, i })).sort((a, b) => ((a.r.level || 9) - (b.r.level || 9)) || (a.i - b.i)).map(x => x.r);
    return `<div class="book-grid">${sorted.map(r => recipeCardHTML(r, data.ui)).join('')}</div>`;
  }

  function textOf(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return (d.textContent || '').toLowerCase();
  }

  // Search: every card of every tab, kept when its text contains the query
  function searchHTML(data) {
    const q = query.toLowerCase();
    const ui = data.ui;
    const results = [];
    // The intro cards belong to the Learn tab (key 'start')
    [['intro', 'start'], ['start', 'start'], ['trouble', 'trouble'], ['shortcuts', 'shortcuts']].forEach(([sec, tab]) => {
      const holder = document.createElement('div');
      holder.innerHTML = data.sections[sec] || '';
      holder.querySelectorAll('.help-card').forEach(card => {
        if ((card.textContent || '').toLowerCase().includes(q)) {
          results.push(`<div><div class="book-result-label">${esc(data.tabs[tab])}</div>${card.outerHTML}</div>`);
        }
      });
    });
    const done = lessonsDone();
    (data.lessons || []).forEach((ls, i) => {
      const card = lessonCardHTML(ls, i, ui, done);
      if (textOf(card).includes(q)) results.push(`<div><div class="book-result-label">${esc(data.tabs.start)}</div>${card}</div>`);
    });
    moduleEntries(data).forEach(m => {
      const detail = moduleDetailHTML(m, ui);
      if (!textOf(detail).includes(q)) return;
      results.push(`<div><div class="book-result-label">${esc(data.tabs.modules)}</div>
        <div class="help-card"><div class="book-mod-head"><h4 style="margin:0;">${esc(m.name)}</h4>
        <button class="book-link-btn" data-open-module="${esc(m.type)}">${esc(data.tabs.modules)}</button></div>
        ${m.summary ? `<p style="margin:8px 0 0;">${esc(m.summary)}</p>` : ''}</div></div>`);
    });
    (data.recipes || []).forEach(r => {
      const card = recipeCardHTML(r, ui);
      if (textOf(card).includes(q)) results.push(`<div><div class="book-result-label">${esc(data.tabs.recipes)}</div>${card}</div>`);
    });
    return results.length ? `<div class="book-stack">${results.join('')}</div>` : `<p style="color: var(--muted-text);">${esc(ui.noResults)}</p>`;
  }

  function renderHelpUI() {
    injectModalStyles();
    const data = lang();
    if (!data) return;
    const modal = document.getElementById('help-modal');
    if (modal) modal.setAttribute('dir', currentLang === 'he' ? 'rtl' : 'ltr');
    const titleEl = document.getElementById('help-modal-title');
    const searchEl = document.getElementById('help-search-input');
    if (titleEl) titleEl.textContent = data.title;
    if (searchEl) searchEl.placeholder = data.searchPlaceholder;

    const tabsContainer = document.getElementById('help-nav-tabs');
    if (tabsContainer) {
      tabsContainer.innerHTML = '';
      Object.keys(data.tabs).forEach(tabKey => {
        const tabBtn = document.createElement('button');
        tabBtn.className = `book-tab${!query && activeTab === tabKey ? ' active' : ''}`;
        tabBtn.dataset.tab = tabKey;
        tabBtn.textContent = data.tabs[tabKey];
        tabBtn.onclick = () => {
          activeTab = tabKey;
          clearSearch();
          renderHelpUI();
        };
        tabsContainer.appendChild(tabBtn);
      });
    }

    const contentArea = document.getElementById('help-tab-content');
    if (!contentArea) return;
    let html;
    if (query) html = searchHTML(data);
    else if (activeTab === 'modules') html = modulesTabHTML(data);
    else if (activeTab === 'recipes') html = recipesTabHTML(data);
    else if (activeTab === 'start') html = learnTabHTML(data);
    else html = `<div class="book-stack">${data.sections[activeTab] || ''}</div>`;
    contentArea.innerHTML = html;
    contentArea.scrollTop = 0;
    bindContent(contentArea);
  }

  function clearSearch() {
    query = '';
    const searchEl = document.getElementById('help-search-input');
    if (searchEl) searchEl.value = '';
  }

  function bindContent(container) {
    container.querySelectorAll('.preset-btn[data-preset]').forEach(btn => {
      btn.onclick = () => {
        if (btn.dataset.lesson) markLessonDone(btn.getAttribute('data-preset'));
        loadPreset(btn.getAttribute('data-preset'), !!btn.dataset.lesson);
      };
    });
    container.querySelectorAll('.book-mod-btn[data-module]').forEach(btn => {
      btn.onclick = () => {
        activeModule = btn.dataset.module;
        renderHelpUI();
      };
    });
    container.querySelectorAll('[data-open-module]').forEach(btn => {
      btn.onclick = () => {
        activeModule = btn.dataset.openModule;
        activeTab = 'modules';
        clearSearch();
        renderHelpUI();
      };
    });
  }

  // A preset is added next to the modules already on the canvas (an empty canvas just gets the preset).
  // A lesson (replace) clears the canvas first, behind the app's short audio fade; Undo brings the old canvas back.
  function loadPreset(key, replace) {
    const preset = window.presetData ? window.presetData[key] : null;
    const app = window.synthApp;
    if (!preset || !app || typeof app.loadPatchData !== 'function') return;
    closeModal();
    if (replace && typeof app.withAudioFade === 'function') app.withAudioFade(() => startPreset(key, preset, false));
    else startPreset(key, preset, true);
  }

  function startPreset(key, preset, add) {
    // The app itself shows the "patch added, raise the volume" notice
    const newIds = window.synthApp.loadPatchData(preset, { add }) || [];
    if (window.synthApp.audioCtx && window.synthApp.audioCtx.state === 'suspended') window.synthApp.audioCtx.resume();
    // The preset's Sequencers, Drum Machines and Metronomes (any template module with start()) start right away (its Output volume is still at 0)
    setTimeout(() => {
      Object.values(window.synthApp.modules || {}).forEach(m => {
        if (!m.instance || !newIds.includes(m.id)) return;
        if (m.type === 'sequencer' && !m.instance.isPlaying && typeof m.instance.togglePlay === 'function') m.instance.togglePlay();
        if (m.instance.def && !m.instance.playing && typeof m.instance.start === 'function') m.instance.start();
      });
    }, 300);
    if (window.presetTips) window.presetTips.show(key);
  }

  // Lets the tips panel start the next lesson (presetTips.js, the tip after a lesson's steps)
  window.helpBook = {
    loadLesson(key) {
      markLessonDone(key);
      loadPreset(key, true);
    }
  };

  function openModal() {
    const modal = document.getElementById('help-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    renderHelpUI();
  }

  function closeModal() {
    const modal = document.getElementById('help-modal');
    if (modal) modal.style.display = 'none';
  }

  function bindHelpEvents() {
    const helpBtn = document.getElementById('help-btn');
    const closeBtn = document.getElementById('close-help-btn');
    const helpModal = document.getElementById('help-modal');
    const langBtn = document.getElementById('help-lang-toggle');
    const searchInput = document.getElementById('help-search-input');
    if (helpBtn) {
      helpBtn.onclick = (e) => {
        if (e) e.preventDefault();
        openModal();
      };
    }
    if (closeBtn) closeBtn.onclick = () => closeModal();
    if (helpModal) {
      helpModal.onclick = (e) => {
        if (e.target === helpModal) closeModal();
      };
    }
    if (langBtn) {
      langBtn.onclick = () => {
        currentLang = currentLang === 'he' ? 'en' : 'he';
        langBtn.textContent = currentLang === 'he' ? 'English' : 'Hebrew';
        renderHelpUI();
      };
    }
    if (searchInput) {
      searchInput.oninput = (e) => {
        query = e.target.value.trim();
        renderHelpUI();
      };
    }
  }

  document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('help-modal');
    if (e.key === 'Escape' && modal && modal.style.display === 'flex') closeModal();
  });

  bindHelpEvents();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindHelpEvents);
  }
})();
