// VocoderModule.js - a channel vocoder: the MODULATOR (a voice, drums) shapes the CARRIER (a synth),
// so the synth "talks" or "sings" with the modulator's vowels and rhythm.
// Both sounds are split into the same row of frequency bands; the loudness of each modulator band
// turns its carrier band up or down. All the sound work happens in one AudioWorklet (made from a
// string, like the Compressor). The display shows one bar per band: the modulator's shape right now.
// Built on the shared template (ModuleBase.js).

const VOCODER_LOW = 100;     // lowest band center (Hz)
const VOCODER_HIGH = 8000;   // highest band center (Hz)

const VOCODER_WORKLET = `
  const LOW = ${VOCODER_LOW};
  const HIGH = ${VOCODER_HIGH};

  // Band-pass coefficients (RBJ, 0 dB peak) for a center frequency and a width in octaves
  function bandpass(f, bw) {
    const w0 = 2 * Math.PI * Math.min(f, 0.45 * sampleRate) / sampleRate;
    const alpha = Math.sin(w0) * Math.sinh(Math.LN2 / 2 * bw * w0 / Math.sin(w0));
    const a0 = 1 + alpha;
    return { b0: alpha / a0, b2: -alpha / a0, a1: -2 * Math.cos(w0) / a0, a2: (1 - alpha) / a0 };
  }

  class VocoderProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      const k = (name, defaultValue, minValue, maxValue) => ({ name, defaultValue, minValue, maxValue, automationRate: 'k-rate' });
      return [
        k('attack', 0.005, 0.0005, 0.5), k('release', 0.05, 0.005, 2), k('shift', 0, -12, 12),
        k('noise', 0.1, 0, 1), k('width', 0.5, 0, 1), k('level', 1, 0, 8)
      ];
    }

    constructor() {
      super();
      this.freeze = false;
      this.shift = null;
      this.level = 1;
      this.seed = 22222;
      this.repN = 0;
      this.setBands(16);
      this.port.onmessage = e => {
        const m = e.data || {};
        if (m.bands !== undefined && m.bands !== this.n) this.setBands(m.bands);
        if (m.freeze !== undefined) this.freeze = m.freeze;
      };
    }

    setBands(n) {
      this.n = n;
      this.bw = Math.log2(HIGH / LOW) / (n - 1);
      this.freqs = [];
      for (let b = 0; b < n; b++) this.freqs.push(LOW * Math.pow(HIGH / LOW, b / (n - 1)));
      // Two band-pass stages per band and per sound, for steeper sides: [x1, x2, y1, y2] each
      this.mState = new Float64Array(n * 8);
      this.cState = new Float64Array(n * 8);
      this.env = new Float64Array(n);
      this.rep = new Float32Array(n);
      this.mCoef = this.freqs.map(f => bandpass(f, this.bw * 1.2));
      // Higher carrier bands are turned up (+3 dB per octave) so a saw comes out even from low to high
      this.tilt = this.freqs.map(f => Math.sqrt(f / 1000));
      this.shift = null;
    }

    setShift(semis) {
      this.shift = semis;
      const r = Math.pow(2, semis / 12);
      this.cCoef = this.freqs.map(f => bandpass(f * r, this.bw * 1.2));
    }

    process(inputs, outputs, parameters) {
      const out = outputs[0];
      const outL = out[0];
      const outR = out[1] || out[0];
      if (!outL) return true;
      const car = inputs[0] && inputs[0][0];
      const mod = inputs[1] && inputs[1][0];
      const sr = sampleRate;
      if (parameters.shift[0] !== this.shift) this.setShift(parameters.shift[0]);
      const att = Math.exp(-1 / (parameters.attack[0] * sr));
      const rel = Math.exp(-1 / (parameters.release[0] * sr));
      const noise = parameters.noise[0] * 0.3;
      const width = parameters.width[0];
      // Odd bands lean left, even bands right; the louder side stays at 1, the other drops to 1 - Width
      const far = 1 - width;
      const norm = Math.SQRT2 / Math.sqrt(1 + far * far);
      const smooth = Math.exp(-1 / (0.02 * sr));
      const lvlTarget = parameters.level[0];
      const n = this.n;
      const ms = this.mState, cs = this.cState, env = this.env, mc = this.mCoef, cc = this.cCoef, tilt = this.tilt;
      const frozen = this.freeze;

      for (let i = 0; i < outL.length; i++) {
        this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
        const xc = (car ? car[i] : 0) + noise * ((this.seed / 4294967296) * 2 - 1);
        const xm = mod ? mod[i] : 0;
        let sumL = 0, sumR = 0;
        for (let b = 0; b < n; b++) {
          const o = b * 8;
          // Modulator band -> its loudness (envelope follower)
          if (!frozen) {
            let c = mc[b];
            let y = c.b0 * xm + c.b2 * ms[o + 1] - c.a1 * ms[o + 2] - c.a2 * ms[o + 3];
            ms[o + 1] = ms[o]; ms[o] = xm; ms[o + 3] = ms[o + 2]; ms[o + 2] = y;
            const y2 = c.b0 * y + c.b2 * ms[o + 5] - c.a1 * ms[o + 6] - c.a2 * ms[o + 7];
            ms[o + 5] = ms[o + 4]; ms[o + 4] = y; ms[o + 7] = ms[o + 6]; ms[o + 6] = y2;
            const r = Math.abs(y2);
            const k = r > env[b] ? att : rel;
            env[b] = k * env[b] + (1 - k) * r;
          }
          // Carrier band, turned up or down by that loudness
          const c = cc[b];
          const y = c.b0 * xc + c.b2 * cs[o + 1] - c.a1 * cs[o + 2] - c.a2 * cs[o + 3];
          cs[o + 1] = cs[o]; cs[o] = xc; cs[o + 3] = cs[o + 2]; cs[o + 2] = y;
          const y2 = c.b0 * y + c.b2 * cs[o + 5] - c.a1 * cs[o + 6] - c.a2 * cs[o + 7];
          cs[o + 5] = cs[o + 4]; cs[o + 4] = y; cs[o + 7] = cs[o + 6]; cs[o + 6] = y2;
          const v = y2 * env[b] * tilt[b];
          if (b & 1) { sumL += v * far; sumR += v; } else { sumL += v; sumR += v * far; }
        }
        this.level = smooth * this.level + (1 - smooth) * lvlTarget;
        const g = this.level * norm * 1.5 * n;   // more bands are each narrower and quieter
        outL[i] = Math.tanh(sumL * g);
        if (outR !== outL) outR[i] = Math.tanh(sumR * g);
      }
      for (let b = 0; b < n; b++) if (env[b] > this.rep[b]) this.rep[b] = env[b];

      // About 30 reports a second for the display
      this.repN += outL.length;
      if (this.repN >= 1536) {
        this.port.postMessage({ env: this.rep.slice() });
        this.rep.fill(0);
        this.repN = 0;
      }
      return true;
    }
  }
  registerProcessor('vocoder-processor', VocoderProcessor);
`;

