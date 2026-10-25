// EqModule.js - a stereo EQ: turns ranges of the sound (lows, mids, highs) up or down.
// Four bands (Low shelf, Mid 1, Mid 2, High shelf) plus Low Cut and High Cut, made of native
// BiquadFilterNodes (one chain per side). The display draws the EQ curve over a live spectrum
// of the sound, and each band has a dot you drag: left / right sets its frequency, up / down its gain.
// Built on the shared template (ModuleBase.js).

// Frequency sliders run 0-100 and map evenly over the octaves from 20 Hz to 20 kHz
const EQ_FMIN = 20;
const EQ_FMAX = 20000;
const eqFreq = pos => EQ_FMIN * Math.pow(EQ_FMAX / EQ_FMIN, pos / 100);
const eqPos = f => 100 * Math.log(f / EQ_FMIN) / Math.log(EQ_FMAX / EQ_FMIN);
const eqHz = f => (f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 0 : 1)} kHz` : `${Math.round(f)} Hz`);
// Typing a frequency in Hz into a readout (valueEntry.js)
const EQ_ENTRY = { unit: 'Hz', decimals: 0, fromSlider: eqFreq, toSlider: eqPos };
const eqDb = v => `${v > 0 ? '+' : ''}${v} dB`;
const EQ_RANGE = 18;   // the display shows -18..+18 dB

// The four bands: [key, column title, filter type, has Q]
const EQ_BANDS = [
  ['low', 'Low', 'lowshelf', false],
  ['m1', 'Mid 1', 'peaking', true],
  ['m2', 'Mid 2', 'peaking', true],
  ['high', 'High', 'highshelf', false]
];

class EqModule extends ModuleBase {
  static def = {
    type: 'eq',
    title: 'EQ',
    width: 400,
    menu: { group: 'Processors & Effects', label: 'EQ' },
    params: [
      { id: 'low_freq', label: 'Low Freq', min: 0, max: 100, step: 0.1, value: +eqPos(100).toFixed(1), format: v => eqHz(eqFreq(v)), entry: EQ_ENTRY },
      { id: 'low_gain', label: 'Low Gain', min: -EQ_RANGE, max: EQ_RANGE, step: 0.5, value: 0, format: eqDb },
      { id: 'm1_freq', label: 'Mid 1 Freq', min: 0, max: 100, step: 0.1, value: +eqPos(400).toFixed(1), format: v => eqHz(eqFreq(v)), entry: EQ_ENTRY },
      { id: 'm1_gain', label: 'Mid 1 Gain', min: -EQ_RANGE, max: EQ_RANGE, step: 0.5, value: 0, format: eqDb },
      { id: 'm1_q', label: 'Mid 1 Q', min: 0.3, max: 10, step: 0.1, value: 1 },
      { id: 'm2_freq', label: 'Mid 2 Freq', min: 0, max: 100, step: 0.1, value: +eqPos(2500).toFixed(1), format: v => eqHz(eqFreq(v)), entry: EQ_ENTRY },
      { id: 'm2_gain', label: 'Mid 2 Gain', min: -EQ_RANGE, max: EQ_RANGE, step: 0.5, value: 0, format: eqDb },
      { id: 'm2_q', label: 'Mid 2 Q', min: 0.3, max: 10, step: 0.1, value: 1 },
      { id: 'high_freq', label: 'High Freq', min: 0, max: 100, step: 0.1, value: +eqPos(8000).toFixed(1), format: v => eqHz(eqFreq(v)), entry: EQ_ENTRY },
      { id: 'high_gain', label: 'High Gain', min: -EQ_RANGE, max: EQ_RANGE, step: 0.5, value: 0, format: eqDb },
      { id: 'lowcut', label: 'Low Cut', min: 0, max: 60, step: 0.1, value: 0, format: v => (v <= 0 ? 'Off' : eqHz(eqFreq(v))), entry: EQ_ENTRY },
      { id: 'highcut', label: 'High Cut', min: 40, max: 100, step: 0.1, value: 100, format: v => (v >= 100 ? 'Off' : eqHz(eqFreq(v))), entry: EQ_ENTRY },
      { id: 'output', label: 'Output', min: -EQ_RANGE, max: EQ_RANGE, step: 0.5, value: 0, format: eqDb }
    ],
    inputs: [
      { id: 'in_l', label: 'IN L', signal: 'audio', title: 'Left Input',
        guide: { text: 'The sound to shape, left side. If IN R is empty, this feeds both sides.', from: 'Oscillator, Filter, VCA, Poly Synth, Drum Machine MAIN L, Mixer OUT L',
          match: ['oscillator:out:default', 'filter:out:default', 'vca:out:audio', 'polysynth:out:out', 'drums:out:main_l', 'mixer:out:out_l', 'granular:out:out_l', 'audio_in:out:audio', 'compressor:out:out_l', 'delay:out:out_l'] },
        chip: 'Osc / Synth / Drums' },
      { id: 'in_r', label: 'IN R', signal: 'audio', title: 'Right Input',
        guide: { text: 'The sound to shape, right side (optional).', from: 'Drum Machine MAIN R, Mixer OUT R, Compressor OUT R',
          match: ['drums:out:main_r', 'mixer:out:out_r', 'granular:out:out_r', 'compressor:out:out_r', 'delay:out:out_r'] },
        chip: 'Drums R / Mixer R' }
    ],
    outputs: [
      { id: 'out_l', label: 'OUT L', signal: 'audio', title: 'Left Output',
        guide: { text: 'Left side, after the EQ.', to: 'Output IN L, Compressor IN L, Reverb IN L, Stereo Delay IN L, Mixer',
          match: ['output:in:in', 'compressor:in:in_l', 'reverb:in:in_l', 'delay:in:in_l', 'mixer:in:ch_in', 'recorder:in:in', 'oscilloscope:in:audio'] },
        chip: 'Output / effects L' },
      { id: 'out_r', label: 'OUT R', signal: 'audio', title: 'Right Output',
        guide: { text: 'Right side, after the EQ.', to: 'Output IN R, Compressor IN R, Reverb IN R, Stereo Delay IN R, Mixer',
          match: ['output:in:in_r', 'compressor:in:in_r', 'reverb:in:in_r', 'delay:in:in_r', 'mixer:in:ch_in'] },
        chip: 'Output / effects R' }
    ]
  };

  build() {
    const ctx = this.audioCtx;
    this.inL = this.own(ctx.createGain());
    this.inR = this.own(ctx.createGain());
    this.inRCables = 0;
    this.chains = [0, 1].map(() => {
      const f = {
        lowcut: ctx.createBiquadFilter(),
        low: ctx.createBiquadFilter(),
        m1: ctx.createBiquadFilter(),
        m2: ctx.createBiquadFilter(),
        high: ctx.createBiquadFilter(),
        highcut: ctx.createBiquadFilter()
      };
      f.lowcut.type = 'highpass';
      f.lowcut.Q.value = Math.SQRT1_2;
      f.highcut.type = 'lowpass';
      f.highcut.Q.value = Math.SQRT1_2;
      EQ_BANDS.forEach(([key, , type]) => { f[key].type = type; });
      const out = ctx.createGain();
      const order = [f.lowcut, f.low, f.m1, f.m2, f.high, f.highcut, out];
      order.forEach((n, i) => { this.own(n); if (i) order[i - 1].connect(n); });
      return { f, first: f.lowcut, out };
    });
    this.inL.connect(this.chains[0].first);
    this.inR.connect(this.chains[1].first);
    this.inL.connect(this.chains[1].first);   // until a cable arrives in IN R, the left feeds both sides
    this.outputNodes = { out_l: this.chains[0].out, out_r: this.chains[1].out };
    this.inputNodes = { in_l: this.inL, in_r: this.inR };

    // Live spectrum of the left output, drawn behind the curve
    this.analyser = this.own(ctx.createAnalyser());
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    this.spec = new Float32Array(this.analyser.frequencyBinCount);
    this.chains[0].out.connect(this.analyser);

    // Points for the curve: 160 steps, evenly spread over the octaves
    this.curveF = new Float32Array(160);
    for (let i = 0; i < this.curveF.length; i++) this.curveF[i] = eqFreq((100 * i) / (this.curveF.length - 1));
    this.mag = new Float32Array(this.curveF.length);
    this.phase = new Float32Array(this.curveF.length);
    this.dragging = null;
    this.destroyed = false;
  }

  // Every change glides (20 ms) so moving a slider or a dot never clicks
  setAudio(param, value) {
    const now = this.audioCtx.currentTime;
    param.cancelScheduledValues(now);
    param.setTargetAtTime(value, now, 0.02);
  }

  onParamChange(id, value) {
    const nyq = this.audioCtx.sampleRate / 2;
    this.chains.forEach(({ f, out }) => {
      if (id === 'lowcut') this.setAudio(f.lowcut.frequency, value <= 0 ? 5 : eqFreq(value));
      else if (id === 'highcut') this.setAudio(f.highcut.frequency, value >= 100 ? nyq : Math.min(nyq, eqFreq(value)));
      else if (id === 'output') this.setAudio(out.gain, Math.pow(10, value / 20));
      else {
        const [band, what] = id.split('_');
        const node = f[band];
        if (!node) return;
        if (what === 'freq') this.setAudio(node.frequency, eqFreq(value));
        else if (what === 'gain') this.setAudio(node.gain, value);
        else if (what === 'q') this.setAudio(node.Q, value);
      }
    });
  }

  onInputConnected(key, connected) {
    if (key !== 'in_r') return;
    const before = this.inRCables > 0;
    this.inRCables = Math.max(0, this.inRCables + (connected ? 1 : -1));
    const now = this.inRCables > 0;
    if (before === now) return;
    if (now) { try { this.inL.disconnect(this.chains[1].first); } catch (e) {} }
    else this.inL.connect(this.chains[1].first);
  }

  // The bands as a grid (columns Low / Mid 1 / Mid 2 / High), then Low Cut, High Cut and Output.
  // The sliders keep the template's ids, so they save, load and take LFO cables like any other.
  renderControls() {
    const cell = id => {
      const p = this.paramDef(id);
      if (!p) return '<span></span>';
      const v = this.params[id];
      return `<div class="eq-cell">
          <span class="eq-readout" id="${this.elId(`v_${id}`)}"${this.entryAttr(p)}>${this.formatParam(p, v)}</span>
          <input type="range" id="${this.elId(`p_${id}`)}" min="${p.min}" max="${p.max}" step="${p.step}" value="${v}" aria-label="${p.label}">
        </div>`;
    };
    const head = `<div class="eq-grid eq-head"><span></span>${EQ_BANDS.map(b => `<span>${b[1]}</span>`).join('')}</div>`;
    const row = (name, what) => `<div class="eq-grid"><span class="eq-name">${name}</span>${EQ_BANDS.map(b => cell(`${b[0]}_${what}`)).join('')}</div>`;
    return `${head}${row('Freq', 'freq')}${row('Gain', 'gain')}${row('Q', 'q')}
      <div class="eq-bottom">${['lowcut', 'highcut', 'output'].map(id => this.renderControl(this.paramDef(id))).join('')}</div>`;
  }

  renderBody() {
    return `
      <canvas id="${this.elId('display')}" class="eq-display" width="740" height="300"></canvas>
      <div class="eq-hint">Drag a dot: left / right sets the frequency, up / down the gain.</div>
    `;
  }

  onMount(card) {
    card.classList.add('eq-card');
    this.bindDisplay();
    const tick = () => {
      if (this.destroyed || !this.card || !this.card.isConnected) return;
      this.drawDisplay();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  geom() {
    const c = this.el('display');
    const w = c.width;
    const h = c.height;
    const padL = 44;
    const padR = 12;
    const padY = 14;
    return {
      c, w, h,
      x: f => padL + (eqPos(f) / 100) * (w - padL - padR),
      f: x => eqFreq(Math.min(100, Math.max(0, ((x - padL) / (w - padL - padR)) * 100))),
      y: db => padY + (1 - (db + EQ_RANGE) / (2 * EQ_RANGE)) * (h - 2 * padY),
      db: y => EQ_RANGE - ((y - padY) / (h - 2 * padY)) * 2 * EQ_RANGE,
      padL, padR, padY
    };
  }

  // Where each band's dot sits (the cuts sit on the 0 dB line)
  dots() {
    const list = EQ_BANDS.map(([key]) => ({ key, f: eqFreq(this.params[`${key}_freq`]), db: this.params[`${key}_gain`] }));
    if (this.params.lowcut > 0) list.push({ key: 'lowcut', f: eqFreq(this.params.lowcut), db: 0 });
    if (this.params.highcut < 100) list.push({ key: 'highcut', f: eqFreq(this.params.highcut), db: 0 });
    return list;
  }

  bindDisplay() {
    const c = this.el('display');
    if (!c) return;
    const toCanvas = e => {
      const r = c.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
    };
    c.addEventListener('pointerdown', e => {
      const g = this.geom();
      const pt = toCanvas(e);
      let best = null;
      let bestD = 40;
      this.dots().forEach(d => {
        const dist = Math.hypot(g.x(d.f) - pt.x, g.y(d.db) - pt.y);
        if (dist < bestD) { bestD = dist; best = d.key; }
      });
      if (!best) return;
      e.preventDefault();
      e.stopPropagation();
      this.dragging = best;
      try { c.setPointerCapture(e.pointerId); } catch (err) {}
    });
    c.addEventListener('pointermove', e => {
      if (!this.dragging) return;
      e.preventDefault();
      e.stopPropagation();
      const g = this.geom();
      const pt = toCanvas(e);
      const pos = eqPos(g.f(pt.x));
      const key = this.dragging;
      if (key === 'lowcut' || key === 'highcut') this.setParam(key, Math.round(pos * 10) / 10);
      else {
        this.setParam(`${key}_freq`, Math.round(pos * 10) / 10);
        this.setParam(`${key}_gain`, Math.round(Math.max(-EQ_RANGE, Math.min(EQ_RANGE, g.db(pt.y))) * 2) / 2);
      }
    });
    const end = () => { this.dragging = null; };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
  }

  drawDisplay() {
    const c = this.el('display');
    if (!c) return;
    const g = this.geom();
    const ctx = c.getContext('2d');
    const css = getComputedStyle(this.card);
    const muted = css.getPropertyValue('--muted-text').trim() || '#64748b';
    const primary = css.getPropertyValue('--primary-color').trim() || '#2563eb';
    const border = css.getPropertyValue('--panel-border').trim() || '#e2e8f0';
    ctx.clearRect(0, 0, g.w, g.h);
    ctx.font = '600 16px system-ui, sans-serif';

    // Grid: 100 Hz, 1 kHz, 10 kHz and every 6 dB
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.fillStyle = muted;
    [100, 1000, 10000].forEach(f => {
      const x = g.x(f);
      ctx.beginPath(); ctx.moveTo(x, g.padY); ctx.lineTo(x, g.h - g.padY); ctx.stroke();
      ctx.fillText(eqHz(f).replace(' ', ''), x + 4, g.h - g.padY - 4);
    });
    for (let db = -12; db <= 12; db += 6) {
      const y = g.y(db);
      ctx.lineWidth = db === 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(g.padL, y); ctx.lineTo(g.w - g.padR, y); ctx.stroke();
      if (db % 12 === 0) ctx.fillText(db > 0 ? `+${db}` : `${db}`, 4, y + 5);
    }

    // Live spectrum (-90..-10 dB mapped to the height), faint, behind the curve
    this.analyser.getFloatFrequencyData(this.spec);
    const binHz = this.audioCtx.sampleRate / this.analyser.fftSize;
    ctx.beginPath();
    ctx.moveTo(g.x(EQ_FMIN), g.h - g.padY);
    for (let i = 1; i < this.spec.length; i++) {
      const f = i * binHz;
      if (f < EQ_FMIN) continue;
      if (f > EQ_FMAX) break;
      const lv = Math.min(1, Math.max(0, (this.spec[i] + 90) / 80));
      ctx.lineTo(g.x(f), g.h - g.padY - lv * (g.h - 2 * g.padY));
    }
    ctx.lineTo(g.x(EQ_FMAX), g.h - g.padY);
    ctx.closePath();
    ctx.fillStyle = muted;
    ctx.globalAlpha = 0.18;
    ctx.fill();
    ctx.globalAlpha = 1;

    // The EQ curve: all six filters together, plus Output
    const total = new Float32Array(this.curveF.length).fill(1);
    Object.values(this.chains[0].f).forEach(node => {
      node.getFrequencyResponse(this.curveF, this.mag, this.phase);
      for (let i = 0; i < total.length; i++) total[i] *= this.mag[i];
    });
    const outDb = this.params.output;
    ctx.save();
    ctx.beginPath(); ctx.rect(g.padL, 0, g.w - g.padL - g.padR, g.h); ctx.clip();
    ctx.strokeStyle = primary;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < total.length; i++) {
      const db = Math.max(-EQ_RANGE - 6, Math.min(EQ_RANGE + 6, 20 * Math.log10(total[i] + 1e-9) + outDb));
      const x = g.x(this.curveF[i]);
      if (i === 0) ctx.moveTo(x, g.y(db)); else ctx.lineTo(x, g.y(db));
    }
    ctx.stroke();
    ctx.restore();

    // A dot per band (filled while dragged), the cuts as rings on the 0 dB line
    this.dots().forEach(d => {
      const x = g.x(d.f);
      const y = g.y(d.db);
      ctx.beginPath();
      ctx.arc(x, y, this.dragging === d.key ? 13 : 10, 0, Math.PI * 2);
      if (d.key === 'lowcut' || d.key === 'highcut') {
        ctx.strokeStyle = primary;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        ctx.fillStyle = primary;
        ctx.globalAlpha = this.dragging === d.key ? 1 : 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
  }

  destroy() {
    this.destroyed = true;
  }
}

ModuleBase.register(EqModule);
