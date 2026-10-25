// TimbreModule.js - a recipe book of instrument colors for additive synthesis. Each preset is a list
// of 8 levels, one per partial of the Harmonics module. A cable from TIMBRE OUT to the Mixer's TIMBRE
// input moves Mixer faders 1-8 to the recipe; after that the faders stay free to play with.
// The cable carries settings, not sound (like the NOTES cable): TIMBRE OUT is a TimbreBus.
// Built on the shared template (ModuleBase.js). Owner's idea 2026-10-25, together with Harmonics.

// Levels are linear amplitudes (fader positions), loudest partial = 1. Rough textbook spectra of a
// middle-register note; the waves are their Fourier series (square: odd partials at 1/n, saw: all at 1/n).
const TIMBRE_PRESETS = {
  flute:    { label: 'Flute',    levels: [1, 0.45, 0.2, 0.1, 0.05, 0.03, 0.02, 0.01],
              text: 'A strong fundamental and only weak overtones: soft and pure.' },
  clarinet: { label: 'Clarinet', levels: [1, 0.04, 0.75, 0.04, 0.5, 0.04, 0.35, 0.02],
              text: 'Mostly odd partials (1, 3, 5, 7), the even ones almost silent: hollow and woody.' },
  oboe:     { label: 'Oboe',     levels: [0.45, 0.8, 1, 0.7, 0.45, 0.4, 0.25, 0.15],
              text: 'Partials 2 to 4 louder than the fundamental: nasal and reedy.' },
  trumpet:  { label: 'Trumpet',  levels: [0.6, 0.85, 1, 0.9, 0.75, 0.55, 0.4, 0.3],
              text: 'Many strong partials reaching high up: bright and brassy.' },
  sine:     { label: 'Sine',     levels: [1, 0, 0, 0, 0, 0, 0, 0],
              text: 'The fundamental alone: the purest possible tone.' },
  square:   { label: 'Square',   levels: [1, 0, 1 / 3, 0, 1 / 5, 0, 1 / 7, 0],
              text: 'Odd partials only, each at 1/n: the same idea as the clarinet, but electronic.' },
  saw:      { label: 'Sawtooth', levels: [1, 1 / 2, 1 / 3, 1 / 4, 1 / 5, 1 / 6, 1 / 7, 1 / 8],
              text: 'Every partial, each at 1/n: bright and buzzy.' }
};

// What a TIMBRE cable carries. app.js calls bus.connect(sink) / bus.disconnect(sink) like for an
// audio node; the sink (the Mixer's TIMBRE input) gets setTimbreLevels(levels).
class TimbreBus {
  constructor(getLevels) {
    this.getLevels = getLevels;
    this.sinks = new Set();
  }

  // A cable the user just plugged in applies the recipe at once. A cable restored by loading a patch
  // or by Undo does not, so faders the user moved afterwards keep their saved positions.
  connect(target) {
    if (!target || typeof target.setTimbreLevels !== 'function') return;
    this.sinks.add(target);
    if (window.synthApp && window.synthApp.activeCable) target.setTimbreLevels(this.getLevels());
  }

  disconnect(target) {
    if (target) this.sinks.delete(target);
    else this.sinks.clear();
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
        guide: { text: 'The recipe: a level for each of the 8 partials. Into the Mixer TIMBRE input it moves faders 1-8 to the recipe whenever you pick an instrument. Carries settings, not sound.', to: 'Mixer TIMBRE', match: ['mixer:in:timbre'] },
        chip: 'Mixer TIMBRE' }
    ]
  };

  build() {
    this.bus = new TimbreBus(() => this.levels());
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
    const bars = [];
    for (let n = 1; n <= 8; n++) {
      bars.push(`<div class="timbre-bar"><div class="timbre-fill" id="${this.elId(`bar_${n}`)}"></div><span>${n}</span></div>`);
    }
    return `<div class="timbre-bars">${bars.join('')}</div>
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

  drawBars() {
    if (!this.card) return;
    const levels = this.levels();
    levels.forEach((v, i) => {
      const fill = this.el(`bar_${i + 1}`);
      if (fill) fill.style.height = `${Math.round(v * 100)}%`;
    });
    const text = this.el('text');
    if (text) text.textContent = (TIMBRE_PRESETS[this.params.preset] || {}).text || '';
  }
}

ModuleBase.register(TimbreModule);
