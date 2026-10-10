// WavetableModule.js - a wavetable oscillator. Each table is a row of 8 waves; Position glides
// smoothly between them (the sound "moves" when an LFO or envelope turns it) and Warp bends each
// wave for more colors. The waves are built here from harmonic recipes, once per table, in 10
// band-limited copies (fewer harmonics for higher notes, so high notes do not alias). The sound
// runs in one AudioWorklet (made from a string, like the Degrader).
// Built on the shared template (ModuleBase.js).

const WT_FRAMES = 8;
const WT_LEVELS = 10;
const WT_SIZE = 2048;
const WT_BASE_F = 40;      // level k holds notes up to 40 Hz x 2^k
const WT_MAX_H = 256;

const WAVETABLE_WORKLET = `
  class WavetableProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      return [
        { name: 'freq', defaultValue: 0, automationRate: 'a-rate' },
        { name: 'fm', defaultValue: 0, automationRate: 'a-rate' },
        { name: 'pos', defaultValue: 0, automationRate: 'a-rate' },
        { name: 'posmod', defaultValue: 0, automationRate: 'a-rate' },
        { name: 'ratio', defaultValue: 1, automationRate: 'k-rate' },
        { name: 'warp', defaultValue: 0, automationRate: 'k-rate' }
      ];
    }

    constructor() {
      super();
      this.table = null;
      this.phase = 0;
      this.lastPos = -1;
      this.count = 0;
      this.port.onmessage = e => {
        const m = e.data || {};
        if (m.data) this.table = m;
      };
    }

    process(inputs, outputs, parameters) {
      const out = outputs[0][0];
      if (!out) return true;
      const t = this.table;
      if (!t) { out.fill(0); return true; }
      const { data, frames, levels, size, baseF } = t;
      const levelLen = size;
      const frameLen = levels * size;
      const P = parameters;
      const one = (arr, i) => (arr.length > 1 ? arr[i] : arr[0]);
      const ratio = P.ratio[0];
      const warp = Math.min(1, Math.max(0, P.warp[0]));
      const k = 0.5 - 0.45 * warp;
      let pos = 0;
      for (let i = 0; i < out.length; i++) {
        const f = one(P.freq, i) * ratio + one(P.fm, i);
        const af = Math.abs(f);
        let level = af <= baseF ? 0 : Math.ceil(Math.log2(af / baseF));
        if (level > levels - 1) level = levels - 1;
        this.phase += f / sampleRate;
        this.phase -= Math.floor(this.phase);
        // Warp: phase distortion, the first half of the wave is squeezed into a shorter time
        const ph = warp > 0 ? (this.phase < k ? this.phase * 0.5 / k : 0.5 + (this.phase - k) * 0.5 / (1 - k)) : this.phase;
        pos = Math.min(1, Math.max(0, one(P.pos, i) + one(P.posmod, i)));
        const fp = pos * (frames - 1);
        const f0 = Math.min(frames - 2, Math.floor(fp));
        const fr = fp - f0;
        const x = ph * size;
        const i0 = Math.floor(x);
        const xf = x - i0;
        const i1 = (i0 + 1) % size;
        const a = f0 * frameLen + level * levelLen;
        const b = a + frameLen;
        const va = data[a + i0] + (data[a + i1] - data[a + i0]) * xf;
        const vb = data[b + i0] + (data[b + i1] - data[b + i0]) * xf;
        out[i] = va + (vb - va) * fr;
      }
      // Tell the card where Position is now (for the display), a few times per second
      this.count += out.length;
      if (this.count >= 2048) {
        this.count = 0;
        if (Math.abs(pos - this.lastPos) > 0.002) {
          this.lastPos = pos;
          this.port.postMessage({ pos });
        }
      }
      return true;
    }
  }
  registerProcessor('wavetable-processor', WavetableProcessor);
`;

