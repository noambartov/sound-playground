// VoiceSplitModule.js - turns one NOTES cable (every held key, from the Keyboard, Sequencer,
// Harmony Walker or Chorale) into 4 separate voices, each with its own PITCH (Hz) and GATE output.
// With it a polyphonic synth can be built from separate modules: one Oscillator / Filter / VCA /
// Envelope chain per voice. A new note goes to a free voice; when all are busy the oldest note
// is taken over. Built on the shared template (ModuleBase.js).

const VS_VOICES = 4;
const VS_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

class VoiceSplitModule extends ModuleBase {
  static def = {
    type: 'voicesplit',
    title: 'Voice Split',
    width: 260,
    menu: { group: 'Controllers & Sequencing', label: 'Voice Split' },
    params: [
      { id: 'voices', label: 'Voices', min: 1, max: VS_VOICES, step: 1, value: VS_VOICES, format: v => `${v}`, entry: false },
      { id: 'mode', label: 'New Note Goes To', kind: 'select', value: 'rotate',
        options: [['rotate', 'Next voice (in turn)'], ['first', 'Lowest free voice']] }
    ],
    inputs: [
      { id: 'notes', label: 'NOTES', signal: 'gate', title: 'Notes Input (from Keyboard, Sequencer, Harmony Walker or Chorale NOTES)',
        guide: { text: 'All the keys you hold. Each note is handed to one of the 4 voices. This cable carries notes, not sound.', from: 'Keyboard NOTES, Sequencer NOTES, Harmony Walker NOTES, Chorale NOTES', match: ['keyboard:out:notes', 'sequencer:out:notes', 'harmony:out:notes', 'chorale:out:notes'] },
        chip: 'Keyboard NOTES' }
    ],
    outputs: Array.from({ length: VS_VOICES }, (_, i) => [
      { id: `pitch${i + 1}`, label: `PITCH ${i + 1}`, signal: 'cv', title: `Voice ${i + 1} Pitch Output (Hz)`, inline: true,
        guide: { text: `The note voice ${i + 1} is playing, as a pitch. It keeps the last note after the key is released, so the sound fades out in tune.`, to: 'Oscillator PITCH', match: ['oscillator:in:pitch', 'wavetable:in:pitch'] },
        chip: 'Osc PITCH' },
      { id: `gate${i + 1}`, label: `GATE ${i + 1}`, signal: 'gate', title: `Voice ${i + 1} Gate Output`, inline: true,
        guide: { text: `On while voice ${i + 1}'s key is held. A new note on a busy voice closes the gate for a moment, so the envelope starts again.`, to: 'Envelope GATE IN, or VCA CV', match: ['envelope:in:gate', 'vca:in:cv'] },
        chip: 'Env GATE' }
    ]).flat()
  };

