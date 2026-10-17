// onboarding.js - first-run help for newcomers: a welcome card on the first visit and a hint on the empty canvas.
// The welcome card shows once per browser (localStorage 'sp_welcome_seen'); every button also starts the audio.
(function () {
  'use strict';

  const SEEN_KEY = 'sp_welcome_seen';
  const DEMO_PRESET = 'demo-reverb';   // a Sequencer melody through Reverb: plays by itself, no keys needed
  const DEMO_VOLUME = 0.5;

  function app() { return window.synthApp; }

  function startAudio() {
    const a = app();
    if (a && typeof a.ensureAudioContextRunning === 'function') a.ensureAudioContextRunning();
  }

  function moduleCount() {
    const a = app();
    return a && a.modules ? Object.keys(a.modules).length : 0;
  }

  // Loads the demo patch, starts its Sequencer and raises its Output (presets otherwise load at volume 0)
  function playDemo() {
    const a = app();
    const preset = window.presetData ? window.presetData[DEMO_PRESET] : null;
    if (!a || !preset || typeof a.loadPatchData !== 'function') return;
    const newIds = a.loadPatchData(preset, { add: true }) || [];
    setTimeout(() => {
      Object.values(a.modules || {}).forEach(m => {
        if (!m.instance || !newIds.includes(m.id)) return;
        if (m.type === 'sequencer' && !m.instance.isPlaying && typeof m.instance.togglePlay === 'function') m.instance.togglePlay();
        if (m.type === 'output' && typeof m.instance.setState === 'function') m.instance.setState({ volume: DEMO_VOLUME });
      });
      a.showNotification('The demo is playing. Master Volume on the Output module sets the loudness, and Stop on the Sequencer stops it.');
    }, 300);
  }

  function closeWelcome(overlay) {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
    overlay.remove();
    document.removeEventListener('keydown', overlay._onKey);
    updateEmptyHint();
  }

  function showWelcome() {
    const overlay = document.createElement('div');
    overlay.id = 'welcome-overlay';
    overlay.className = 'welcome-overlay';
    overlay.innerHTML = `
      <div class="welcome-card" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <h2 id="welcome-title">Welcome to Sound Playground</h2>
        <p>A modular synthesizer in your browser. Each module makes or shapes sound, and cables connect them.
          You hear only what is cabled into an <strong>Output</strong> module.</p>
        <div class="welcome-actions">
          <button type="button" class="tool-btn welcome-primary" data-welcome="demo">Play a demo patch</button>
          <button type="button" class="tool-btn" data-welcome="guide">Open the guide</button>
          <button type="button" class="tool-btn" data-welcome="empty">Start from scratch</button>
        </div>
        <p class="welcome-note">No sound? Turn up your device volume. On iPhone, also turn off silent mode.</p>
      </div>`;

    overlay.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-welcome]');
      if (!btn && e.target !== overlay) return;
      startAudio();
      const choice = btn ? btn.getAttribute('data-welcome') : 'empty';
      closeWelcome(overlay);
      if (choice === 'demo') playDemo();
      if (choice === 'guide') { const help = document.getElementById('help-btn'); if (help) help.click(); }
    });
    overlay._onKey = (e) => { if (e.key === 'Escape') closeWelcome(overlay); };
    document.addEventListener('keydown', overlay._onKey);

    document.body.appendChild(overlay);
    const primary = overlay.querySelector('.welcome-primary');
    if (primary) primary.focus();
  }

  // Quiet text in the middle of the canvas while it has no modules
  let hint = null;
  function updateEmptyHint() {
    if (!hint) return;
    const show = moduleCount() === 0 && !document.getElementById('welcome-overlay');
    hint.hidden = !show;
  }

  function initEmptyHint() {
    const container = document.getElementById('canvas-container');
    const layer = document.getElementById('modules-layer');
    if (!container || !layer) return;
    hint = document.createElement('div');
    hint.className = 'empty-canvas-hint';
    hint.innerHTML = `<p>Add modules from the <strong>Modules</strong> menu, then cable them into an <strong>Output</strong> module to hear them.</p>
      <p>Or press <strong>?</strong> for ready-made patches and the guide.</p>`;
    container.appendChild(hint);
    new MutationObserver(updateEmptyHint).observe(layer, { childList: true });
    updateEmptyHint();
  }

  function init() {
    if (!app()) { setTimeout(init, 50); return; }
    initEmptyHint();
    let seen = false;
    try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch (e) {}
    if (!seen && moduleCount() === 0) showWelcome();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
