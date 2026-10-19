// ChoraleModule.js - a four-voice chorale writer and choir. It writes Soprano, Alto, Tenor and Bass
// parts, each in the range of a real singer, and moves them by the rules of voice leading: contrary
// motion, no parallel fifths or octaves, no voice crossing, common tones held, the leading tone rising.
// Every rule is a switch, so you can hear what it does. Source picks where the music comes from:
// - Free: it writes phrases by itself (chords from a chance table of the style, ending in a cadence).
// - Chords: it voices the chords arriving at CHORDS (a Harmony Walker's or a Keyboard's NOTES).
// - Melody: a short tune recorded with Rec, played on a Keyboard (MELODY) or sung into a microphone
//   (MIC, pitch detection), becomes the soprano; it picks the chords and writes the three lower voices.
// Style: Palestrina (modal, stepwise, suspensions at cadences, no sevenths), Bach (functional harmony,
// cadences, seventh chords, passing eighths) or Arvo Part (tintinnabuli: a stepwise melody voice,
// a voice on the notes of the tonic triad, a mirrored voice and a drone).
// Rhythm: Halves, Quarters, Eighths or Mixed. A built-in choir sings the four voices on a vowel
// (A E I O U, Cycle or Drift; sawtooth voices through three formant filters). Every voice also has its
// own PITCH (Hz) / GATE for oscillators and VOICE (its sound) for a Vocoder CARRIER; NOTES carries all
// four to a Poly Synth. Follows a CLOCK cable (clockSync.js, architecture.md section 4) or its own Tempo.
// Built on the shared template (ModuleBase.js).

const CH_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const CH_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
// raise: when the 7th degree is raised to a leading tone in V and VII ('always', at 'cadence's, or never)
const CH_MODES = {
  major: { label: 'Major', steps: [0, 2, 4, 5, 7, 9, 11] },
  minor: { label: 'Minor', steps: [0, 2, 3, 5, 7, 8, 10], raise: 'always' },
  dorian: { label: 'Dorian', steps: [0, 2, 3, 5, 7, 9, 10], raise: 'cadence' },
  phrygian: { label: 'Phrygian', steps: [0, 1, 3, 5, 7, 8, 10] },
  lydian: { label: 'Lydian', steps: [0, 2, 4, 6, 7, 9, 11] },
  mixolydian: { label: 'Mixolydian', steps: [0, 2, 4, 5, 7, 9, 10], raise: 'cadence' },
  aeolian: { label: 'Aeolian', steps: [0, 2, 3, 5, 7, 8, 10], raise: 'cadence' }
};
// Voice ranges as MIDI notes, index 0 = Bass, 1 = Tenor, 2 = Alto, 3 = Soprano
const CH_RANGES = [[40, 62], [48, 67], [55, 74], [60, 79]];
const CH_VOICE_KEYS = ['b', 't', 'a', 's'];
const CH_VOICE_NAMES = ['Bass', 'Tenor', 'Alto', 'Soprano'];
const CH_MAX_NOTES = 16;   // the longest melody Rec takes
// How each style weighs the choices (higher = avoided more)
const CH_STYLES = {
  palestrina: { leap: 1.3, inv1: 2.5, inv2: 40, dimRoot: 40, omitFifth: 4, jitter: 0.6, seventh: 0, susp: 0.6, pass: 0.45 },
  bach: { leap: 0.6, inv1: 1.1, inv2: 14, dimRoot: 8, omitFifth: 1.5, jitter: 0.8, seventh: 0.4, susp: 0.25, pass: 0.8 },
  part: { leap: 1.0, inv1: 3, inv2: 40, dimRoot: 40, omitFifth: 4, jitter: 0.3, seventh: 0, susp: 0, pass: 0 }
};
// Which chord (scale degree 0 = I ... 6 = VII) tends to follow which, per style
const CH_TABLES = {
  bach: {
    0: { 3: 0.22, 4: 0.25, 5: 0.15, 1: 0.2, 2: 0.06, 6: 0.06 },
    1: { 4: 0.65, 6: 0.2, 0: 0.15 },
    2: { 5: 0.45, 3: 0.4, 1: 0.15 },
    3: { 4: 0.4, 0: 0.25, 1: 0.25, 6: 0.1 },
    4: { 0: 0.7, 5: 0.2, 3: 0.1 },
    5: { 1: 0.35, 3: 0.35, 4: 0.15, 2: 0.15 },
    6: { 0: 0.85, 5: 0.15 }
  },
  palestrina: {
    0: { 3: 0.25, 4: 0.2, 5: 0.15, 2: 0.15, 6: 0.1, 1: 0.15 },
    1: { 4: 0.35, 5: 0.2, 6: 0.15, 3: 0.3 },
    2: { 5: 0.35, 3: 0.35, 0: 0.15, 6: 0.15 },
    3: { 0: 0.4, 4: 0.25, 1: 0.2, 6: 0.15 },
    4: { 0: 0.5, 5: 0.25, 2: 0.15, 3: 0.1 },
    5: { 1: 0.3, 3: 0.3, 2: 0.2, 4: 0.2 },
    6: { 0: 0.4, 2: 0.3, 3: 0.3 }
  }
};
// Vowel formants (Hz) and their strengths, for a middle voice; lower voices are scaled down a little
const CH_VOWELS = {
  a: { f: [800, 1150, 2800], g: [1, 0.5, 0.12] },
  e: { f: [400, 1700, 2600], g: [1, 0.3, 0.12] },
  i: { f: [290, 2200, 3000], g: [1, 0.16, 0.1] },
  o: { f: [450, 800, 2830], g: [1, 0.35, 0.06] },
  u: { f: [325, 700, 2530], g: [1, 0.2, 0.04] }
};
const CH_VOWEL_ORDER = ['a', 'e', 'i', 'o', 'u'];
const CH_FORMANT_SCALE = [0.86, 0.93, 1.0, 1.08];
const CH_BANDWIDTH = [80, 90, 120];

class ChoraleModule extends ModuleBase {
  static def = {
    type: 'chorale',
    title: 'Chorale',
    width: 380,
    menu: { group: 'Controllers & Sequencing', label: 'Chorale' },
    params: [
      { id: 'source', label: 'Source', kind: 'select', value: 'free',
        options: [['free', 'Free (writes by itself)'], ['chords', 'Chords (from CHORDS)'], ['melody', 'Melody (Rec a tune)']] },
      { id: 'style', label: 'Style', kind: 'select', value: 'bach',
        options: [['palestrina', 'Palestrina'], ['bach', 'Bach'], ['part', 'Arvo Part (tintinnabuli)']] },
      { id: 'rhythm', label: 'Rhythm', kind: 'select', value: 'quarters',
        options: [['halves', 'Halves'], ['quarters', 'Quarters'], ['eighths', 'Eighths'], ['mixed', 'Mixed']] },
      { id: 'key', label: 'Key', kind: 'select', value: '0', options: CH_NAMES.map((n, i) => [String(i), n]) },
      { id: 'mode', label: 'Mode', kind: 'select', value: 'major',
        options: Object.keys(CH_MODES).map(k => [k, CH_MODES[k].label]) },
      { id: 'tempo', label: 'Tempo', min: 30, max: 160, step: 1, value: 72, unit: 'BPM' },
      { id: 'motion', label: 'Motion', min: 0, max: 100, step: 1, value: 50, unit: '%' },
      { id: 'vowel', label: 'Vowel', kind: 'select', value: 'a',
        options: [['a', 'A (ah)'], ['e', 'E (eh)'], ['i', 'I (ee)'], ['o', 'O (oh)'], ['u', 'U (oo)'],
          ['cycle', 'Cycle (a e i o u, one per note)'], ['drift', 'Drift (slowly changing)']] },
      { id: 'level', label: 'Choir Level', min: 0, max: 100, step: 1, value: 70, unit: '%' },
      { id: 'contrary', label: 'Contrary', kind: 'toggle', value: true },
      { id: 'parallels', label: 'No 5ths/8ves', kind: 'toggle', value: true },
      { id: 'crossing', label: 'No crossing', kind: 'toggle', value: true },
      { id: 'common', label: 'Common tones', kind: 'toggle', value: true },
      { id: 'leading', label: 'Leading tone', kind: 'toggle', value: true }
    ],
    inputs: [
      { id: 'clock', label: 'CLOCK', signal: 'gate', title: 'Clock Input', inline: true,
        guide: { text: 'A pulse on every 16th note. With a cable here the Chorale follows that tempo, starts when that module starts and stops with it.', from: 'Metronome CLOCK, Drum Machine CLOCK, Sequencer CLOCK', match: ['metronome:out:clock', 'drums:out:clock', 'sequencer:out:clock'] },
        chip: 'Metronome CLOCK' },
      { id: 'chords', label: 'CHORDS', signal: 'gate', title: 'Chords Input (NOTES)', inline: true,
        guide: { text: 'The chords to sing, from a Harmony Walker or a Keyboard (Source: Chords). The Chorale decides how each voice moves from one chord to the next. Carries notes, not sound.', from: 'Harmony Walker NOTES, Keyboard NOTES', match: ['harmony:out:notes', 'keyboard:out:notes'] },
        chip: 'Walker / Keyboard NOTES' },
      { id: 'melody', label: 'MELODY', signal: 'gate', title: 'Melody Input (Keyboard NOTES)', inline: true,
        guide: { text: 'Press Rec and play a short tune (up to 16 notes) on the Keyboard. It becomes the soprano, and the Chorale writes the other three voices under it. Carries notes, not sound.', from: 'Keyboard NOTES', match: ['keyboard:out:notes'] },
        chip: 'Keyboard NOTES' },
      { id: 'mic', label: 'MIC', signal: 'audio', title: 'Microphone Input (sing a melody)', inline: true,
        guide: { text: 'Press Rec and sing a short tune, one clear note at a time (la la la). The Chorale finds the notes you sing, finds their key, and makes them the soprano.', from: 'Mic / Audio In OUT', match: ['audio_in:out:audio'] },
        chip: 'Mic OUT' }
    ],
    outputs: [
      { id: 'notes', label: 'NOTES', signal: 'gate', title: 'Notes Output (all four voices)', inline: true,
        guide: { text: 'The four voices together, as notes. Carries notes, not sound.', to: 'Poly Synth NOTES', match: ['polysynth:in:notes'] },
        chip: 'Poly Synth NOTES' },
      { id: 'out_l', label: 'OUT L', signal: 'audio', title: 'Choir Output Left', inline: true,
        guide: { text: 'The built-in choir, left side (Bass and Alto lean left).', to: 'Reverb IN L, Output IN L, Mixer', match: ['reverb:in:in_l', 'output:in:in', 'mixer:in:ch_in'] },
        chip: 'Reverb IN L' },
      { id: 'out_r', label: 'OUT R', signal: 'audio', title: 'Choir Output Right', inline: true,
        guide: { text: 'The built-in choir, right side (Tenor and Soprano lean right).', to: 'Reverb IN R, Output IN R', match: ['reverb:in:in_r', 'output:in:in_r'] },
        chip: 'Reverb IN R' }
    ].concat(...[3, 2, 1, 0].map(k => {
      const v = CH_VOICE_NAMES[k], s = CH_VOICE_KEYS[k];
      return [
        { id: `${s}_pitch`, label: `${s.toUpperCase()} PITCH`, short: 'PITCH', signal: 'cv', title: `${v} Pitch (Hz)`, inline: true,
          guide: { text: `The ${v.toLowerCase()} voice's note, as a pitch in Hz.`, to: 'Oscillator PITCH, Wavetable Osc PITCH', match: ['oscillator:in:pitch', 'wavetable:in:pitch'] },
          chip: 'Osc PITCH' },
        { id: `${s}_gate`, label: `${s.toUpperCase()} GATE`, short: 'GATE', signal: 'gate', title: `${v} Gate`, inline: true,
          guide: { text: `On while the ${v.toLowerCase()} sings; it restarts (off for a moment) on every new note.`, to: 'Envelope GATE IN', match: ['envelope:in:gate', 'vca:in:cv'] },
          chip: 'Env GATE IN' },
        { id: `${s}_voice`, label: `${s.toUpperCase()} VOICE`, short: 'VOICE', signal: 'audio', title: `${v} Voice (sound)`, inline: true,
          guide: { text: `The ${v.toLowerCase()} singer alone (the choir sound of this voice, not affected by Choir Level).`, to: 'Vocoder CARRIER, Filter, Reverb, Mixer', match: ['vocoder:in:carrier', 'filter:in:audio', 'reverb:in:in_l', 'mixer:in:ch_in'] },
          chip: 'Vocoder CARRIER' }
      ];
    }))
  };

