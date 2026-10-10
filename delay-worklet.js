// delay-worklet.js - AudioWorklet DSP for the Stereo Delay module (StereoDelayModule.js).
// Input 0: stereo audio (channel 1 empty -> uses channel 0 when the module says monoR).
// Input 1: clock pulses (one per 16th note) used to measure the tempo for Sync.
// Output 0: stereo (dry + wet per side).
// Parameters arrive as plain objects through port.postMessage and are smoothed here.

class StereoDelayProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.size = Math.ceil(sampleRate * 4.2); // 2 s max delay, reverse reads up to 2x the delay back
    this.buf = [new Float32Array(this.size), new Float32Array(this.size)];
    this.w = 0;
    this.p = {
      time: [0.375, 0.5], fb: [0.4, 0.4], tone: [0.6, 0.6], level: [1, 1], mix: [0.35, 0.35],
      rev: [false, false], pingpong: false, monoR: true
    };
    this.d = [this.p.time[0] * sampleRate, this.p.time[1] * sampleRate]; // smoothed delay in samples
    this.lp = [0, 0];      // tone low-pass state (wet)
    this.hp = [0, 0];      // 60 Hz high-pass state in the feedback path
    this.hpIn = [0, 0];
    this.revPh = [0, 0];   // position inside the current reverse chunk
    this.revLen = [1, 1];  // length of the current reverse chunk (samples)
    this.clockHigh = false;
    this.lastEdge = -1;
    this.n = 0;            // samples processed
    this.port.onmessage = e => {
      const m = e.data || {};
      for (const k in m) {
        if (Array.isArray(m[k])) this.p[k] = m[k].slice();
        else this.p[k] = m[k];
      }
    };
  }

  read(ch, delay) {
    let pos = this.w - delay;
    while (pos < 0) pos += this.size;
    const i = Math.floor(pos);
    const f = pos - i;
    const b = this.buf[ch];
    const a = b[i % this.size];
    const c = b[(i + 1) % this.size];
    return a + (c - a) * f;
  }

  // Reverse: each chunk of `delay` samples plays the previous chunk backwards, with short fades at the edges
  readReverse(ch) {
    const len = this.revLen[ch];
    const ph = this.revPh[ch];
    const fade = Math.max(1, Math.min(len / 2, sampleRate * 0.008));
    const env = Math.min(1, ph / fade, (len - ph) / fade);
    const v = this.read(ch, 1 + 2 * ph);
    this.revPh[ch] = ph + 1;
    if (this.revPh[ch] >= len) {
      this.revPh[ch] = 0;
      this.revLen[ch] = Math.max(64, Math.round(this.d[ch]));
    }
    return v * env;
  }

  process(inputs, outputs) {
    const out = outputs[0];
    if (!out || !out[0]) return true;
    const N = out[0].length;
    const inp = inputs[0] || [];
    const clk = inputs[1] && inputs[1][0];
    const inL = inp[0];
    const inR = inp[1] && !this.p.monoR ? inp[1] : inp[0];
    const p = this.p;
    const outL = out[0];
    const outR = out[1] || out[0];
    const smooth = 1 - Math.exp(-1 / (sampleRate * 0.06));
    const toneA = [0, 1].map(ch => 1 - Math.exp(-2 * Math.PI * (400 * Math.pow(2, p.tone[ch] * 5.5)) / sampleRate));
    const hpA = 1 - Math.exp(-2 * Math.PI * 60 / sampleRate);
    const fb = [Math.min(0.95, p.fb[0]), Math.min(0.95, p.fb[1])];

    for (let i = 0; i < N; i++) {
      // Clock: rising edges, one per 16th note
      if (clk) {
        const high = clk[i] > 0.5;
        if (high && !this.clockHigh) {
          if (this.lastEdge >= 0) {
            const interval = (this.n + i - this.lastEdge) / sampleRate;
            if (interval > 0.02 && interval < 2) this.port.postMessage({ clock: interval });
          }
          this.lastEdge = this.n + i;
        }
        this.clockHigh = high;
      }

      const xL = inL ? inL[i] : 0;
      const xR = inR ? inR[i] : 0;
      const wet = [0, 0];
      for (let ch = 0; ch < 2; ch++) {
        const target = Math.min(2, Math.max(0.005, p.time[ch])) * sampleRate;
        this.d[ch] += (target - this.d[ch]) * smooth;
        const raw = p.rev[ch] ? this.readReverse(ch) : this.read(ch, this.d[ch]);
        this.lp[ch] += toneA[ch] * (raw - this.lp[ch]);
        wet[ch] = this.lp[ch];
      }

      // Feedback (with a 60 Hz high-pass so low end does not build up, and a soft clip)
      const fbSig = [0, 1].map(ch => {
        this.hp[ch] += hpA * (wet[ch] - this.hp[ch]);
        return wet[ch] - this.hp[ch];
      });
      let wL, wR;
      if (p.pingpong) {
        // Input goes into the left line; each repeat crosses to the other side
        wL = (xL + xR) * 0.5 + fb[1] * fbSig[1];
        wR = fb[0] * fbSig[0];
      } else {
        wL = xL + fb[0] * fbSig[0];
        wR = xR + fb[1] * fbSig[1];
      }
      this.buf[0][this.w] = Math.tanh(wL);
      this.buf[1][this.w] = Math.tanh(wR);

      outL[i] = xL * (1 - p.mix[0]) + wet[0] * p.level[0] * p.mix[0];
      outR[i] = xR * (1 - p.mix[1]) + wet[1] * p.level[1] * p.mix[1];

      this.w = (this.w + 1) % this.size;
    }
    this.n += N;
    return true;
  }
}

registerProcessor('stereo-delay', StereoDelayProcessor);
