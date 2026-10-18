// HarmonyWalkerModule.js - a harmony engine that plays by itself: press Play and it walks from chord
// to chord on the Tonnetz (the Neo-Riemannian grid of notes and triads), one P, L or R move per step.
// P (Parallel) C major <-> C minor, R (Relative) C major <-> A minor, L (Leading-tone) C major <-> E minor:
// each move changes one note of the triad, so the voices move smoothly. A row of up to 8 steps sets the
// movement (ready-made movements in a menu, or tap the steps). The chord goes out on NOTES (a Poly Synth),
// on LOW / MID / HIGH FREQ (three oscillators) and a GATE on every change. Follows a CLOCK cable
// (16th-note pulses, architecture.md section 4) or its own Tempo. Built on the shared template (ModuleBase.js).

const HW_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const HW_MOVES = {
  pl: ['P', 'L'],
  pr: ['P', 'R'],
  lr: ['L', 'R'],
  plr: ['P', 'L', 'R'],
  drift: ['L', 'P', 'R', 'P'],
  random: ['?']
};
const HW_STEP_CYCLE = ['P', 'L', 'R', '?', '-'];
const HW_MAX_STEPS = 8;
const HW_GATE_LEN = 0.85;   // the GATE stays on for this part of each chord

// Detects rising edges on the CLOCK input and posts their audio time to the module
const HW_CLOCK_WORKLET = `
  class HwClockProcessor extends AudioWorkletProcessor {
    constructor() { super(); this.high = false; }
    process(inputs) {
      const ch = inputs[0] && inputs[0][0];
      if (ch) {
        for (let i = 0; i < ch.length; i++) {
          const v = ch[i];
          if (!this.high && v > 0.5) { this.high = true; this.port.postMessage(currentTime + i / sampleRate); }
          else if (this.high && v < 0.25) this.high = false;
        }
      }
      return true;
    }
  }
  registerProcessor('hw-clock-processor', HwClockProcessor);
`;

class HarmonyWalkerModule extends ModuleBase {
  static def = {
    type: 'harmony',
    title: 'Harmony Walker',
    width: 360,
    menu: { group: 'Controllers & Sequencing', label: 'Harmony Walker' },
    params: [
      { id: 'movement', label: 'Movement', kind: 'select', value: 'drift',
        options: [['pl', 'Hexatonic cycle (P L)'], ['pr', 'Octatonic cycle (P R)'], ['lr', 'Chain of thirds (L R)'],
          ['plr', 'P L R'], ['drift', 'Drift (L P R P)'], ['random', 'Random walk'], ['custom', 'Custom']] },
      { id: 'length', label: 'Steps', min: 1, max: HW_MAX_STEPS, step: 1, value: 4 },
      { id: 'every', label: 'Change Every', min: 1, max: 16, step: 1, value: 4,
        format: v => `${v} ${v === 1 ? 'beat' : 'beats'}` },
      { id: 'tempo', label: 'Tempo', min: 20, max: 200, step: 1, value: 80, unit: 'BPM' },
      { id: 'start', label: 'Start Chord', kind: 'select', value: '0M',
        options: HW_NAMES.map((n, i) => [`${i}M`, `${n} major`]).concat(HW_NAMES.map((n, i) => [`${i}m`, `${n} minor`])) },
      { id: 'octave', label: 'Octave', min: 1, max: 6, step: 1, value: 3 },
      { id: 'voicing', label: 'Voicing', kind: 'select', value: 'close',
        options: [['close', 'Close'], ['open', 'Open (low note down)'], ['wide', 'Wide (low down, high up)']] }
    ],
    inputs: [
      { id: 'clock', label: 'CLOCK', signal: 'gate', title: 'Clock Input', inline: true,
        guide: { text: 'A pulse on every 16th note. With a cable here the Walker follows that tempo instead of its own (Change Every counts beats of 4 pulses).', from: 'Metronome CLOCK, Drum Machine CLOCK, Sequencer CLOCK', match: ['metronome:out:clock', 'drums:out:clock', 'sequencer:out:clock'] },
        chip: 'Metronome / Drums CLOCK' }
    ],
    outputs: [
      { id: 'notes', label: 'NOTES', signal: 'gate', title: 'Notes Output (to Poly Synth NOTES)',
        guide: { text: 'The three notes of the chord. Notes the next chord shares keep sounding; only the changed note is played again. Carries notes, not sound.', to: 'Poly Synth NOTES', match: ['polysynth:in:notes'] },
        chip: 'Poly Synth NOTES' },
      { id: 'low', label: 'LOW', signal: 'cv', title: 'Lowest Note (Hz)',
        guide: { text: 'The lowest note of the chord, as a pitch in Hz.', to: 'Oscillator PITCH, Wavetable Osc PITCH', match: ['oscillator:in:pitch', 'wavetable:in:pitch'] },
        chip: 'Osc PITCH' },
      { id: 'mid', label: 'MID', signal: 'cv', title: 'Middle Note (Hz)',
        guide: { text: 'The middle note of the chord, as a pitch in Hz.', to: 'Oscillator PITCH, Wavetable Osc PITCH', match: ['oscillator:in:pitch', 'wavetable:in:pitch'] },
        chip: 'Osc PITCH' },
      { id: 'high', label: 'HIGH', signal: 'cv', title: 'Highest Note (Hz)',
        guide: { text: 'The highest note of the chord, as a pitch in Hz.', to: 'Oscillator PITCH, Wavetable Osc PITCH', match: ['oscillator:in:pitch', 'wavetable:in:pitch'] },
        chip: 'Osc PITCH' },
      { id: 'gate', label: 'GATE', signal: 'gate', title: 'Gate Output',
        guide: { text: 'Turns on at every chord change and off just before the next one.', to: 'Envelope GATE IN, VCA CV', match: ['envelope:in:gate', 'vca:in:cv'] },
        chip: 'Env GATE IN' }
    ]
  };