// Harmonic recipes: for a table and a frame position t (0..1), the sine (s) and cosine (c)
// amplitude of each harmonic h = 1..WT_MAX_H
const WT_TABLES = {
  basic: (t, s) => {
    // Sine -> Triangle -> Saw -> Square
    const shapes = [
      h => (h === 1 ? 1 : 0),
      h => (h % 2 ? (8 / (Math.PI * Math.PI)) * (((h - 1) / 2) % 2 ? -1 : 1) / (h * h) : 0),
      h => (2 / Math.PI) * (h % 2 ? 1 : -1) / h,
      h => (h % 2 ? (4 / Math.PI) / h : 0)
    ];
    const x = t * 3;
    const i = Math.min(2, Math.floor(x));
    const fr = x - i;
    for (let h = 1; h <= WT_MAX_H; h++) s[h] = shapes[i](h) * (1 - fr) + shapes[i + 1](h) * fr;
  },
  vocal: (t, s) => {
    // Vowels A -> E -> I -> O -> U (two formants each), as heard on a 130 Hz note
    const V = [[730, 1090], [530, 1840], [270, 2290], [570, 840], [300, 870]];
    const x = t * 4;
    const i = Math.min(3, Math.floor(x));
    const fr = x - i;
    const F1 = V[i][0] + (V[i + 1][0] - V[i][0]) * fr;
    const F2 = V[i][1] + (V[i + 1][1] - V[i][1]) * fr;
    const g = (hz, F, bw) => Math.exp(-Math.pow((hz - F) / bw, 2));
    for (let h = 1; h <= WT_MAX_H; h++) {
      const hz = h * 130;
      s[h] = (g(hz, F1, 160) + 0.7 * g(hz, F2, 200) + 0.25 * g(hz, 2800, 300) + (h === 1 ? 0.4 : 0)) / Math.pow(h, 0.3);
    }
  },
  digital: (t, s) => {
    // A narrow band of harmonics that climbs up the spectrum, on top of a quiet fundamental
    const c = 2 + t * 46;
    const w = 1.2 + t * 3;
    for (let h = 1; h <= WT_MAX_H; h++) {
      s[h] = Math.exp(-Math.pow((h - c) / w, 2)) * (h % 2 ? 1 : -0.8) + (h === 1 ? 0.5 : 0);
    }
  },
  organ: (t, s) => {
    // Drawbar settings on harmonics 1, 2, 3, 4, 5, 6, 8, one per frame
    const H = [1, 2, 3, 4, 5, 6, 8];
    const R = [
      [1, 0, 0, 0, 0, 0, 0], [1, 1, 0, 0, 0, 0, 0], [1, 0.8, 0.6, 0, 0, 0, 0], [1, 1, 1, 1, 0, 0, 0],
      [0.8, 0.6, 0.8, 0.5, 0.4, 0.5, 0.3], [1, 0.2, 0.9, 0.1, 0.7, 0.1, 0.5], [0.6, 1, 0.4, 0.8, 0.3, 0.6, 0.8], [1, 1, 1, 1, 1, 1, 1]
    ];
    const x = t * (R.length - 1);
    const i = Math.min(R.length - 2, Math.floor(x));
    const fr = x - i;
    H.forEach((h, j) => { s[h] = R[i][j] * (1 - fr) + R[i + 1][j] * fr; });
  },
  pwm: (t, s, c) => {
    // A pulse that narrows from 50% to 4%
    const w = 0.5 - t * 0.46;
    for (let h = 1; h <= WT_MAX_H; h++) c[h] = (2 / (Math.PI * h)) * Math.sin(Math.PI * h * w);
  }
};

