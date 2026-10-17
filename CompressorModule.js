// CompressorModule.js - a stereo compressor: turns loud parts down so the sound is more even and punchy.
// The SC (sidechain) input lets another sound decide when to turn down (e.g. a kick that makes a pad "pump").
// All the sound work happens in one AudioWorklet (made from a string, like the Degrader).
// The display shows the compression curve, a dot for the level coming in, and a Reduction meter.
// Built on the shared template (ModuleBase.js).

const COMPRESSOR_WORKLET = `
  class CompressorProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      const k = (name, defaultValue, minValue, maxValue) => ({ name, defaultValue, minValue, maxValue, automationRate: 'k-rate' });
      return [
        k('threshold', -24, -60, 0), k('ratio', 4, 1, 20), k('attack', 0.01, 0.0001, 0.2),
        k('release', 0.15, 0.01, 2), k('knee', 6, 0, 24), k('makeup', 0, 0, 24), k('mix', 1, 0, 1)
      ];
    }

    constructor() {
      super();
      this.peak = 0;       // gain reduction (dB) after the instant-attack / release stage
      this.gr = 0;         // smoothed gain reduction (dB)
      this.makeup = 1;     // smoothed makeup gain (linear)
      this.mix = 1;        // smoothed mix
      this.monoR = true;   // IN R empty: the right side copies the left
      this.useSc = false;  // a cable in SC: its level decides the reduction
      this.repGr = 0;      // loudest values since the last report to the display
      this.repIn = -120;
      this.repN = 0;
      this.port.onmessage = e => {
        const m = e.data || {};
        if (m.monoR !== undefined) this.monoR = m.monoR;
        if (m.useSc !== undefined) this.useSc = m.useSc;
      };
    }

    process(inputs, outputs, parameters) {
      const out = outputs[0];
      const outL = out[0];
      const outR = out[1] || out[0];
      if (!outL) return true;
      const inp = inputs[0] || [];
      const inL = inp[0];
      const inR = this.monoR ? inL : (inp[1] || inL);
      const sc = this.useSc && inputs[1] && inputs[1][0];
      const sr = sampleRate;
      const T = parameters.threshold[0];
      const slope = 1 - 1 / parameters.ratio[0];
      const W = parameters.knee[0];
      const att = Math.exp(-1 / (parameters.attack[0] * sr));
      const rel = Math.exp(-1 / (parameters.release[0] * sr));
      const mkTarget = Math.pow(10, parameters.makeup[0] / 20);
      const mixTarget = parameters.mix[0];
      const smooth = Math.exp(-1 / (0.02 * sr));   // 20 ms glide for Makeup and Mix (no clicks)

      for (let i = 0; i < outL.length; i++) {
        const xl = inL ? inL[i] : 0;
        const xr = inR ? inR[i] : 0;
        const det = this.useSc ? (sc ? Math.abs(sc[i]) : 0) : Math.max(Math.abs(xl), Math.abs(xr));
        const lvl = 20 * Math.log10(det + 1e-6);
        // How many dB to turn down at this level (soft knee around the threshold)
        const over = lvl - T;
        let want = 0;
        if (2 * over > W) want = slope * over;
        else if (W > 0 && 2 * over > -W) want = slope * (over + W / 2) * (over + W / 2) / (2 * W);
        // Release holds the peaks, Attack sets how fast the turning down follows them
        this.peak = Math.max(want, rel * this.peak + (1 - rel) * want);
        this.gr = att * this.gr + (1 - att) * this.peak;
        this.makeup = smooth * this.makeup + (1 - smooth) * mkTarget;
        this.mix = smooth * this.mix + (1 - smooth) * mixTarget;
        const g = Math.pow(10, -this.gr / 20) * this.makeup;
        const wet = this.mix * g + (1 - this.mix);
        outL[i] = xl * wet;
        if (outR !== outL) outR[i] = xr * wet;
        if (this.gr > this.repGr) this.repGr = this.gr;
        if (lvl > this.repIn) this.repIn = lvl;
      }

      // About 30 reports a second for the display
      this.repN += outL.length;
      if (this.repN >= 1536) {
        this.port.postMessage({ gr: this.repGr, lvl: this.repIn });
        this.repN = 0;
        this.repGr = 0;
        this.repIn = -120;
      }
      return true;
    }
  }
  registerProcessor('compressor-processor', CompressorProcessor);
`;

