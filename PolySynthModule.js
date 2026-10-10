// PolySynthModule.js - a complete polyphonic synth in one module: up to 8 voices, each with two
// oscillators (the second one detuned), a low-pass filter with its own envelope, and a volume
// envelope. Notes arrive on one NOTES cable from the Keyboard (every held key, not just the top one).
// Built on the shared template (ModuleBase.js).

// What a NOTES cable carries: not sound but note-on / note-off messages. The Keyboard's NOTES output
// is a PolyNoteBus; app.js calls bus.connect(sink) / bus.disconnect(sink) like for an audio node,
// and the sink (the Poly Synth's NOTES input) gets noteOn(note, freq) / noteOff(note) / allNotesOff().
class PolyNoteBus {
  constructor() {
    this.sinks = new Set();
    this.held = new Map();   // note number -> Hz, the keys held right now
  }

  connect(target) {
    if (!target || typeof target.noteOn !== 'function') return;
    this.sinks.add(target);
    this.held.forEach((freq, note) => target.noteOn(note, freq));
  }

  disconnect(target) {
    const list = target ? [target] : Array.from(this.sinks);
    list.forEach(s => {
      if (!this.sinks.delete(s)) return;
      try { s.allNotesOff(); } catch (e) {}
    });
  }

  // Called with the full list of held keys; sends only what changed
  update(notes) {
    const next = new Map();
    notes.forEach(n => next.set(n.midiNote, n.freq));
    this.held.forEach((freq, note) => {
      if (!next.has(note)) this.sinks.forEach(s => s.noteOff(note));
    });
    next.forEach((freq, note) => {
      if (this.held.get(note) !== freq) this.sinks.forEach(s => s.noteOn(note, freq));
    });
    this.held = next;
  }
}

window.PolyNoteBus = PolyNoteBus;

const POLY_MAX_VOICES = 8;

class PolySynthModule extends ModuleBase {
  static def = {
    type: 'polysynth',
    title: 'Poly Synth',
    width: 240,
    menu: { group: 'Sound Sources', label: 'Poly Synth' },
    params: [
      { id: 'voices', label: 'Voices', min: 1, max: POLY_MAX_VOICES, step: 1, value: 8 },
      { id: 'wave', label: 'Waveform', kind: 'select', value: 'sawtooth',
        options: [['sawtooth', 'Sawtooth'], ['square', 'Square'], ['triangle', 'Triangle'], ['sine', 'Sine']] },
      { id: 'detune', label: 'Detune', min: 0, max: 50, step: 1, value: 8, unit: 'cents' },
      { id: 'cutoff', label: 'Cutoff', min: 0, max: 100, step: 1, value: 45, format: v => PolySynthModule.formatHz(PolySynthModule.cutoffHz(v)) },
      { id: 'reso', label: 'Resonance', min: 0, max: 20, step: 0.5, value: 2, format: v => `Q ${v}` },
      { id: 'filterEnv', label: 'Filter Env', min: 0, max: 100, step: 1, value: 40, unit: '%' },
      { id: 'attack', label: 'Attack', min: 1, max: 3000, step: 1, value: 10, unit: 'ms' },
      { id: 'decay', label: 'Decay', min: 10, max: 3000, step: 10, value: 400, unit: 'ms' },
      { id: 'sustain', label: 'Sustain', min: 0, max: 100, step: 1, value: 60, unit: '%' },
      { id: 'release', label: 'Release', min: 10, max: 5000, step: 10, value: 500, unit: 'ms' },
      { id: 'level', label: 'Level', min: 0, max: 100, step: 1, value: 70, unit: '%' }
    ],
    inputs: [
      { id: 'notes', label: 'NOTES', signal: 'gate', title: 'Notes Input (from Keyboard NOTES)',
        guide: { text: 'All the keys you hold on the Keyboard, each played by its own voice. This cable carries notes, not sound.', from: 'Keyboard NOTES', match: ['keyboard:out:notes'] },
        chip: 'Keyboard NOTES' }
    ],
    outputs: [
      { id: 'out', label: 'OUT', signal: 'audio', title: 'Audio Output',
        guide: { text: 'All the voices mixed together.', to: 'Output IN, Reverb IN L, Stereo Delay IN L, Mixer IN, Degrader IN', match: ['output:in:in', 'reverb:in:in_l', 'delay:in:in_l', 'mixer:in:ch_in', 'degrader:in:in', 'filter:in:audio', 'vca:in:audio', 'oscilloscope:in:audio', 'recorder:in:in'] },
        chip: 'Output / Reverb' }
    ]
  };

