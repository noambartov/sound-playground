// touchSliders.js - Sliders (input type="range") driven by Pointer Events for fingers and the pencil.
// iPad Safari's own slider handling stops while another finger is down (e.g. holding a Keyboard key),
// so for touch / pen the native handling is switched off and every pointer moves its own slider:
// dragging moves the value relative to where it was (the full track length = the full range),
// vertical sliders (writing-mode vertical, or taller than wide) go up for more.
// The slider gets the same 'input' / 'change' events as a native drag, so modules need no changes.
(function () {
  const drags = new Map(); // pointerId -> { el, startX, startY, startValue, vertical }

  const isSlider = (el) => el && el.tagName === 'INPUT' && el.type === 'range' && !el.disabled;

  // Native touch handling off on sliders (pointer events still arrive)
  document.addEventListener('touchstart', (e) => {
    if (isSlider(e.target)) e.preventDefault();
  }, { passive: false, capture: true });

  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || !isSlider(e.target)) return;
    const el = e.target;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const vertical = /^(vertical|tb|bt)/.test(cs.writingMode || '') || rect.height > rect.width * 1.5;
    drags.set(e.pointerId, { el, startX: e.clientX, startY: e.clientY, startValue: parseFloat(el.value), vertical });
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
  }, true);

  window.addEventListener('pointermove', (e) => {
    const d = drags.get(e.pointerId);
    if (!d) return;
    const el = d.el;
    const min = parseFloat(el.min || 0), max = parseFloat(el.max || 100);
    const rect = el.getBoundingClientRect();
    const length = d.vertical ? rect.height : rect.width;
    if (!length) return;
    const moved = d.vertical ? (d.startY - e.clientY) : (e.clientX - d.startX);
    let value = d.startValue + moved / length * (max - min);
    const step = el.step === 'any' ? 0 : parseFloat(el.step || 1);
    if (step > 0) value = min + Math.round((value - min) / step) * step;
    value = Math.min(max, Math.max(min, value));
    const before = el.value;
    el.value = String(value);
    if (el.value !== before) el.dispatchEvent(new Event('input', { bubbles: true }));
  }, true);

  const end = (e) => {
    const d = drags.get(e.pointerId);
    if (!d) return;
    drags.delete(e.pointerId);
    d.el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  window.addEventListener('pointerup', end, true);
  window.addEventListener('pointercancel', end, true);
})();
