// valueEntry.js - Type an exact value: a tap / click on the number next to a slider turns it into a small
// text box. Enter (or tapping away) sets the value, Escape puts the old one back. Arrow Up / Down move one
// step (Shift: 10 steps) and are heard at once. When the box was opened by a finger or the pencil,
// "−" and "+" buttons appear next to it (touch keyboards have no arrow keys; hold to repeat).
//
// A readout takes part when it carries data-entry. Its slider is the only range input in the nearest
// enclosing element that has one. data-entry holds either
//   - inline settings "key:value;key:value": scale (shown = slider value x scale, default 1),
//     unit (text after the box; default: the readout's text without its number), step, decimals,
//     prop (the module property holding the exact slider value, e.g. prop:attack)
//   - or "@key": the module answers getEntry(key, slider) with an object that may also give
//     toSlider(n) / fromSlider(v) for curved sliders (frequency, rate), get() for the exact current
//     slider value, and format(n) / parse(text) for readouts that are not plain numbers (note names).
// The box starts from the exact value (get() / prop), not from the slider, whose position is rounded
// to its step.
// The value is written through the slider itself (step lifted for that moment, so typed values are
// exact) with the usual 'input' and 'change' events, so each module, LFO-to-slider cables, undo and
// saving all react through their existing slider code.
(function () {
  const exact = new WeakMap(); // slider -> { n, str }: the typed value, while the slider still holds it
  let lastPointerType = 'mouse';
  let downX = 0, downY = 0;
  let open = null;

  document.addEventListener('pointerdown', (e) => {
    lastPointerType = e.pointerType || 'mouse';
    downX = e.clientX;
    downY = e.clientY;
  }, true);

  const parseSettings = (raw) => {
    const out = {};
    raw.split(';').forEach(pair => {
      const i = pair.indexOf(':');
      if (i < 0) return;
      const k = pair.slice(0, i).trim();
      const v = pair.slice(i + 1).trim();
      out[k] = (k === 'unit' || k === 'prop') ? v : parseFloat(v);
    });
    return out;
  };

  const decimalsOf = (x) => {
    const s = String(Number(x.toPrecision(10)));
    const i = s.indexOf('.');
    return i < 0 ? 0 : s.length - i - 1;
  };

  const round = (n, d) => Number(n.toFixed(Math.min(6, d)));

  const unitFromText = (text) => {
    if (!/\d/.test(text)) return '';
    return text.replace(/^[^\d+\-.]*/, '').replace(/[+\-]?\d+(\.\d+)?\s*k?/, '').trim();
  };

  function sliderFor(readout) {
    let el = readout.parentElement;
    while (el && !el.classList.contains('module-card')) {
      const found = el.querySelectorAll('input[type="range"]');
      if (found.length === 1) return found[0];
      if (found.length > 1) return null;
      el = el.parentElement;
    }
    return null;
  }

  function moduleOf(el) {
    const card = el.closest('.module-card');
    if (!card || !window.synthApp || !card.id.startsWith('module_card_')) return null;
    return synthApp.getModule(card.id.slice('module_card_'.length));
  }

  function settingsFor(readout, slider) {
    const raw = readout.dataset.entry || '';
    let s;
    if (raw.startsWith('@')) {
      const mod = moduleOf(readout);
      s = mod && typeof mod.getEntry === 'function' ? mod.getEntry(raw.slice(1), slider) : null;
      if (!s) return null;
    } else {
      s = parseSettings(raw);
      if (s.prop) {
        const mod = moduleOf(readout);
        const prop = s.prop;
        if (mod && typeof mod[prop] === 'number') s.get = () => mod[prop];
      }
    }
    const scale = s.scale || 1;
    const curved = typeof s.toSlider === 'function';
    const toSlider = curved ? s.toSlider : (n => n / scale);
    const fromSlider = curved ? s.fromSlider : (v => v * scale);
    const sliderStep = parseFloat(slider.getAttribute('step')) || 1;
    const step = s.step || (curved ? 0 : sliderStep * scale);
    const decimals = s.decimals !== undefined ? s.decimals : (step ? decimalsOf(step) : 2);
    const a = fromSlider(parseFloat(slider.min || '0'));
    const b = fromSlider(parseFloat(slider.max || '100'));
    return {
      toSlider, fromSlider, step, sliderStep, decimals,
      lo: Math.min(a, b), hi: Math.max(a, b),
      unit: s.unit !== undefined ? s.unit : unitFromText(readout.textContent),
      get: typeof s.get === 'function' ? s.get : null,
      format: s.format || null,
      parse: s.parse || null
    };
  }

  // The value the box starts from: what was typed last, unless the slider moved since
  function currentValue(slider, s) {
    const ex = exact.get(slider);
    if (ex && ex.str === slider.value) return ex.n;
    const v = s.get ? parseFloat(s.get()) : NaN;
    return round(s.fromSlider(isNaN(v) ? parseFloat(slider.value) : v), s.decimals);
  }

  function writeSlider(slider, s, n) {
    n = Math.min(s.hi, Math.max(s.lo, n));
    const v = Math.min(parseFloat(slider.max || '100'), Math.max(parseFloat(slider.min || '0'), s.toSlider(n)));
    const stepAttr = slider.getAttribute('step');
    slider.step = 'any';
    slider.value = String(v);
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
    if (stepAttr === null) slider.removeAttribute('step');
    else slider.setAttribute('step', stepAttr);
    exact.set(slider, { n, str: slider.value });
    return n;
  }

  function show(s, n) {
    if (s.format) return s.format(n);
    return String(round(n, Math.max(s.decimals, 4)));
  }

  function read(s, text) {
    if (s.parse) return s.parse(text);
    const m = String(text).replace(',', '.').match(/[+\-]?\d*\.?\d+/);
    return m ? parseFloat(m[0]) : NaN;
  }

  function startEdit(readout) {
    if (open) open.finish(true);
    const slider = sliderFor(readout);
    if (!slider || slider.disabled) return;
    const s = settingsFor(readout, slider);
    if (!s) return;

    const startN = currentValue(slider, s);
    let n = startN;
    const touch = lastPointerType === 'touch' || lastPointerType === 'pen';

    const box = document.createElement('span');
    box.className = 've-box';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 've-input';
    input.value = show(s, n);
    input.setAttribute('inputmode', s.format || s.lo < 0 ? 'text' : 'decimal');
    input.setAttribute('enterkeyhint', 'done');
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', 'Type a value');
    const field = document.createElement('span');
    field.className = 've-field';
    field.appendChild(input);
    if (s.unit) {
      const u = document.createElement('span');
      u.className = 've-unit';
      u.textContent = s.unit;
      field.appendChild(u);
    }
    box.appendChild(field);

    const stepBy = (dir, mult) => {
      const typed = read(s, input.value);
      const from = isNaN(typed) ? n : typed;
      let next;
      if (s.step) {
        next = round(Math.round(from / s.step) * s.step + dir * mult * s.step, s.decimals);
      } else {
        const v = s.toSlider(Math.min(s.hi, Math.max(s.lo, from))) + dir * mult * s.sliderStep;
        next = round(s.fromSlider(v), s.decimals);
      }
      n = writeSlider(slider, s, next);
      input.value = show(s, n);
    };

    if (touch) {
      const steps = document.createElement('span');
      steps.className = 've-steps';
      box.appendChild(steps);
      [['−', -1], ['+', 1]].forEach(([label, dir]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 've-btn';
        btn.textContent = label;
        btn.setAttribute('aria-label', dir < 0 ? 'Step down' : 'Step up');
        let timer = null;
        const stop = () => { clearTimeout(timer); timer = null; };
        btn.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          stepBy(dir, 1);
          const repeat = (delay) => { timer = setTimeout(() => { stepBy(dir, 1); repeat(70); }, delay); };
          repeat(420);
        });
        btn.addEventListener('pointerup', stop);
        btn.addEventListener('pointercancel', stop);
        btn.addEventListener('pointerleave', stop);
        steps.appendChild(btn);
      });
    }

    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      if (save) {
        const typed = read(s, input.value);
        if (!isNaN(typed) && typed !== n) writeSlider(slider, s, typed);
      } else if (n !== startN) {
        writeSlider(slider, s, startN);
      }
      box.remove();
      readout.style.display = '';
      if (open && open.box === box) open = null;
    };

    box.addEventListener('pointerdown', e => e.stopPropagation());
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        stepBy(e.key === 'ArrowUp' ? 1 : -1, e.shiftKey ? 10 : 1);
      }
    });
    input.addEventListener('keyup', e => e.stopPropagation());
    input.addEventListener('blur', () => finish(true));

    readout.style.display = 'none';
    readout.after(box);
    open = { box, finish };
    input.focus();
    input.select();
  }

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const readout = t.closest('[data-entry]');
    if (!readout || !readout.closest('.module-card')) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return; // the end of a drag, not a tap
    e.preventDefault();
    startEdit(readout);
  });

  window.ValueEntry = { startEdit };
})();