class WavetableModule extends ModuleBase {
  static def = {
    type: 'wavetable',
    title: 'Wavetable Osc',
    width: 260,
    menu: { group: 'Sound Sources', label: 'Wavetable Osc' },
    params: [
      { id: 'table', label: 'Table', kind: 'select', value: 'basic',
        options: [['basic', 'Basic (Sine to Square)'], ['vocal', 'Vocal (A E I O U)'], ['digital', 'Digital'], ['organ', 'Organ'], ['pwm', 'PWM (Pulse)']] },
      { id: 'position', label: 'Position', min: 0, max: 100, step: 0.1, value: 0, format: v => `${Math.round(v)}%` },
      { id: 'warp', label: 'Warp', min: 0, max: 100, step: 1, value: 0, unit: '%' },
      { id: 'freq', label: 'Frequency', min: 20, max: 2000, step: 1, value: 220, unit: 'Hz' },
      { id: 'octave', label: 'Octave', min: -3, max: 3, step: 1, value: 0, format: v => (v > 0 ? `+${v}` : `${v}`) },
      { id: 'tune', label: 'Tune', min: -100, max: 100, step: 1, value: 0, format: v => `${v > 0 ? '+' : ''}${v} cents` },
      { id: 'posDepth', label: 'POS Depth', min: 0, max: 100, step: 1, value: 100, unit: '%' }
    ],
    inputs: [
      { id: 'pitch', label: 'PITCH', signal: 'cv', title: 'Pitch Input',
        guide: { text: 'Plays notes (in Hz). While a cable is plugged in, the incoming note sets the pitch and the Frequency slider is set aside; Octave and Tune still apply.',
          from: 'Keyboard FREQ, Sequencer PITCH CV, Ribbon PITCH', match: ['keyboard:out:freq', 'sequencer:out:pitch', 'ribbon:out:pitch'] },
        chip: 'Keyboard / Seq' },
      { id: 'fm', label: 'FM', signal: 'cv', title: 'FM Input',
        guide: { text: 'Moves the pitch up and down around the note. An LFO gives vibrato; another oscillator gives metallic tones.',
          from: 'LFO OUT, Oscillator OUT', match: ['lfo:out:default', 'oscillator:out:default'] },
        chip: 'LFO / Osc' },
      { id: 'pos', label: 'POS', signal: 'cv', title: 'Position Input',
        guide: { text: 'Moves Position: 0 to 1 sweeps the whole table (scaled by POS Depth). An Envelope makes every note travel through the waves.',
          from: 'Envelope ENV OUT, Ribbon Y', match: ['envelope:out:env', 'ribbon:out:y', 'ribbon:out:press'] },
        chip: 'Env / Ribbon Y' }
    ],
    outputs: [
      { id: 'out', label: 'OUT', signal: 'audio', title: 'Audio Output',
        guide: { text: 'The sound of the wavetable oscillator.', to: 'Filter IN, VCA IN, Mixer, Output, Oscilloscope',
          match: ['filter:in:audio', 'vca:in:audio', 'mixer:in:ch_in', 'output:in:in', 'oscilloscope:in:audio', 'degrader:in:in', 'delay:in:in_l'] },
        chip: 'Filter / VCA' }
    ]
  };

  static workletReady = null;
  static tableCache = {};