class VocoderModule extends ModuleBase {
  static def = {
    type: 'vocoder',
    title: 'Vocoder',
    width: 300,
    menu: { group: 'Processors & Effects', label: 'Vocoder' },
    params: [
      { id: 'bands', label: 'Bands', kind: 'select', value: '16',
        options: [['8', '8 bands'], ['12', '12 bands'], ['16', '16 bands'], ['24', '24 bands'], ['32', '32 bands']] },
      { id: 'attack', label: 'Attack', min: 1, max: 200, step: 1, value: 5, format: v => `${v} ms` },
      { id: 'release', label: 'Release', min: 10, max: 1500, step: 5, value: 60, format: v => `${v} ms` },
      { id: 'shift', label: 'Shift', min: -12, max: 12, step: 0.5, value: 0, format: v => `${v > 0 ? '+' : ''}${v} st` },
      { id: 'noise', label: 'Noise', min: 0, max: 100, step: 1, value: 10, unit: '%' },
      { id: 'width', label: 'Width', min: 0, max: 100, step: 1, value: 50, unit: '%' },
      { id: 'level', label: 'Level', min: -24, max: 12, step: 0.5, value: 0, format: v => `${v > 0 ? '+' : ''}${v} dB` },
      { id: 'freeze', label: 'Freeze', kind: 'toggle', value: false }
    ],
    inputs: [
      { id: 'carrier', label: 'CARRIER', signal: 'audio', title: 'Carrier Input',
        guide: { text: 'The sound that gets shaped: it gives the notes. A bright, steady sound works best (a sawtooth Oscillator, a Poly Synth chord).', from: 'Oscillator OUT (sawtooth), Poly Synth OUT, Wavetable Osc OUT, VCA OUT',
          match: ['oscillator:out:default', 'polysynth:out:out', 'wavetable:out:out', 'vca:out:audio', 'filter:out:default', 'mixer:out:out_l'] },
        chip: 'Synth / Oscillator' },
      { id: 'modulator', label: 'MOD', signal: 'audio', title: 'Modulator Input',
        guide: { text: 'The sound that does the shaping: its vowels and rhythm are put onto the carrier. A voice from the Mic is the classic; drums or a Vocal wavetable work too.', from: 'Mic / Audio In OUT, Wavetable Osc OUT (Vocal table), Drum Machine MAIN L',
          match: ['audio_in:out:audio', 'wavetable:out:out', 'drums:out:main_l', 'vca:out:audio', 'granular:out:out_l'] },
        chip: 'Mic / Voice / Drums' }
    ],
    outputs: [
      { id: 'out_l', label: 'OUT L', signal: 'audio', title: 'Left Output',
        guide: { text: 'The talking synth, left side.', to: 'Output IN L, Reverb IN L, Stereo Delay IN L, Mixer, Recorder',
          match: ['output:in:in', 'reverb:in:in_l', 'delay:in:in_l', 'mixer:in:ch_in', 'recorder:in:in', 'oscilloscope:in:audio'] },
        chip: 'Output / Reverb L' },
      { id: 'out_r', label: 'OUT R', signal: 'audio', title: 'Right Output',
        guide: { text: 'The talking synth, right side.', to: 'Output IN R, Reverb IN R, Stereo Delay IN R, Mixer',
          match: ['output:in:in_r', 'reverb:in:in_r', 'delay:in:in_r', 'mixer:in:ch_in'] },
        chip: 'Output / Reverb R' }
    ]
  };

