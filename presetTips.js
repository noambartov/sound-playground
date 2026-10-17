// presetTips.js - a small tips panel at the bottom of the screen while a preset plays ("Try moving ... to get ...").
// Tips come from helpData: playTips[preset] when written, else the recipe's steps, else the module's controls and tips.
// English by default; a button switches to Hebrew (shared with the empty-canvas text, localStorage 'sp_intro_lang').
(function () {
  'use strict';

  const LANG_KEY = 'sp_intro_lang';
  const UI = {
    en: { count: (i, n) => `Tip ${i} of ${n}`, next: 'Next tip', lang: 'עברית', close: 'Close tips' },
    he: { count: (i, n) => `טיפ ${i} מתוך ${n}`, next: 'לטיפ הבא', lang: 'English', close: 'סגירת הטיפים' }
  };

  let panel = null;
  let presetKey = null;
  let index = 0;

  function getLang() {
    try { return localStorage.getItem(LANG_KEY) === 'he' ? 'he' : 'en'; } catch (e) { return 'en'; }
  }

  function setLang(lang) {
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    render();
  }

  function tipsFor(key, lang) {
    const data = window.helpData && window.helpData[lang];
    if (!data) return [];
    if (data.playTips && data.playTips[key]) return data.playTips[key];
    const recipe = (data.recipes || []).find(r => r.preset === key);
    if (recipe && recipe.steps && recipe.steps.length) return recipe.steps;
    const mod = (data.modules || []).find(m => m.preset === key);
    if (mod) return [...(mod.controls || []), ...(mod.tips || [])];
    return [];
  }

  function render() {
    if (!panel || !presetKey) return;
    const lang = getLang();
    const tips = tipsFor(presetKey, lang);
    if (!tips.length) { hide(); return; }
    index = index % tips.length;
    const ui = UI[lang];
    panel.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
    panel.querySelector('.preset-tips-count').textContent = ui.count(index + 1, tips.length);
    panel.querySelector('.preset-tips-text').textContent = tips[index];
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
    presetKey = null;
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
      <button type="button" class="tool-btn preset-tips-next"></button>`;
    panel.querySelector('.preset-tips-next').addEventListener('click', () => { index++; render(); });
    panel.querySelector('.preset-tips-lang').addEventListener('click', () => setLang(getLang() === 'he' ? 'en' : 'he'));
    panel.querySelector('.preset-tips-close').addEventListener('click', hide);
    // Typing on the panel must not play the Keyboard module
    panel.addEventListener('keydown', e => e.stopPropagation());
    document.body.appendChild(panel);
    const layer = document.getElementById('modules-layer');
    if (layer) new MutationObserver(() => {
      if (window.synthApp && Object.keys(window.synthApp.modules || {}).length === 0) hide();
    }).observe(layer, { childList: true });
  }

  // Called after a preset is loaded (help.js, onboarding.js)
  function show(key) {
    if (!panel) build();
    presetKey = key;
    index = 0;
    render();
  }

  window.presetTips = { show, hide };
})();