  // Cutoff slider 0..100 -> 60 Hz .. 12 kHz on an even musical scale
  static cutoffHz(v) {
    return 60 * Math.pow(200, v / 100);
  }

  static formatHz(hz) {
    return hz >= 1000 ? `${(hz / 1000).toFixed(1)} kHz` : `${Math.round(hz)} Hz`;
  }

  // Stops a parameter's scheduled moves and holds it where it is now
  static hold(param, t) {
    if (typeof param.cancelAndHoldAtTime === 'function') {
      param.cancelAndHoldAtTime(t);
    } else {
      const v = param.value;
      param.cancelScheduledValues(t);
      param.setValueAtTime(v, t);
    }
  }

  build() {
    const ctx = this.audioCtx;
    this.destroyed = false;
    this.outNode = this.own(ctx.createGain());
    this.outputNodes = { out: this.outNode };
    this.order = 0;

    // Each voice runs all the time and is silent until a note opens its volume envelope
    this.voices = [];
    for (let i = 0; i < POLY_MAX_VOICES; i++) {
      const osc1 = this.own(ctx.createOscillator());
      const osc2 = this.own(ctx.createOscillator());
      const mix = this.own(ctx.createGain());
      mix.gain.value = 0.5;
      const filter = this.own(ctx.createBiquadFilter());
      filter.type = 'lowpass';
      const amp = this.own(ctx.createGain());
      amp.gain.value = 0;
      osc1.connect(mix);
      osc2.connect(mix);
      mix.connect(filter);
      filter.connect(amp);
      amp.connect(this.outNode);
      osc1.start();
      osc2.start();
      this.voices.push({ osc1, osc2, filter, amp, note: null, freq: 440, gate: false, freeAt: 0, started: 0, order: 0 });
    }

    // The NOTES input: app.js connects the Keyboard's PolyNoteBus to this object
    const self = this;
    this.inputNodes = {
      notes: {
        noteOn(note, freq) { self.noteOn(note, freq); },
        noteOff(note) { self.noteOff(note); },
        allNotesOff() { self.allNotesOff(); }
      }
    };
  }

  renderBody() {
    const cells = [];
    for (let i = 0; i < POLY_MAX_VOICES; i++) {
      cells.push(`<div class="poly-voice" data-voice="${i}">${i + 1}</div>`);
    }
    return `<div class="poly-voices" id="${this.elId('voices')}">${cells.join('')}</div>`;
  }

  onMount() {
    this.updateVoiceDisplay();
  }

  onParamChange(id, value) {
    if (!this.voices) return;
    const t = this.audioCtx.currentTime;
    if (id === 'wave') {
      this.voices.forEach(v => { v.osc1.type = value; v.osc2.type = value; });
    } else if (id === 'detune') {
      this.voices.forEach(v => {
        v.osc1.detune.setTargetAtTime(-value / 2, t, 0.02);
        v.osc2.detune.setTargetAtTime(value / 2, t, 0.02);
      });
    } else if (id === 'reso') {
      this.voices.forEach(v => v.filter.Q.setTargetAtTime(value, t, 0.02));
    } else if (id === 'level') {
      // Several voices add up, so the output is kept well below 1
      this.outNode.gain.setTargetAtTime(0.35 * value / 100, t, 0.02);
    } else if (id === 'cutoff' || id === 'filterEnv' || id === 'sustain') {
      // Voices that are holding a note follow the new filter / sustain settings
      this.voices.forEach(v => {
        if (!v.gate) {
          if (id === 'cutoff' && t >= v.freeAt) v.filter.frequency.setTargetAtTime(this.cutoffBase(), t, 0.02);
          return;
        }
        if (t < v.started + this.params.attack / 1000) return;
        PolySynthModule.hold(v.filter.frequency, t);
        v.filter.frequency.setTargetAtTime(this.cutoffSustain(), t, 0.03);
        if (id === 'sustain') {
          PolySynthModule.hold(v.amp.gain, t);
          v.amp.gain.setTargetAtTime(this.params.sustain / 100, t, 0.03);
        }
      });
    } else if (id === 'voices') {
      // Voices beyond the new count let go of their notes
      this.voices.forEach((v, i) => { if (i >= value && v.gate) this.releaseVoice(v, t); });
      this.updateVoiceDisplay();
    }
  }