  static workletReady = null;   // one shared promise per audio context

  static loadWorklet(ctx) {
    if (!ctx.audioWorklet) return Promise.reject(new Error('AudioWorklet not supported'));
    if (!VocoderModule.workletReady || VocoderModule.workletCtx !== ctx) {
      VocoderModule.workletCtx = ctx;
      const url = URL.createObjectURL(new Blob([VOCODER_WORKLET], { type: 'application/javascript' }));
      VocoderModule.workletReady = ctx.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url));
    }
    return VocoderModule.workletReady;
  }

  build() {
    const ctx = this.audioCtx;
    // Both inputs are mixed down to mono
    const monoGain = () => {
      const g = ctx.createGain();
      g.channelCount = 1;
      g.channelCountMode = 'explicit';
      g.channelInterpretation = 'speakers';
      return this.own(g);
    };
    this.carIn = monoGain();
    this.modIn = monoGain();
    this.outL = this.own(ctx.createGain());
    this.outR = this.own(ctx.createGain());
    this.splitter = this.own(ctx.createChannelSplitter(2));
    this.splitter.connect(this.outL, 0);
    this.splitter.connect(this.outR, 1);
    this.inputNodes = { carrier: this.carIn, modulator: this.modIn };
    this.outputNodes = { out_l: this.outL, out_r: this.outR };
    this.env = null;      // latest band levels from the worklet, for the display
    this.shown = null;
    this.node = null;
    this.destroyed = false;
    // Silent until the worklet is loaded (a vocoder has no sensible pass-through)
    VocoderModule.loadWorklet(ctx).then(() => {
      if (this.destroyed) return;
      this.node = this.own(new AudioWorkletNode(ctx, 'vocoder-processor', {
        numberOfInputs: 2, numberOfOutputs: 1, outputChannelCount: [2],
        channelCount: 1, channelCountMode: 'explicit', channelInterpretation: 'speakers'
      }));
      (this.def.params || []).forEach(p => this.applyParam(p.id, this.params[p.id], true));
      this.node.port.onmessage = e => {
        if (e.data && e.data.env) this.env = e.data.env;
      };
      this.carIn.connect(this.node, 0, 0);
      this.modIn.connect(this.node, 0, 1);
      this.node.connect(this.splitter);
    }).catch(err => console.warn('Vocoder: AudioWorklet unavailable.', err));
  }

  // Control values in the worklet's units (seconds, 0-1, linear gain), glided so moving a slider never clicks
  applyParam(id, value, instant) {
    if (!this.node) return;
    if (id === 'bands') { this.node.port.postMessage({ bands: parseInt(value, 10) || 16 }); this.env = null; return; }
    if (id === 'freeze') { this.node.port.postMessage({ freeze: !!value }); return; }
    const param = this.node.parameters.get(id);
    if (!param) return;
    let v = value;
    if (id === 'attack' || id === 'release') v = value / 1000;
    else if (id === 'noise' || id === 'width') v = value / 100;
    else if (id === 'level') v = Math.pow(10, value / 20);
    const now = this.audioCtx.currentTime;
    // Shift changes the band filters, so it jumps instead of gliding
    if (instant || id === 'shift') param.setValueAtTime(v, now);
    else param.setTargetAtTime(v, now, 0.02);
  }

  onParamChange(id, value) {
    this.applyParam(id, value, false);
  }

  renderBody() {
    return `<canvas id="${this.elId('display')}" class="vocoder-display" width="560" height="200"></canvas>`;
  }

  onMount(card) {
    card.classList.add('vocoder-card');
    const tick = () => {
      if (this.destroyed || !this.card || !this.card.isConnected) return;
      this.drawDisplay();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // One bar per band, low on the left; height is the modulator band's level (-60 to 0 dB)
  drawDisplay() {
    const c = this.el('display');
    if (!c) return;
    const ctx = c.getContext('2d');
    const css = getComputedStyle(this.card);
    const muted = css.getPropertyValue('--muted-text').trim() || '#64748b';
    const primary = css.getPropertyValue('--primary-color').trim() || '#2563eb';
    const border = css.getPropertyValue('--panel-border').trim() || '#e2e8f0';
    const w = c.width;
    const h = c.height;
    const pad = 12;
    const labelH = 34;
    const top = pad;
    const bottom = h - pad - labelH;
    ctx.clearRect(0, 0, w, h);

    const n = parseInt(this.params.bands, 10) || 16;
    if (!this.shown || this.shown.length !== n) this.shown = new Float32Array(n);
    const env = this.env && this.env.length === n ? this.env : null;
    const slot = (w - pad * 2) / n;
    const gap = Math.max(2, slot * 0.18);

    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, top, w - pad * 2, bottom - top);
    for (let b = 0; b < n; b++) {
      const db = env ? 20 * Math.log10(env[b] + 1e-6) : -120;
      const target = Math.max(0, Math.min(1, (db + 60) / 60));
      // Bars jump up and fall back gently
      this.shown[b] = target > this.shown[b] ? target : this.shown[b] * 0.85 + target * 0.15;
      const bh = (bottom - top - 4) * this.shown[b];
      ctx.fillStyle = primary;
      ctx.globalAlpha = this.params.freeze ? 0.45 : 0.85;
      ctx.fillRect(pad + b * slot + gap / 2, bottom - 2 - bh, slot - gap, bh);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = muted;
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    ctx.fillText(`${VOCODER_LOW} Hz`, pad, h - 4);
    ctx.textAlign = 'center';
    ctx.fillText(this.params.freeze ? 'Frozen' : `${n} bands`, w / 2, h - 4);
    ctx.textAlign = 'right';
    ctx.fillText(`${VOCODER_HIGH / 1000} kHz`, w - pad, h - 4);
  }

  destroy() {
    this.destroyed = true;
  }
}

ModuleBase.register(VocoderModule);