  static loadWorklet(ctx) {
    if (!ctx.audioWorklet) return Promise.reject(new Error('AudioWorklet not supported'));
    if (!WavetableModule.workletReady || WavetableModule.workletCtx !== ctx) {
      WavetableModule.workletCtx = ctx;
      const url = URL.createObjectURL(new Blob([WAVETABLE_WORKLET], { type: 'application/javascript' }));
      WavetableModule.workletReady = ctx.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url));
    }
    return WavetableModule.workletReady;
  }

  // All frames x levels x samples of one table, each frame scaled to a peak of 1
  static buildTable(name, sampleRate) {
    const key = `${name}@${sampleRate}`;
    if (WavetableModule.tableCache[key]) return WavetableModule.tableCache[key];
    const recipe = WT_TABLES[name] || WT_TABLES.basic;
    const data = new Float32Array(WT_FRAMES * WT_LEVELS * WT_SIZE);
    const sinT = new Float32Array(WT_SIZE);
    const cosT = new Float32Array(WT_SIZE);
    for (let n = 0; n < WT_SIZE; n++) {
      sinT[n] = Math.sin(2 * Math.PI * n / WT_SIZE);
      cosT[n] = Math.cos(2 * Math.PI * n / WT_SIZE);
    }
    for (let fi = 0; fi < WT_FRAMES; fi++) {
      const s = new Float32Array(WT_MAX_H + 1);
      const c = new Float32Array(WT_MAX_H + 1);
      recipe(fi / (WT_FRAMES - 1), s, c);
      let peak = 0;
      for (let lv = 0; lv < WT_LEVELS; lv++) {
        const hmax = Math.max(1, Math.min(WT_MAX_H, Math.floor((sampleRate * 0.45) / (WT_BASE_F * Math.pow(2, lv)))));
        const off = (fi * WT_LEVELS + lv) * WT_SIZE;
        for (let h = 1; h <= hmax; h++) {
          const sh = s[h];
          const ch = c[h];
          if (!sh && !ch) continue;
          for (let n = 0, idx = 0; n < WT_SIZE; n++, idx = (idx + h) % WT_SIZE) {
            data[off + n] += sh * sinT[idx] + ch * cosT[idx];
          }
        }
        if (lv === 0) for (let n = 0; n < WT_SIZE; n++) peak = Math.max(peak, Math.abs(data[off + n]));
      }
      const g = peak > 0 ? 1 / peak : 1;
      const start = fi * WT_LEVELS * WT_SIZE;
      for (let n = 0; n < WT_LEVELS * WT_SIZE; n++) data[start + n] *= g;
    }
    const table = { data, frames: WT_FRAMES, levels: WT_LEVELS, size: WT_SIZE, baseF: WT_BASE_F };
    WavetableModule.tableCache[key] = table;
    return table;
  }

  build() {
    const ctx = this.audioCtx;
    this.pitchIn = this.own(ctx.createGain());
    this.fmIn = this.own(ctx.createGain());
    this.posIn = this.own(ctx.createGain());
    this.outNode = this.own(ctx.createGain());
    this.outNode.gain.value = 0.5;
    this.inputNodes = { pitch: this.pitchIn, fm: this.fmIn, pos: this.posIn };
    this.outputNodes = { out: this.outNode };
    this.pitchCables = 0;
    this.livePos = this.params.position / 100;
    this.processor = null;
    this.destroyed = false;
    WavetableModule.loadWorklet(ctx).then(() => {
      if (this.destroyed) return;
      const node = this.own(new AudioWorkletNode(ctx, 'wavetable-processor', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] }));
      this.processor = node;
      this.pitchIn.connect(node.parameters.get('freq'));
      this.fmIn.connect(node.parameters.get('fm'));
      this.posIn.connect(node.parameters.get('posmod'));
      node.connect(this.outNode);
      node.port.onmessage = e => {
        if (e.data && e.data.pos !== undefined) { this.livePos = e.data.pos; this.requestDraw(); }
      };
      ['table', 'position', 'warp', 'freq', 'octave'].forEach(id => this.onParamChange(id, this.params[id]));
    }).catch(err => console.warn('Wavetable: AudioWorklet unavailable.', err));
  }

  param(name) {
    return this.processor ? this.processor.parameters.get(name) : null;
  }

  onParamChange(id, value) {
    const now = this.audioCtx.currentTime;
    if (id === 'table') {
      if (this.processor) this.processor.port.postMessage(WavetableModule.buildTable(value, this.audioCtx.sampleRate));
      this.requestDraw();
    } else if (id === 'position') {
      const p = this.param('pos');
      if (p) p.setTargetAtTime(value / 100, now, 0.01);
      if (!this.posCables) this.livePos = value / 100;
      this.requestDraw();
    } else if (id === 'warp') {
      const p = this.param('warp');
      if (p) p.setValueAtTime(value / 100, now);
      this.requestDraw();
    } else if (id === 'freq') {
      this.applyBaseFrequency();
    } else if (id === 'octave' || id === 'tune') {
      const p = this.param('ratio');
      if (p) p.setValueAtTime(Math.pow(2, this.params.octave + this.params.tune / 1200), now);
    } else if (id === 'posDepth') {
      this.posIn.gain.setTargetAtTime(value / 100, now, 0.01);
    }
  }

  // While PITCH has a cable, the incoming note alone sets the pitch (like the Oscillator)
  applyBaseFrequency() {
    const p = this.param('freq');
    if (!p) return;
    const now = this.audioCtx.currentTime;
    p.cancelScheduledValues(now);
    p.setTargetAtTime(this.pitchCables > 0 ? 0 : this.params.freq, now, 0.003);
  }

  formatParam(p, value) {
    if (p.id === 'freq' && this.pitchCables > 0) return 'from PITCH IN';
    return super.formatParam(p, value);
  }

  onInputConnected(key, connected) {
    if (key === 'pos') this.posCables = Math.max(0, (this.posCables || 0) + (connected ? 1 : -1));
    if (key !== 'pitch') return;
    this.pitchCables = Math.max(0, this.pitchCables + (connected ? 1 : -1));
    this.applyBaseFrequency();
    const sl = this.el('p_freq');
    const ro = this.el('v_freq');
    if (sl) sl.disabled = this.pitchCables > 0;
    if (ro) ro.textContent = this.formatParam(this.paramDef('freq'), this.params.freq);
  }

  renderBody() {
    return `<canvas id="${this.elId('display')}" class="wt-display" width="480" height="240"></canvas>`;
  }

  onMount() {
    this.requestDraw();
  }

  requestDraw() {
    if (this.drawPending || !this.card) return;
    this.drawPending = true;
    requestAnimationFrame(() => {
      this.drawPending = false;
      if (!this.destroyed) this.drawDisplay();
    });
  }

  // The table as a stack of waves (front = first wave, back = last); the wave playing now is
  // drawn bright at its place in the stack, with Warp applied
  drawDisplay() {
    const cv = this.el('display');
    if (!cv) return;
    const g = cv.getContext('2d');
    const W = cv.width;
    const H = cv.height;
    const css = getComputedStyle(this.card);
    const muted = css.getPropertyValue('--muted-text').trim() || '#64748b';
    const primary = css.getPropertyValue('--primary-color').trim() || '#2563eb';
    g.clearRect(0, 0, W, H);
    const t = WavetableModule.buildTable(this.params.table, this.audioCtx.sampleRate);
    const pad = 14;
    const waveW = W * 0.6;
    const amp = H * 0.14;
    const dx = (W - waveW - pad * 2) / (WT_FRAMES - 1);
    const dy = (H - amp * 2 - pad * 2) / (WT_FRAMES - 1);
    const N = 120;
    const frameLen = WT_LEVELS * WT_SIZE;
    const sample = (fi, ph) => t.data[fi * frameLen + Math.floor(ph * WT_SIZE) % WT_SIZE];
    const drawWave = (fp, get) => {
      const x0 = pad + fp * dx;
      const yc = H - pad - amp - fp * dy;
      g.beginPath();
      for (let n = 0; n <= N; n++) {
        const v = get(n / N);
        const x = x0 + (n / N) * waveW;
        const y = yc - v * amp;
        if (n) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
    };
    g.lineWidth = 2;
    g.strokeStyle = muted;
    for (let fi = WT_FRAMES - 1; fi >= 0; fi--) {
      g.globalAlpha = 0.25 + 0.35 * (1 - fi / (WT_FRAMES - 1));
      drawWave(fi, ph => sample(fi, ph));
    }
    g.globalAlpha = 1;
    // The wave playing now
    const warp = this.params.warp / 100;
    const k = 0.5 - 0.45 * warp;
    const fp = Math.min(1, Math.max(0, this.livePos)) * (WT_FRAMES - 1);
    const f0 = Math.min(WT_FRAMES - 2, Math.floor(fp));
    const fr = fp - f0;
    g.lineWidth = 4;
    g.strokeStyle = primary;
    drawWave(fp, ph => {
      const p = warp > 0 ? (ph < k ? ph * 0.5 / k : 0.5 + (ph - k) * 0.5 / (1 - k)) : ph;
      return sample(f0, p) * (1 - fr) + sample(f0 + 1, p) * fr;
    });
  }

  destroy() {
    this.destroyed = true;
  }
}

ModuleBase.register(WavetableModule);
