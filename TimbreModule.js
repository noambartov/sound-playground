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

// Sample analysis (owner's request 2026-10-25): finds the recipe of a recorded note. Pure functions on
// a mono Float32Array, so they can be tested outside the browser.
const TimbreAnalysis = {
  // In-place radix-2 FFT (re, im of length 2^k)
  fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const a = i + k, b = a + len / 2;
          const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
          re[b] = re[a] - tr; im[b] = im[a] - ti;
          re[a] += tr; im[a] += ti;
          const ncr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr; cr = ncr;
        }
      }
    }
  },

  // The steady part of the note: the 50 ms windows at least half as loud as the loudest one,
  // skipping the first 100 ms of that stretch (the attack), at most 1.5 s long
  steadyRegion(x, sr) {
    const win = Math.round(sr * 0.05);
    const rms = [];
    for (let i = 0; i + win <= x.length; i += win) {
      let e = 0;
      for (let k = i; k < i + win; k++) e += x[k] * x[k];
      rms.push(Math.sqrt(e / win));
    }
    const peak = Math.max(0, ...rms);
    if (peak < 1e-4) return null;
    let a = rms.findIndex(v => v >= peak * 0.5);
    let b = a;
    while (b + 1 < rms.length && rms[b + 1] >= peak * 0.5) b++;
    const start = (a + Math.min(2, Math.max(0, b - a - 2))) * win;
    const end = Math.min((b + 1) * win, start + Math.round(sr * 1.5));
    return end - start >= sr * 0.08 ? { start, end } : null;
  },

  // Fundamental by the YIN method (cumulative mean normalized difference), 40-2000 Hz
  yin(x, start, sr) {
    const W = 2048, maxTau = Math.min(Math.floor(sr / 40), 2048), minTau = Math.floor(sr / 2000);
    if (start + W + maxTau > x.length) return 0;
    const d = new Float32Array(maxTau + 1);
    for (let tau = 1; tau <= maxTau; tau++) {
      let sum = 0;
      for (let i = 0; i < W; i++) { const v = x[start + i] - x[start + i + tau]; sum += v * v; }
      d[tau] = sum;
    }
    let run = 0;
    const cm = new Float32Array(maxTau + 1);
    cm[0] = 1;
    for (let tau = 1; tau <= maxTau; tau++) { run += d[tau]; cm[tau] = run ? d[tau] * tau / run : 1; }
    let tau = -1;
    for (let t = minTau; t < maxTau; t++) {
      if (cm[t] < 0.15) { while (t + 1 < maxTau && cm[t + 1] < cm[t]) t++; tau = t; break; }
    }
    if (tau < 0) return 0;
    const a = cm[tau - 1], b = cm[tau], c = cm[tau + 1];
    const shift = (a - 2 * b + c) ? 0.5 * (a - c) / (a - 2 * b + c) : 0;
    return sr / (tau + shift);
  },

  // { f0, levels[16] } (loudest partial = 1) or { error: '...' }
  analyze(x, sr) {
    const region = this.steadyRegion(x, sr);
    if (!region) return { error: 'The sample is silent or too short. Use a single note of at least a quarter second.' };
    // Pitch: median of up to 5 frames across the steady part
    const f0s = [];
    for (let k = 0; k < 5; k++) {
      const at = Math.round(region.start + (region.end - region.start - 4200) * k / 4);
      if (at < region.start) continue;
      const f = this.yin(x, at, sr);
      if (f) f0s.push(f);
    }
    if (f0s.length < 2) return { error: 'No clear note found. Use one note of a single instrument (not a chord or a noise).' };
    f0s.sort((p, q) => p - q);
    const f0 = f0s[Math.floor(f0s.length / 2)];
    // Spectrum: average of Hann-windowed 8192-sample frames across the steady part
    const N = 8192;
    const mag = new Float32Array(N / 2);
    let frames = 0;
    for (let at = region.start; at + N <= region.end || (frames === 0 && at + N <= x.length); at += N / 2) {
      const re = new Float32Array(N), im = new Float32Array(N);
      for (let i = 0; i < N; i++) re[i] = x[at + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
      this.fft(re, im);
      for (let i = 0; i < N / 2; i++) mag[i] += Math.hypot(re[i], im[i]);
      frames++;
      if (frames >= 8) break;
    }
    if (!frames) return { error: 'The sample is too short. Use a single note of at least a quarter second.' };
    const binHz = sr / N;
    const levels = [];
    let harmE = 0;
    for (let n = 1; n <= 16; n++) {
      const fc = n * f0;
      if (fc > sr * 0.45) { levels.push(0); continue; }
      const half = Math.max(2, Math.min(0.04 * fc, 0.45 * f0) / binHz);
      // The strongest bin near n x f0, measured as the energy of it and its 2 neighbours each side
      // (so a partial that falls between two bins reads the same as one on a bin)
      let pk = -1;
      for (let i = Math.max(1, Math.floor(fc / binHz - half)); i <= Math.ceil(fc / binHz + half) && i < N / 2; i++) if (pk < 0 || mag[i] > mag[pk]) pk = i;
      let e = 0;
      for (let i = pk - 2; i <= pk + 2; i++) if (i > 0 && i < N / 2) e += mag[i] * mag[i];
      levels.push(Math.sqrt(e));
    }
    // How much of the sound sits on the partials (a chord or noise spreads it elsewhere)
    let totalE = 0;
    const top = Math.min(N / 2 - 1, Math.round(16.5 * f0 / binHz));
    for (let i = Math.round(30 / binHz); i <= top; i++) totalE += mag[i] * mag[i];
    for (let n = 1; n <= 16; n++) {
      const c = Math.round(n * f0 / binHz);
      for (let i = c - 3; i <= c + 3; i++) if (i > 0 && i <= top) harmE += mag[i] * mag[i];
    }
    if (!totalE || harmE / totalE < 0.35) return { error: 'No clear note found. Use one note of a single instrument (not a chord or a noise).' };
    const max = Math.max(...levels);
    // Partials 1 and 2 both missing: the 'fundamental' is a common divisor of several notes (a chord)
    if (levels[0] < 0.05 * max && levels[1] < 0.05 * max) return { error: 'No clear note found. Use one note of a single instrument (not a chord or a noise).' };
    return { f0, levels: levels.map(v => Math.round(v / max * 1000) / 1000) };
  }
};