class CompressorModule extends ModuleBase {
  static def = {
    type: 'compressor',
    title: 'Compressor',
    width: 330,
    menu: { group: 'Processors & Effects', label: 'Compressor' },
    params: [
      { id: 'threshold', label: 'Threshold', min: -60, max: 0, step: 1, value: -24, unit: 'dB' },
      { id: 'ratio', label: 'Ratio', min: 1, max: 20, step: 0.5, value: 4, format: v => `${v}:1` },
      { id: 'attack', label: 'Attack', min: 0.1, max: 100, step: 0.1, value: 10, format: v => `${v} ms` },
      { id: 'release', label: 'Release', min: 10, max: 1000, step: 5, value: 150, format: v => `${v} ms` },
      { id: 'knee', label: 'Knee', min: 0, max: 24, step: 1, value: 6, unit: 'dB' },
      { id: 'makeup', label: 'Makeup', min: 0, max: 24, step: 0.5, value: 0, format: v => `+${v} dB` },
      { id: 'mix', label: 'Mix', min: 0, max: 100, step: 1, value: 100, format: v => `${v}%` }
    ],
    inputs: [
      { id: 'in_l', label: 'IN L', signal: 'audio', title: 'Left Input',
        guide: { text: 'The sound to compress, left side. If IN R is empty, this feeds both sides.', from: 'Drum Machine MAIN L, Mixer OUT L, Poly Synth OUT, Filter OUT, VCA OUT',
          match: ['drums:out:main_l', 'mixer:out:out_l', 'polysynth:out:out', 'filter:out:default', 'vca:out:audio', 'oscillator:out:default', 'granular:out:out_l', 'audio_in:out:audio', 'delay:out:out_l'] },
        chip: 'Drums / Mixer / Synth' },
      { id: 'in_r', label: 'IN R', signal: 'audio', title: 'Right Input',
        guide: { text: 'The sound to compress, right side (optional). Both sides are turned down together, so the stereo picture stays put.', from: 'Drum Machine MAIN R, Mixer OUT R, Granular OUT R',
          match: ['drums:out:main_r', 'mixer:out:out_r', 'granular:out:out_r', 'delay:out:out_r'] },
        chip: 'Drums R / Mixer R' },
      { id: 'sc', label: 'SC', signal: 'audio', title: 'Sidechain Input',
        guide: { text: 'Sidechain: with a cable here, this sound (not the one in IN) decides when to turn down. A kick here makes a pad duck on every beat.', from: 'Drum Machine Kick OUT, Oscillator, any sound',
          match: ['drums:out:kick_out', 'drums:out:main_l', 'oscillator:out:default', 'vca:out:audio'] },
        chip: 'Kick OUT' }
    ],
    outputs: [
      { id: 'out_l', label: 'OUT L', signal: 'audio', title: 'Left Output',
        guide: { text: 'Left side, compressed (by Mix).', to: 'Output IN L, Reverb IN L, Stereo Delay IN L, Mixer, Recorder',
          match: ['output:in:in', 'reverb:in:in_l', 'delay:in:in_l', 'mixer:in:ch_in', 'recorder:in:in', 'oscilloscope:in:audio'] },
        chip: 'Output / Reverb L' },
      { id: 'out_r', label: 'OUT R', signal: 'audio', title: 'Right Output',
        guide: { text: 'Right side, compressed (by Mix).', to: 'Output IN R, Reverb IN R, Stereo Delay IN R, Mixer',
          match: ['output:in:in_r', 'reverb:in:in_r', 'delay:in:in_r', 'mixer:in:ch_in'] },
        chip: 'Output / Reverb R' }
    ]
  };

  static workletReady = null;   // one shared promise per audio context

