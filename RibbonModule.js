// RibbonModule.js - a colorful strip played with the mouse, a finger or the iPad pencil.
// Left to right sets the pitch (continuous, or snapped to notes); the height of the touch and the
// pencil pressure are two more control outputs. Built on the shared template (ModuleBase.js).

const RIBBON_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

class RibbonModule extends ModuleBase {
  static def = {
    type: 'ribbon',
    title: 'Ribbon',
    width: 300,
    menu: { group: 'Controllers & Sequencing', label: 'Ribbon' },
    params: [
      { id: 'base', label: 'Base Note', min: 24, max: 72, step: 1, value: 48, format: v => RibbonModule.noteName(v) },
      { id: 'range', label: 'Range', min: 1, max: 5, step: 1, value: 2, format: v => `${v} oct` },
      { id: 'glide', label: 'Glide', min: 0, max: 500, step: 5, value: 20, unit: 'ms' },
      { id: 'cvRange', label: 'Y / Press Range', min: 1, max: 2000, step: 1, value: 1, format: v => `x ${v}` },
      { id: 'snap', label: 'Snap', kind: 'toggle', value: false },
      { id: 'hold', label: 'Hold', kind: 'toggle', value: false }
    ],
    outputs: [
      { id: 'pitch', label: 'PITCH', signal: 'cv', title: 'Pitch Output',
        guide: { text: 'The note under your finger or pencil, left = Base Note.', to: 'Oscillator PITCH', match: ['oscillator:in:pitch'] },
        chip: 'Osc PITCH / any slider' },
      { id: 'gate', label: 'GATE', signal: 'gate', title: 'Gate Output',
        guide: { text: 'On while you touch the strip (stays on with Hold).', to: 'Envelope GATE IN, or VCA CV', match: ['envelope:in:gate', 'vca:in:cv'] },
        chip: 'Env GATE / VCA CV' },
      { id: 'y', label: 'Y', signal: 'cv', title: 'Height Output',
        guide: { text: 'How high you touch inside the strip, 0 at the bottom, times Y / Press Range. Its cable can also be dropped on any slider.', to: 'VCA CV, Filter CUT MOD, or any slider', match: ['vca:in:cv', 'filter:in:cutoff', 'granular:in:cv1', 'granular:in:cv2'] },
        chip: 'any slider / CV in' },
      { id: 'press', label: 'PRESS', signal: 'cv', title: 'Pressure Output',
        guide: { text: 'Pencil pressure (mouse and finger give full pressure), times Y / Press Range. Its cable can also be dropped on any slider.', to: 'VCA CV, Filter CUT MOD, or any slider', match: ['vca:in:cv', 'filter:in:cutoff', 'granular:in:cv1', 'granular:in:cv2'] },
        chip: 'any slider / CV in' }
    ]
  };

  static noteName(midi) {
    const m = Math.round(midi);
    return `${RIBBON_NOTES[m % 12]}${Math.floor(m / 12) - 1}`;
  }

  static midiToHz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  build() {
    this.x = 0;          // 0..1 along the strip
    this.y = 0;          // 0..1, bottom to top
    this.pressure = 0;   // 0..1
    this.touching = false;
    this.gateOn = false;
    this.pointerId = null;

    this.pitchOut = this.makeConstant(RibbonModule.midiToHz(48));
    this.gateOut = this.makeConstant(0);
    this.yOut = this.makeConstant(0);
    this.pressOut = this.makeConstant(0);
    this.outputNodes = { pitch: this.pitchOut, gate: this.gateOut, y: this.yOut, press: this.pressOut };
  }

  onParamChange(id, value) {
    if (!this.pitchOut) return;
    if (id === 'hold' && !value && !this.touching) this.release();
    else this.update();
  }

  currentMidi() {
    const semis = this.x * this.params.range * 12;
    return this.params.base + (this.params.snap ? Math.round(semis) : semis);
  }

