// TimbreModule.js - a recipe book of instrument colors for additive synthesis. Each preset is a list
// of 16 levels, one per partial of the Harmonics module. A cable from TIMBRE OUT to the Mixer's TIMBRE
// input moves the Mixer faders to the recipe (8, 12 or 16 of them, as many partials as the Harmonics
// feeding that Mixer show); after that the faders stay free to play with.
// The cable carries settings, not sound (like the NOTES cable): TIMBRE OUT is a TimbreBus.
// Built on the shared template (ModuleBase.js). Owner's idea 2026-10-25, together with Harmonics.

// Levels are linear amplitudes (fader positions), loudest partial = 1. Rough textbook spectra of a
// middle-register note; the waves are their Fourier series (square: odd partials at 1/n, saw: all at 1/n).
const TIMBRE_PRESETS = {
  flute:    { label: 'Flute',    levels: [1, 0.45, 0.2, 0.1, 0.05, 0.03, 0.02, 0.01, 0.008, 0.006, 0.004, 0.003, 0.002, 0.002, 0.001, 0.001],
              text: 'A strong fundamental and only weak overtones: soft and pure.' },
  clarinet: { label: 'Clarinet', levels: [1, 0.04, 0.75, 0.04, 0.5, 0.04, 0.35, 0.02, 0.25, 0.02, 0.18, 0.02, 0.12, 0.01, 0.08, 0.01],
              text: 'Mostly odd partials (1, 3, 5, 7), the even ones almost silent: hollow and woody.' },
  oboe:     { label: 'Oboe',     levels: [0.45, 0.8, 1, 0.7, 0.45, 0.4, 0.25, 0.15, 0.1, 0.08, 0.06, 0.05, 0.04, 0.03, 0.02, 0.02],
              text: 'Partials 2 to 4 louder than the fundamental: nasal and reedy.' },
  trumpet:  { label: 'Trumpet',  levels: [0.6, 0.85, 1, 0.9, 0.75, 0.55, 0.4, 0.3, 0.25, 0.2, 0.16, 0.13, 0.1, 0.08, 0.06, 0.05],
              text: 'Many strong partials reaching high up: bright and brassy.' },
  sine:     { label: 'Sine',     levels: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              text: 'The fundamental alone: the purest possible tone.' },
  square:   { label: 'Square',   levels: Array.from({ length: 16 }, (_, i) => (i % 2 ? 0 : 1 / (i + 1))),
              text: 'Odd partials only, each at 1/n: the same idea as the clarinet, but electronic.' },
  saw:      { label: 'Sawtooth', levels: Array.from({ length: 16 }, (_, i) => 1 / (i + 1)),
              text: 'Every partial, each at 1/n: bright and buzzy.' }
};

// What a TIMBRE cable carries. app.js calls bus.connect(sink) / bus.disconnect(sink) like for an
// audio node; the sink (the Mixer's TIMBRE input) gets setTimbreLevels(levels), and may offer
// attachBus / detachBus / partialCount so the card shows as many bars as the Mixer has partials.
class TimbreBus {
  constructor(getLevels, onChange) {
    this.getLevels = getLevels;
    this.onChange = onChange;
    this.sinks = new Set();
  }

  // Partials played by the connected Mixers (8 without any)
  count() {
    let n = 0;
    this.sinks.forEach(s => { if (typeof s.partialCount === 'function') n = Math.max(n, s.partialCount()); });
    return n || 8;
  }

  changed() {
    if (this.onChange) this.onChange();
  }

  // A cable the user just plugged in applies the recipe at once. A cable restored by loading a patch
  // or by Undo does not, so faders the user moved afterwards keep their saved positions.
  connect(target) {
    if (!target || typeof target.setTimbreLevels !== 'function') return;
    this.sinks.add(target);
    if (typeof target.attachBus === 'function') target.attachBus(this);
    this.changed();
    if (window.synthApp && window.synthApp.activeCable) target.setTimbreLevels(this.getLevels());
  }

  disconnect(target) {
    const list = target ? [target] : Array.from(this.sinks);
    list.forEach(s => {
      this.sinks.delete(s);
      if (typeof s.detachBus === 'function') s.detachBus(this);
    });
    this.changed();
  }

  send() {
    const levels = this.getLevels();
    this.sinks.forEach(s => s.setTimbreLevels(levels));
  }
}

window.TimbreBus = TimbreBus;

class TimbreModule extends ModuleBase {
  static def = {
    type: 'timbre',
    title: 'Timbre',
    width: 260,
    menu: { group: 'Controllers & Sequencing', label: 'Timbre' },
    params: [
      { id: 'preset', label: 'Instrument', kind: 'select', value: 'clarinet',
        options: Object.keys(TIMBRE_PRESETS).map(k => [k, TIMBRE_PRESETS[k].label]) }
    ],
    outputs: [
      { id: 'timbre', label: 'TIMBRE', signal: 'cv', title: 'Timbre Output (fader settings)',
        guide: { text: 'The recipe: a level for each partial. Into the Mixer TIMBRE input it moves the faders of the partial channels (8, 12 or 16, as set on the Harmonics) to the recipe whenever you pick an instrument. Carries settings, not sound.', to: 'Mixer TIMBRE', match: ['mixer:in:timbre'] },
        chip: 'Mixer TIMBRE' }
    ]
  };

  build() {
    this.bus = new TimbreBus(() => this.levels(), () => this.drawBars());
    this.outputNodes = { timbre: this.bus };
  }

  levels() {
    return (TIMBRE_PRESETS[this.params.preset] || TIMBRE_PRESETS.sine).levels.slice();
  }

  onParamChange(id) {
    if (id !== 'preset' || !this.bus) return;
    this.drawBars();
    // Only a choice made on the card moves the faders (setState while loading a patch does not)
    if (this.card && !this.loadingState) this.bus.send();
  }

  setState(state) {
    this.loadingState = true;
    try { super.setState(state); } finally { this.loadingState = false; }
  }

  renderBody() {
    return `<div class="timbre-bars" id="${this.elId('bars')}"></div>
      <div class="timbre-text" id="${this.elId('text')}"></div>`;
  }

  renderControls() {
    return super.renderControls() +
      `<button class="action-btn" id="${this.elId('apply')}" title="Move the Mixer faders back to this recipe">Apply to Mixer</button>`;
  }

  onMount() {
    const btn = this.el('apply');
    if (btn) btn.addEventListener('click', () => this.bus.send());
    this.drawBars();
  }

  // One bar per partial the connected Mixer plays (8, 12 or 16); rebuilt only when that number changes
  drawBars() {
    if (!this.card) return;
    const n = this.bus.count();
    const box = this.el('bars');
    if (box && box.childElementCount !== n) {
      const bars = [];
      for (let k = 1; k <= n; k++) {
        bars.push(`<div class="timbre-bar"><div class="timbre-fill" id="${this.elId(`bar_${k}`)}"></div><span>${k}</span></div>`);
      }
      box.innerHTML = bars.join('');
      box.classList.toggle('timbre-bars-many', n > 8);
    }
    const levels = this.levels().slice(0, n);
    levels.forEach((v, i) => {
      const fill = this.el(`bar_${i + 1}`);
      if (fill) fill.style.height = `${Math.round(v * 100)}%`;
    });
    const text = this.el('text');
    if (text) text.textContent = (TIMBRE_PRESETS[this.params.preset] || {}).text || '';
  }
}

ModuleBase.register(TimbreModule);
