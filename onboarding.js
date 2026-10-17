// onboarding.js - help for newcomers. Until the first module appears, the empty canvas shows a short explanation and a big
// Play demo button; then the button flies into the Toolbar as a plain Demo button (#demo-btn) and stays there
// (localStorage 'sp_demo_docked'). Later, an empty canvas shows only a short text hint. A small button switches the text to Hebrew.
// Pressing either button also starts the audio (the user gesture browsers require).
(function () {
  'use strict';

  const DEMO_PRESET = 'demo-reverb';   // a Sequencer melody through Reverb: plays by itself, no keys needed
  const DEMO_VOLUME = 0.5;
  const DOCKED_KEY = 'sp_demo_docked';
  let docked = false;

  function app() { return window.synthApp; }

  function moduleCount() {
    const a = app();
    return a && a.modules ? Object.keys(a.modules).length : 0;
  }

  // Loads the demo patch, starts its Sequencer and raises its Output (presets otherwise load at volume 0)
  function playDemo() {
    const a = app();
    const preset = window.presetData ? window.presetData[DEMO_PRESET] : null;
    if (!a || !preset || typeof a.loadPatchData !== 'function') return;
    if (typeof a.ensureAudioContextRunning === 'function') a.ensureAudioContextRunning();
    const newIds = a.loadPatchData(preset, { add: true }) || [];
    setTimeout(() => {
      Object.values(a.modules || {}).forEach(m => {
        if (!m.instance || !newIds.includes(m.id)) return;
        if (m.type === 'sequencer' && !m.instance.isPlaying && typeof m.instance.togglePlay === 'function') m.instance.togglePlay();
        if (m.type === 'output' && typeof m.instance.setState === 'function') m.instance.setState({ volume: DEMO_VOLUME });
      });
      a.showNotification('The demo is playing. Master Volume on the Output module sets the loudness, and Stop on the Sequencer stops it.',
        'הדמו מתנגן. Master Volume במודול Output קובע את העוצמה, ו-Stop בסיקוונסר עוצר אותו.');
    }, 300);
    if (window.presetTips) window.presetTips.show(DEMO_PRESET);
  }

  let hint = null;
  let toolbarBtn = null;
  // The text is English by default; the owner allowed an optional Hebrew version here, like in the manual
  const LANG_KEY = 'sp_intro_lang';
  let lang = 'en';

  function setLang(next) {
    lang = next;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    hint.classList.toggle('lang-he', lang === 'he');
    hint.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
    hint.querySelector('.empty-canvas-lang').textContent = lang === 'he' ? 'English' : 'עברית';
    hint.querySelector('.empty-canvas-demo').textContent = lang === 'he' ? 'נגן דמו' : 'Play demo';
    hint.querySelector('.empty-canvas-guide').textContent = lang === 'he' ? 'פתח את ספר העזרה' : 'Open the guide';
  }

  function updateEmptyHint() {
    if (!hint) return;
    const empty = moduleCount() === 0;
    if (!empty && !docked) dock(true);
    hint.hidden = !empty;
    hint.classList.toggle('docked', docked);
  }

  // Moves the big button into the Toolbar; animate = fly a copy of it from the middle of the screen to the Toolbar
  function dock(animate) {
    docked = true;
    try { localStorage.setItem(DOCKED_KEY, '1'); } catch (e) {}
    if (!toolbarBtn) return;
    const big = hint && hint.querySelector('.empty-canvas-demo');
    const from = big && !hint.hidden ? big.getBoundingClientRect() : null;
    toolbarBtn.hidden = false;
    if (!animate || !from || !from.width || typeof toolbarBtn.animate !== 'function') return;
    const to = toolbarBtn.getBoundingClientRect();
    const ghost = big.cloneNode(true);
    ghost.className = 'tool-btn demo-fly';
    Object.assign(ghost.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px' });
    document.body.appendChild(ghost);
    toolbarBtn.style.visibility = 'hidden';
    const anim = ghost.animate([
      { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px', fontSize: '16px', opacity: 1 },
      { left: to.left + 'px', top: to.top + 'px', width: to.width + 'px', height: to.height + 'px', fontSize: '12px', opacity: 0.9 }
    ], { duration: 700, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' });
    anim.onfinish = () => { ghost.remove(); toolbarBtn.style.visibility = ''; };
  }

  function initEmptyHint() {
    const container = document.getElementById('canvas-container');
    const layer = document.getElementById('modules-layer');
    if (!container || !layer) return;
    hint = document.createElement('div');
    hint.className = 'empty-canvas-hint';
    hint.innerHTML = `
      <div class="empty-canvas-intro">
        <h2>Sound Playground</h2>
        <p data-lang="en">You're looking at an empty canvas. Pick modules from the <strong>Modules</strong> menu and connect them with cables to make sound.
          Follow the sound's path and make sure it ends in an <strong>Output</strong> module, so you can hear it.
          For any question, use the <strong>?</strong> button or <strong>Tooltips</strong> in the top bar.</p>
        <p data-lang="en">New to modular synths? The guide explains it step by step.</p>
        <p data-lang="he">לפניך קנבס ריק. בחר מודולים מתפריט <strong>Modules</strong> וחבר ביניהם בכבלים כדי ליצור סאונד.
          עקוב אחרי מסלול הסאונד וודא שהוא מגיע למודול <strong>Output</strong>, כדי שתוכל לשמוע אותו.
          בכל שאלה אפשר להיעזר בכפתור <strong>?</strong> או ב-<strong>Tooltips</strong> בסרגל העליון.</p>
        <p data-lang="he">חדש בסינתים מודולריים? ספר העזרה מסביר הכול צעד אחר צעד.</p>
        <div class="empty-canvas-actions">
          <button type="button" class="tool-btn empty-canvas-demo">Play demo</button>
          <button type="button" class="tool-btn empty-canvas-guide">Open the guide</button>
        </div>
        <p class="empty-canvas-note" data-lang="en">Works great on a phone too, but for a first try a larger screen is recommended.<br>
          No sound? Turn up your device volume. On iPhone, also turn off silent mode.</p>
        <p class="empty-canvas-note" data-lang="he">עובד מצוין גם בטלפון, אבל בפעם הראשונה מומלץ להתנסות על מסך גדול יותר.<br>
          אין צליל? הגבר את עוצמת הקול במכשיר. באייפון, כבה גם את מצב השקט.</p>
      </div>
      <p class="empty-canvas-short" data-lang="en">Add modules from the <strong>Modules</strong> menu and cable them into an <strong>Output</strong> module,
        or press <strong>Demo</strong> to hear an example.</p>
      <p class="empty-canvas-short" data-lang="he">הוסף מודולים מתפריט <strong>Modules</strong> וחבר אותם בכבל למודול <strong>Output</strong>,
        או לחץ על <strong>Demo</strong> כדי לשמוע דוגמה.</p>
      <button type="button" class="empty-canvas-lang">עברית</button>`;
    const btn = hint.querySelector('.empty-canvas-demo');
    const langBtn = hint.querySelector('.empty-canvas-lang');
    const guideBtn = hint.querySelector('.empty-canvas-guide');
    guideBtn.addEventListener('click', () => { const help = document.getElementById('help-btn'); if (help) help.click(); });
    // Keep presses away from the canvas (selection box, pan)
    [btn, langBtn, guideBtn].forEach(b => ['pointerdown', 'mousedown', 'touchstart'].forEach(t => b.addEventListener(t, e => e.stopPropagation(), { passive: true })));
    btn.addEventListener('click', playDemo);
    langBtn.addEventListener('click', () => setLang(lang === 'he' ? 'en' : 'he'));
    try { if (localStorage.getItem(LANG_KEY) === 'he') lang = 'he'; } catch (e) {}
    setLang(lang);
    container.appendChild(hint);
    toolbarBtn = document.getElementById('demo-btn');
    if (toolbarBtn) toolbarBtn.addEventListener('click', playDemo);
    try { docked = localStorage.getItem(DOCKED_KEY) === '1'; } catch (e) {}
    if (docked && toolbarBtn) toolbarBtn.hidden = false;
    new MutationObserver(updateEmptyHint).observe(layer, { childList: true });
    updateEmptyHint();
  }

  function init() {
    if (!app()) { setTimeout(init, 50); return; }
    initEmptyHint();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
