// touchSliders.js - Sliders (input type="range") driven by script for fingers and the pencil.
// iPad Safari's own slider handling stops while another finger is down (e.g. holding a Keyboard key),
// so for touch / pen the native handling is switched off and every finger moves its own slider:
// dragging moves the value relative to where it was (the full track length = the full range),
// vertical sliders (writing-mode vertical, or taller than wide) go up for more.
// On devices with Touch Events (iPad, iPhone, touch screens) each touch is followed by its identifier:
// iPad Safari did not keep sending pointer events for a slider finger while another finger held a key.
// Elsewhere (no Touch Events) Pointer Events do the same job.
// The slider gets the same 'input' / 'change' events as a native drag, so modules need no changes.
(function () {
  const drags = new Map(); // touch identifier or pointerId -> { el, startX, startY, startValue, vertical }
  const useTouch = typeof window.TouchEvent === 'function' && 'ontouchstart' in window;

  const isSlider = (el) => el && el.tagName === 'INPUT' && el.type === 'range' && !el.disabled;

  const begin = (key, el, x, y) => {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const vertical = /^(vertical|tb|bt)/.test(cs.writingMode || '') || rect.height > rect.width * 1.5;
    drags.set(key, { el, startX: x, startY: y, startValue: parseFloat(el.value), vertical });
  };

  const move = (key, x, y) => {
    const d = drags.get(key);
    if (!d) return;
    const el = d.el;
    const min = parseFloat(el.min || 0), max = parseFloat(el.max || 100);
    const rect = el.getBoundingClientRect();
    const length = d.vertical ? rect.height : rect.width;
    if (!length) return;
    const moved = d.vertical ? (d.startY - y) : (x - d.startX);
    let value = d.startValue + moved / length * (max - min);
    const step = el.step === 'any' ? 0 : parseFloat(el.step || 1);
    if (step > 0) value = min + Math.round((value - min) / step) * step;
    value = Math.min(max, Math.max(min, value));
    const before = el.value;
    el.value = String(value);
    if (el.value !== before) el.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const end = (key) => {
    const d = drags.get(key);
    if (!d) return;
    drags.delete(key);
    d.el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  // Native touch handling off on sliders; with Touch Events, the touch that landed on a slider drives it
  document.addEventListener('touchstart', (e) => {
    if (!isSlider(e.target)) return;
    e.preventDefault();
    if (!useTouch) return;
    Array.from(e.changedTouches).forEach(t => {
      if (t.target === e.target) begin(`t${t.identifier}`, e.target, t.clientX, t.clientY);
    });
  }, { passive: false, capture: true });

  if (useTouch) {
    document.addEventListener('touchmove', (e) => {
      Array.from(e.changedTouches).forEach(t => move(`t${t.identifier}`, t.clientX, t.clientY));
    }, { passive: true, capture: true });
    const touchEnd = (e) => Array.from(e.changedTouches).forEach(t => end(`t${t.identifier}`));
    document.addEventListener('touchend', touchEnd, { capture: true });
    document.addEventListener('touchcancel', touchEnd, { capture: true });
  }

  // Pointer Events: the pencil / fingers where there are no Touch Events (mouse dragging stays native)
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || useTouch || !isSlider(e.target)) return;
    begin(`p${e.pointerId}`, e.target, e.clientX, e.clientY);
    try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
  }, true);
  window.addEventListener('pointermove', (e) => move(`p${e.pointerId}`, e.clientX, e.clientY), true);
  window.addEventListener('pointerup', (e) => end(`p${e.pointerId}`), true);
  window.addEventListener('pointercancel', (e) => end(`p${e.pointerId}`), true);
})();
