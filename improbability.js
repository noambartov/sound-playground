// improbability.js - the "Improbability" toolbar button (Hitchhiker's Guide's Infinite Improbability Drive).
// A tap nudges every slider and menu of the modules to a new random value near where it is;
// a long press (or Shift+click) throws them anywhere in their range ("infinite" mode).
// Only the selected modules change when some are selected, otherwise the whole canvas.
// Volumes, levels and gains, the Output, Keyboard, Audio In, Recorder and Oscilloscope are left alone,
// and the Stereo Delay feedback is capped so nothing runs away. One Undo puts everything back.

(function () {
  const SKIP_MODULES = ['output', 'keyboard', 'audio_in', 'recorder', 'oscilloscope'];
  const NUDGE = 0.35;          // tap: move up to 35% of the range either way
  const INFINITE_SPAN = [0.05, 0.9]; // long press: anywhere between 5% and 90% of the range
  const LONG_PRESS_MS = 600;

  // Sliders that set loudness (kept as they are, so the balance of the patch survives)
  function isLevel(input) {
    const id = input.id || '';
    const handler = input.getAttribute('oninput') || '';
    return /(^|_)p_(level|volume|makeup|output)_/.test(id) || /^vca_gain_/.test(id) || /^gain_/.test(id) ||
      /Volume|setGain/.test(handler);
  }

  // Menus that would ask for the microphone or a device, or pick a MIDI port
  function isSkippedSelect(sel) {
    return sel.classList.contains('kb-select') || /source_mode|midi/i.test(sel.id || '');
  }

  // Highest value a slider may get (a fraction of its range), for controls that can run away
  function capFor(input) {
    if (/(^|_)p_fb_/.test(input.id || '')) return 0.8; // Stereo Delay feedback: at most 80% of 0-95
    return 1;
  }

  function roundToStep(v, min, step) {
    if (!step || step === 'any') return v;
    const s = parseFloat(step);
    if (!s) return v;
    const r = Math.round((v - min) / s) * s + min;
    return parseFloat(r.toFixed(6));
  }

  function shuffleSlider(input, infinite) {
    const min = parseFloat(input.min || '0');
    const max = parseFloat(input.max || '100');
    if (!(max > min)) return false;
    const range = max - min;
    const cur = parseFloat(input.value);
    let v;
    if (infinite || isNaN(cur)) {
      v = min + range * (INFINITE_SPAN[0] + Math.random() * (INFINITE_SPAN[1] - INFINITE_SPAN[0]));
    } else {
      v = cur + (Math.random() * 2 - 1) * NUDGE * range;
    }
    v = Math.min(min + range * capFor(input), Math.max(min, v));
    v = roundToStep(v, min, input.step || '1');
    if (String(v) === input.value) return false;
    input.value = String(v);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function shuffleSelect(sel, infinite) {
    const opts = Array.from(sel.options).filter(o => !o.disabled);
    if (opts.length < 2) return false;
    // A tap changes only some menus (about one in three), a long press changes them all
    if (!infinite && Math.random() > 0.33) return false;
    const others = opts.filter(o => o.value !== sel.value);
    sel.value = others[Math.floor(Math.random() * others.length)].value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function shake(card) {
    card.classList.remove('improb-shake');
    void card.offsetWidth; // restart the animation
    card.classList.add('improb-shake');
    setTimeout(() => card.classList.remove('improb-shake'), 500);
  }

  function engage(infinite) {
    const app = window.synthApp;
    if (!app || !app.modules) return;
    const all = Object.values(app.modules).filter(m => m.card);
    const selected = all.filter(m => app.selectedNodeIds && app.selectedNodeIds.has(m.id));
    const targets = (selected.length ? selected : all).filter(m => !SKIP_MODULES.includes(m.type));
    let changed = 0;
    targets.forEach(m => {
      let touched = false;
      m.card.querySelectorAll('input[type="range"]').forEach(input => {
        if (input.disabled || isLevel(input)) return;
        if (shuffleSlider(input, infinite)) touched = true;
      });
      m.card.querySelectorAll('select').forEach(sel => {
        if (sel.disabled || isSkippedSelect(sel)) return;
        if (shuffleSelect(sel, infinite)) touched = true;
      });
      if (touched) { changed++; shake(m.card); }
    });
    if (!changed) {
      app.showNotification(all.length ? 'Nothing here can be made improbable. Add a sound source or effect.' :
        'Nothing to make improbable yet. Add some modules first.');
      return;
    }
    if (typeof app.scheduleHistoryCapture === 'function') app.scheduleHistoryCapture();
  }

  function init() {
    const btn = document.getElementById('improbability-btn');
    if (!btn) return;
    let timer = null, longFired = false;
    const cancel = () => { clearTimeout(timer); timer = null; };
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      longFired = false;
      cancel();
      timer = setTimeout(() => { timer = null; longFired = true; engage(true); }, LONG_PRESS_MS);
    });
    btn.addEventListener('pointerup', cancel);
    btn.addEventListener('pointerleave', cancel);
    btn.addEventListener('pointercancel', cancel);
    btn.addEventListener('contextmenu', e => e.preventDefault());
    btn.addEventListener('click', (e) => {
      if (longFired) { longFired = false; return; }
      engage(e.shiftKey);
    });
  }

  window.improbability = { engage };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
