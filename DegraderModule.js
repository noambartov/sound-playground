// DegraderModule.js - a one-knob lo-fi effect. Turning Degrade moves several settings at once,
// from clean, through warm tape and lo-fi, to a fully wrecked sound. All the sound work happens
// in one AudioWorklet (made from a string, like the Envelope's gate detector).
// Built on the shared template (ModuleBase.js).

const DEGRADER_WORKLET = `
  const seg = (a, lo, hi) => Math.min(1, Math.max(0, (a - lo) / (hi - lo)));
  // Exponential slide between two values (for frequencies, rates and bit depths)
  const expLerp = (from, to, t) => from * Math.pow(to / from, t);

  class DegraderProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      return [{ name: 'amount', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }];
    }

    constructor() {
      super();
      this.buf = new Float32Array(4096);   // delay line for the tape wobble
      this.w = 0;
      this.wowPhase = 0;
      this.flutterPhase = 0;
      this.holdPhase = 1;                  // sample-rate reduction (sample and hold)
      this.held = 0;
      this.lp1 = 0;                        // two one-pole low-pass stages
      this.lp2 = 0;
      this.hissLp = 0;
      this.crackle = 0;                    // current click, decays fast
    }

    process(inputs, outputs, parameters) {
      const out = outputs[0][0];
      if (!out) return true;
      const inp = inputs[0] && inputs[0][0];
      const sr = sampleRate;
      const a = parameters.amount[0];

      // Stage 1 (0-30%): tape warmth. Saturation fades in, highs start to soften.
      const satMix = seg(a, 0, 0.3);
      const drive = 1 + 3 * seg(a, 0.3, 1);
      const satNorm = Math.tanh(1.5 * drive);
      // Stage 2 (30-60%): lo-fi. Bits 16 -> 8, sample rate down to 8 kHz, tape wobble starts.
      // Stage 3 (60-100%): wrecked. Bits 8 -> 3, sample rate down to 1.5 kHz, hiss and crackle.
      const bits = a < 0.3 ? 0 : (a < 0.6 ? expLerp(16, 8, seg(a, 0.3, 0.6)) : expLerp(8, 3, seg(a, 0.6, 1)));
      const steps = bits ? Math.pow(2, bits - 1) : 0;
      const rate = a < 0.3 ? sr : (a < 0.6 ? expLerp(sr, 8000, seg(a, 0.3, 0.6)) : expLerp(8000, 1500, seg(a, 0.6, 1)));
      const holdStep = Math.min(1, rate / sr);
      const wobble = 0.6 * seg(a, 0.3, 0.6) + 0.4 * seg(a, 0.6, 1);
      const noise = seg(a, 0.6, 1);
      const hiss = 0.02 * noise;
      const crackleChance = (30 * noise) / sr;
      // Low-pass: open at 0%, 8 kHz at 30%, 4 kHz at 60%, 1.5 kHz at 100%
      const cutoff = a <= 0 ? sr : (a < 0.3 ? expLerp(20000, 8000, seg(a, 0, 0.3)) :
        (a < 0.6 ? expLerp(8000, 4000, seg(a, 0.3, 0.6)) : expLerp(4000, 1500, seg(a, 0.6, 1))));
      const lpCoef = cutoff >= sr / 2 ? 1 : 1 - Math.exp(-2 * Math.PI * cutoff / sr);
      const outGain = 1 - 0.3 * seg(a, 0.3, 1);

      const size = this.buf.length;
      const baseDelay = 0.006 * sr;
      const wowDepth = 0.0025 * sr * wobble;
      const flutterDepth = 0.0003 * sr * wobble;
      const wowInc = 2 * Math.PI * 0.7 / sr;
      const flutterInc = 2 * Math.PI * 7 / sr;

      for (let i = 0; i < out.length; i++) {
        // Tape wobble: a short delay whose length swings slowly (wow) and quickly (flutter)
        this.buf[this.w] = inp ? inp[i] : 0;
        this.wowPhase += wowInc;
        this.flutterPhase += flutterInc;
        if (this.wowPhase > 6.283185307) this.wowPhase -= 6.283185307;
        if (this.flutterPhase > 6.283185307) this.flutterPhase -= 6.283185307;
        const d = baseDelay + wowDepth * (1 + Math.sin(this.wowPhase)) + flutterDepth * (1 + Math.sin(this.flutterPhase));
        let r = this.w - d;
        if (r < 0) r += size;
        const r0 = Math.floor(r);
        const frac = r - r0;
        let x = this.buf[r0] + (this.buf[(r0 + 1) % size] - this.buf[r0]) * frac;
        this.w = (this.w + 1) % size;

        // Saturation (soft clip), blended in over the first stage
        if (satMix > 0) x = x + satMix * (Math.tanh(1.5 * drive * x) / satNorm - x);

        // Sample-rate reduction: hold each sample until the next one at the lower rate
        this.holdPhase += holdStep;
        if (this.holdPhase >= 1) {
          this.holdPhase -= 1;
          this.held = x;
        }
        x = this.held;

        // Bit reduction
        if (steps) x = Math.round(x * steps) / steps;

        // Hiss and record crackle
        if (noise > 0) {
          this.hissLp += 0.3 * ((Math.random() * 2 - 1) - this.hissLp);
          x += hiss * this.hissLp;
          if (Math.random() < crackleChance) this.crackle = (Math.random() < 0.5 ? -1 : 1) * (0.05 + 0.3 * Math.random()) * noise;
          x += this.crackle;
          this.crackle *= 0.55;
        }

        // Highs close as the knob turns
        this.lp1 += lpCoef * (x - this.lp1);
        this.lp2 += lpCoef * (this.lp1 - this.lp2);
        out[i] = this.lp2 * outGain;
      }
      return true;
    }
  }
  registerProcessor('degrader-processor', DegraderProcessor);
`;