window.TimbreAnalysis = TimbreAnalysis;

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
    if (this.params.preset === 'sample' && this.sample) return this.sample.levels.slice();
    return (TIMBRE_PRESETS[this.params.preset] || TIMBRE_PRESETS.sine).levels.slice();
  }

  onParamChange(id) {
    if (id !== 'preset' || !this.bus) return;
    this.drawBars();
    // Only a choice made on the card moves the faders (setState while loading a patch does not)
    if (this.card && !this.loadingState) this.bus.send();
  }

  // A recipe learned from a sample is saved with the patch ({ name, f0, levels[16] }), so the
  // file is not needed again; it is restored before the Instrument menu so 'sample' exists there.
  setState(state) {
    this.loadingState = true;
    try {
      if (state && state.sample) this.setSample(state.sample);
      super.setState(state);
    } finally { this.loadingState = false; }
  }

  getExtraState() { return this.sample ? { sample: this.sample } : {}; }

  setSample(sample) {
    if (!sample || !Array.isArray(sample.levels)) return;
    this.sample = { name: String(sample.name || 'Sample').slice(0, 40), f0: +sample.f0 || 0, levels: sample.levels.slice(0, 16).map(v => +v || 0) };
    const sel = this.el('p_preset');
    if (!sel) return;
    let opt = sel.querySelector('option[value="sample"]');
    if (!opt) { opt = document.createElement('option'); opt.value = 'sample'; sel.appendChild(opt); }
    opt.textContent = `Sample: ${this.sample.name.slice(0, 18)}`;
  }

  static noteOf(f) {
    const midi = Math.round(69 + 12 * Math.log2(f / 440));
    return `${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
  }

  // Load Sample: decode the file, analyze it, and on success make it the chosen recipe
  async loadSample(file) {
    const text = this.el('text');
    const say = msg => { if (text) text.textContent = msg; };
    say('Analyzing...');
    try {
      const data = await file.arrayBuffer();
      const buf = await new Promise((ok, fail) => {
        const p = this.audioCtx.decodeAudioData(data, ok, fail);
        if (p && typeof p.then === 'function') p.then(ok, fail);
      });
      const mono = new Float32Array(buf.length);
      for (let c = 0; c < buf.numberOfChannels; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < d.length; i++) mono[i] += d[i] / buf.numberOfChannels;
      }
      const r = TimbreAnalysis.analyze(mono, buf.sampleRate);
      if (r.error) { say(r.error); return; }
      this.setSample({ name: file.name.replace(/\.[^.]+$/, ''), f0: r.f0, levels: r.levels });
      this.setParam('preset', 'sample');   // draws the bars and moves the Mixer faders
      if (window.synthApp) window.synthApp.scheduleHistoryCapture();
    } catch (e) {
      say('This file could not be read. Try a WAV, MP3 or M4A file.');
    }
  }

  renderBody() {
    return `<div class="timbre-bars" id="${this.elId('bars')}"></div>
      <div class="timbre-text" id="${this.elId('text')}"></div>`;
  }

  renderControls() {
    return super.renderControls() +
      `<div class="timbre-btns">
        <button class="action-btn" id="${this.elId('apply')}" title="Move the Mixer faders back to this recipe">Apply to Mixer</button>
        <button class="action-btn" id="${this.elId('load')}" title="Load a recording of one note and learn its recipe">Load Sample</button>
      </div>
      <input type="file" id="${this.elId('file')}" accept="audio/*,.wav,.mp3,.m4a,.aif,.aiff,.flac,.ogg" hidden>`;
  }

  onMount() {
    const btn = this.el('apply');
    if (btn) btn.addEventListener('click', () => this.bus.send());
    const load = this.el('load'), file = this.el('file');
    if (load && file) {
      load.addEventListener('click', () => file.click());
      file.addEventListener('change', () => {
        if (file.files && file.files[0]) this.loadSample(file.files[0]);
        file.value = '';
      });
    }
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
    if (!text) return;
    if (this.params.preset === 'sample' && this.sample) {
      const f = this.sample.f0;
      text.textContent = `Learned from "${this.sample.name}": ${f ? `${TimbreModule.noteOf(f)}, ${f.toFixed(1)} Hz` : 'note unknown'}.`;
    } else text.textContent = (TIMBRE_PRESETS[this.params.preset] || {}).text || '';
  }
}

ModuleBase.register(TimbreModule);