  static mod(a, n) {
    return ((a % n) + n) % n;
  }

  static mtof(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  static ftom(f) {
    return 69 + 12 * Math.log2(f / 440);
  }

  build() {
    const ctx = this.audioCtx;
    this.playing = false;
    this.tick = 0;
    this.timeline = null;
    this.voices = [null, null, null, null];   // the MIDI note each voice sings now (null = silent)
    this.lastVoicing = null;
    this.lastChord = null;
    this.phraseNo = 0;
    this.melody = [];        // recorded tune: { midi, start, len } in 16ths
    this.melodyLen = 0;
    this.rec = null;
    this.history = [];       // live display (Chords source): the voices tick by tick
    this.vowelIndex = [0, 0, 0, 0];

    // ---- The choir: per voice two detuned saws with vibrato, three formant filters, an envelope ----
    this.bus = this.own(ctx.createGain());
    this.bus.channelCount = 2;
    this.bus.channelCountMode = 'explicit';
    this.split = this.own(ctx.createChannelSplitter(2));
    this.bus.connect(this.split);
    this.outL = this.own(ctx.createGain());
    this.outR = this.own(ctx.createGain());
    this.split.connect(this.outL, 0);
    this.split.connect(this.outR, 1);
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noise = this.own(ctx.createBufferSource());
    this.noise.buffer = noiseBuf;
    this.noise.loop = true;
    this.noise.start();
    this.singers = [0, 1, 2, 3].map(k => {
      const v = { k };
      v.pre = this.own(ctx.createGain());
      v.pre.gain.value = 0.5;
      v.oscs = [-7, 7].map(det => {
        const o = this.own(ctx.createOscillator());
        o.type = 'sawtooth';
        o.detune.value = det;
        o.frequency.value = ChoraleModule.mtof((CH_RANGES[k][0] + CH_RANGES[k][1]) / 2);
        o.connect(v.pre);
        o.start();
        return o;
      });
      v.vib = this.own(ctx.createOscillator());
      v.vib.frequency.value = 4.8 + k * 0.27;
      v.vibDepth = this.own(ctx.createGain());
      v.vibDepth.gain.value = 16;   // cents
      v.vib.connect(v.vibDepth);
      v.oscs.forEach(o => v.vibDepth.connect(o.detune));
      v.vib.start();
      v.breath = this.own(ctx.createGain());
      v.breath.gain.value = 0.08;
      this.noise.connect(v.breath);
      v.breath.connect(v.pre);
      v.post = this.own(ctx.createGain());
      v.post.gain.value = 3.2;
      v.filters = [0, 1, 2].map(n => {
        const f = this.own(ctx.createBiquadFilter());
        f.type = 'bandpass';
        const g = this.own(ctx.createGain());
        v.pre.connect(f);
        f.connect(g);
        g.connect(v.post);
        return { f, g };
      });
      v.env = this.own(ctx.createGain());
      v.env.gain.value = 0;
      v.post.connect(v.env);
      v.out = this.own(ctx.createGain());   // VOICE jack
      v.env.connect(v.out);
      v.pan = this.own(ctx.createStereoPanner());
      v.pan.pan.value = [-0.45, 0.25, -0.25, 0.45][k];
      v.env.connect(v.pan);
      v.pan.connect(this.bus);
      v.pitch = this.makeConstant(0);
      v.gate = this.makeConstant(0);
      v.vowel = null;
      return v;
    });
    this.singers.forEach(v => this.setVowel(v.k, 'a', ctx.currentTime, false));

    this.noteBus = new PolyNoteBus();

    // ---- Inputs ----
    this.follower = new ClockFollower(ctx, {
      onPulse: (t, dur, index) => this.followPulse(t, dur, index),
      onStop: () => this.followStop(),
      onCablesChanged: () => this.updateClockUi()
    });
    const self = this;
    this.chordHeld = new Map();
    this.chordsIn = {
      noteOn(note, freq) { self.chordHeld.set(note, freq); self.chordsChanged(); },
      noteOff(note) { self.chordHeld.delete(note); self.chordsChanged(); },
      allNotesOff() { self.chordHeld.clear(); self.chordsChanged(); },
      bend() {}
    };
    this.melodyIn = {
      noteOn(note, freq) { self.melodyNoteOn(Math.round(ChoraleModule.ftom(freq))); },
      noteOff(note) { self.melodyNoteOff(); },
      allNotesOff() { self.melodyNoteOff(); },
      bend() {}
    };
    this.micIn = this.own(ctx.createGain());
    this.analyser = this.own(ctx.createAnalyser());
    this.analyser.fftSize = 2048;
    this.micIn.connect(this.analyser);
    this.micCables = 0;
    this.micBuf = new Float32Array(2048);

    this.inputNodes = { clock: this.follower.input, chords: this.chordsIn, melody: this.melodyIn, mic: this.micIn };
    this.outputNodes = { notes: this.noteBus, out_l: this.outL, out_r: this.outR };
    this.singers.forEach(v => {
      const s = CH_VOICE_KEYS[v.k];
      this.outputNodes[`${s}_pitch`] = v.pitch;
      this.outputNodes[`${s}_gate`] = v.gate;
      this.outputNodes[`${s}_voice`] = v.out;
    });
  }

  // ---- Settings ----
  onParamChange(id, value) {
    if (id === 'level' && this.bus) this.bus.gain.setTargetAtTime(value / 100 * 0.5, this.audioCtx.currentTime, 0.03);
    if (id === 'vowel' && this.singers) {
      clearInterval(this.driftTimer);
      this.driftTimer = null;
      const t = this.audioCtx.currentTime;
      if (CH_VOWELS[value]) this.singers.forEach(v => this.setVowel(v.k, value, t, true));
      if (value === 'drift') {
        this.singers.forEach(v => this.setVowel(v.k, CH_VOWEL_ORDER[(v.k * 2) % 5], t, true, 1.5));
        this.driftTimer = setInterval(() => {
          const v = this.singers[Math.floor(Math.random() * 4)];
          const options = CH_VOWEL_ORDER.filter(x => x !== v.vowel);
          this.setVowel(v.k, options[Math.floor(Math.random() * options.length)], this.audioCtx.currentTime, true, 1.2);
        }, 900);
      }
    }
    if (id === 'tempo' || id === 'motion' || id === 'level' || id === 'vowel') return;
    if (!this.singers) return;
    // Anything about the music: write it again from where it is now
    if (id === 'source') this.updateEnabled();
    this.rewrite();
  }

  rewrite() {
    if (this.params.source === 'melody') this.harmonized = null;
    if (this.playing && this.params.source !== 'chords') {
      const at = this.tick;
      this.timeline = this.buildTimeline(true);
      this.tick = this.timeline && at < this.timeline.len ? at : 0;
    } else {
      this.timeline = null;
    }
    this.updateReadout();
    this.requestDraw();
  }

  rules() {
    const p = this.params;
    return { contrary: p.contrary, parallels: p.parallels, crossing: p.crossing, common: p.common, leading: p.leading };
  }

  style() {
    return CH_STYLES[this.params.style] || CH_STYLES.bach;
  }

  tonic() {
    return parseInt(this.params.key, 10) || 0;
  }

  modeDef() {
    return CH_MODES[this.params.mode] || CH_MODES.major;
  }

  // The notes of the key as pitch classes (with the raised leading tone in Minor)
  scalePcs(raised = false) {
    const m = this.modeDef();
    return m.steps.map((s, i) => {
      let x = s;
      if (i === 6 && x === 10 && (m.raise === 'always' || (raised && m.raise))) x = 11;
      return ChoraleModule.mod(this.tonic() + x, 12);
    });
  }

  // ---- Chords ----
  // A chord on a scale degree: { deg, root, pcs (root, third, fifth[, seventh]), q, seventh, label }
  degreeChord(deg, o = {}) {
    const m = this.modeDef();
    const raise = (deg === 4 || deg === 6) && (m.raise === 'always' || (m.raise === 'cadence' && o.cadence));
    const pcs = [0, 1, 2].concat(o.seventh ? [3] : []).map(n => {
      const idx = (deg + n * 2) % 7;
      let x = m.steps[idx];
      if (idx === 6 && raise && x === 10) x = 11;
      return ChoraleModule.mod(this.tonic() + x, 12);
    });
    return this.makeChord(pcs, deg);
  }

  makeChord(pcs, deg = null) {
    const root = pcs[0];
    const third = ChoraleModule.mod(pcs[1] - root, 12);
    const fifth = ChoraleModule.mod(pcs[2] - root, 12);
    let q = third === 4 ? (fifth === 8 ? 'aug' : 'M') : (fifth === 6 ? 'dim' : 'm');
    if (pcs.length < 3) q = 'M';
    const c = { deg, root, pcs, q, seventh: pcs.length > 3 };
    c.label = this.chordLabel(c);
    return c;
  }

  chordLabel(c) {
    if (c.deg === null || c.deg === undefined) {
      return CH_NAMES[c.root] + ({ m: 'm', dim: 'dim', aug: '+', M: '' }[c.q] || '') + (c.seventh ? '7' : '');
    }
    let r = CH_ROMAN[c.deg];
    if (c.q === 'm' || c.q === 'dim') r = r.toLowerCase();
    if (c.q === 'dim') r += '°';
    if (c.q === 'aug') r += '+';
    if (c.seventh) r += '7';
    return r;
  }

  // A chord from held notes (CHORDS input): find the root that makes the most stacked thirds
  chordFromNotes(midis) {
    const pcs = Array.from(new Set(midis.map(m => ChoraleModule.mod(m, 12))));
    if (!pcs.length) return null;
    let best = null;
    pcs.forEach(r => {
      const iv = pcs.map(p => ChoraleModule.mod(p - r, 12));
      let score = 0;
      if (iv.includes(3) || iv.includes(4)) score += 2;
      if (iv.includes(7)) score += 2;
      if (iv.includes(6) || iv.includes(8)) score += 1;
      if (iv.includes(10) || iv.includes(11) || iv.includes(9)) score += 0.5;
      if (!best || score > best.score) best = { r, score };
    });
    const r = best.r;
    const order = [0, 3, 4, 6, 7, 8, 9, 10, 11, 1, 2, 5];
    const sorted = pcs.slice().sort((a, b) => order.indexOf(ChoraleModule.mod(a - r, 12)) - order.indexOf(ChoraleModule.mod(b - r, 12)));
    const c = this.makeChord(sorted.slice(0, 4));
    // Its degree in the key, when it is the key's own chord
    const scale = this.scalePcs(true);
    const d = scale.indexOf(r);
    if (d >= 0) {
      const dc = this.degreeChord(d, { seventh: c.seventh, cadence: true });
      const dn = this.degreeChord(d, { seventh: c.seventh });
      if ([dc, dn].some(x => x.pcs.join() === c.pcs.join())) { c.deg = d; c.label = this.chordLabel(c); }
    }
    return c;
  }

  // ---- Voice leading: the best of every way to sing the chord, by the style's costs and the rules ----
  lead(prev, chord, o = {}) {
    const cands = k => {
      const out = [];
      for (let m = CH_RANGES[k][0]; m <= CH_RANGES[k][1]; m++) if (chord.pcs.includes(m % 12)) out.push(m);
      return out;
    };
    const B = cands(0), T = cands(1), A = cands(2);
    const S = o.soprano != null ? [o.soprano] : cands(3);
    const st = this.style();
    const rules = this.rules();
    let best = null;
    B.forEach(b => T.forEach(t => A.forEach(a => S.forEach(s => {
      const v = [b, t, a, s];
      const c = this.cost(prev, v, chord, o, st, rules);
      if (!best || c < best.c) best = { v, c };
    }))));
    return best ? best.v : (prev || [48, 55, 60, 67]);
  }

  cost(prev, v, chord, o, st, rules) {
    const [b, t, a, s] = v;
    let c = 0;
    const ordered = b <= t && t <= a && a <= s;
    if (!ordered) c += rules.crossing ? 1000 : 0.3;
    if (b === t || t === a || a === s) c += 6;
    if (s - a > 12) c += 8;
    if (a - t > 12) c += 8;
    if (t - b > 24) c += 3;
    // Every note of the chord, and sensible doubling
    const count = new Map();
    v.forEach(m => count.set(m % 12, (count.get(m % 12) || 0) + 1));
    const [root, third, fifth, sev] = chord.pcs;
    if (!count.has(root)) c += 12;
    if (third !== undefined && !count.has(third)) c += 10;
    if (fifth !== undefined && !count.has(fifth)) c += st.omitFifth;
    if (sev !== undefined && !count.has(sev)) c += 10;
    const lt = ChoraleModule.mod(this.tonic() + 11, 12);
    count.forEach((n, pc) => {
      if (n < 2) return;
      if (pc === third) c += chord.q === 'M' ? 2 : 0.8;
      if (pc === sev) c += 10;
      if (pc === lt && (chord.deg === 4 || chord.deg === 6)) c += 8;
      if (pc === fifth) c += 0.5;
    });
    // Bass: root position first, then the third; the fifth (6/4) almost never
    const bi = chord.pcs.indexOf(b % 12);
    if (bi === 1) c += st.inv1;
    else if (bi === 2) c += st.inv2;
    else if (bi === 3) c += 5;
    if (chord.q === 'dim' && bi === 0) c += st.dimRoot;
    if (o.bassRoot && bi !== 0) c += 20;
    // Stay near the middle of each range
    v.forEach((m, k) => {
      const mid = (CH_RANGES[k][0] + CH_RANGES[k][1]) / 2;
      const d = Math.abs(m - mid);
      if (d > 6) c += (d - 6) * 0.2;
    });
    if (prev) {
      const W = [0.25, 1, 1, 0.6];
      const moves = v.map((m, k) => m - prev[k]);
      moves.forEach((d, k) => {
        const ad = Math.abs(d);
        c += W[k] * ad * 0.8;
        if (k > 0 && ad > 4) c += (ad - 4) * st.leap;
        if (ad === 6) c += 8;   // a tritone leap is hard to sing
        if (k > 0 && ad > 9) c += 10;
        if (ad > 12) c += 30;
        if (k === 0 && ad > 7 && ad !== 12) c += (ad - 7) * 0.6;
      });
      if (rules.parallels) {
        for (let i = 0; i < 4; i++) {
          for (let j = i + 1; j < 4; j++) {
            if (!moves[i] || !moves[j]) continue;
            const pi = ChoraleModule.mod(Math.abs(prev[j] - prev[i]), 12);
            const ni = ChoraleModule.mod(Math.abs(v[j] - v[i]), 12);
            if ((pi === 7 || pi === 0) && pi === ni) c += 100;
          }
        }
        // Hidden octaves / fifths: the outer voices move the same way into one, the soprano by leap
        const no = ChoraleModule.mod(Math.abs(s - b), 12);
        if ((no === 0 || no === 7) && Math.sign(moves[0]) === Math.sign(moves[3]) && moves[0] && Math.abs(moves[3]) > 2) c += 5;
      }
      if (rules.contrary) {
        const db = Math.sign(moves[0]), ds = Math.sign(moves[3]);
        if (db && ds && db === ds) c += 3;
        if (db && ds && db !== ds) c -= 1.5;
        const dirs = moves.map(Math.sign);
        if (dirs[0] && dirs.every(x => x === dirs[0])) c += 4;
      }
      if (rules.common) {
        for (let k = 1; k < 4; k++) if (chord.pcs.includes(prev[k] % 12) && v[k] !== prev[k] && o.soprano == null) c += 1.5;
        for (let k = 1; k < 3; k++) if (chord.pcs.includes(prev[k] % 12) && v[k] !== prev[k] && o.soprano != null) c += 1.5;
      }
      if (rules.leading && o.prevChord) {
        const pc = o.prevChord;
        const tonic = this.tonic();
        if ((pc.deg === 4 || pc.deg === 6) && pc.pcs.includes(lt) && chord.pcs.includes(tonic)) {
          for (let k = 0; k < 4; k++) {
            if (prev[k] % 12 === lt && v[k] !== prev[k] + 1) c += k === 3 ? 10 : k === 0 ? 6 : 3;
          }
        }
        if (pc.seventh) {
          const sv = pc.pcs[3];
          for (let k = 0; k < 4; k++) {
            if (prev[k] % 12 === sv && v[k] !== prev[k] && !(v[k] === prev[k] - 1 || v[k] === prev[k] - 2)) c += 5;
          }
        }
      }
    }
    return c + Math.random() * st.jitter;
  }

  // Parallel fifths / octaves between two voicings, as voice pairs (for the display)
  parallelsBetween(p, v) {
    const out = [];
    if (!p || !v) return out;
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        if (p[i] == null || p[j] == null || v[i] == null || v[j] == null) continue;
        if (p[i] === v[i] || p[j] === v[j]) continue;
        const pi = ChoraleModule.mod(Math.abs(p[j] - p[i]), 12);
        const ni = ChoraleModule.mod(Math.abs(v[j] - v[i]), 12);
        if ((pi === 7 || pi === 0) && pi === ni) out.push([i, j]);
      }
    }
    return out;
  }

  // ---- Writing the music ----
  pick(weights) {
    const keys = Object.keys(weights);
    const sum = keys.reduce((a, k) => a + weights[k], 0);
    let r = Math.random() * sum;
    for (const k of keys) {
      r -= weights[k];
      if (r <= 0) return parseInt(k, 10);
    }
    return parseInt(keys[0], 10);
  }

  slotLen() {
    const r = this.params.rhythm;
    if (r === 'halves') return 8;
    if (r === 'mixed') return Math.random() < 0.3 ? 8 : 4;
    return 4;
  }

  // Free: one phrase of chords ending in a cadence, voiced and decorated
  freePhrase() {
    const style = this.params.style;
    const st = this.style();
    const table = CH_TABLES[style] || CH_TABLES.bach;
    this.phraseNo++;
    const L = style === 'palestrina' ? 6 + Math.floor(Math.random() * 3) : 8;
    const half = style === 'bach' && this.phraseNo % 2 === 0;
    const dimOk = style === 'bach';
    const isDim = d => this.degreeChord(d).q === 'dim';
    const degs = [];
    let d = this.lastChord && this.lastChord.deg != null ? this.lastChord.deg : null;
    d = d === null || d === 0 ? 0 : this.pick(table[d]);
    if (this.phraseNo === 1) d = 0;
    degs.push(d);
    while (degs.length < L - 2) {
      let n = this.pick(table[d]);
      let tries = 0;
      while ((n === d || (!dimOk && isDim(n))) && tries++ < 10) n = this.pick(table[d]);
      d = n;
      degs.push(d);
    }
    let cadence;
    if (half) cadence = [Math.random() < 0.5 ? 1 : 3, 4];
    else if (style === 'palestrina' && Math.random() < 0.35) cadence = [3, 0];
    else cadence = [4, 0];
    if (!half && cadence[0] === 4 && degs[degs.length - 1] === 4) degs[degs.length - 1] = Math.random() < 0.5 ? 1 : 3;
    if (!dimOk && isDim(degs[degs.length - 1])) degs[degs.length - 1] = 3;
    const all = degs.concat(cadence);
    const slots = [];
    let start = 0;
    all.forEach((deg, i) => {
      const last = i === all.length - 1;
      const cad = i >= all.length - 2;
      const seventh = deg === 4 && cad && !last && Math.random() < st.seventh * 1.6
        || (deg === 1 || deg === 4) && !cad && Math.random() < st.seventh * 0.5;
      let chord = this.degreeChord(deg, { seventh, cadence: cad });
      // The last chord of a phrase in a minor-sounding mode often ends major (Picardy third)
      if (last && deg === 0 && chord.q === 'm' && (style === 'palestrina' || Math.random() < 0.4)) {
        chord = this.makeChord([chord.pcs[0], ChoraleModule.mod(chord.pcs[0] + 4, 12), chord.pcs[2]], 0);
        chord.label = 'I';
      }
      let dur = this.slotLen();
      if (last) dur = Math.max(8, dur * 2);
      slots.push({ start, dur, chord });
      start += dur;
    });
    // End on a bar line
    const pad = (16 - start % 16) % 16;
    slots[slots.length - 1].dur += pad;
    start += pad;
    let prev = this.lastVoicing;
    let prevChord = this.lastChord;
    slots.forEach((sl, i) => {
      sl.v = this.lead(prev, sl.chord, { prevChord, bassRoot: (i === slots.length - 1 && !half) || (i === 0 && sl.chord.deg === 0) });
      prev = sl.v;
      prevChord = sl.chord;
    });
    this.lastVoicing = prev;
    this.lastChord = prevChord;
    return this.decorate(slots, start, null);
  }

  // Melody: the recorded tune on top, chords picked for it (the cheapest path through the chord table)
  melodyPhrase() {
    if (!this.melody.length) return null;
    const mel = this.melody;
    const mean = mel.reduce((a, n) => a + n.midi, 0) / mel.length;
    const shift = 12 * Math.round((70 - mean) / 12);
    const unit = { halves: 8, quarters: 4, eighths: 2, mixed: 4 }[this.params.rhythm] || 4;
    const total = this.melodyLen;
    // A note on the rhythm's grid starts a new chord; others pass over the chord before
    const slots = [];
    mel.forEach(n => {
      const sop = n.midi + shift;
      if (!slots.length || n.start % unit === 0) slots.push({ start: n.start, sop, notes: [] });
      slots[slots.length - 1].notes.push({ start: n.start, len: n.len, midi: sop });
    });
    slots.forEach((sl, i) => { sl.dur = (i + 1 < slots.length ? slots[i + 1].start : total) - sl.start; });
    if (slots[0].start > 0) { slots[0].notes.unshift({ start: 0, len: slots[0].start, midi: null }); slots[0].dur += slots[0].start; slots[0].start = 0; }
    const style = this.params.style;
    const st = this.style();
    const table = CH_TABLES[style] || CH_TABLES.bach;
    const dimOk = style === 'bach';
    // Chords that hold each slot's melody note
    const options = slots.map((sl, i) => {
      const pc = sl.sop % 12;
      const list = [];
      for (let d = 0; d < 7; d++) {
        const cad = i >= slots.length - 2;
        [false, true].forEach(sev => {
          if (sev && !(d === 4 && st.seventh > 0)) return;
          const ch = this.degreeChord(d, { seventh: sev, cadence: cad || d === 4 });
          if (!ch.pcs.includes(pc)) return;
          if (ch.q === 'dim' && !dimOk) return;
          if (ch.q === 'aug') return;
          list.push({ ch, extra: sev ? 0.6 : 0 });
        });
      }
      if (!list.length) {
        // A note outside the key: a major or minor chord that holds it
        for (let r = 0; r < 12; r++) {
          ['M', 'm'].forEach(q => {
            const pcs = [r, (r + (q === 'M' ? 4 : 3)) % 12, (r + 7) % 12];
            if (pcs.includes(pc)) list.push({ ch: this.makeChord(pcs), extra: 3 });
          });
        }
      }
      return list;
    });
    const trans = (a, b) => {
      if (a.deg == null || b.deg == null) return 2;
      if (a.deg === b.deg) return 2.2;
      const w = (table[a.deg] || {})[b.deg] || 0;
      return -Math.log(w + 0.03);
    };
    const n = slots.length;
    let layer = options[0].map(o => ({ o, cost: o.extra + (o.ch.deg === 0 ? 0 : o.ch.deg === 4 ? 1 : 2.5) + Math.random() * 0.3, back: null }));
    const layers = [layer];
    for (let i = 1; i < n; i++) {
      const next = options[i].map(o => {
        let best = null;
        layer.forEach(p => {
          let c = p.cost + trans(p.o.ch, o.ch) + o.extra + Math.random() * 0.3;
          if (i === n - 1) c += o.ch.deg === 0 ? 0 : o.ch.deg === 4 ? 1.2 : 4;
          if (!best || c < best.cost) best = { o, cost: c, back: p };
        });
        return best;
      });
      layers.push(next);
      layer = next;
    }
    let end = layer.reduce((a, b) => (b.cost < a.cost ? b : a));
    const chosen = [];
    while (end) { chosen.unshift(end.o.ch); end = end.back; }
    // Voice it twice so the loop joins smoothly (the second pass starts from the last chord)
    let prev = null, prevChord = null;
    for (let pass = 0; pass < 2; pass++) {
      slots.forEach((sl, i) => {
        sl.chord = chosen[i];
        sl.v = this.lead(prev, sl.chord, { soprano: sl.sop, prevChord, bassRoot: (i === 0 || i === slots.length - 1) && sl.chord.deg === 0 });
        prev = sl.v;
        prevChord = sl.chord;
      });
    }
    return this.decorate(slots, total, slots.map(sl => sl.notes));
  }

  // The scale note between two notes a third apart (or the next one up / down)
  scaleStep(from, dir, raised) {
    const sc = this.scalePcs(raised);
    for (let m = from + dir; Math.abs(m - from) <= 3; m += dir) if (sc.includes(ChoraleModule.mod(m, 12))) return m;
    return from + dir;
  }

  // Slots -> each voice's notes, with passing tones, neighbour notes and suspensions by Rhythm and Motion.
  // sopNotes: the melody's own notes per slot (Melody source), so the soprano is never decorated.
  decorate(slots, len, sopNotes) {
    const st = this.style();
    const rhythm = this.params.rhythm;
    const motion = this.params.motion / 100;
    // sub[k][i]: the notes of voice k in slot i, as { off, midi }
    const sub = [0, 1, 2, 3].map(k => slots.map(sl => [{ off: 0, midi: sl.v[k] }]));
    const moving = rhythm !== 'halves' && rhythm !== 'quarters';
    for (let i = 0; i + 1 < slots.length; i++) {
      const cur = slots[i], nxt = slots[i + 1];
      const finalNext = i + 1 === slots.length - 1;
      for (let k = 0; k < 4; k++) {
        if (k === 3 && sopNotes) continue;
        const a = cur.v[k], b = nxt.v[k];
        // Suspension: a voice that steps down into the next chord holds its note over, then resolves
        if (k > 0 && (a - b === 1 || a - b === 2) && nxt.dur >= 4 && !nxt.chord.pcs.includes(a % 12)
          && (finalNext ? Math.random() < st.susp * 2 : Math.random() < st.susp * motion * 0.6)
          && sub[k][i + 1].length === 1) {
          const h = Math.max(2, Math.round(nxt.dur / 4) * 2);
          sub[k][i + 1] = [{ off: 0, midi: a }, { off: h, midi: b }];
          continue;
        }
        if (!moving || cur.dur < 4 || sub[k][i].length > 1) continue;
        const h = Math.round(cur.dur / 4) * 2;
        const gap = Math.abs(b - a);
        const pass = rhythm === 'eighths' ? 0.9 : st.pass * motion;
        if ((gap === 3 || gap === 4) && Math.random() < pass) {
          sub[k][i].push({ off: h, midi: this.scaleStep(a, Math.sign(b - a), b > a) });
        } else if (gap === 0 && k > 0 && Math.random() < (rhythm === 'eighths' ? 0.5 : 0.15) * motion) {
          sub[k][i].push({ off: h, midi: this.scaleStep(a, 1, false) });
        } else if (rhythm === 'eighths' && k > 0 && Math.random() < 0.5 * motion) {
          // A leap to another note of the same chord
          const ch = cur.chord.pcs;
          const opts = [];
          for (let m = a - 5; m <= a + 5; m++) if (m !== a && ch.includes(ChoraleModule.mod(m, 12))) opts.push(m);
          const ok = opts.filter(m => m >= CH_RANGES[k][0] && m <= CH_RANGES[k][1]);
          if (ok.length) sub[k][i].push({ off: h, midi: ok[Math.floor(Math.random() * ok.length)] });
        }
      }
    }
    // Flatten: tied notes merge into one
    const events = [0, 1, 2, 3].map(k => {
      const list = [];
      slots.forEach((sl, i) => {
        const notes = k === 3 && sopNotes
          ? sopNotes[i].map(n => ({ off: n.start - sl.start, midi: n.midi }))
          : sub[k][i];
        notes.forEach((n, j) => {
          const start = sl.start + n.off;
          const endAt = j + 1 < notes.length ? sl.start + notes[j + 1].off : sl.start + sl.dur;
          const lastEv = list[list.length - 1];
          if (lastEv && lastEv.midi === n.midi && !(k === 3 && sopNotes)) lastEv.len = endAt - lastEv.start;
          else list.push({ start, len: endAt - start, midi: n.midi });
        });
      });
      return list;
    });
    slots.forEach((sl, i) => { sl.par = i ? this.parallelsBetween(slots[i - 1].v, sl.v) : []; });
    return { len, slots, events };
  }

  // ---- Arvo Part: tintinnabuli ----
  // The melody voice (M) moves by step; the T voice sings the nearest note of the tonic triad
  // (alternating above and below with Contrary on); the tenor mirrors the melody (or follows it a
  // tenth below); the bass holds the tonic as a drone.
  partTriad(chord) {
    if (chord) return chord.pcs.slice(0, 3);
    const m = this.modeDef();
    const t = this.tonic();
    return [t, ChoraleModule.mod(t + m.steps[2], 12), ChoraleModule.mod(t + m.steps[4], 12)];
  }

  partPhrase() {
    const sc = this.scalePcs(false);
    const tonic = this.tonic();
    let center = 60 + tonic;
    if (center < 64) center += 12;
    if (center > 75) center -= 12;
    const u = { halves: 8, quarters: 4, eighths: 2, mixed: 4 }[this.params.rhythm] || 8;
    // Scale steps from the center (positive = up)
    const stepNote = n => {
      let m = center, left = Math.abs(n);
      const dir = Math.sign(n);
      while (left > 0) { m += dir; if (sc.includes(ChoraleModule.mod(m, 12))) left--; }
      return m;
    };
    const line = [];
    let start = 0;
    this.partCount = (this.partCount || 0);
    for (let p = 0; p < 4; p++) {
      const n = 2 + (this.partCount % 4);
      const from = this.partCount % 2 === 0 ? n : -n;   // from above, then from below
      this.partCount++;
      for (let s = Math.abs(from); s >= 0; s--) {
        let midi = stepNote(Math.sign(from) * s);
        // Leading tone: the note under the tonic rises to it
        if (this.params.leading && s === 1 && from < 0 && ChoraleModule.mod(midi + 2, 12) === tonic % 12 && ChoraleModule.mod(midi - tonic, 12) === 10) midi += 1;
        const last = s === 0;
        const dur = this.params.rhythm === 'mixed' ? (last ? 8 : (s === Math.abs(from) ? 6 : 2 + 2 * (s % 2))) : (last ? u * 2 : u);
        line.push({ start, len: dur, midi });
        start += dur;
      }
      line.push({ start, len: u, midi: null });   // a breath
      start += u;
    }
    const pad = (16 - start % 16) % 16;
    line[line.length - 1].len += pad;
    start += pad;
    return this.partFromLine(line, start, false);
  }

  partFromLine(line, len, live) {
    const triad = this.partTriad(null);
    const sc = this.scalePcs(false);
    const tonic = this.tonic();
    const tCenter = (() => { let c = 48 + tonic; if (c < 50) c += 12; return c; })();
    const sCenter = (() => { let c = 60 + tonic; if (c < 64) c += 12; if (c > 75) c -= 12; return c; })();
    const degreeOf = m => {
      // scale steps from sCenter
      let n = 0, x = sCenter;
      const dir = Math.sign(m - sCenter);
      while (x !== m && Math.abs(n) < 30) { x += dir; if (sc.includes(ChoraleModule.mod(x, 12))) n += dir; }
      return n;
    };
    const stepFrom = (c, n) => {
      let m = c, left = Math.abs(n);
      const dir = Math.sign(n);
      while (left > 0) { m += dir; if (sc.includes(ChoraleModule.mod(m, 12))) left--; }
      return m;
    };
    const events = [[], [], [], []];
    let lastT = null;
    line.forEach((n, i) => {
      events[3].push({ start: n.start, len: n.len, midi: n.midi });
      if (n.midi == null) {
        events[2].push({ start: n.start, len: n.len, midi: null });
        events[1].push({ start: n.start, len: n.len, midi: null });
        lastT = null;
        return;
      }
      events[2].push({ start: n.start, len: n.len, midi: live ? { tint: n.midi, i } : this.tintNote(n.midi, i, lastT, triad) });
      if (!live) lastT = events[2][events[2].length - 1].midi;
      let ten;
      if (this.params.contrary) ten = stepFrom(tCenter, -degreeOf(n.midi));
      else ten = stepFrom(n.midi - 12, -2);   // a tenth below
      while (ten > CH_RANGES[1][1]) ten -= 12;
      while (ten < CH_RANGES[1][0]) ten += 12;
      events[1].push({ start: n.start, len: n.len, midi: ten });
    });
    let bass = 36 + tonic;
    while (bass < CH_RANGES[0][0]) bass += 12;
    events[0].push({ start: 0, len, midi: live ? { drone: true } : bass });
    // Merge ties
    events.forEach((list, k) => {
      for (let i = list.length - 1; i > 0; i--) {
        const a = list[i - 1], b = list[i];
        if (typeof a.midi === 'number' && a.midi === b.midi && k !== 3) { a.len += b.len; list.splice(i, 1); }
      }
    });
    const tChord = this.makeChord(triad, 0);
    return { len, events, slots: [{ start: 0, dur: len, chord: tChord, v: [bass, null, null, null], par: [] }], part: true };
  }

  // The T voice for a melody note m: the triad note just below (or above, every other note)
  tintNote(m, i, lastT, triad) {
    const rules = this.rules();
    const above = rules.contrary && i % 2 === 1;
    const isT = x => triad.includes(ChoraleModule.mod(x, 12));
    // Common tones: keep the last T note while it is still a triad note on the right side, close by
    if (rules.common && lastT != null && isT(lastT) && lastT !== m && Math.abs(lastT - m) <= 9
      && (above ? lastT > m : lastT < m)) return lastT;
    let x;
    if (above) {
      x = m + 1;
      while (!isT(x) || (rules.parallels && ChoraleModule.mod(x - m, 12) === 0)) x++;
      if (rules.crossing) {
        x -= 12;
        if (x < CH_RANGES[2][0]) { x = m - 1; while (!isT(x) || x === m) x--; }
      }
    } else {
      x = rules.parallels ? m - 1 : m;
      while (!isT(x) || (rules.parallels && x === m)) x--;
    }
    while (x > CH_RANGES[2][1]) x -= 12;
    while (x < CH_RANGES[2][0]) x += 12;
    return x;
  }

  // A full timeline for Free / Melody (null when there is nothing to play)
  buildTimeline(rebuild = false) {
    const src = this.params.source;
    const part = this.params.style === 'part';
    if (rebuild && src === 'free' && !part) {
      // Write the new phrase from the chord now sounding
      this.lastVoicing = this.voices.every(m => m != null) ? this.voices.slice() : this.lastVoicing;
    }
    if (src === 'melody') {
      if (!this.melody.length) return null;
      if (part) {
        const mean = this.melody.reduce((a, n) => a + n.midi, 0) / this.melody.length;
        const shift = 12 * Math.round((70 - mean) / 12);
        const line = [];
        let at = 0;
        this.melody.forEach(n => {
          if (n.start > at) line.push({ start: at, len: n.start - at, midi: null });
          line.push({ start: n.start, len: n.len, midi: n.midi + shift });
          at = n.start + n.len;
        });
        if (at < this.melodyLen) line.push({ start: at, len: this.melodyLen - at, midi: null });
        return this.partFromLine(line, this.melodyLen, false);
      }
      return this.melodyPhrase();
    }
    if (src === 'chords') return part ? this.partLive() : null;
    return part ? this.partPhrase() : this.freePhrase();
  }

  // Part with Chords: the melody voice is written ahead, the T voice and drone follow the chord coming in
  partLive() {
    const tl = this.partPhrase();
    const line = tl.events[3];
    return this.partFromLine(line, tl.len, true);
  }

  // ---- Playing ----
  start() {
    if (this.playing || this.follower.connected) return;
    if (window.synthApp && synthApp.ensureAudioContextRunning) synthApp.ensureAudioContextRunning();
    if (this.rec) this.finishRec();
    this.beginPlay();
    this.nextTime = this.audioCtx.currentTime + 0.06;
    this.timer = setInterval(() => this.schedule(), 25);
    this.schedule();
  }

  beginPlay() {
    this.playing = true;
    this.tick = 0;
    this.phraseNo = 0;
    this.partCount = 0;
    this.lastVoicing = null;
    this.lastChord = null;
    this.liveChord = null;
    this.pendingChord = this.params.source === 'chords' ? this.currentInputChord() : null;
    this.history = [];
    this.timeline = this.buildTimeline();
    this.updatePlayButton();
  }

  stop() {
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const t = this.audioCtx.currentTime;
    for (let k = 0; k < 4; k++) this.setVoice(k, null, t, true);
    this.noteBus.update([]);
    this.updatePlayButton();
    this.updateReadout();
    this.requestDraw();
  }

  schedule() {
    if (!this.playing) return;
    const now = this.audioCtx.currentTime;
    if (this.nextTime < now - 0.2) this.nextTime = now + 0.02;   // the page was asleep
    const dur = 60 / this.params.tempo / 4;
    while (this.nextTime < now + 0.1) {
      this.playTick(this.nextTime, dur);
      this.nextTime += dur;
    }
  }

  followPulse(t, dur, index) {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (index === 0 || !this.playing) {
      if (this.rec) this.finishRec();
      this.beginPlay();
    }
    this.pulseDur = dur;
    this.playTick(t, dur);
  }

  followStop() {
    if (this.playing && !this.timer) this.stop();
  }

  updateClockUi() {
    const following = this.follower.connected;
    if (following && this.timer) this.stop();
    if (!following && this.playing && !this.timer) this.stop();
    const sl = this.el('p_tempo');
    const ro = this.el('v_tempo');
    if (sl) sl.disabled = following;
    if (ro) ro.textContent = this.formatParam(this.paramDef('tempo'), this.params.tempo);
    this.updatePlayButton();
  }

  formatParam(p, value) {
    if (p.id === 'tempo' && this.follower && this.follower.connected) return 'from CLOCK';
    return super.formatParam(p, value);
  }

  playTick(t, dur) {
    const src = this.params.source;
    const part = this.params.style === 'part';
    if (src === 'chords' && !part) {
      this.liveTick(t);
    } else {
      if (!this.timeline || this.tick >= this.timeline.len) {
        this.tick = 0;
        if (!this.timeline || src !== 'melody') this.timeline = this.buildTimeline();
      }
      const tl = this.timeline;
      if (tl) {
        tl.events.forEach((list, k) => {
          const ev = list.find(e => e.start === this.tick);
          if (ev) this.setVoice(k, this.resolve(ev.midi, k), t, false, true);
        });
        const sl = tl.slots.find(s => s.start === this.tick);
        if (sl) this.shownSlot = sl;
      }
    }
    this.tick++;
    const snapshot = this.voices.slice();
    const wait = Math.max(0, (t - this.audioCtx.currentTime) * 1000);
    setTimeout(() => {
      if (!this.playing) return;
      this.noteBus.update(snapshot.filter(m => m != null).map(m => ({ midiNote: m, freq: ChoraleModule.mtof(m) })));
      if (src === 'chords' && !part) {
        this.history.push({ v: snapshot, label: this.liveChord ? this.liveChord.label : '', par: this.lastPar || [] });
        this.lastPar = null;
        if (this.history.length > 64) this.history.shift();
      }
      this.drawTick = this.tick;
      this.updateReadout();
      this.requestDraw();
    }, wait);
  }

  // Part with Chords: the T voice and the drone come from the chord now coming in
  resolve(m, k) {
    if (m == null || typeof m === 'number') return m;
    const triad = this.partTriad(this.liveChord);
    if (m.drone) {
      let b = triad[0];
      while (b < CH_RANGES[0][0]) b += 12;
      return b;
    }
    if (m.tint != null) return this.tintNote(m.tint, m.i, this.voices[2], triad);
    return null;
  }

  // Chords source: a new chord is sung on the next beat (or half note); with Eighths or Mixed the voices
  // also move between the notes of the chord while it holds
  liveTick(t) {
    const unit = this.params.rhythm === 'halves' ? 8 : 4;
    const atBeat = this.tick % unit === 0;
    if (atBeat && this.pendingChord !== null && this.pendingChord !== undefined) {
      const ch = this.pendingChord;
      this.pendingChord = undefined;
      if (!ch) {
        for (let k = 0; k < 4; k++) this.setVoice(k, null, t);
        this.liveChord = null;
        return;
      }
      const prev = this.voices.every(m => m != null) ? this.voices.slice() : null;
      const v = this.lead(prev, ch, { prevChord: this.liveChord });
      this.lastPar = this.parallelsBetween(prev, v);
      this.liveChord = ch;
      v.forEach((m, k) => this.setVoice(k, m, t));
      this.shownSlot = { chord: ch };
      return;
    }
    const r = this.params.rhythm;
    if (!this.liveChord || this.tick % 2 !== 0 || (r !== 'eighths' && r !== 'mixed')) return;
    const p = (r === 'eighths' ? 0.6 : 0.25) * this.params.motion / 100;
    if (Math.random() > p) return;
    const k = 1 + Math.floor(Math.random() * 3);
    const cur = this.voices[k];
    if (cur == null) return;
    const opts = [];
    for (let m = cur - 5; m <= cur + 5; m++) {
      if (m === cur || !this.liveChord.pcs.includes(ChoraleModule.mod(m, 12))) continue;
      if (m < CH_RANGES[k][0] || m > CH_RANGES[k][1]) continue;
      if (this.params.crossing && ((k > 0 && m <= this.voices[k - 1]) || (k < 3 && m >= this.voices[k + 1]))) continue;
      opts.push(m);
    }
    if (opts.length) this.setVoice(k, opts[Math.floor(Math.random() * opts.length)], t);
  }

  currentInputChord() {
    if (!this.chordHeld.size) return null;
    return this.chordFromNotes(Array.from(this.chordHeld.values()).map(f => Math.round(ChoraleModule.ftom(f))));
  }

  // CHORDS input: wait a moment for all the notes of a chord to arrive
  chordsChanged() {
    clearTimeout(this.chordTimer);
    this.chordTimer = setTimeout(() => {
      if (this.params.source !== 'chords') return;
      const ch = this.currentInputChord();
      if (this.params.style === 'part') { if (ch) this.liveChord = ch; }
      else this.pendingChord = ch;
      // A chord arriving with nothing playing (and no CLOCK) starts the Chorale on its own Tempo
      if (ch && !this.playing && !this.follower.connected) this.start();
    }, 30);
  }

  // ---- The choir ----
  setVowel(k, vowel, t, smooth, time = 0.08) {
    const v = this.singers[k];
    const def = CH_VOWELS[vowel];
    if (!def) return;
    v.vowel = vowel;
    v.filters.forEach((fl, n) => {
      const f = def.f[n] * CH_FORMANT_SCALE[k];
      const q = f / CH_BANDWIDTH[n];
      if (smooth) {
        fl.f.frequency.setTargetAtTime(f, t, time / 3);
        fl.g.gain.setTargetAtTime(def.g[n], t, time / 3);
      } else {
        fl.f.frequency.setValueAtTime(f, t);
        fl.g.gain.setValueAtTime(def.g[n], t);
      }
      fl.f.Q.setValueAtTime(q, t);
    });
  }

  // One voice to a new note (or silent) at time t: choir, PITCH, GATE
  // strike: sing the same note again (a repeated note in the melody)
  setVoice(k, midi, t, now = false, strike = false) {
    const v = this.singers[k];
    const was = this.voices[k];
    if (midi === was && !now) {
      if (!strike || midi == null) return;
      v.env.gain.cancelScheduledValues(t);
      v.env.gain.setTargetAtTime(0.3, t, 0.015);
      v.env.gain.setTargetAtTime(1, t + 0.05, 0.04);
      v.gate.offset.cancelScheduledValues(t);
      v.gate.offset.setValueAtTime(0, t);
      v.gate.offset.setValueAtTime(1, t + 0.004);
      return;
    }
    this.voices[k] = midi;
    if (midi == null) {
      v.env.gain.cancelScheduledValues(t);
      v.env.gain.setTargetAtTime(0, t, now ? 0.03 : 0.09);
      v.gate.offset.cancelScheduledValues(t);
      v.gate.offset.setValueAtTime(0, t);
      return;
    }
    const f = ChoraleModule.mtof(midi);
    v.oscs.forEach(o => {
      o.frequency.cancelScheduledValues(t);
      if (was == null) o.frequency.setValueAtTime(f, t);
      else o.frequency.setTargetAtTime(f, t, 0.025);
    });
    if (was == null) {
      v.env.gain.cancelScheduledValues(t);
      v.env.gain.setTargetAtTime(1, t, 0.06);
    }
    if (this.params.vowel === 'cycle') {
      this.vowelIndex[k] = (this.vowelIndex[k] + 1) % 5;
      this.setVowel(k, CH_VOWEL_ORDER[this.vowelIndex[k]], t, true, 0.06);
    }
    v.pitch.offset.cancelScheduledValues(t);
    v.pitch.offset.setValueAtTime(f, t);
    v.gate.offset.cancelScheduledValues(t);
    v.gate.offset.setValueAtTime(0, t);
    v.gate.offset.setValueAtTime(1, t + 0.004);
  }

  // ---- Recording a melody (Keyboard on MELODY, or singing into MIC) ----
  toggleRec() {
    if (this.rec) { this.finishRec(); return; }
    if (window.synthApp && synthApp.ensureAudioContextRunning) synthApp.ensureAudioContextRunning();
    if (this.playing) this.stop();
    this.rec = { t0: null, notes: [], open: null, quiet: null };
    if (this.params.source !== 'melody') this.setParam('source', 'melody');
    if (this.micCables > 0) this.startMic();
    this.updateRecButton();
    this.updateReadout();
    this.requestDraw();
  }

  recGrid() {
    // Notes snap to eighth notes of the Tempo (or of the CLOCK)
    const sixteenth = this.follower.connected && this.pulseDur ? this.pulseDur : 60 / this.params.tempo / 4;
    return sixteenth * 2;
  }

  melodyNoteOn(midi, at) {
    if (!this.rec) return;
    const t = at != null ? at : this.audioCtx.currentTime;
    const r = this.rec;
    if (r.t0 === null) r.t0 = t;
    const g = this.recGrid();
    let start = Math.round((t - r.t0) / g) * 2;
    const last = r.notes[r.notes.length - 1];
    if (last && start <= last.start) {
      if (r.open === last) { last.midi = midi; this.monitor(midi); return; }   // two keys at once: the newer one
      start = last.start + 2;
    }
    if (r.open) r.open.len = Math.max(2, start - r.open.start);
    const n = { midi, start, len: 2 };
    r.notes.push(n);
    r.open = n;
    clearTimeout(r.quiet);
    this.monitor(midi);
    this.updateReadout();
    this.requestDraw();
    if (r.notes.length >= CH_MAX_NOTES) this.melodyNoteOff(t, true);
  }

  melodyNoteOff(at, last = false) {
    const r = this.rec;
    if (!r || !r.open) return;
    const t = at != null ? at : this.audioCtx.currentTime;
    const g = this.recGrid();
    const end = Math.round((t - r.t0) / g) * 2;
    r.open.len = Math.max(2, end - r.open.start);
    r.open = null;
    this.monitor(null);
    clearTimeout(r.quiet);
    if (last) { this.finishRec(); return; }
    // Four seconds without a note ends the recording
    r.quiet = setTimeout(() => { if (this.rec === r) this.finishRec(); }, 4000);
    this.requestDraw();
  }

  monitor(midi) {
    this.setVoice(3, midi, this.audioCtx.currentTime);
  }

  finishRec() {
    const r = this.rec;
    if (!r) return;
    if (r.open) this.melodyNoteOff(null);
    clearTimeout(r.quiet);
    this.stopMic();
    this.rec = null;
    this.monitor(null);
    this.updateRecButton();
    if (r.notes.length) {
      const end = r.notes.reduce((a, n) => Math.max(a, n.start + n.len), 0);
      this.melody = r.notes;
      this.melodyLen = Math.max(16, Math.ceil(end / 16) * 16);
      this.detectKey();
      this.rewrite();
      if (!this.follower.connected) this.start();
    } else {
      this.updateReadout();
      this.requestDraw();
    }
  }

  clearMelody() {
    if (this.rec) { clearTimeout(this.rec.quiet); this.stopMic(); this.rec = null; this.updateRecButton(); }
    this.melody = [];
    this.melodyLen = 0;
    if (this.params.source === 'melody' && this.playing) this.stop();
    this.timeline = null;
    this.updateReadout();
    this.requestDraw();
  }

  // The key that fits the recorded notes best (Krumhansl profiles), kept within major / minor
  detectKey() {
    const major = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    const minor = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
    const w = new Array(12).fill(0);
    this.melody.forEach((n, i) => {
      w[n.midi % 12] += n.len;
      if (i === 0 || i === this.melody.length - 1) w[n.midi % 12] += 4;   // first and last notes weigh more
    });
    const fit = (prof, r) => prof.reduce((a, p, i) => a + p * w[(i + r) % 12], 0);
    const minorish = ['minor', 'dorian', 'phrygian', 'aeolian'].includes(this.params.mode);
    let best = null;
    for (let r = 0; r < 12; r++) {
      [['major', major], ['minor', minor]].forEach(([m, prof]) => {
        const s = fit(prof, r);
        if (!best || s > best.s) best = { r, m, s };
      });
    }
    if (!best) return;
    this.params.key = String(best.r);
    const keySel = this.el('p_key');
    if (keySel) keySel.value = this.params.key;
    if ((best.m === 'minor') !== minorish) {
      this.params.mode = best.m;
      const modeSel = this.el('p_mode');
      if (modeSel) modeSel.value = best.m;
    }
  }

  // Singing into MIC: a pitch tracker (YIN) turns the voice into notes (a note must hold for three reads)
  startMic() {
    this.stopMic();
    this.micState = { note: null, cand: null, count: 0, silent: 0 };
    this.micTimer = setInterval(() => this.micPoll(), 30);
  }

  stopMic() {
    clearInterval(this.micTimer);
    this.micTimer = null;
  }

  micPoll() {
    if (!this.rec) { this.stopMic(); return; }
    const buf = this.micBuf;
    this.analyser.getFloatTimeDomainData(buf);
    let rms = 0;
    for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / buf.length);
    const s = this.micState;
    const f = rms > 0.015 ? ChoraleModule.yin(buf, this.audioCtx.sampleRate) : 0;
    const t = this.audioCtx.currentTime - 0.04;
    if (!f) {
      if (s.note !== null && ++s.silent >= 3) { s.note = null; s.cand = null; this.melodyNoteOff(t); }
      return;
    }
    s.silent = 0;
    const midi = Math.round(ChoraleModule.ftom(f));
    if (midi === s.note) { s.cand = null; return; }
    if (midi === s.cand) s.count++;
    else { s.cand = midi; s.count = 1; }
    if (s.count >= 3) {
      s.note = midi;
      s.cand = null;
      this.melodyNoteOn(midi, t - 0.06);
    }
  }

  // YIN pitch detection on a block of samples; 0 when no clear pitch (70 to 1000 Hz)
  static yin(buf, sr) {
    const W = 1024;
    const minT = Math.floor(sr / 1000), maxT = Math.min(Math.floor(sr / 70), buf.length - W - 1);
    const d = new Float32Array(maxT + 1);
    for (let tau = minT; tau <= maxT; tau++) {
      let sum = 0;
      for (let i = 0; i < W; i += 2) {
        const x = buf[i] - buf[i + tau];
        sum += x * x;
      }
      d[tau] = sum;
    }
    let running = 0;
    let tauBest = -1;
    for (let tau = minT; tau <= maxT; tau++) {
      running += d[tau];
      const cm = running > 0 ? d[tau] * (tau - minT + 1) / running : 1;
      d[tau] = cm;
    }
    for (let tau = minT + 1; tau < maxT; tau++) {
      if (d[tau] < 0.15) {
        while (tau + 1 < maxT && d[tau + 1] < d[tau]) tau++;
        tauBest = tau;
        break;
      }
    }
    if (tauBest < 0) return 0;
    const a = d[tauBest - 1], b = d[tauBest], c = d[tauBest + 1];
    const den = a - 2 * b + c;
    const shift = den ? 0.5 * (a - c) / den : 0;
    return sr / (tauBest + shift);
  }

  onInputConnected(key, connected, source) {
    if (key === 'clock') { this.follower.cable(connected, source); return; }
    if (key === 'mic') {
      this.micCables = Math.max(0, this.micCables + (connected ? 1 : -1));
      if (this.rec && this.micCables > 0 && !this.micTimer) this.startMic();
    }
  }

  // ---- UI ----
  renderBody() {
    const jack = (p, dir) => {
      const port = `<div class="port port-${dir}" data-node-id="${this.id}" data-port-id="${p.id}" data-port-type="${p.signal || 'cv'}" title="${p.title || p.label}"></div>`;
      const label = `<span>${p.short || p.label}</span>`;
      return `<div class="port-group">${dir === 'in' ? port + label : label + port}</div>`;
    };
    const outs = this.def.outputs;
    const byId = id => outs.find(p => p.id === id);
    const rows = [3, 2, 1, 0].map(k => {
      const s = CH_VOICE_KEYS[k];
      return `<div class="ch-voice-row"><span class="ch-voice-name">${CH_VOICE_NAMES[k]}</span>
        ${['pitch', 'gate', 'voice'].map(x => jack(byId(`${s}_${x}`), 'out')).join('')}</div>`;
    }).join('');
    return `
      <div class="hw-top">
        <button class="action-btn hw-play" id="${this.elId('play')}">Play</button>
        <button class="action-btn ch-rec" id="${this.elId('rec')}">Rec</button>
        <button class="action-btn ch-clear" id="${this.elId('clear')}">Clear</button>
        <span class="hw-chord" id="${this.elId('readout')}"></span>
      </div>
      <canvas id="${this.elId('display')}" class="ch-display" width="720" height="300"></canvas>
      <div class="ports-row hw-jacks">
        ${this.def.inputs.map(p => jack(p, 'in')).join('')}
      </div>
      <div class="ch-outs">
        ${rows}
        <div class="ch-voice-row"><span class="ch-voice-name">Choir</span>
          ${['notes', 'out_l', 'out_r'].map(id => jack(byId(id), 'out')).join('')}</div>
      </div>
    `;
  }

  onMount(card) {
    card.classList.add('ch-card');
    // Move the jack block under the controls
    const body = card.querySelector('.module-base-body');
    const jacksIn = card.querySelector('.hw-jacks');
    const outs = card.querySelector('.ch-outs');
    const basePorts = card.querySelector('.module-base-ports');
    if (body && jacksIn && outs) {
      body.insertBefore(jacksIn, basePorts);
      body.insertBefore(outs, basePorts);
    }
    const play = this.el('play');
    if (play) play.addEventListener('click', () => (this.playing ? this.stop() : this.start()));
    const rec = this.el('rec');
    if (rec) rec.addEventListener('click', () => this.toggleRec());
    const clear = this.el('clear');
    if (clear) clear.addEventListener('click', () => this.clearMelody());
    this.updateEnabled();
    this.updatePlayButton();
    this.updateRecButton();
    this.updateReadout();
    this.requestDraw();
  }

  updateEnabled() {
    const clear = this.el('clear');
    if (clear) clear.disabled = !this.melody.length && !this.rec;
  }

  updatePlayButton() {
    const btn = this.el('play');
    if (!btn) return;
    const following = this.follower && this.follower.connected;
    btn.textContent = following ? 'CLOCK' : this.playing ? 'Stop' : 'Play';
    btn.disabled = !!following;
    btn.classList.toggle('active', this.playing);
  }

  updateRecButton() {
    const btn = this.el('rec');
    if (btn) {
      btn.textContent = this.rec ? 'Done' : 'Rec';
      btn.classList.toggle('active', !!this.rec);
    }
    this.updateEnabled();
  }

  updateReadout() {
    const el = this.el('readout');
    if (!el) return;
    const key = `${CH_NAMES[this.tonic()]} ${this.modeDef().label.toLowerCase()}`;
    let text;
    if (this.rec) {
      text = this.rec.notes.length ? `Recording ${this.rec.notes.length} / ${CH_MAX_NOTES}` : (this.micCables ? 'Sing or play' : 'Play the Keyboard');
    } else if (this.params.source === 'melody' && !this.melody.length) {
      text = 'Press Rec';
    } else if (this.params.source === 'chords' && !this.playing) {
      text = 'Waiting for CHORDS';
    } else if (this.playing && this.shownSlot && this.shownSlot.chord) {
      text = `${this.shownSlot.chord.label} in ${key}`;
    } else {
      text = key;
    }
    el.textContent = text;
  }

  requestDraw() {
    if (this.drawPending || !this.card) return;
    this.drawPending = true;
    requestAnimationFrame(() => { this.drawPending = false; this.draw(); });
  }

  // A piano roll of the four voices: the whole phrase with a play line (Free, Melody), the last
  // bars as they happened (Chords), or the notes being recorded. Parallel fifths / octaves in red.
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
    const colors = [text, '#10b981', '#f59e0b', primary];   // Bass, Tenor, Alto, Soprano
    const lo = 38, hi = 82;
    const top = 8, bottom = H - 34;
    const y = m => bottom - (m - lo) / (hi - lo) * (bottom - top);
    g.clearRect(0, 0, W, H);
    // Octave lines (C notes)
    g.lineWidth = 1;
    g.strokeStyle = border;
    g.fillStyle = muted;
    g.font = '16px system-ui, sans-serif';
    g.textBaseline = 'middle';
    for (let m = 48; m <= 72; m += 12) {
      g.beginPath();
      g.moveTo(36, y(m));
      g.lineTo(W, y(m));
      g.stroke();
      g.fillText(`C${m / 12 - 1}`, 4, y(m));
    }
    const x0 = 40;
    const bar = (xa, xb, m, color, w = 7) => {
      g.fillStyle = color;
      g.fillRect(xa, y(m) - w / 2, Math.max(3, xb - xa - 2), w);
    };
    g.textAlign = 'center';
    if (this.rec) {
      const notes = this.rec.notes;
      const len = Math.max(32, notes.reduce((a, n) => Math.max(a, n.start + n.len), 0) + 4);
      const xs = tk => x0 + tk / len * (W - x0 - 6);
      notes.forEach(n => bar(xs(n.start), xs(n.start + n.len), Math.min(hi, Math.max(lo, n.midi)), primary, 9));
      g.fillStyle = muted;
      g.fillText(notes.length ? '' : 'Recording: play or sing a tune', W / 2, H / 2);
      g.textAlign = 'left';
      return;
    }
    const tl = this.params.source === 'chords' && this.params.style !== 'part' ? null : (this.timeline || null);
    if (tl) {
      const xs = tk => x0 + tk / tl.len * (W - x0 - 6);
      // Chord names under the roll
      g.font = 'bold 17px system-ui, sans-serif';
      let lastX = -99;
      tl.slots.forEach(sl => {
        const lx = xs(sl.start + Math.min(sl.dur, 8) / 2);
        if (tl.part || lx - lastX < 34) return;   // no room: skip the name
        lastX = lx;
        g.fillStyle = this.shownSlot === sl && this.playing ? text : muted;
        g.fillText(sl.chord.label, lx, H - 16);
      });
      if (tl.part) {
        g.fillStyle = muted;
        g.fillText(`tintinnabuli on ${CH_NAMES[this.tonic()]}`, W / 2, H - 16);
      }
      tl.events.forEach((list, k) => list.forEach(ev => {
        let m = typeof ev.midi === 'number' ? ev.midi : null;
        if (ev.midi && ev.midi.drone) m = this.resolve(ev.midi, 0);
        if (ev.midi && ev.midi.tint != null) m = this.tintNote(ev.midi.tint, ev.midi.i, null, this.partTriad(this.liveChord));
        if (m == null) return;
        bar(xs(ev.start), xs(ev.start + ev.len), m, colors[k]);
      }));
      // Parallels: a red line joining the two voices on each side of the chord change
      g.strokeStyle = '#ef4444';
      g.lineWidth = 3;
      tl.slots.forEach((sl, i) => (sl.par || []).forEach(([a, b]) => {
        const p = tl.slots[i - 1];
        [a, b].forEach(k => {
          g.beginPath();
          g.moveTo(xs(sl.start) - 10, y(p.v[k]));
          g.lineTo(xs(sl.start) + 10, y(sl.v[k]));
          g.stroke();
        });
      }));
      if (this.playing) {
        const px = xs(Math.max(0, (this.drawTick || 0) - 1) + 0.5);
        g.strokeStyle = text;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(px, top);
        g.lineTo(px, bottom);
        g.stroke();
      }
    } else if (this.params.source === 'chords') {
      const span = 64;
      const hs = this.history;
      const xs = i => x0 + i / span * (W - x0 - 6);
      const off = span - hs.length;
      hs.forEach((h, i) => {
        h.v.forEach((m, k) => { if (m != null) bar(xs(off + i), xs(off + i + 1) + 2, m, colors[k]); });
        if (h.par && h.par.length && i) {
          g.strokeStyle = '#ef4444';
          g.lineWidth = 3;
          h.par.forEach(([a, b]) => [a, b].forEach(k => {
            const pm = hs[i - 1].v[k], nm = h.v[k];
            if (pm == null || nm == null) return;
            g.beginPath();
            g.moveTo(xs(off + i) - 8, y(pm));
            g.lineTo(xs(off + i) + 8, y(nm));
            g.stroke();
          }));
        }
        if (h.label && (i === 0 || hs[i - 1].label !== h.label)) {
          g.fillStyle = muted;
          g.font = 'bold 17px system-ui, sans-serif';
          g.fillText(h.label, xs(off + i) + 12, H - 16);
        }
      });
      if (!hs.length) {
        g.fillStyle = muted;
        g.fillText('Connect a Harmony Walker or a Keyboard to CHORDS', W / 2, H / 2);
      }
    } else {
      g.fillStyle = muted;
      g.fillText(this.params.source === 'melody' && !this.melody.length ? 'Press Rec, then play or sing a short tune' : 'Press Play', W / 2, H / 2);
    }
    // Voice names
    g.textAlign = 'right';
    g.font = 'bold 15px system-ui, sans-serif';
    ['B', 'T', 'A', 'S'].forEach((n, k) => {
      g.fillStyle = colors[k];
      g.fillText(n, W - 6 - (3 - k) * 18, top + 10);
    });
    g.textAlign = 'left';
  }

  getExtraState() {
    return { melody: this.melody.map(n => [n.midi, n.start, n.len]), melodyLen: this.melodyLen };
  }

  setExtraState(s) {
    if (Array.isArray(s.melody)) {
      this.melody = s.melody.filter(n => Array.isArray(n) && n.length === 3).slice(0, CH_MAX_NOTES)
        .map(([midi, start, len]) => ({ midi, start, len }));
      const end = this.melody.reduce((a, n) => Math.max(a, n.start + n.len), 0);
      this.melodyLen = Math.max(s.melodyLen || 0, Math.ceil(end / 16) * 16, this.melody.length ? 16 : 0);
      this.timeline = null;
      this.updateEnabled();
      this.updateReadout();
      this.requestDraw();
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
    clearInterval(this.driftTimer);
    clearTimeout(this.chordTimer);
    this.stopMic();
    if (this.rec) clearTimeout(this.rec.quiet);
    this.follower.destroy();
  }
}

ModuleBase.register(ChoraleModule);