class DegraderModule extends ModuleBase {
  static def = {
    type: 'degrader',
    title: 'Degrader',
    width: 220,
    menu: { group: 'Processors & Effects', label: 'Degrader' },
    params: [
      { id: 'amount', label: 'Degrade', min: 0, max: 100, step: 1, value: 50, format: v => `${v}% ${DegraderModule.stageName(v)}` }
    ],
    inputs: [
      { id: 'in', label: 'IN', signal: 'audio', title: 'Audio Input',
        guide: { text: 'The sound to degrade.', from: 'VCA OUT, Filter OUT, Oscillator OUT, Mixer OUT L, Drum Machine MAIN L',
          match: ['vca:out:audio', 'filter:out:default', 'oscillator:out:default', 'mixer:out:out_l', 'granular:out:out_l', 'audio_in:out:audio', 'drums:out:main_l'] },
        chip: 'VCA / Filter / Osc' }
    ],
    outputs: [
      { id: 'out', label: 'OUT', signal: 'audio', title: 'Audio Output',
        guide: { text: 'The degraded sound.', to: 'Output IN, Reverb IN L, Mixer IN, Oscilloscope IN',
          match: ['output:in:in', 'reverb:in:in_l', 'mixer:in:ch_in', 'oscilloscope:in:audio', 'recorder:in:in', 'filter:in:audio'] },
        chip: 'Output / Reverb' }
    ]
  };

  static workletReady = null;   // one shared promise per audio context

  static stageName(v) {
    if (v <= 0) return 'Clean';
    if (v < 30) return 'Tape';
    if (v < 60) return 'Lo-Fi';
    return 'Wrecked';
  }

  static loadWorklet(ctx) {
    if (!ctx.audioWorklet) return Promise.reject(new Error('AudioWorklet not supported'));
    if (!DegraderModule.workletReady || DegraderModule.workletCtx !== ctx) {
      DegraderModule.workletCtx = ctx;
      const url = URL.createObjectURL(new Blob([DEGRADER_WORKLET], { type: 'application/javascript' }));
      DegraderModule.workletReady = ctx.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url));
    }
    return DegraderModule.workletReady;
  }

  build() {
    this.inNode = this.own(this.audioCtx.createGain());
    this.outNode = this.own(this.audioCtx.createGain());
    this.inputNodes = { in: this.inNode };
    this.outputNodes = { out: this.outNode };
    this.processor = null;
    this.destroyed = false;
    // Until the worklet is loaded the sound passes through clean
    this.inNode.connect(this.outNode);
    DegraderModule.loadWorklet(this.audioCtx).then(() => {
      if (this.destroyed) return;
      this.processor = this.own(new AudioWorkletNode(this.audioCtx, 'degrader-processor', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 1, channelCountMode: 'explicit' }));
      this.processor.parameters.get('amount').setValueAtTime(this.params.amount / 100, this.audioCtx.currentTime);
      this.inNode.disconnect();
      this.inNode.connect(this.processor);
      this.processor.connect(this.outNode);
    }).catch(err => console.warn('Degrader: AudioWorklet unavailable, passing sound through clean.', err));
  }

  onParamChange(id, value) {
    if (id !== 'amount' || !this.processor) return;
    this.processor.parameters.get('amount').setTargetAtTime(value / 100, this.audioCtx.currentTime, 0.02);
  }

  destroy() {
    this.destroyed = true;
  }
}

ModuleBase.register(DegraderModule);