  // Writes the current position to the outputs and redraws
  update() {
    const now = this.audioCtx.currentTime;
    const glide = Math.max(0.001, this.params.glide / 1000 / 3);
    this.pitchOut.offset.setTargetAtTime(RibbonModule.midiToHz(this.currentMidi()), now, glide);
    this.yOut.offset.setTargetAtTime(this.y * this.params.cvRange, now, 0.005);
    this.pressOut.offset.setTargetAtTime(this.pressure * this.params.cvRange, now, 0.005);
    this.gateOut.offset.setTargetAtTime(this.gateOn ? 1 : 0, now, 0.001);
    this.draw();
  }

  // Finger lifted (and Hold off): gate closes, Y and pressure fall back; the pitch stays so the note's tail is in tune
  release() {
    this.gateOn = false;
    this.y = 0;
    this.pressure = 0;
    this.update();
  }

  // Slider modulation (modulation.js): a cable from an output dropped on a slider moves it by that output.
  // PITCH moves it both ways around its value (strip center = no change); Y, PRESS and GATE only push it
  // up from its value, so at rest the slider sits where the user set it.
  getKnobModValue(portInfo) {
    const port = portInfo && (portInfo.id || portInfo.name);
    if (port === 'y') return this.y;
    if (port === 'press') return this.pressure;
    if (port === 'gate') return this.gateOn ? 1 : 0;
    return this.x * 2 - 1;
  }

  getKnobModDepth() { return 1; }

  renderBody() {
    return `
      <div class="ribbon-readout"><span>Note</span><span id="${this.elId('note')}">${RibbonModule.noteName(this.params.base)}</span></div>
      <canvas id="${this.elId('strip')}" class="ribbon-strip" width="552" height="200"></canvas>
    `;
  }

  onMount() {
    const strip = this.el('strip');
    if (!strip) return;
    const read = e => {
      const r = strip.getBoundingClientRect();
      this.x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      this.y = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
      this.pressure = e.pointerType === 'pen' ? Math.min(1, Math.max(0, e.pressure || 0)) : 1;
    };
    strip.addEventListener('pointerdown', e => {
      if (this.pointerId !== null) return;
      e.preventDefault();
      e.stopPropagation();
      if (window.synthApp && synthApp.ensureAudioContextRunning) synthApp.ensureAudioContextRunning();
      this.pointerId = e.pointerId;
      try { strip.setPointerCapture(e.pointerId); } catch (err) {}
      this.touching = true;
      this.gateOn = true;
      read(e);
      this.update();
    });
    strip.addEventListener('pointermove', e => {
      if (e.pointerId !== this.pointerId) return;
      read(e);
      this.update();
    });
    const end = e => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = null;
      this.touching = false;
      if (!this.params.hold) this.release();
      else this.draw();
    };
    strip.addEventListener('pointerup', end);
    strip.addEventListener('pointercancel', end);
    this.draw();
  }

  draw() {
    const canvas = this.el('strip');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const css = getComputedStyle(this.card);
    const text = css.getPropertyValue('--text-color').trim() || '#0f172a';

    // Rainbow from red (left, low notes) to violet (right, high notes); brighter while touched
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 6; i++) grad.addColorStop(i / 6, `hsl(${i * 50}, 85%, ${this.gateOn ? 58 : 66}%)`);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // A line on every note (stronger on every C)
    const semis = this.params.range * 12;
    for (let s = 1; s < semis; s++) {
      const isC = (this.params.base + s) % 12 === 0;
      ctx.fillStyle = isC ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)';
      ctx.fillRect(Math.round((s / semis) * w) - (isC ? 1 : 0), 0, isC ? 2 : 1, h);
    }

    // Position marker: a vertical line plus a dot at the touch height, sized by pressure
    if (this.gateOn || this.touching || this.x > 0) {
      const px = this.params.snap ? (Math.round(this.x * semis) / semis) * w : this.x * w;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillRect(px - 2, 0, 4, h);
      if (this.gateOn) {
        ctx.beginPath();
        ctx.arc(px, h - this.y * h, 8 + this.pressure * 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = text;
        ctx.stroke();
      }
    }

    const note = this.el('note');
    if (note) note.textContent = this.gateOn ? RibbonModule.noteName(this.currentMidi()) : '-';
  }
}

ModuleBase.register(RibbonModule);
