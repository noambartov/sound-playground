// PolySynthModule.js - a complete polyphonic synth in one module: up to 8 voices, each with two
// oscillators (the second one detuned), a low-pass filter with its own envelope, and a volume
// envelope. Notes arrive on one NOTES cable from the Keyboard (every held key, not just the top one).
// The oscillators can also play the Wavetable Osc's tables (WT_TABLES in WavetableModule.js, loaded
// before this file), with Position and Warp, as browser PeriodicWaves (band-limited by the browser).
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
const POLY_CLASSIC_WAVES = ['sawtooth', 'square', 'triangle', 'sine'];
const POLY_WARP_N = 2048;   // samples per cycle when Warp is applied (harmonics up to 256 fit easily)

class PolySynthModule extends ModuleBase {
  static def = {
    type: 'polysynth',
    title: 'Poly Synth',
    width: 240,
    menu: { group: 'Sound Sources', label: 'Poly Synth' },
    params: [
      { id: 'voices', label: 'Voices', min: 1, max: POLY_MAX_VOICES, step: 1, value: 8 },
      { id: 'wave', label: 'Waveform', kind: 'select', value: 'sawtooth',
        options: [['sawtooth', 'Sawtooth'], ['square', 'Square'], ['triangle', 'Triangle'], ['sine', 'Sine'],
          ['wt_basic', 'Wavetable: Basic'], ['wt_vocal', 'Wavetable: Vocal'], ['wt_digital', 'Wavetable: Digital'],
          ['wt_organ', 'Wavetable: Organ'], ['wt_pwm', 'Wavetable: PWM']] },
      { id: 'position', label: 'Position', min: 0, max: 100, step: 0.5, value: 0, unit: '%' },
      { id: 'warp', label: 'Warp', min: 0, max: 100, step: 1, value: 0, unit: '%' },
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

  // The 8 frames of a Wavetable Osc table as harmonics (sine s, cosine c), each scaled to a peak of 1
  // like the Wavetable Osc does
  static tableFrames(name) {
    PolySynthModule.frameCache = PolySynthModule.frameCache || {};
    if (PolySynthModule.frameCache[name]) return PolySynthModule.frameCache[name];
    const frames = [];
    for (let fi = 0; fi < WT_FRAMES; fi++) {
      const s = new Float32Array(WT_MAX_H + 1);
      const c = new Float32Array(WT_MAX_H + 1);
      WT_TABLES[name](fi / (WT_FRAMES - 1), s, c);
      const wave = PolySynthModule.synth(s, c);
      const peak = wave.reduce((m, x) => Math.max(m, Math.abs(x)), 0) || 1;
      for (let h = 1; h <= WT_MAX_H; h++) { s[h] /= peak; c[h] /= peak; }
      frames.push({ s, c });
    }
    PolySynthModule.frameCache[name] = frames;
    return frames;
  }

  // In-place radix-2 FFT (re / im of a power-of-two length); inverse = no 1/N scaling
  static fft(re, im, inverse) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [re[i], re[j]] = [re[j], re[i]];
        [im[i], im[j]] = [im[j], im[i]];
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (inverse ? 2 : -2) * Math.PI / len;
      const wr = Math.cos(ang);
      const wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1;
        let ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const ar = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
          const ai = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
          re[i + k + len / 2] = re[i + k] - ar;
          im[i + k + len / 2] = im[i + k] - ai;
          re[i + k] += ar;
          im[i + k] += ai;
          const t = cr * wr - ci * wi;
          ci = cr * wi + ci * wr;
          cr = t;
        }
      }
    }
  }

  // One cycle of POLY_WARP_N samples from harmonics (sine s, cosine c)
  static synth(s, c) {
    const N = POLY_WARP_N;
    const re = new Float64Array(N);
    const im = new Float64Array(N);
    for (let h = 1; h <= WT_MAX_H && h < N / 2; h++) {
      re[h] = c[h] / 2; im[h] = -s[h] / 2;
      re[N - h] = c[h] / 2; im[N - h] = s[h] / 2;
    }
    PolySynthModule.fft(re, im, true);
    return re;
  }

  // Harmonics (sine s, cosine c) of one cycle of POLY_WARP_N samples
  static analyze(wave) {
    const N = wave.length;
    const re = Float64Array.from(wave);
    const im = new Float64Array(N);
    PolySynthModule.fft(re, im, false);
    const s = new Float32Array(WT_MAX_H + 1);
    const c = new Float32Array(WT_MAX_H + 1);
    for (let h = 1; h <= WT_MAX_H && h < N / 2; h++) {
      c[h] = 2 * re[h] / N;
      s[h] = -2 * im[h] / N;
    }
    return { s, c };
  }

  // The PeriodicWave for a table at Position (0..1) and Warp (0..1), cached
  static tableWave(ctx, name, pos, warp) {
    if (PolySynthModule.waveCtx !== ctx || PolySynthModule.waveCache.size > 600) {
      PolySynthModule.waveCtx = ctx;
      PolySynthModule.waveCache = new Map();
    }
    const key = `${name}|${pos.toFixed(3)}|${warp.toFixed(2)}`;
    const hit = PolySynthModule.waveCache.get(key);
    if (hit) return hit;

    // Neighboring frames blended, like the Wavetable Osc's crossfade
    const frames = PolySynthModule.tableFrames(name);
    const x = pos * (WT_FRAMES - 1);
    const i = Math.min(WT_FRAMES - 2, Math.floor(x));
    const fr = x - i;
    let s = new Float32Array(WT_MAX_H + 1);
    let c = new Float32Array(WT_MAX_H + 1);
    for (let h = 1; h <= WT_MAX_H; h++) {
      s[h] = frames[i].s[h] * (1 - fr) + frames[i + 1].s[h] * fr;
      c[h] = frames[i].c[h] * (1 - fr) + frames[i + 1].c[h] * fr;
    }

    // Warp: the same phase distortion as the Wavetable Osc, then back to harmonics (DFT)
    if (warp > 0) {
      const k = 0.5 - 0.45 * warp;
      const src = PolySynthModule.synth(s, c);
      const N = POLY_WARP_N;
      const warped = new Float64Array(N);
      for (let n = 0; n < N; n++) {
        const p = n / N;
        const q = (p < k ? 0.5 * p / k : 0.5 + 0.5 * (p - k) / (1 - k)) * N;
        const i0 = Math.floor(q) % N;
        const f = q - Math.floor(q);
        warped[n] = src[i0] + (src[(i0 + 1) % N] - src[i0]) * f;
      }
      ({ s, c } = PolySynthModule.analyze(warped));
    }

    // Web Audio: real = cosine terms, imag = sine terms; the browser scales the wave to a peak of 1
    const wave = ctx.createPeriodicWave(c, s);
    PolySynthModule.waveCache.set(key, wave);
    return wave;
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
    this.applyWave();
    this.updateVoiceDisplay();
  }

  onParamChange(id, value) {
    if (!this.voices) return;
    const t = this.audioCtx.currentTime;
    if (id === 'wave' || id === 'position' || id === 'warp') {
      this.applyWave();
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

  // Classic waves use the oscillator type; wavetables a PeriodicWave for the current Position / Warp
  applyWave() {
    const wave = this.params.wave;
    const classic = POLY_CLASSIC_WAVES.includes(wave);
    if (classic) {
      this.voices.forEach(v => { v.osc1.type = wave; v.osc2.type = wave; });
      this.currentWave = null;
    } else {
      const table = wave.replace(/^wt_/, '');
      const pw = PolySynthModule.tableWave(this.audioCtx, WT_TABLES[table] ? table : 'basic',
        (this.params.position || 0) / 100, (this.params.warp || 0) / 100);
      if (pw !== this.currentWave) {
        this.voices.forEach(v => { v.osc1.setPeriodicWave(pw); v.osc2.setPeriodicWave(pw); });
        this.currentWave = pw;
      }
    }
    // Position and Warp only work with a wavetable
    ['position', 'warp'].forEach(id => {
      const sl = this.el(`p_${id}`);
      if (sl) sl.disabled = classic;
    });
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
