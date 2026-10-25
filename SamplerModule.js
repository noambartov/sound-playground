// SamplerModule.js - plays a loaded sound file (WAV / MP3 / M4A ...) from the Keyboard: every key
// plays the sample at its own pitch (faster = higher), up to 8 keys at once. Notes arrive on a NOTES
// cable (PolyNoteBus, PolySynthModule.js); a TRIG cable plays it at the Root note on every pulse.
// The waveform box shows the sample, the part that is played (Start / End, draggable) and a moving
// line per sounding voice. Trim keeps only the selected part (undoable: the original stays in memory
// and the trim is saved as fractions of it), Zoom enlarges the selection, Reset brings the whole file back.
// Built on the shared template (ModuleBase.js). File decoding reuses GranularModule (loaded before).

const SAMPLER_MAX_VOICES = 8;
const SAMPLER_W = 560;    // canvas pixels (drawn at half size on the card)
const SAMPLER_H = 180;
const SAMPLER_MIN_SEL = 0.002;   // smallest selection, as a share of the (trimmed) sample

class SamplerModule extends ModuleBase {
  static def = {
    type: 'sampler',
    title: 'Sampler',
    width: 300,
    menu: { group: 'Sound Sources', label: 'Sampler' },
    params: [
      { id: 'root', label: 'Root', min: 24, max: 96, step: 1, value: 60,
        format: v => SamplerModule.noteName(v),
        entry: { unit: '', step: 1, format: v => SamplerModule.noteName(v), parse: t => RibbonModule.parseNote(t) } },
      { id: 'tune', label: 'Tune', min: -50, max: 50, step: 1, value: 0, unit: 'cents' },
      { id: 'start', label: 'Start', min: 0, max: 100, step: 0.1, value: 0, unit: '%' },
      { id: 'end', label: 'End', min: 0, max: 100, step: 0.1, value: 100, unit: '%' },
      { id: 'attack', label: 'Attack', min: 1, max: 2000, step: 1, value: 3, unit: 'ms' },
      { id: 'release', label: 'Release', min: 10, max: 5000, step: 10, value: 300, unit: 'ms' },
      { id: 'level', label: 'Level', min: 0, max: 100, step: 1, value: 80, unit: '%' },
      { id: 'loop', label: 'Loop', kind: 'toggle', value: false }
    ],
    inputs: [
      { id: 'notes', label: 'NOTES', signal: 'gate', title: 'Notes Input (from Keyboard NOTES)',
        guide: { text: 'All the keys you hold on the Keyboard, each playing the sample at its own pitch (the Root key plays it as recorded). This cable carries notes, not sound.', from: 'Keyboard NOTES, Harmony Walker NOTES, Chorale NOTES', match: ['keyboard:out:notes', 'harmony:out:notes', 'chorale:out:notes'] },
        chip: 'Keyboard NOTES' },
      { id: 'trig', label: 'TRIG', signal: 'gate', title: 'Trigger Input (plays the sample at the Root note)',
        guide: { text: 'Every pulse plays the sample once, at the Root note, from Start (with Loop on it holds for the length of one pulse).', from: 'Sequencer GATE, Ribbon GATE, LFO OUT (square)', match: ['sequencer:out:gate', 'ribbon:out:gate', 'lfo:out:default'] },
        chip: 'Sequencer GATE' }
    ],
    outputs: [
      { id: 'out', label: 'OUT', signal: 'audio', title: 'Audio Output',
        guide: { text: 'All the voices mixed together.', to: 'Output IN, Reverb IN L, Mixer IN, Filter IN', match: ['output:in:in', 'reverb:in:in_l', 'delay:in:in_l', 'mixer:in:ch_in', 'degrader:in:in', 'filter:in:audio', 'vca:in:audio', 'oscilloscope:in:audio', 'recorder:in:in'] },
        chip: 'Output / Reverb' }
    ]
  };