  cutoffBase() {
    return PolySynthModule.cutoffHz(this.params.cutoff);
  }

  // Filter Env opens the filter by up to 6 octaves above Cutoff at the top of each note
  cutoffPeak() {
    return Math.min(18000, this.cutoffBase() * Math.pow(2, 6 * this.params.filterEnv / 100));
  }

  cutoffSustain() {
    const base = this.cutoffBase();
    return base + (this.cutoffPeak() - base) * (this.params.sustain / 100);
  }

  activeVoices() {
    return this.voices.slice(0, this.params.voices);
  }

  // Picks a voice for a new note: the same note if it is still sounding, else a silent voice,
  // else the one released longest ago, else the oldest held note (it is cut off)
  pickVoice(note, t) {
    const pool = this.activeVoices();
    return pool.find(v => v.note === note)
      || pool.filter(v => !v.gate && t >= v.freeAt).sort((a, b) => a.order - b.order)[0]
      || pool.filter(v => !v.gate).sort((a, b) => a.order - b.order)[0]
      || pool.slice().sort((a, b) => a.order - b.order)[0];
  }

  noteOn(note, freq) {
    if (this.destroyed) return;
    const ctx = this.audioCtx;
    const t = ctx.currentTime;
    const v = this.pickVoice(note, t);
    if (!v) return;
    const p = this.params;
    const a = p.attack / 1000;
    const d = p.decay / 1000;
    const s = p.sustain / 100;
    const stolen = v.gate && v.note !== note;

    v.note = note;
    v.freq = freq;
    v.gate = true;
    v.started = t;
    v.order = ++this.order;
    v.freeAt = Infinity;

    // A voice taken from another note gets a very short fade first, so it does not click
    const start = stolen ? t + 0.006 : t;
    PolySynthModule.hold(v.amp.gain, t);
    if (stolen) v.amp.gain.linearRampToValueAtTime(0, start);
    v.osc1.frequency.setValueAtTime(freq, start);
    v.osc2.frequency.setValueAtTime(freq, start);

    v.amp.gain.linearRampToValueAtTime(1, start + a);
    v.amp.gain.setTargetAtTime(s, start + a, Math.max(0.005, d / 4));

    const f = v.filter.frequency;
    PolySynthModule.hold(f, t);
    f.setValueAtTime(this.cutoffBase(), start);
    f.exponentialRampToValueAtTime(this.cutoffPeak(), start + a);
    f.setTargetAtTime(this.cutoffSustain(), start + a, Math.max(0.005, d / 4));

    this.updateVoiceDisplay();
  }

  noteOff(note) {
    if (this.destroyed) return;
    const t = this.audioCtx.currentTime;
    this.voices.forEach(v => { if (v.gate && v.note === note) this.releaseVoice(v, t); });
    this.updateVoiceDisplay();
  }

  allNotesOff() {
    if (this.destroyed) return;
    const t = this.audioCtx.currentTime;
    this.voices.forEach(v => { if (v.gate) this.releaseVoice(v, t); });
    this.updateVoiceDisplay();
  }

  releaseVoice(v, t) {
    const r = this.params.release / 1000;
    v.gate = false;
    v.order = ++this.order;
    v.freeAt = t + r;
    PolySynthModule.hold(v.amp.gain, t);
    v.amp.gain.setTargetAtTime(0, t, r / 4);
    PolySynthModule.hold(v.filter.frequency, t);
    v.filter.frequency.setTargetAtTime(this.cutoffBase(), t, r / 4);
  }

  // Lights the voices that are holding a note; voices above the Voices count are dimmed
  updateVoiceDisplay() {
    const box = this.el('voices');
    if (!box) return;
    box.querySelectorAll('.poly-voice').forEach(cell => {
      const i = parseInt(cell.dataset.voice, 10);
      const v = this.voices[i];
      cell.classList.toggle('on', !!(v && v.gate));
      cell.classList.toggle('off', i >= this.params.voices);
    });
  }

  destroy() {
    this.destroyed = true;
  }
}

ModuleBase.register(PolySynthModule);