  static loadWorklet(ctx) {
    if (!ctx.audioWorklet) return Promise.reject(new Error('AudioWorklet not supported'));
    if (!CompressorModule.workletReady || CompressorModule.workletCtx !== ctx) {
      CompressorModule.workletCtx = ctx;
      const url = URL.createObjectURL(new Blob([COMPRESSOR_WORKLET], { type: 'application/javascript' }));
      CompressorModule.workletReady = ctx.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url));
    }
    return CompressorModule.workletReady;
  }

  build() {
    const ctx = this.audioCtx;
    this.inL = this.own(ctx.createGain());
    this.inR = this.own(ctx.createGain());
    this.scIn = this.own(ctx.createGain());
    this.outL = this.own(ctx.createGain());
    this.outR = this.own(ctx.createGain());
    this.merger = this.own(ctx.createChannelMerger(2));
    this.splitter = this.own(ctx.createChannelSplitter(2));
    this.inL.connect(this.merger, 0, 0);
    this.inR.connect(this.merger, 0, 1);
    this.splitter.connect(this.outL, 0);
    this.splitter.connect(this.outR, 1);
    this.inputNodes = { in_l: this.inL, in_r: this.inR, sc: this.scIn };
    this.outputNodes = { out_l: this.outL, out_r: this.outR };
    this.inRCables = 0;
    this.scCables = 0;
    this.gr = 0;          // latest reduction (dB) and input level (dB) from the worklet, for the display
    this.lvl = -120;
    this.shownGr = 0;
    this.node = null;
    this.destroyed = false;
    // Until the worklet is loaded the sound passes through untouched
    this.inL.connect(this.outL);
    this.inR.connect(this.outR);
    CompressorModule.loadWorklet(ctx).then(() => {
      if (this.destroyed) return;
      this.node = this.own(new AudioWorkletNode(ctx, 'compressor-processor', {
        numberOfInputs: 2, numberOfOutputs: 1, outputChannelCount: [2],
        channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'discrete'
      }));
      (this.def.params || []).forEach(p => this.applyParam(p.id, this.params[p.id], true));
      this.sendRouting();
      this.node.port.onmessage = e => {
        if (!e.data) return;
        this.gr = e.data.gr;
        this.lvl = e.data.lvl;
      };
      this.inL.disconnect();
      this.inR.disconnect();
      this.inL.connect(this.merger, 0, 0);
      this.inR.connect(this.merger, 0, 1);
      this.merger.connect(this.node, 0, 0);
      this.scIn.connect(this.node, 0, 1);
      this.node.connect(this.splitter);
    }).catch(err => console.warn('Compressor: AudioWorklet unavailable, passing sound through.', err));
  }

  // Slider values in the worklet's units (seconds, 0-1), glided so moving a slider never clicks
  applyParam(id, value, instant) {
    if (!this.node) return;
    const param = this.node.parameters.get(id);
    if (!param) return;
    const v = id === 'attack' || id === 'release' ? value / 1000 : id === 'mix' ? value / 100 : value;
    const now = this.audioCtx.currentTime;
    if (instant) param.setValueAtTime(v, now);
    else param.setTargetAtTime(v, now, 0.02);
  }

  onParamChange(id, value) {
    this.applyParam(id, value, false);
  }

  sendRouting() {
    if (this.node) this.node.port.postMessage({ monoR: this.inRCables === 0, useSc: this.scCables > 0 });
  }

  onInputConnected(key, connected) {
    if (key === 'in_r') this.inRCables = Math.max(0, this.inRCables + (connected ? 1 : -1));
    else if (key === 'sc') this.scCables = Math.max(0, this.scCables + (connected ? 1 : -1));
    else return;
    this.sendRouting();
  }

  renderBody() {
    return `
      <canvas id="${this.elId('display')}" class="comp-display" width="600" height="250"></canvas>
      <div class="comp-readout" id="${this.elId('grtext')}">Reduction: 0.0 dB</div>
    `;
  }

  onMount(card) {
    card.classList.add('comp-card');
    const tick = () => {
      if (this.destroyed || !this.card || !this.card.isConnected) return;
      this.drawDisplay();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Output level (dB) for an input level, before Makeup: the curve drawn on the display
  curve(x) {
    const T = this.params.threshold;
    const slope = 1 - 1 / this.params.ratio;
    const W = this.params.knee;
    const over = x - T;
    let red = 0;
    if (2 * over > W) red = slope * over;
    else if (W > 0 && 2 * over > -W) red = slope * (over + W / 2) * (over + W / 2) / (2 * W);
    return x - red;
  }

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
    const pad = 16;
    const meterW = 44;
    const size = h - pad * 2;                 // height of the curve area
    const x0 = pad + 28;
    const plotW = w - x0 - meterW - 24 - pad; // the curve fills the width up to the meter
    const dbX = db => x0 + ((db + 60) / 60) * plotW;
    const dbY = db => pad + (1 - (db + 60) / 60) * size;
    ctx.clearRect(0, 0, w, h);

    // Grid: one line every 12 dB, the straight "no change" line dashed
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    for (let db = -48; db < 0; db += 12) {
      ctx.beginPath(); ctx.moveTo(dbX(db), pad); ctx.lineTo(dbX(db), pad + size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0, dbY(db)); ctx.lineTo(x0 + plotW, dbY(db)); ctx.stroke();
    }
    ctx.strokeRect(x0, pad, plotW, size);
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(dbX(-60), dbY(-60)); ctx.lineTo(dbX(0), dbY(0)); ctx.stroke();
    ctx.setLineDash([]);

    // Threshold line
    const tx = dbX(this.params.threshold);
    ctx.strokeStyle = muted;
    ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(tx, pad); ctx.lineTo(tx, pad + size); ctx.stroke();
    ctx.globalAlpha = 1;

    // The curve (with Makeup added, clipped to its area)
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, pad, plotW, size); ctx.clip();
    ctx.strokeStyle = primary;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let db = -60; db <= 0; db += 0.5) {
      const y = dbY(this.curve(db) + this.params.makeup);
      if (db === -60) ctx.moveTo(dbX(db), y); else ctx.lineTo(dbX(db), y);
    }
    ctx.stroke();
    // A dot for the level coming in
    if (this.lvl > -60) {
      const lv = Math.min(0, this.lvl);
      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.arc(dbX(lv), dbY(this.curve(lv) + this.params.makeup), 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = muted;
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillText('0', x0 - 18, pad + 14);
    ctx.fillText('-60', x0 - 30, pad + size);

    // Reduction meter: grows down from the top, 0 to 24 dB
    this.shownGr = this.gr > this.shownGr ? this.gr : this.shownGr * 0.9 + this.gr * 0.1;
    const mx = w - pad - meterW;
    ctx.strokeStyle = border;
    ctx.strokeRect(mx, pad, meterW, size);
    const frac = Math.min(1, this.shownGr / 24);
    ctx.fillStyle = primary;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(mx + 2, pad + 2, meterW - 4, Math.max(0, (size - 4) * frac));
    ctx.globalAlpha = 1;

    const txt = this.el('grtext');
    const label = `Reduction: ${this.shownGr.toFixed(1)} dB`;
    if (txt && txt.textContent !== label) txt.textContent = label;
  }

  destroy() {
    this.destroyed = true;
  }
}

ModuleBase.register(CompressorModule);