  static noteName(midi) {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const m = Math.round(midi);
    return `${names[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
  }

  static midiToHz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // The built-in sample, so the module (and its demo) sounds before a file is loaded:
  // a plucked string on C4 (Karplus-Strong), 2.5 seconds
  static builtInSample(ctx) {
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 2.5);
    const buf = ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);
    const period = sr / SamplerModule.midiToHz(60) - 0.5;   // the averaging adds half a sample of delay
    const n = Math.max(2, Math.round(period));
    const line = new Float32Array(n);
    let seed = 12345;
    const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; };
    let prev = 0;
    for (let i = 0; i < n; i++) { prev = prev * 0.5 + rand() * 0.5; line[i] = prev; }   // a slightly soft pluck
    let idx = 0;
    let peak = 0;
    for (let i = 0; i < len; i++) {
      const a = line[idx];
      const b = line[(idx + 1) % n];
      const v = 0.4985 * (a + b);
      line[idx] = v;
      out[i] = a;
      peak = Math.max(peak, Math.abs(a));
      idx = (idx + 1) % n;
    }
    const fadeLen = Math.floor(sr * 0.05);
    for (let i = 0; i < len; i++) {
      out[i] = out[i] / (peak || 1) * 0.85;
      if (i > len - fadeLen) out[i] *= (len - i) / fadeLen;
    }
    return buf;
  }

  // Finds the pitch of a sample (autocorrelation over a steady part); returns a MIDI note number
  // with a fraction, or null when no clear pitch is found
  static detectPitch(buffer) {
    const sr = buffer.sampleRate;
    const data = buffer.getChannelData(0);
    const size = Math.min(4096, Math.pow(2, Math.floor(Math.log2(Math.max(512, data.length / 2)))));
    if (data.length < size + 64) return null;
    // The loudest window in the first two seconds (skipping the very start, often a noisy attack)
    let best = 0, bestAt = 0;
    const from = Math.min(Math.floor(sr * 0.05), Math.max(0, data.length - size));
    const to = Math.min(data.length - size, Math.floor(sr * 2));
    for (let s = from; s <= to; s += size >> 2) {
      let e = 0;
      for (let i = 0; i < size; i += 4) e += data[s + i] * data[s + i];
      if (e > best) { best = e; bestAt = s; }
    }
    if (best < 1e-4) return null;
    const minLag = Math.floor(sr / 2000);
    const maxLag = Math.min(size >> 1, Math.floor(sr / 40));
    const corr = new Float32Array(maxLag + 2);
    for (let lag = minLag; lag <= maxLag + 1; lag++) {
      let c = 0;
      for (let i = 0; i < size - lag; i++) c += data[bestAt + i] * data[bestAt + i + lag];
      corr[lag] = c;
    }
    let e0 = 0;
    for (let i = 0; i < size; i++) e0 += data[bestAt + i] * data[bestAt + i];
    let peak = -Infinity;
    for (let lag = minLag; lag <= maxLag; lag++) peak = Math.max(peak, corr[lag]);
    if (peak < e0 * 0.3) return null;
    // The first lag that comes close to the best (avoids picking an octave below)
    let lag = minLag;
    for (let l = minLag + 1; l < maxLag; l++) {
      if (corr[l] >= peak * 0.9 && corr[l] >= corr[l - 1] && corr[l] >= corr[l + 1]) { lag = l; break; }
    }
    const a = corr[lag - 1], b = corr[lag], c = corr[lag + 1];
    const shift = (a - 2 * b + c) !== 0 ? 0.5 * (a - c) / (a - 2 * b + c) : 0;
    const hz = sr / (lag + shift);
    return 69 + 12 * Math.log2(hz / 440);
  }

  build() {
    const ctx = this.audioCtx;
    this.outNode = this.own(ctx.createGain());
    this.outputNodes.out = this.outNode;
    // Pitch bend from the Keyboard plus Tune, in cents, added to every voice's detune
    this.detuneNode = this.makeConstant(0);
    this.bendCents = 0;
    this.voices = [];
    this.order = 0;
    this.lastRate = null;
    this.original = SamplerModule.builtInSample(ctx);   // the whole loaded file
    this.loadedName = null;     // file name of the sample in memory (null = built in)
    this.savedName = null;      // file name kept in the saved state
    this.trim = [0, 1];         // the part of the original that is kept, as fractions
    this.view = null;           // zoomed view [from, to] of the trimmed sample, null = all of it
    this.applyTrim();

    const self = this;
    this.inputNodes = {
      notes: {
        noteOn(note, freq, glide) { self.noteOn(note, freq, glide); },
        noteOff(note) { self.noteOff(note); },
        allNotesOff() { self.allNotesOff(); },
        bend(amount) { self.setBend(amount); }
      }
    };
    // TRIG: every pulse (clockSync.js) plays the sample once at the Root note
    this.follower = new ClockFollower(ctx, {
      onPulse: (time, dur) => this.trigger(time, dur)
    });
    this.inputNodes.trig = this.follower.input;
  }

  onInputConnected(key, connected, source) {
    if (key === 'trig') this.follower.cable(connected, source);
  }

  // ---- The sample ----

  // The playable buffer: the trimmed part of the original
  applyTrim() {
    const src = this.original;
    const a = Math.floor(this.trim[0] * src.length);
    const b = Math.max(a + 2, Math.floor(this.trim[1] * src.length));
    if (a === 0 && b >= src.length) {
      this.buffer = src;
    } else {
      const buf = this.audioCtx.createBuffer(src.numberOfChannels, b - a, src.sampleRate);
      for (let ch = 0; ch < src.numberOfChannels; ch++) buf.copyToChannel(src.getChannelData(ch).subarray(a, b), ch);
      this.buffer = buf;
    }
    this.peaksKey = null;
    this.requestDraw && this.requestDraw();
  }

  async loadFile(file) {
    const notify = (msg) => {
      if (window.synthApp && typeof window.synthApp.showNotification === 'function') window.synthApp.showNotification(msg);
    };
    let data;
    try {
      data = await file.arrayBuffer();
    } catch (err) {
      notify(`Could not read ${file.name}.`);
      return;
    }
    let decoded = null;
    try {
      decoded = await this.audioCtx.decodeAudioData(data.slice(0));
    } catch (err) {
      decoded = GranularModule.decodePcm(data, this.audioCtx);
    }
    if (!decoded) {
      notify(`${file.name} could not be opened. Try MP3, WAV, M4A, AAC, OGG, FLAC or AIFF.`);
      return;
    }
    this.allNotesOff(true);
    this.original = decoded;
    this.loadedName = file.name;
    this.savedName = file.name;
    this.trim = [0, 1];
    this.view = null;
    this.applyTrim();
    this.setParam('start', 0);
    this.setParam('end', 100);
    const pitch = SamplerModule.detectPitch(decoded);
    if (pitch !== null && pitch >= 24 && pitch <= 96) {
      const note = Math.round(pitch);
      this.setParam('root', note);
      this.setParam('tune', Math.max(-50, Math.min(50, Math.round((pitch - note) * 100))));
      notify(`${file.name} loaded. Its pitch sounds like ${SamplerModule.noteName(note)}, so Root is set to it.`);
    } else {
      notify(`${file.name} loaded. No clear pitch found; set Root to the note you hear.`);
    }
    this.updateInfo();
    if (window.synthApp && typeof window.synthApp.scheduleHistoryCapture === 'function') window.synthApp.scheduleHistoryCapture();
  }

  // Start / End as seconds in the playable buffer (Start always before End)
  region() {
    const dur = this.buffer.duration;
    let a = Math.min(this.params.start, this.params.end) / 100;
    let b = Math.max(this.params.start, this.params.end) / 100;
    if (b - a < SAMPLER_MIN_SEL) b = Math.min(1, a + SAMPLER_MIN_SEL);
    if (b - a < SAMPLER_MIN_SEL) a = b - SAMPLER_MIN_SEL;
    return { a: a * dur, b: b * dur };
  }

  // Trim: keep only the selection
  trimToSelection() {
    const a = Math.min(this.params.start, this.params.end) / 100;
    const b = Math.max(this.params.start, this.params.end) / 100;
    if (a <= 0 && b >= 1) return;
    const span = this.trim[1] - this.trim[0];
    const r = v => Math.round(v * 1e6) / 1e6;
    this.allNotesOff(true);
    this.trim = [r(this.trim[0] + a * span), r(this.trim[0] + Math.max(b, a + SAMPLER_MIN_SEL) * span)];
    this.view = null;
    this.applyTrim();
    this.setParam('start', 0);
    this.setParam('end', 100);
    this.updateInfo();
    if (window.synthApp && typeof window.synthApp.scheduleHistoryCapture === 'function') window.synthApp.scheduleHistoryCapture();
  }

  resetTrim() {
    this.allNotesOff(true);
    this.trim = [0, 1];
    this.view = null;
    this.applyTrim();
    this.setParam('start', 0);
    this.setParam('end', 100);
    this.updateInfo();
    if (window.synthApp && typeof window.synthApp.scheduleHistoryCapture === 'function') window.synthApp.scheduleHistoryCapture();
  }

  toggleZoom() {
    if (this.view) this.view = null;
    else {
      const a = Math.min(this.params.start, this.params.end) / 100;
      const b = Math.max(this.params.start, this.params.end) / 100;
      if (b - a > 0.98) return;
      const pad = (b - a) * 0.08;
      this.view = [Math.max(0, a - pad), Math.min(1, b + pad)];
    }
    this.peaksKey = null;
    this.updateInfo();
    this.requestDraw();
  }

  getExtraState() {
    const s = {};
    if (this.trim[0] !== 0 || this.trim[1] !== 1) s.trim = this.trim.slice();
    if (this.savedName) s.sample = this.savedName;
    return s;
  }

  setExtraState(state) {
    const trim = Array.isArray(state.trim) && state.trim.length === 2 ? [Number(state.trim[0]), Number(state.trim[1])] : [0, 1];
    this.savedName = state.sample || null;
    if (trim[0] !== this.trim[0] || trim[1] !== this.trim[1]) {
      this.allNotesOff(true);
      this.trim = trim;
      this.view = null;
      this.applyTrim();
    }
    this.updateInfo();
  }

  // ---- Voices ----

  rateFor(freq) {
    return freq / SamplerModule.midiToHz(this.params.root);
  }

  startVoice(note, rate, time, glide = 0) {
    const ctx = this.audioCtx;
    const t = Math.max(time, ctx.currentTime);
    // A key that is still sounding is released first; with all voices busy the oldest one is cut
    this.voices.filter(v => v.note === note && v.gate).forEach(v => this.releaseVoice(v, t, 0.015));
    let busy = this.voices.filter(v => !v.done);
    while (busy.length >= SAMPLER_MAX_VOICES) {
      const oldest = busy.reduce((m, v) => (v.order < m.order ? v : m), busy[0]);
      this.releaseVoice(oldest, t, 0.01);
      oldest.done = true;
      busy = this.voices.filter(v => !v.done);
    }
    const { a, b } = this.region();
    const src = ctx.createBufferSource();
    src.buffer = this.buffer;
    const loop = !!this.params.loop;
    if (loop) {
      src.loop = true;
      src.loopStart = a;
      src.loopEnd = b;
    }
    const from = glide > 0 && this.lastRate ? this.lastRate : null;
    src.playbackRate.setValueAtTime(from || rate, t);
    if (from) src.playbackRate.setTargetAtTime(rate, t, glide / 3);
    try { this.detuneNode.connect(src.detune); } catch (e) {}
    const amp = ctx.createGain();
    const atk = Math.max(0.001, this.params.attack / 1000);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(1, t + atk);
    src.connect(amp);
    amp.connect(this.outNode);
    if (loop) src.start(t, a);
    else src.start(t, a, b - a);
    const voice = { note, src, amp, rate, t0: t, a, b, loop, gate: true, done: false, order: this.order++ };
    src.onended = () => {
      voice.done = true;
      try { amp.disconnect(); } catch (e) {}
      try { this.detuneNode.disconnect(src.detune); } catch (e) {}
      this.voices = this.voices.filter(v => v !== voice);
    };
    this.voices.push(voice);
    this.lastRate = rate;
    this.startAnimation();
    return voice;
  }

  releaseVoice(v, time, fast) {
    if (!v.gate && !fast) return;
    v.gate = false;
    const t = Math.max(time, this.audioCtx.currentTime);
    const rel = fast || Math.max(0.01, this.params.release / 1000);
    try {
      v.amp.gain.cancelScheduledValues(t);
      v.amp.gain.setValueAtTime(v.amp.gain.value, t);
      v.amp.gain.setTargetAtTime(0, t, rel / 4);
      v.src.stop(t + rel * 1.2 + 0.02);
    } catch (e) {}
  }

  noteOn(note, freq, glide = 0) {
    const glideSec = glide === true ? 0.15 : Number(glide) || 0;
    this.startVoice(note, this.rateFor(freq), this.audioCtx.currentTime, glideSec);
  }

  noteOff(note) {
    const t = this.audioCtx.currentTime;
    this.voices.filter(v => v.note === note && v.gate).forEach(v => this.releaseVoice(v, t));
  }

  allNotesOff(fast = false) {
    const t = this.audioCtx.currentTime;
    (this.voices || []).forEach(v => this.releaseVoice(v, t, fast ? 0.01 : 0));
  }

  trigger(time, dur) {
    const v = this.startVoice('trig', 1, time);
    // Without Loop the sample plays to End by itself; with Loop it holds for one pulse
    if (this.params.loop) this.releaseVoice(v, time + Math.max(0.03, dur * 0.9));
    else v.gate = false;
  }

  // Pitch bend: -1..+1 is -2..+2 semitones
  setBend(amount) {
    this.bendCents = Math.max(-1, Math.min(1, amount)) * 200;
    this.applyDetune();
  }

  applyDetune() {
    const t = this.audioCtx.currentTime;
    this.detuneNode.offset.cancelScheduledValues(t);
    this.detuneNode.offset.setTargetAtTime(this.bendCents + this.params.tune, t, 0.005);
  }

  onParamChange(id, value) {
    if (!this.outNode) return;
    const t = this.audioCtx.currentTime;
    if (id === 'level') this.outNode.gain.setTargetAtTime(0.8 * value / 100, t, 0.02);
    else if (id === 'tune') this.applyDetune();
    else if (id === 'root') {
      // Held notes keep their key: their speed follows the new Root
      const ratio = SamplerModule.midiToHz(this._root || value) / SamplerModule.midiToHz(value);
      if (this._root !== undefined) (this.voices || []).forEach(v => {
        if (v.note === 'trig') return;
        v.rate *= ratio;
        try { v.src.playbackRate.setTargetAtTime(v.rate, t, 0.01); } catch (e) {}
      });
      this._root = value;
    } else if (id === 'start' || id === 'end') {
      const { a, b } = this.region();
      (this.voices || []).forEach(v => {
        if (!v.loop || v.done) return;
        try { v.src.loopStart = a; v.src.loopEnd = b; v.a = a; v.b = b; } catch (e) {}
      });
      this.updateInfo();
      this.requestDraw && this.requestDraw();
    }
  }

  // ---- Card ----

  renderBody() {
    return `
      <canvas id="${this.elId('wave')}" class="sampler-wave" width="${SAMPLER_W}" height="${SAMPLER_H}"></canvas>
      <div class="sampler-info" id="${this.elId('info')}"></div>
      <div class="sampler-buttons">
        <button class="action-btn" id="${this.elId('load')}">Load Sample</button>
        <button class="action-btn" id="${this.elId('trim')}" title="Keep only the selected part">Trim</button>
        <button class="action-btn module-toggle" id="${this.elId('zoom')}" title="Show the selection bigger">Zoom</button>
        <button class="action-btn" id="${this.elId('reset')}" title="Bring back the whole file">Reset</button>
      </div>
      <input type="file" id="${this.elId('file')}" accept="${GranularModule.FILE_ACCEPT}" style="display:none;">
    `;
  }

  onMount(card) {
    card.classList.add('sampler-card');
    const stop = el => {
      if (!el) return;
      el.addEventListener('pointerdown', e => e.stopPropagation());
      el.addEventListener('mousedown', e => e.stopPropagation());
    };
    const fileInput = this.el('file');
    ['load', 'trim', 'zoom', 'reset'].forEach(n => stop(this.el(n)));
    this.el('load').addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
    fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      e.target.value = '';
      if (file) this.loadFile(file);
    });
    this.el('trim').addEventListener('click', () => this.trimToSelection());
    this.el('zoom').addEventListener('click', () => this.toggleZoom());
    this.el('reset').addEventListener('click', () => this.resetTrim());
    this.bindWave();
    this.requestDraw = () => {
      if (this.drawQueued) return;
      this.drawQueued = true;
      requestAnimationFrame(() => { this.drawQueued = false; this.draw(); });
    };
    this.updateInfo();
    this.requestDraw();
  }

  updateInfo() {
    const info = this.el('info');
    const zoom = this.el('zoom');
    if (zoom) zoom.classList.toggle('active', !!this.view);
    if (!info || !this.buffer) return;
    const fmt = s => (s < 10 ? s.toFixed(2) : s.toFixed(1)) + ' s';
    const { a, b } = this.region();
    let name = this.loadedName || 'Built-in pluck (C4)';
    if (this.savedName && this.savedName !== this.loadedName) name = `Load ${this.savedName} again`;
    info.textContent = `${name} · ${fmt(this.buffer.duration)} · playing ${fmt(b - a)}`;
    info.title = name;
  }

  // The visible part of the playable buffer, as fractions
  viewRange() {
    return this.view || [0, 1];
  }

  bindWave() {
    const c = this.el('wave');
    if (!c) return;
    const frac = e => {
      const r = c.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const [v0, v1] = this.viewRange();
      return { f: v0 + x * (v1 - v0), px: x * SAMPLER_W };
    };
    const markerPx = pct => {
      const [v0, v1] = this.viewRange();
      return ((pct / 100 - v0) / (v1 - v0)) * SAMPLER_W;
    };
    const set = (id, f) => this.setParam(id, Math.round(Math.min(1, Math.max(0, f)) * 1000) / 10);
    c.addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      const p = frac(e);
      const ds = Math.abs(markerPx(this.params.start) - p.px);
      const de = Math.abs(markerPx(this.params.end) - p.px);
      const pick = 28;   // canvas pixels, easy to grab with a finger
      if (Math.min(ds, de) <= pick) this.drag = { id: ds <= de ? 'start' : 'end' };
      else {
        // Elsewhere: draw a new selection from here
        this.drag = { id: 'end', anchor: p.f };
        set('start', p.f);
        set('end', p.f);
      }
      try { c.setPointerCapture(e.pointerId); } catch (err) {}
    });
    c.addEventListener('pointermove', e => {
      if (!this.drag) return;
      e.preventDefault();
      e.stopPropagation();
      const p = frac(e);
      if (this.drag.anchor !== undefined) {
        set('start', Math.min(this.drag.anchor, p.f));
        set('end', Math.max(this.drag.anchor, p.f));
      } else if (this.drag.id === 'start') set('start', Math.min(p.f, this.params.end / 100 - SAMPLER_MIN_SEL));
      else set('end', Math.max(p.f, this.params.start / 100 + SAMPLER_MIN_SEL));
    });
    const end = () => {
      if (!this.drag) return;
      // A tap without dragging leaves an empty selection: play the rest of the sample from there
      if (this.drag.anchor !== undefined && this.params.end - this.params.start < SAMPLER_MIN_SEL * 100) set('end', 1);
      this.drag = null;
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
  }

  // Min / max per pixel column of the visible part (cached until the sample or the view changes)
  peaks() {
    const [v0, v1] = this.viewRange();
    const key = `${v0}|${v1}|${this.buffer.length}|${this.trim.join(',')}`;
    if (this.peaksKey === key) return this.peakData;
    const chs = [];
    for (let ch = 0; ch < Math.min(2, this.buffer.numberOfChannels); ch++) chs.push(this.buffer.getChannelData(ch));
    const len = this.buffer.length;
    const s0 = Math.floor(v0 * len);
    const span = Math.max(1, Math.floor((v1 - v0) * len));
    const mins = new Float32Array(SAMPLER_W);
    const maxs = new Float32Array(SAMPLER_W);
    for (let x = 0; x < SAMPLER_W; x++) {
      const a = s0 + Math.floor((x / SAMPLER_W) * span);
      const b = Math.max(a + 1, s0 + Math.floor(((x + 1) / SAMPLER_W) * span));
      const step = Math.max(1, Math.floor((b - a) / 200));   // long files: look at up to 200 samples per column
      let mn = 1, mx = -1;
      for (let i = a; i < b && i < len; i += step) {
        let v = 0;
        chs.forEach(d => { v += d[i]; });
        v /= chs.length;
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
      if (mn > mx) { mn = 0; mx = 0; }
      mins[x] = mn;
      maxs[x] = mx;
    }
    let peak = 0;
    for (let x = 0; x < SAMPLER_W; x++) peak = Math.max(peak, -mins[x], maxs[x]);
    this.peakData = { mins, maxs, scale: peak > 0.001 ? 0.95 / peak : 1 };
    this.peaksKey = key;
    return this.peakData;
  }

  // Where each sounding voice is now, as a fraction of the playable buffer
  playheads() {
    const now = this.audioCtx.currentTime;
    const dur = this.buffer.duration;
    const out = [];
    this.voices.forEach(v => {
      if (v.done || now < v.t0) return;
      let pos = v.a + (now - v.t0) * v.rate;
      if (v.loop && pos > v.b) pos = v.a + ((pos - v.a) % (v.b - v.a));
      if (!v.loop && pos > v.b) return;
      out.push({ f: pos / dur, gate: v.gate });
    });
    return out;
  }

  startAnimation() {
    if (this.animating || !this.card) return;
    this.animating = true;
    const tick = () => {
      if (!this.card || !this.card.isConnected || this.destroyed) { this.animating = false; return; }
      this.draw();
      if (this.voices.some(v => !v.done)) requestAnimationFrame(tick);
      else { this.animating = false; this.draw(); }
    };
    requestAnimationFrame(tick);
  }

  draw() {
    const c = this.el('wave');
    if (!c || !this.buffer) return;
    const ctx = c.getContext('2d');
    const css = getComputedStyle(this.card);
    const muted = css.getPropertyValue('--muted-text').trim() || '#64748b';
    const primary = css.getPropertyValue('--primary-color').trim() || '#2563eb';
    const text = css.getPropertyValue('--text-color').trim() || '#0f172a';
    const W = SAMPLER_W, H = SAMPLER_H, mid = H / 2;
    const [v0, v1] = this.viewRange();
    const toX = f => ((f - v0) / (v1 - v0)) * W;
    const sa = Math.min(this.params.start, this.params.end) / 100;
    const sb = Math.max(this.params.start, this.params.end) / 100;
    const xa = toX(sa), xb = toX(sb);
    ctx.clearRect(0, 0, W, H);

    // The selection (the part that is played)
    ctx.fillStyle = primary;
    ctx.globalAlpha = 0.1;
    ctx.fillRect(xa, 0, xb - xa, H);
    ctx.globalAlpha = 1;

    // The waveform: bright inside the selection, faint outside
    const { mins, maxs, scale } = this.peaks();
    const half = mid - 6;
    for (let x = 0; x < W; x++) {
      const inside = x >= xa && x <= xb;
      ctx.fillStyle = inside ? primary : muted;
      ctx.globalAlpha = inside ? 0.9 : 0.35;
      const y1 = mid - maxs[x] * scale * half;
      const y2 = mid - mins[x] * scale * half;
      ctx.fillRect(x, y1, 1, Math.max(1, y2 - y1));
    }
    ctx.globalAlpha = 1;

    // Start / End markers with a handle at the top
    [[xa, 'S'], [xb, 'E']].forEach(([x, label]) => {
      ctx.strokeStyle = text;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      ctx.fillStyle = text;
      const w = 22;
      const left = label === 'S' ? x : x - w;
      ctx.fillRect(left, 0, w, 22);
      ctx.fillStyle = css.getPropertyValue('--panel-bg').trim() || '#fff';
      ctx.font = '700 16px system-ui, sans-serif';
      ctx.fillText(label, left + 6, 17);
    });

    // A moving line for every sounding voice
    this.playheads().forEach(p => {
      const x = toX(p.f);
      if (x < 0 || x > W) return;
      ctx.strokeStyle = primary;
      ctx.globalAlpha = p.gate ? 1 : 0.5;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    });
    ctx.globalAlpha = 1;

    if (this.view) {
      ctx.fillStyle = muted;
      ctx.font = '600 15px system-ui, sans-serif';
      ctx.fillText('Zoomed', W - 70, H - 8);
    }
  }

  destroy() {
    this.destroyed = true;
    this.allNotesOff(true);
    if (this.follower) this.follower.destroy();
  }
}

ModuleBase.register(SamplerModule);
window.SamplerModule = SamplerModule;