  static loadWorklet(ctx) {
    if (!ctx.audioWorklet) return Promise.reject(new Error('AudioWorklet not supported'));
    if (!HarmonyWalkerModule.workletReady || HarmonyWalkerModule.workletCtx !== ctx) {
      HarmonyWalkerModule.workletCtx = ctx;
      const url = URL.createObjectURL(new Blob([HW_CLOCK_WORKLET], { type: 'application/javascript' }));
      HarmonyWalkerModule.workletReady = ctx.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url));
    }
    return HarmonyWalkerModule.workletReady;
  }

  // ---- Tonnetz math ----
  // Grid point (i, j): i counts fifths to the right, j major thirds up-right. Note = 7i + 4j (+ the start note).
  // A major triangle at (i, j) has corners (i, j) root, (i + 1, j) fifth, (i, j + 1) third.
  // A minor triangle at (i, j) has corners (i + 1, j) fifth, (i, j + 1) root, (i + 1, j + 1) third.
  pc(i, j) {
    return (((7 * i + 4 * j + this.base) % 12) + 12) % 12;
  }

  corners(t) {
    return t.type === 'M'
      ? [[t.i, t.j], [t.i + 1, t.j], [t.i, t.j + 1]]
      : [[t.i + 1, t.j], [t.i, t.j + 1], [t.i + 1, t.j + 1]];
  }

  chordPcs(t) {
    const root = t.type === 'M' ? this.pc(t.i, t.j) : this.pc(t.i, t.j + 1);
    return [root, (root + (t.type === 'M' ? 4 : 3)) % 12, (root + 7) % 12];
  }

  chordName(t) {
    const root = this.chordPcs(t)[0];
    return `${HW_NAMES[root]} ${t.type === 'M' ? 'major' : 'minor'}`;
  }

  // Each move flips the triangle across one of its edges
  transform(t, move) {
    if (t.type === 'M') {
      if (move === 'P') return { type: 'm', i: t.i, j: t.j - 1 };
      if (move === 'R') return { type: 'm', i: t.i - 1, j: t.j };
      return { type: 'm', i: t.i, j: t.j };
    }
    if (move === 'P') return { type: 'M', i: t.i, j: t.j + 1 };
    if (move === 'R') return { type: 'M', i: t.i + 1, j: t.j };
    return { type: 'M', i: t.i, j: t.j };
  }

  build() {
    this.steps = HW_MOVES.drift.slice();
    while (this.steps.length < HW_MAX_STEPS) this.steps.push('-');
    this.playing = false;
    this.stepIndex = -1;       // the step that made the current chord (-1: the start chord)
    this.lastMove = null;
    this.trail = [];           // earlier chords, newest last
    this.voices = null;        // three MIDI notes, one per voice
    this.timer = null;
    this.clockCables = 0;
    this.pulses = 0;
    this.lastPulse = 0;
    this.pulseGap = 0;
    this.cam = null;
    this.setStartChord();

    this.noteBus = new PolyNoteBus();
    this.lowOut = this.makeConstant(0);
    this.midOut = this.makeConstant(0);
    this.highOut = this.makeConstant(0);
    this.gateOut = this.makeConstant(0);
    this.clockIn = this.own(this.audioCtx.createGain());
    this.inputNodes = { clock: this.clockIn };
    this.outputNodes = { notes: this.noteBus, low: this.lowOut, mid: this.midOut, high: this.highOut, gate: this.gateOut };

    HarmonyWalkerModule.loadWorklet(this.audioCtx).then(() => {
      if (this.destroyed) return;
      this.clockNode = this.own(new AudioWorkletNode(this.audioCtx, 'hw-clock-processor', { numberOfInputs: 1, numberOfOutputs: 1 }));
      this.clockIn.connect(this.clockNode);
      // A silent path to the speakers keeps the detector running
      this.sink = this.own(this.audioCtx.createGain());
      this.sink.gain.value = 0;
      this.clockNode.connect(this.sink);
      this.sink.connect(this.audioCtx.destination);
      this.clockNode.port.onmessage = e => this.onClockPulse(e.data);
    }).catch(() => {});
  }

  setStartChord() {
    const s = String(this.params.start || '0M');
    this.base = parseInt(s, 10) || 0;
    this.chord = s.endsWith('m') ? { type: 'm', i: 0, j: -1 } : { type: 'M', i: 0, j: 0 };
    this.trail = [];
    this.voices = null;
    this.cam = null;
  }

  onParamChange(id, value) {
    if (id === 'movement' && HW_MOVES[value]) {
      const m = HW_MOVES[value];
      for (let k = 0; k < HW_MAX_STEPS; k++) this.steps[k] = m[k % m.length];
      if (this.params.length !== m.length) this.setParam('length', m.length);
      this.renderSteps();
    }
    if (id === 'start' && !this.playing) {
      this.setStartChord();
      this.updateReadout();
      this.requestDraw();
    }
    if (id === 'voicing' && this.playing) this.sendChord(this.audioCtx.currentTime, false);
    if (id === 'length') this.renderSteps();
  }

  // ---- Voices: each voice moves to the nearest note of the new chord, pulled gently toward the Octave ----
  center() {
    return 12 * (this.params.octave + 1) + 6;
  }

  voiceChord(pcs) {
    const c = this.center();
    if (!this.voices) {
      let root = c - 6 + ((pcs[0] - (c - 6)) % 12 + 12) % 12;
      if (root > c) root -= 12;
      const third = root + ((pcs[1] - pcs[0] + 12) % 12);
      const fifth = root + 7;
      this.voices = [root, third, fifth];
      return;
    }
    const near = (from, pc) => {
      let best = null;
      for (let n = from - 6; n <= from + 6; n++) {
        if (((n % 12) + 12) % 12 !== pc) continue;
        const cost = Math.abs(n - from) + 0.3 * Math.abs(n - c);
        if (!best || cost < best.cost) best = { n, cost };
      }
      return best;
    };
    const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    let bestSet = null;
    perms.forEach(p => {
      const notes = this.voices.map((v, k) => near(v, pcs[p[k]]));
      const cost = notes.reduce((a, b) => a + b.cost, 0);
      if (!bestSet || cost < bestSet.cost) bestSet = { cost, notes: notes.map(x => x.n) };
    });
    this.voices = bestSet.notes;
  }

  outputNotes() {
    const n = this.voices.slice().sort((a, b) => a - b);
    if (this.params.voicing === 'open' || this.params.voicing === 'wide') n[0] -= 12;
    if (this.params.voicing === 'wide') n[2] += 12;
    return n;
  }

  static hz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // ---- Playing ----
  chordSeconds() {
    const beat = this.clockLive() ? this.pulseGap * 4 : 60 / this.params.tempo;
    return beat * this.params.every;
  }

  clockLive() {
    return this.clockCables > 0 && this.pulseGap > 0 && this.audioCtx.currentTime - this.lastPulse < 3;
  }

  start() {
    if (this.playing) return;
    if (window.synthApp && synthApp.ensureAudioContextRunning) synthApp.ensureAudioContextRunning();
    this.playing = true;
    this.setStartChord();
    this.stepIndex = -1;
    this.lastMove = null;
    this.pulses = 0;
    const t = this.audioCtx.currentTime + 0.05;
    this.nextTime = t;
    this.timer = setInterval(() => this.schedule(), 25);
    this.schedule();
    this.updatePlayButton();
  }

  stop() {
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    clearTimeout(this.noteTimer);
    this.noteBus.update([]);
    const now = this.audioCtx.currentTime;
    this.gateOut.offset.cancelScheduledValues(now);
    this.gateOut.offset.setValueAtTime(0, now);
    this.updatePlayButton();
    this.requestDraw();
  }

  // Own tempo: chords on the audio clock, a little ahead. With a live CLOCK the pulses drive it instead.
  schedule() {
    if (!this.playing || this.clockLive()) return;
    const now = this.audioCtx.currentTime;
    if (this.nextTime < now - 0.2) this.nextTime = now + 0.02;   // the page was asleep
    if (this.nextTime < now + 0.1) {
      this.advance(this.nextTime);
      this.nextTime += this.chordSeconds();
    }
  }

  onClockPulse(time) {
    if (this.lastPulse && time - this.lastPulse < 3) this.pulseGap = time - this.lastPulse;
    this.lastPulse = time;
    if (!this.playing || !this.pulseGap) return;
    if (this.pulses % (this.params.every * 4) === 0) this.advance(Math.max(time, this.audioCtx.currentTime));
    this.pulses++;
    this.nextTime = this.audioCtx.currentTime + this.chordSeconds();   // ready if the clock stops
  }

  // The first call plays the start chord; every later one takes the next step
  advance(t) {
    if (this.stepIndex >= 0 || this.voices) {
      this.stepIndex = (this.stepIndex + 1) % this.params.length;
      let move = this.steps[this.stepIndex];
      if (move === '?') {
        const options = ['P', 'L', 'R'].filter(m => m !== this.lastMove);   // the same move twice goes back
        move = options[Math.floor(Math.random() * options.length)];
      }
      if (move !== '-') {
        this.trail.push(this.chord);
        if (this.trail.length > 6) this.trail.shift();
        this.chord = this.transform(this.chord, move);
        this.lastMove = move;
      }
    }
    this.sendChord(t, true);
  }

  sendChord(t, gate) {
    const first = !this.voices;
    if (first || gate) this.voiceChord(this.chordPcs(this.chord));
    const notes = this.outputNotes();
    [this.lowOut, this.midOut, this.highOut].forEach((o, k) => o.offset.setValueAtTime(HarmonyWalkerModule.hz(notes[k]), t));
    if (gate) {
      const g = this.gateOut.offset;
      g.cancelScheduledValues(t);
      g.setValueAtTime(0, t);
      g.setValueAtTime(1, t + 0.003);
      g.setValueAtTime(0, t + this.chordSeconds() * HW_GATE_LEN);
    }
    // NOTES and the display follow when the chord is actually heard
    const wait = Math.max(0, (t - this.audioCtx.currentTime) * 1000);
    clearTimeout(this.noteTimer);
    this.noteTimer = setTimeout(() => {
      if (!this.playing) return;
      this.noteBus.update(notes.map(m => ({ midiNote: m, freq: HarmonyWalkerModule.hz(m) })));
      this.shownStep = this.stepIndex;
      this.updateReadout();
      this.renderSteps();
      this.requestDraw();
    }, wait);
  }

  onInputConnected(key, connected) {
    if (key !== 'clock') return;
    this.clockCables = Math.max(0, this.clockCables + (connected ? 1 : -1));
    if (!this.clockCables) this.pulseGap = 0;
    const sl = this.el('p_tempo');
    const ro = this.el('v_tempo');
    if (sl) sl.disabled = this.clockCables > 0;
    if (ro) ro.textContent = this.clockCables > 0 ? 'from CLOCK' : this.formatParam(this.paramDef('tempo'), this.params.tempo);
  }

  formatParam(p, value) {
    if (p.id === 'tempo' && this.clockCables > 0) return 'from CLOCK';
    return super.formatParam(p, value);
  }

  // ---- UI ----
  renderBody() {
    return `
      <div class="hw-top">
        <button class="action-btn hw-play" id="${this.elId('play')}">Play</button>
        <span class="hw-chord" id="${this.elId('chord')}"></span>
        ${this.renderPort(this.def.inputs[0], 'in')}
      </div>
      <canvas id="${this.elId('display')}" class="hw-display" width="560" height="320"></canvas>
      <div class="hw-steps" id="${this.elId('steps')}"></div>
    `;
  }

  renderSteps() {
    const box = this.el('steps');
    if (!box) return;
    let html = '';
    for (let k = 0; k < HW_MAX_STEPS; k++) {
      const cls = ['hw-step'];
      if (k >= this.params.length) cls.push('off');
      if (this.playing && k === this.shownStep) cls.push('now');
      const label = this.steps[k] === '-' ? '–' : this.steps[k];
      html += `<button class="${cls.join(' ')}" data-step="${k}">${label}</button>`;
    }
    box.innerHTML = html;
  }

  updateReadout() {
    const el = this.el('chord');
    if (!el) return;
    const prev = this.trail.length ? this.trail[this.trail.length - 1] : null;
    el.textContent = this.playing && prev ? `${this.chordName(prev)} to ${this.chordName(this.chord)}` : this.chordName(this.chord);
  }

  onMount(card) {
    card.classList.add('hw-card');
    this.renderSteps();
    this.updateReadout();
    const play = this.el('play');
    if (play) play.addEventListener('click', () => (this.playing ? this.stop() : this.start()));
    const steps = this.el('steps');
    if (steps) steps.addEventListener('click', e => {
      const b = e.target.closest('.hw-step');
      if (!b) return;
      const k = parseInt(b.dataset.step, 10);
      if (k >= this.params.length) this.setParam('length', k + 1);
      this.steps[k] = HW_STEP_CYCLE[(HW_STEP_CYCLE.indexOf(this.steps[k]) + 1) % HW_STEP_CYCLE.length];
      if (this.params.movement !== 'custom') {
        this.params.movement = 'custom';
        const sel = this.el('p_movement');
        if (sel) sel.value = 'custom';
      }
      this.renderSteps();
    });
    this.updatePlayButton();
    this.requestDraw();
  }

  updatePlayButton() {
    const btn = this.el('play');
    if (!btn) return;
    btn.textContent = this.playing ? 'Stop' : 'Play';
    btn.classList.toggle('active', this.playing);
  }

  requestDraw() {
    if (this.drawPending || !this.card) return;
    this.drawPending = true;
    requestAnimationFrame(() => { this.drawPending = false; this.draw(); });
  }

  // The grid follows the current chord: the view glides so the lit triangle stays in the middle
  draw() {
    const cv = this.el('display');
    if (!cv) return;
    const g = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const css = getComputedStyle(this.card);
    const text = css.getPropertyValue('--text-color').trim() || '#0f172a';
    const muted = css.getPropertyValue('--muted-text').trim() || '#64748b';
    const primary = css.getPropertyValue('--primary-color').trim() || '#2563eb';
    const border = css.getPropertyValue('--panel-border').trim() || '#e2e8f0';
    const dx = 124, dy = dx * Math.sqrt(3) / 2;
    const pos = (i, j) => [i * dx + j * dx / 2, -j * dy];
    const centroid = t => {
      const p = this.corners(t).map(([i, j]) => pos(i, j));
      return [(p[0][0] + p[1][0] + p[2][0]) / 3, (p[0][1] + p[1][1] + p[2][1]) / 3];
    };
    const target = centroid(this.chord);
    if (!this.cam) this.cam = target.slice();
    this.cam[0] += (target[0] - this.cam[0]) * 0.18;
    this.cam[1] += (target[1] - this.cam[1]) * 0.18;
    const moving = Math.abs(target[0] - this.cam[0]) + Math.abs(target[1] - this.cam[1]) > 0.5;
    const sx = x => x - this.cam[0] + W / 2;
    const sy = y => y - this.cam[1] + H / 2;

    g.clearRect(0, 0, W, H);
    const j0 = Math.floor(-(this.cam[1] + H / 2) / dy) - 1, j1 = Math.ceil(-(this.cam[1] - H / 2) / dy) + 1;
    const tri = (t, fill, alpha) => {
      g.beginPath();
      this.corners(t).forEach(([i, j], k) => {
        const [x, y] = pos(i, j);
        if (k === 0) g.moveTo(sx(x), sy(y)); else g.lineTo(sx(x), sy(y));
      });
      g.closePath();
      g.globalAlpha = alpha;
      g.fillStyle = fill;
      g.fill();
      g.globalAlpha = 1;
    };
    this.trail.forEach((t, k) => tri(t, primary, 0.08 + 0.3 * (k + 1) / (this.trail.length + 1)));
    tri(this.chord, primary, this.playing ? 0.85 : 0.55);

    // Grid lines and note names
    const lit = new Set(this.corners(this.chord).map(c => c.join(',')));
    g.lineWidth = 1.5;
    g.strokeStyle = border;
    for (let j = j0; j <= j1; j++) {
      const iFrom = Math.floor((this.cam[0] - W / 2 - j * dx / 2) / dx) - 1;
      const iTo = Math.ceil((this.cam[0] + W / 2 - j * dx / 2) / dx) + 1;
      for (let i = iFrom; i <= iTo; i++) {
        const [x, y] = pos(i, j);
        [[i + 1, j], [i, j + 1], [i - 1, j + 1]].forEach(([a, b]) => {
          const [x2, y2] = pos(a, b);
          g.beginPath();
          g.moveTo(sx(x), sy(y));
          g.lineTo(sx(x2), sy(y2));
          g.stroke();
        });
      }
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let j = j0; j <= j1; j++) {
      const iFrom = Math.floor((this.cam[0] - W / 2 - j * dx / 2) / dx) - 1;
      const iTo = Math.ceil((this.cam[0] + W / 2 - j * dx / 2) / dx) + 1;
      for (let i = iFrom; i <= iTo; i++) {
        const [x, y] = pos(i, j);
        const on = lit.has(`${i},${j}`);
        g.beginPath();
        g.arc(sx(x), sy(y), on ? 27 : 24, 0, Math.PI * 2);
        g.fillStyle = css.getPropertyValue('--panel-bg').trim() || '#ffffff';
        g.fill();
        g.lineWidth = on ? 4 : 1.5;
        g.strokeStyle = on ? primary : border;
        g.stroke();
        g.font = `${on ? 'bold ' : ''}25px system-ui, sans-serif`;
        g.fillStyle = on ? text : muted;
        g.fillText(HW_NAMES[this.pc(i, j)], sx(x), sy(y) + 1);
      }
    }
    g.lineWidth = 1;
    if (moving) this.requestDraw();
  }

  getExtraState() {
    return { steps: this.steps.slice() };
  }

  setExtraState(s) {
    if (Array.isArray(s.steps)) {
      for (let k = 0; k < HW_MAX_STEPS; k++) {
        const v = s.steps[k];
        this.steps[k] = HW_STEP_CYCLE.includes(v) ? v : '-';
      }
      this.renderSteps();
    }
  }

  cleanup() {
    this.noteBus.disconnect();
    super.cleanup();
  }

  destroy() {
    this.destroyed = true;
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    clearTimeout(this.noteTimer);
  }
}

ModuleBase.register(HarmonyWalkerModule);