  static noteName(note) {
    const n = Math.round(note);
    return `${VS_NOTE_NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
  }

  build() {
    this.bendMul = 1;
    this.counter = 0;
    this.lastVoice = -1;
    this.voices = [];
    for (let i = 0; i < VS_VOICES; i++) {
      const pitch = this.makeConstant(261.63);
      const gate = this.makeConstant(0);
      this.outputNodes[`pitch${i + 1}`] = pitch;
      this.outputNodes[`gate${i + 1}`] = gate;
      this.voices.push({ pitch, gate, note: null, freq: 261.63, on: false, order: 0, offTimer: null });
    }
    const self = this;
    // The NOTES input: app.js connects a PolyNoteBus (Keyboard NOTES ...) to this object
    this.inputNodes = {
      notes: {
        noteOn(note, freq, glide, when) { self.noteOn(note, freq, glide, when); },
        noteOff(note, when) { self.noteOff(note, when); },
        allNotesOff() { self.allNotesOff(); },
        bend(amount) { self.setBend(amount); }
      }
    };
  }

  onParamChange(id) {
    if (!this.voices) return;
    if (id === 'voices') {
      // Voices beyond the count are switched off
      this.voices.forEach((v, i) => { if (i >= this.params.voices && v.on) this.closeGate(v, this.audioCtx.currentTime); });
      this.updateDisplay();
    }
  }

  time(when) {
    const now = this.audioCtx.currentTime;
    return when && when > now ? when : now;
  }

  // Which voice plays a new note
  pickVoice(note) {
    const count = this.params.voices;
    const active = this.voices.slice(0, count);
    const same = active.findIndex(v => v.note === note);
    if (same >= 0) return same;
    const free = [];
    active.forEach((v, i) => { if (!v.on) free.push(i); });
    if (free.length) {
      if (this.params.mode === 'first') return free[0];
      // In turn: the first free voice after the one used last (lets each note's release ring out)
      for (let k = 1; k <= count; k++) {
        const i = (this.lastVoice + k) % count;
        if (free.includes(i)) return i;
      }
    }
    // All busy: take over the oldest note
    let oldest = 0;
    active.forEach((v, i) => { if (v.order < active[oldest].order) oldest = i; });
    return oldest;
  }

  noteOn(note, freq, glide, when) {
    const t = this.time(when);
    const i = this.pickVoice(note);
    const v = this.voices[i];
    this.lastVoice = i;
    const wasOn = v.on;
    v.note = note;
    v.freq = freq;
    v.on = true;
    v.order = ++this.counter;
    const f = freq * this.bendMul;
    v.pitch.offset.cancelScheduledValues(t);
    if (glide > 0) v.pitch.offset.setTargetAtTime(f, t, glide / 3);
    else v.pitch.offset.setValueAtTime(f, t);
    v.gate.offset.cancelScheduledValues(t);
    if (wasOn) {
      // Retrigger: a 4 ms gap so the voice's Envelope starts again
      v.gate.offset.setValueAtTime(0, t);
      v.gate.offset.setValueAtTime(1, t + 0.004);
    } else {
      v.gate.offset.setValueAtTime(1, t);
    }
    this.showLater(t);
  }

  noteOff(note, when) {
    const t = this.time(when);
    this.voices.forEach(v => {
      if (v.on && v.note === note) this.closeGate(v, t);
    });
    this.showLater(t);
  }

  closeGate(v, t) {
    v.on = false;
    v.gate.offset.cancelScheduledValues(t);
    v.gate.offset.setValueAtTime(0, t);
  }

  allNotesOff() {
    const t = this.audioCtx.currentTime;
    this.voices.forEach(v => { if (v.on) this.closeGate(v, t); });
    this.updateDisplay();
  }

  setBend(amount) {
    this.bendMul = Math.pow(2, (amount || 0) * 2 / 12);   // +-2 semitones, like the Keyboard's FREQ output
    const t = this.audioCtx.currentTime;
    this.voices.forEach(v => v.pitch.offset.setTargetAtTime(v.freq * this.bendMul, t, 0.01));
  }

  // Notes from the Sequencer arrive a little ahead: light the display when they actually play
  showLater(t) {
    const ms = Math.max(0, (t - this.audioCtx.currentTime) * 1000);
    if (ms < 5) this.updateDisplay();
    else setTimeout(() => this.updateDisplay(), ms);
  }

  renderBody() {
    const rows = this.voices.map((v, i) => `
      <div class="vs-row" data-voice="${i}">
        <span class="vs-num">${i + 1}</span>
        <span class="vs-note" id="${this.elId(`note${i}`)}">-</span>
        ${this.renderPort(this.def.outputs[i * 2], 'out')}
        ${this.renderPort(this.def.outputs[i * 2 + 1], 'out')}
      </div>`).join('');
    return `<div class="vs-rows" id="${this.elId('rows')}">${rows}</div>`;
  }

  onMount() {
    this.updateDisplay();
  }

  updateDisplay() {
    if (!this.card || !this.voices) return;
    this.voices.forEach((v, i) => {
      const row = this.card.querySelector(`.vs-row[data-voice="${i}"]`);
      const label = this.el(`note${i}`);
      if (!row || !label) return;
      row.classList.toggle('on', v.on);
      row.classList.toggle('unused', i >= this.params.voices);
      label.textContent = v.note == null ? '-' : VoiceSplitModule.noteName(v.note);
    });
  }

  destroy() {
    this.voices = null;
  }
}

ModuleBase.register(VoiceSplitModule);
window.VoiceSplitModule = VoiceSplitModule;
