// modulation.js - "LFO to any slider": a cable from LFO OUT dropped on a slider in another module
// moves that slider up and down around the value the user set (the "base").
// The cable is a normal entry in app.connections whose toPortInfo is { id: 'knob:<ref>', knob: '<ref>' }.
// Every animation frame the slider is set to base + offset and an 'input' event is fired,
// so each module reacts through its own existing slider code (no per-module changes needed).

class KnobModulation {
  constructor(app) {
    this.app = app;
    this.links = new Map();      // connectionKey -> { conn }
    this.states = new Map();     // slider element -> { base, last, target, band }
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // A stable reference to a slider inside its module card: '#<element id>' or 'i<index among the card's sliders>'
  static refFor(slider, card) {
    if (slider.id) return `#${slider.id}`;
    return `i${Array.from(card.querySelectorAll('input[type="range"]')).indexOf(slider)}`;
  }

  static resolve(card, ref) {
    if (!card || !ref) return null;
    if (ref.startsWith('#')) return card.querySelector(`[id="${ref.slice(1)}"]`);
    return card.querySelectorAll('input[type="range"]')[parseInt(ref.slice(1), 10)] || null;
  }

  static isKnobConnection(conn) {
    return !!(conn && conn.toPortInfo && conn.toPortInfo.knob);
  }

  // Only modules that expose getKnobModValue (the LFO, the Ribbon) can modulate sliders.
  // getKnobModValue(fromPortInfo) gets the cable's source jack, so a module with several outputs can answer per jack.
  static canModulateFrom(app, moduleId) {
    const mod = app.getModule(moduleId);
    return !!(mod && typeof mod.getKnobModValue === 'function');
  }

  add(conn) {
    this.links.set(this.app.connectionKey(conn), { conn });
  }

  remove(conn) {
    const key = this.app.connectionKey(conn);
    const link = this.links.get(key);
    if (!link) return;
    this.links.delete(key);
    const el = this.sliderFor(link.conn);
    if (el && this.states.has(el) && !this.isModulated(el)) {
      const st = this.states.get(el);
      this.write(el, st.base);
      if (st.band) st.band.remove();
      this.states.delete(el);
    }
  }

  isModulated(el) {
    for (const link of this.links.values()) if (this.sliderFor(link.conn) === el) return true;
    return false;
  }

  sliderFor(conn) {
    const card = document.getElementById(`module_card_${conn.toNode}`);
    return KnobModulation.resolve(card, conn.toPortInfo.knob);
  }

  write(el, value) {
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Runs fn while every modulated slider holds its base value, so saved patches and undo history
  // store what the user set, not a passing modulated value. Both writes happen in the same task,
  // so the audio never hears the base value.
  withBaseValues(fn) {
    if (!this.states.size) return fn();
    this.states.forEach((st, el) => {
      if (!el.isConnected) return;
      this.write(el, st.base);
      st.baseStr = el.value;
    });
    try {
      return fn();
    } finally {
      this.states.forEach((st, el) => {
        if (!el.isConnected) return;
        if (el.value !== st.baseStr) {
          // fn changed the slider (e.g. undo restored another value): keep it as the new base
          st.base = parseFloat(el.value);
          st.last = el.value;
          return;
        }
        this.write(el, st.target);
        st.last = el.value;
      });
    }
  }

  loop() {
    requestAnimationFrame(this.loop);
    if (!this.links.size && !this.states.size) return;

    // Sum the offsets of all LFOs patched into the same slider
    const offsets = new Map();
    this.links.forEach(link => {
      const el = this.sliderFor(link.conn);
      if (!el) return;
      const src = this.app.getModule(link.conn.fromNode);
      const v = src && typeof src.getKnobModValue === 'function' ? src.getKnobModValue(link.conn.fromPortInfo) : 0;
      const entry = offsets.get(el) || { sum: 0, depth: 0, color: null };
      entry.sum += v;
      entry.depth += src && typeof src.getKnobModDepth === 'function' ? src.getKnobModDepth() : 0;
      if (!entry.color) entry.color = this.app.getConnectionColor(link.conn, null);
      offsets.set(el, entry);
    });

    // Sliders that lost their element (module rebuilt or deleted)
    this.states.forEach((st, el) => {
      if (!offsets.has(el)) {
        if (st.band) st.band.remove();
        this.states.delete(el);
      }
    });

    offsets.forEach((entry, el) => {
      let st = this.states.get(el);
      if (!st) {
        st = { base: parseFloat(el.value), last: el.value, target: parseFloat(el.value), band: null };
        this.states.set(el, st);
      } else if (el.value !== st.last) {
        // The user (or undo / a preset) moved the slider: that is the new base
        st.base = parseFloat(el.value);
      }
      const min = parseFloat(el.min || '0');
      const max = parseFloat(el.max || '100');
      const half = (max - min) / 2;
      st.target = Math.min(max, Math.max(min, st.base + entry.sum * half));
      this.write(el, st.target);
      st.last = el.value;
      this.drawBand(el, st, entry, min, max, half);
    });
  }

  // A thin colored strip under the slider showing how far it moves
  drawBand(el, st, entry, min, max, half) {
    const card = el.closest('.module-card');
    if (!card) return;
    if (!st.band || st.band.parentNode !== card) {
      st.band = document.createElement('div');
      st.band.className = 'knob-mod-band';
      card.appendChild(st.band);
    }
    const scale = this.app.scale || 1;
    const cRect = card.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const left = (r.left - cRect.left) / scale;
    const width = r.width / scale;
    const lo = Math.max(min, st.base - entry.depth * half);
    const hi = Math.min(max, st.base + entry.depth * half);
    const span = max - min || 1;
    st.band.style.left = `${left + ((lo - min) / span) * width}px`;
    st.band.style.width = `${Math.max(2, ((hi - lo) / span) * width)}px`;
    st.band.style.top = `${(r.bottom - cRect.top) / scale + 1}px`;
    st.band.style.background = entry.color;
  }
}

window.KnobModulation = KnobModulation;
