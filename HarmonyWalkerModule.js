// HarmonyWalkerModule.js - a harmony engine that plays by itself: press Play and it walks from chord
// to chord on the Tonnetz (the Neo-Riemannian grid of notes and triads), one P, L or R move per step.
// P (Parallel) C major <-> C minor, R (Relative) C major <-> A minor, L (Leading-tone) C major <-> E minor:
// each move changes one note of the triad, so the voices move smoothly. S (Slide, C major <-> C# minor),
// N (C major <-> F minor) and H (Hexatonic pole, C major <-> Ab minor) are made of three of those.
// Tuning: equal temperament, or just intonation where every grid point has its own pure pitch
// (fifths 3/2, major thirds 5/4), so a walk that comes back to the same chord can arrive a little
// higher or lower (the pitch drifts). Glide slides the voices from one chord to the next. A row of up to 8 steps sets the
// movement (ready-made movements in a menu, or tap the steps). The chord goes out on NOTES (a Poly Synth),
// on LOW / MID / HIGH FREQ (three oscillators) and a GATE on every change. Follows a CLOCK cable
// (16th-note pulses, architecture.md section 4) or its own Tempo. Built on the shared template (ModuleBase.js).

// HarmonyWalkerModule.js - a harmony engine that plays by itself: press Play and it moves from chord to
// chord. Source picks where the chords come from:
// - Tonnetz moves: a walk on the Tonnetz (the Neo-Riemannian grid of notes and triads), one move per step.
//   P (Parallel) C major <-> C minor, R (Relative) C major <-> A minor, L (Leading-tone) C major <-> E minor:
//   each changes one note of the triad. S (Slide, C major <-> C# minor), N (C major <-> F minor) and
//   H (Hexatonic pole, C major <-> Ab minor) are made of three of those. A row of up to 8 steps sets the
//   movement (ready-made movements in a menu, or tap the steps).
// - Progression: a famous chord progression in the key of the Start Chord, round and round.
// - Chance table: functional harmony, each next chord picked by chance (V goes to I most of the time).
// - Cube Dance / Power Towers: random walks where one note moves by a half step (triads with augmented
//   chords, or the four kinds of seventh chord).
// - Upper structure: follows the chord arriving at FOLLOW (another Walker's or a Keyboard's NOTES) and
//   plays a triad above it (on II, bIII, bV, bVI, VI...), changing at the same moment.
// An arpeggiator plays the chord's notes one by one (ARP and ARP GATE), with up / down and
// Philip Glass style patterns (broken 1 3 5 3, three against four, additive 1 2, 1 2 3, ...).
// Tuning: equal temperament, just intonation (every grid point its own pure pitch, which can drift),
// 19 or 31 equal steps per octave (drift too), or Bohlen-Pierce (13 steps per tritave 3:1, its own
// Tonnetz of 3:5:7 chords). Glide slides the voices from one chord to the next. The chord goes out on
// NOTES (a Poly Synth), on LOW / MID / HIGH (oscillator pitches) and a GATE on every change. Follows
// a CLOCK cable (16th-note pulses, architecture.md section 4) or its own Tempo. Built on ModuleBase.js.

const HW_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const HW_BP_NAMES = ['C', 'Db', 'D', 'E', 'F', 'Gb', 'G', 'H', 'Jb', 'J', 'A', 'Bb', 'B'];
// Pitch systems: steps per period, the steps of the grid's two directions, the period in cents
const HW_WEST = { n: 12, gi: 7, gj: 4, names: HW_NAMES, period: 1200 };
const HW_BP = { n: 13, gi: 10, gj: 6, names: HW_BP_NAMES, period: 1200 * Math.log2(3) };
const HW_MOVES = {
  pl: ['P', 'L'],
  pr: ['P', 'R'],
  lr: ['L', 'R'],
  plr: ['P', 'L', 'R'],
  drift: ['L', 'P', 'R', 'P'],
  mystery: ['H', 'P'],
  wander: ['N', 'R', 'S', 'L'],
  random: ['?']
};
const HW_COMPOUND = { S: ['L', 'P', 'R'], N: ['R', 'L', 'P'], H: ['L', 'P', 'L'] };
const HW_STEP_CYCLE = ['P', 'L', 'R', 'S', 'N', 'H', '?', '-'];
const HW_MAX_STEPS = 8;
const HW_GATE_LEN = 0.85;   // the GATE stays on for this part of each chord

// Chord kinds (half steps above the root) and how their names are written
const HW_QUALITIES = {
  M: [0, 4, 7], m: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8],
  '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9],
  mM7: [0, 3, 7, 11], m6: [0, 3, 7, 9]
};
const HW_SUFFIX = { M: ' major', m: ' minor', dim: ' dim', aug: ' aug', '7': '7', m7: 'm7', maj7: 'maj7',
  m7b5: 'm7b5', dim7: 'dim7', mM7: 'm(maj7)', m6: 'm6' };
const HW_SHORT = { M: '', m: 'm', dim: 'dim', aug: '+', '7': '7', m7: 'm7', maj7: 'maj7', m7b5: 'm7b5',
  dim7: 'dim7', mM7: 'mM7', m6: 'm6' };

// Progressions: [half steps above the key, chord kind]
const HW_PROGS = {
  axis: { label: 'Axis (I V vi IV)', chords: [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']] },
  fifties: { label: 'Fifties (I vi IV V)', chords: [[0, 'M'], [9, 'm'], [5, 'M'], [7, 'M']] },
  pachelbel: { label: 'Pachelbel canon', chords: [[0, 'M'], [7, 'M'], [9, 'm'], [4, 'm'], [5, 'M'], [0, 'M'], [5, 'M'], [7, 'M']] },
  andalusian: { label: 'Andalusian (i bVII bVI V)', chords: [[0, 'm'], [10, 'M'], [8, 'M'], [7, 'M']] },
  fifths: { label: 'Circle of fifths', chords: [[0, 'M'], [5, 'M'], [11, 'dim'], [4, 'm'], [9, 'm'], [2, 'm'], [7, 'M'], [0, 'M']] },
  royal: { label: 'Royal Road (IV V iii vi)', chords: [[5, 'maj7'], [7, '7'], [4, 'm7'], [9, 'm']] },
  blues: { label: '12-bar blues', chords: [[0, '7'], [0, '7'], [0, '7'], [0, '7'], [5, '7'], [5, '7'], [0, '7'], [0, '7'], [7, '7'], [5, '7'], [0, '7'], [7, '7']] },
  twofive: { label: 'Jazz ii V I', chords: [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7']] },
  coltrane: { label: 'Coltrane cycle (Giant Steps)', chords: [[0, 'maj7'], [3, '7'], [8, 'maj7'], [11, '7'], [4, 'maj7'], [7, '7']] },
  cliche: { label: 'Line cliche (minor)', chords: [[0, 'm'], [0, 'mM7'], [0, 'm7'], [0, 'm6']] }
};

// Chance table: the seven chords of the key (I ii iii IV V vi vii, or the minor key's) and, for each,
// the chance of each next chord (functional harmony: ii goes to V, V goes home to I...)
const HW_DEGREES = {
  major: [[0, 'M'], [2, 'm'], [4, 'm'], [5, 'M'], [7, 'M'], [9, 'm'], [11, 'dim']],
  minor: [[0, 'm'], [2, 'dim'], [3, 'M'], [5, 'm'], [7, 'M'], [8, 'M'], [10, 'M']],
  major7: [[0, 'maj7'], [2, 'm7'], [4, 'm7'], [5, 'maj7'], [7, '7'], [9, 'm7'], [11, 'm7b5']],
  minor7: [[0, 'm7'], [2, 'm7b5'], [3, 'maj7'], [5, 'm7'], [7, '7'], [8, 'maj7'], [10, '7']]
};
const HW_CHANCES = [
  { 3: 0.3, 4: 0.25, 5: 0.15, 1: 0.15, 2: 0.1, 6: 0.05 },
  { 4: 0.6, 6: 0.15, 3: 0.1, 5: 0.1, 0: 0.05 },
  { 5: 0.5, 3: 0.3, 1: 0.1, 4: 0.1 },
  { 4: 0.35, 0: 0.25, 1: 0.2, 6: 0.1, 5: 0.1 },
  { 0: 0.6, 5: 0.25, 3: 0.1, 2: 0.05 },
  { 1: 0.35, 3: 0.35, 4: 0.15, 2: 0.1, 0: 0.05 },
  { 0: 0.7, 2: 0.2, 5: 0.1 }
];
// Upper structure: the triad above the followed chord's root ([half steps above it, kind])
const HW_UPPERS = {
  II: [2, 'M'], bIII: [3, 'M'], IV: [5, 'M'], bV: [6, 'M'], V: [7, 'M'], bVI: [8, 'M'], VI: [9, 'M']
};
// Auto: the uppers that suit each kind of chord below
const HW_UPPER_AUTO = {
  M: ['II', 'V'], maj7: ['II', 'V'], m6: ['IV'], m: ['IV', 'bIII'], m7: ['IV', 'bIII'], mM7: ['V'],
  '7': ['II', 'bIII', 'bV', 'bVI', 'VI'], dim: ['bVI'], dim7: ['bVI'], m7b5: ['bVI'], aug: ['II']
};
// Arpeggiator rates: notes per beat
const HW_ARP_RATES = { '8': 2, '8t': 3, '16': 4, '16t': 6 };
const HW_FOLLOW_KINDS = ['M', 'm', '7', 'maj7', 'm7', 'dim', 'aug', 'm7b5', 'dim7', 'mM7', 'm6'];

// Half-step graphs: which chord kinds each walk uses
const HW_GRAPHS = { cube: ['M', 'm', 'aug'], towers: ['7', 'm7', 'm7b5', 'dim7'] };

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
      { id: 'source', label: 'Source', kind: 'select', value: 'tonnetz',
        options: [['tonnetz', 'Tonnetz moves'], ['progression', 'Progression'], ['markov', 'Chance table'],
          ['markov7', 'Chance table, 7th chords'], ['cube', 'Cube Dance (half steps)'], ['towers', 'Power Towers (7th chords)'], ['upper', 'Upper structure (FOLLOW)']] },
      { id: 'movement', label: 'Movement', kind: 'select', value: 'drift',
        options: [['pl', 'Hexatonic cycle (P L)'], ['pr', 'Octatonic cycle (P R)'], ['lr', 'Chain of thirds (L R)'],
          ['plr', 'P L R'], ['drift', 'Drift (L P R P)'], ['mystery', 'Mystery (H P)'], ['wander', 'Wander (N R S L)'],
          ['random', 'Random walk'], ['custom', 'Custom']] },
      { id: 'length', label: 'Steps', min: 1, max: HW_MAX_STEPS, step: 1, value: 4 },
      { id: 'progression', label: 'Progression', kind: 'select', value: 'axis',
        options: Object.keys(HW_PROGS).map(k => [k, HW_PROGS[k].label]) },
      { id: 'upper', label: 'Upper', kind: 'select', value: 'auto',
        options: [['auto', 'Auto (suits the chord)'], ['II', 'II (9, #11, 13)'], ['bIII', 'bIII (#9, 5, b7)'], ['IV', 'IV (11, 13, root)'],
          ['bV', 'bV (#11, b7, b9)'], ['V', 'V (5, 7, 9)'], ['bVI', 'bVI (b13, root, #9)'], ['VI', 'VI (13, b9, 3)'],
          ['R', 'Tonnetz R neighbour'], ['L', 'Tonnetz L neighbour'], ['random', 'Random (II to VI)']] },
      { id: 'every', label: 'Change Every', min: 1, max: 16, step: 1, value: 4,
        format: v => `${v} ${v === 1 ? 'beat' : 'beats'}` },
      { id: 'tempo', label: 'Tempo', min: 20, max: 200, step: 1, value: 80, unit: 'BPM' },
      { id: 'start', label: 'Start Chord', kind: 'select', value: '0M',
        options: HW_NAMES.map((n, i) => [`${i}M`, `${n} major`]).concat(HW_NAMES.map((n, i) => [`${i}m`, `${n} minor`])) },
      { id: 'octave', label: 'Octave', min: 1, max: 6, step: 1, value: 3 },
      { id: 'voicing', label: 'Voicing', kind: 'select', value: 'close',
        options: [['close', 'Close'], ['open', 'Open (low note down)'], ['wide', 'Wide (low down, high up)']] },
      { id: 'tuning', label: 'Tuning', kind: 'select', value: 'equal',
        options: [['equal', 'Equal (12-TET)'], ['just', 'Just, drifting'], ['justc', 'Just, centered'],
          ['edo19', '19 equal, drifting'], ['edo31', '31 equal, drifting'],
          ['bp', 'Bohlen-Pierce (13 per tritave)'], ['bpjust', 'Bohlen-Pierce, just']] },
      { id: 'glide', label: 'Glide', min: 0, max: 3000, step: 10, value: 0,
        format: v => (v > 0 ? `${v} ms` : 'Off') },
      { id: 'arp', label: 'Arp Pattern', kind: 'select', value: 'off',
        options: [['off', 'Off'], ['up', 'Up'], ['down', 'Down'], ['updown', 'Up and down'], ['broken', 'Broken (1 3 5 3)'],
          ['threefour', 'Three against four'], ['additive', 'Additive (1 2, 1 2 3, ...)'], ['random', 'Random']] },
      { id: 'arpRate', label: 'Arp Rate', kind: 'select', value: '8',
        options: [['8', '1/8'], ['8t', '1/8 triplets'], ['16', '1/16'], ['16t', '1/16 triplets']] },
      { id: 'arpOct', label: 'Arp Octaves', min: 1, max: 3, step: 1, value: 1 }
    ],
    inputs: [
      { id: 'clock', label: 'CLOCK', signal: 'gate', title: 'Clock Input', inline: true,
        guide: { text: 'A pulse on every 16th note. With a cable here the Walker follows that tempo instead of its own (Change Every counts beats of 4 pulses).', from: 'Metronome CLOCK, Drum Machine CLOCK, Sequencer CLOCK', match: ['metronome:out:clock', 'drums:out:clock', 'sequencer:out:clock'] },
        chip: 'Metronome / Drums CLOCK' },
      { id: 'follow', label: 'FOLLOW', signal: 'gate', title: 'Follow Input (NOTES of another Walker or a Keyboard)', inline: true,
        guide: { text: 'The chord to follow: another Harmony Walker\'s or a Keyboard\'s NOTES. With Source set to Upper structure, this Walker plays a triad above every chord that arrives here, at the same moment. Carries notes, not sound.', from: 'Harmony Walker NOTES, Keyboard NOTES', match: ['harmony:out:notes', 'keyboard:out:notes'] },
        chip: 'Walker / Keyboard NOTES' }
    ],
    outputs: [
      { id: 'notes', label: 'NOTES', signal: 'gate', title: 'Notes Output (to Poly Synth NOTES)',
        guide: { text: 'The notes of the chord (three, or four for seventh chords). Notes the next chord shares keep sounding; only changed notes are played again. Carries notes, not sound.', to: 'Poly Synth NOTES', match: ['polysynth:in:notes'] },
        chip: 'Poly Synth NOTES' },
      { id: 'low', label: 'LOW', signal: 'cv', title: 'Lowest Note (Hz)',
        guide: { text: 'The lowest note of the chord, as a pitch in Hz.', to: 'Oscillator PITCH, Wavetable Osc PITCH', match: ['oscillator:in:pitch', 'wavetable:in:pitch'] },
        chip: 'Osc PITCH' },
      { id: 'mid', label: 'MID', signal: 'cv', title: 'Middle Note (Hz)',
        guide: { text: 'The second note of the chord from the bottom, as a pitch in Hz.', to: 'Oscillator PITCH, Wavetable Osc PITCH', match: ['oscillator:in:pitch', 'wavetable:in:pitch'] },
        chip: 'Osc PITCH' },
      { id: 'high', label: 'HIGH', signal: 'cv', title: 'Highest Note (Hz)',
        guide: { text: 'The highest note of the chord, as a pitch in Hz.', to: 'Oscillator PITCH, Wavetable Osc PITCH', match: ['oscillator:in:pitch', 'wavetable:in:pitch'] },
        chip: 'Osc PITCH' },
      { id: 'gate', label: 'GATE', signal: 'gate', title: 'Gate Output',
        guide: { text: 'Turns on at every chord change and off just before the next one.', to: 'Envelope GATE IN, VCA CV', match: ['envelope:in:gate', 'vca:in:cv'] },
        chip: 'Env GATE IN' },
      { id: 'arp', label: 'ARP', signal: 'cv', title: 'Arpeggio Pitch (Hz)', inline: true,
        guide: { text: 'The arpeggio: the chord\'s notes one at a time, as a pitch in Hz (Arp Pattern must not be Off).', to: 'Oscillator PITCH, Wavetable Osc PITCH', match: ['oscillator:in:pitch', 'wavetable:in:pitch'] },
        chip: 'Osc PITCH' },
      { id: 'arpgate', label: 'ARP GATE', signal: 'gate', title: 'Arpeggio Gate', inline: true,
        guide: { text: 'On for the first half of every arpeggio note.', to: 'Envelope GATE IN, VCA CV', match: ['envelope:in:gate', 'vca:in:cv'] },
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

  static mod(a, n) {
    return ((a % n) + n) % n;
  }

  // ---- Pitch system and Tonnetz math ----
  // Bohlen-Pierce tunings switch to its own system (13 steps per tritave), which only has Tonnetz moves
  sys() {
    return String(this.params.tuning).startsWith('bp') ? HW_BP : HW_WEST;
  }

  source() {
    return this.sys() === HW_BP ? 'tonnetz' : this.params.source;
  }

  // Grid point (i, j): i counts steps of gi to the right (a fifth), j steps of gj up-right (a major third).
  // A major triangle at (i, j): root (i, j), third (i, j + 1), fifth (i + 1, j).
  // A minor triangle at (i, j): root (i, j + 1), third (i + 1, j), fifth (i + 1, j + 1).
  pc(i, j) {
    const S = this.sys();
    return HarmonyWalkerModule.mod(S.gi * i + S.gj * j + this.base, S.n);
  }

  triPoints(t) {
    return t.type === 'M'
      ? [[t.i, t.j], [t.i, t.j + 1], [t.i + 1, t.j]]
      : [[t.i, t.j + 1], [t.i + 1, t.j], [t.i + 1, t.j + 1]];
  }

  // Each move flips the triangle across one of its edges (S, N and H are three flips)
  transform(t, move) {
    if (HW_COMPOUND[move]) return HW_COMPOUND[move].reduce((c, m) => this.transform(c, m), t);
    if (t.type === 'M') {
      if (move === 'P') return { type: 'm', i: t.i, j: t.j - 1 };
      if (move === 'R') return { type: 'm', i: t.i - 1, j: t.j };
      return { type: 'm', i: t.i, j: t.j };
    }
    if (move === 'P') return { type: 'M', i: t.i, j: t.j + 1 };
    if (move === 'R') return { type: 'M', i: t.i + 1, j: t.j };
    return { type: 'M', i: t.i, j: t.j };
  }

  // A chord is { root, q, pcs }: pcs are its notes as pitch classes, root first
  triChord(t) {
    const pcs = this.triPoints(t).map(([i, j]) => this.pc(i, j));
    return { root: pcs[0], q: t.type, pcs };
  }

  makeChord(root, q) {
    root = HarmonyWalkerModule.mod(root, 12);
    return { root, q, pcs: HW_QUALITIES[q].map(x => (root + x) % 12) };
  }

  chordName(c) {
    if (!c) return '';
    const name = this.sys().names[c.root];
    return name + (HW_SUFFIX[c.q] || '');
  }

  shortName(c) {
    return HW_NAMES[c.root] + (c.q ? HW_SHORT[c.q] : '?');
  }

  // Grid points for the chord's notes: the Tonnetz triangle, or for other chords the root's point
  // nearest the anchor and each other note's point nearest the root
  chordPoints(c, anchor) {
    const posOf = (i, j) => [i + j / 2, j * 0.866];
    const nearest = (pc, ax, ay) => {
      let best = null;
      for (let i = Math.round(ax) - 9; i <= Math.round(ax) + 9; i++) {
        for (let j = Math.round(ay / 0.866) - 5; j <= Math.round(ay / 0.866) + 5; j++) {
          if (this.pc(i, j) !== pc) continue;
          const [x, y] = posOf(i, j);
          const d = (x - ax) * (x - ax) + (y - ay) * (y - ay);
          if (!best || d < best.d) best = { d, p: [i, j] };
        }
      }
      return best ? best.p : [0, 0];
    };
    const root = nearest(c.pcs[0], anchor[0], anchor[1]);
    const [rx, ry] = posOf(root[0], root[1]);
    // The fifth leans right of the root and the thirds up, so the shape stays a tidy triangle
    return [root].concat(c.pcs.slice(1).map(pc => nearest(pc, rx + 0.4, ry + 0.3)));
  }

  static centroid(pts) {
    let x = 0, y = 0;
    pts.forEach(([i, j]) => { x += i + j / 2; y += j * 0.866; });
    return [x / pts.length, y / pts.length];
  }

  // ---- Half-step graphs (Cube Dance, Power Towers): chords that differ by one note moved a half step ----
  static graph(kind) {
    HarmonyWalkerModule.graphs = HarmonyWalkerModule.graphs || {};
    if (HarmonyWalkerModule.graphs[kind]) return HarmonyWalkerModule.graphs[kind];
    const byKey = new Map();
    HW_GRAPHS[kind].forEach(q => {
      for (let r = 0; r < 12; r++) {
        const pcs = HW_QUALITIES[q].map(x => (r + x) % 12);
        const key = pcs.slice().sort((a, b) => a - b).join(',');
        if (!byKey.has(key)) byKey.set(key, { root: r, q, set: new Set(pcs) });
      }
    });
    const nodes = Array.from(byKey.entries()).map(([key, v]) => ({ key, root: v.root, q: v.q, set: v.set }));
    nodes.forEach(a => {
      a.next = nodes.filter(b => {
        if (b === a || b.set.size !== a.set.size) return false;
        const onlyA = [...a.set].filter(x => !b.set.has(x));
        const onlyB = [...b.set].filter(x => !a.set.has(x));
        if (onlyA.length !== 1) return false;
        const d = HarmonyWalkerModule.mod(onlyA[0] - onlyB[0], 12);
        return d === 1 || d === 11;
      }).map(b => b.key);
    });
    const graph = new Map(nodes.map(nd => [nd.key, nd]));
    HarmonyWalkerModule.graphs[kind] = graph;
    return graph;
  }

  static setKey(c) {
    return c.pcs.slice().sort((a, b) => a - b).join(',');
  }

  build() {
    this.steps = HW_MOVES.drift.slice();
    while (this.steps.length < HW_MAX_STEPS) this.steps.push('-');
    this.playing = false;
    this.stepIndex = -1;       // the step (or progression chord) that made the current chord
    this.lastMove = null;
    this.trail = [];           // earlier chords' grid points, newest last
    this.history = [];         // earlier chords, newest last
    this.voices = null;        // the chord's notes in system steps (MIDI notes in 12-TET), one per voice
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
    this.arpOut = this.makeConstant(0);
    this.arpGateOut = this.makeConstant(0);
    this.arpPos = 0;
    this.clockIn = this.own(this.audioCtx.createGain());
    // FOLLOW: app.js connects another PolyNoteBus to this object; it keeps the notes held there
    const self = this;
    this.followCables = 0;
    this.followHeld = new Map();
    this.followIn = {
      noteOn(note, freq) { self.followHeld.set(note, freq); self.followChanged(); },
      noteOff(note) { self.followHeld.delete(note); self.followChanged(); },
      allNotesOff() { self.followHeld.clear(); self.followChanged(); },
      bend() {}
    };
    this.inputNodes = { clock: this.clockIn, follow: this.followIn };
    this.outputNodes = { notes: this.noteBus, low: this.lowOut, mid: this.midOut, high: this.highOut, gate: this.gateOut,
      arp: this.arpOut, arpgate: this.arpGateOut };

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

  // Back to the Start Chord (its root is also the key of Progression and Chance table)
  setStartChord(keepVoices = false) {
    this.tuneShift = [0, 0];
    const s = String(this.params.start || '0M');
    this.base = HarmonyWalkerModule.mod(parseInt(s, 10) || 0, this.sys().n);
    this.minorKey = s.endsWith('m');
    this.tri = this.minorKey ? { type: 'm', i: 0, j: -1 } : { type: 'M', i: 0, j: 0 };
    this.stepIndex = -1;
    this.lastMove = null;
    const src = this.source();
    if (src === 'tonnetz') this.chord = this.triChord(this.tri);
    else if (src === 'progression') { this.chord = this.progChord(0); this.stepIndex = 0; }
    else if (src === 'markov' || src === 'markov7') { this.degree = 0; this.chord = this.degreeChord(0); }
    else if (src === 'towers') this.chord = this.makeChord(this.base, '7');
    else if (src === 'upper' && this.lower) this.chord = this.upperChord(this.lower);
    else this.chord = this.makeChord(this.base, this.minorKey ? 'm' : 'M');
    if (src !== 'tonnetz') this.base = 0;   // other sources name absolute pitch classes
    this.points = src === 'tonnetz' ? this.triPoints(this.tri) : this.chordPoints(this.chord, [0, 0]);
    this.trail = [];
    this.history = [];
    if (!keepVoices) {
      this.voices = null;
      this.lastOut = null;
      this.cam = null;
    }
  }

  progChord(k) {
    const prog = HW_PROGS[this.params.progression] || HW_PROGS.axis;
    const [off, q] = prog.chords[k % prog.chords.length];
    return this.makeChord(this.keyRoot() + off, q);
  }

  degreeChord(d) {
    const table = HW_DEGREES[(this.minorKey ? 'minor' : 'major') + (this.source() === 'markov7' ? '7' : '')];
    const [off, q] = table[d];
    return this.makeChord(this.keyRoot() + off, q);
  }

  keyRoot() {
    return parseInt(String(this.params.start || '0M'), 10) || 0;
  }

  onParamChange(id, value) {
    if (id === 'movement' && HW_MOVES[value]) {
      const m = HW_MOVES[value];
      for (let k = 0; k < HW_MAX_STEPS; k++) this.steps[k] = m[k % m.length];
      if (this.params.length !== m.length) this.setParam('length', m.length);
    }
    // A new source, progression, key or pitch system starts the walk again (voices move smoothly on)
    const restart = id === 'source' || id === 'progression' || id === 'start' ||
      (id === 'tuning' && (String(value).startsWith('bp') !== (this.lastSys === HW_BP)));
    if (id === 'tuning' || id === 'source') this.lastSys = this.sys();
    if (restart && this.voices !== undefined && this.base !== undefined) {
      const playing = this.playing;
      this.setStartChord(playing && this.sys() === this.voiceSys);
      if (playing) this.pending = true;   // the next chord change plays the new start chord
      this.updateReadout();
      this.requestDraw();
    }
    if ((id === 'voicing' || id === 'tuning') && this.playing && this.voices && !restart) this.sendChord(this.audioCtx.currentTime, false);
    if (id === 'tuning') this.updateReadout();
    if (id === 'arpOct' && this.arpNotes && this.lastFreqsAll) this.setArpNotes(this.lastFreqsAll);
    if (id === 'upper' && this.source() === 'upper' && this.lower && this.followPlaying) this.followChanged();
    if (['source', 'tuning', 'movement', 'length', 'progression', 'upper', 'arp'].includes(id)) {
      this.updateEnabled();
      this.renderSteps();
    }
  }

  // Controls that do nothing with the current Source are greyed out
  updateEnabled() {
    const src = this.source();
    const set = (id, on) => { const el = this.el(`p_${id}`); if (el) el.disabled = !on; };
    set('source', this.sys() !== HW_BP);
    // Rate and Octaves only matter with an Arp Pattern
    set('arpRate', this.params.arp !== 'off');
    set('arpOct', this.params.arp !== 'off');
  }

  // ---- Voices: each voice moves to the nearest note of the new chord, pulled gently toward the Octave ----
  center() {
    const N = this.sys().n;
    const c = N * (this.params.octave + 1) + 6;
    // An upper structure sits above the chord it follows
    if (this.source() === 'upper' && this.lowerTop) return Math.max(c, this.lowerTop + 8);
    return c;
  }

  // ---- Upper structure: follow the chord held at FOLLOW ----
  // Several note messages arrive at once (one chord change), so the chord is read once they are all in
  followChanged() {
    if (this.followQueued) return;
    this.followQueued = true;
    Promise.resolve().then(() => {
      this.followQueued = false;
      if (this.destroyed || this.source() !== 'upper' || this.userStopped) return;
      const midis = Array.from(this.followHeld.values()).map(f => Math.round(69 + 12 * Math.log2(f / 440)));
      if (!midis.length) {
        // The chord below stopped: so does this one
        if (this.followPlaying) {
          this.followPlaying = false;
          this.playing = false;
          if (this.timer) clearInterval(this.timer);
          this.timer = null;
          this.arpGateOut.offset.cancelScheduledValues(this.audioCtx.currentTime);
          this.arpGateOut.offset.setValueAtTime(0, this.audioCtx.currentTime);
          this.noteBus.update([]);
          this.gateOut.offset.setValueAtTime(0, this.audioCtx.currentTime);
          this.updatePlayButton();
        }
        return;
      }
      const lower = HarmonyWalkerModule.identify(midis);
      const now = this.audioCtx.currentTime;
      if (this.lowerAt) this.lowerGap = Math.min(16, now - this.lowerAt);
      this.lowerAt = now;
      this.lowerTop = Math.max(...midis);
      const before = this.chord;
      const beforePts = this.points;
      const changed = !this.lower || HarmonyWalkerModule.setKey(lower) !== HarmonyWalkerModule.setKey(this.lower) || !this.followPlaying;
      this.lower = lower;
      if (!changed) return;
      this.chord = this.upperChord(lower);
      if (this.followPlaying && before) {
        this.history.push(before);
        this.trail.push(beforePts);
        if (this.history.length > 8) this.history.shift();
        if (this.trail.length > 6) this.trail.shift();
      }
      this.points = this.chordPoints(this.chord, beforePts ? HarmonyWalkerModule.centroid(beforePts) : [0, 0]);
      this.lowerPoints = this.chordPoints(lower, HarmonyWalkerModule.centroid(this.points));
      if (!this.followPlaying) {
        // Starts by itself with the chord below (its timer only runs the arpeggio)
        this.followPlaying = true;
        this.playing = true;
        this.ensureTimer();
        this.updatePlayButton();
      }
      this.sendChord(now, true);
    });
  }

  // The chord's root and kind from its notes (the lowest note is the root if nothing matches)
  static identify(midis) {
    const pcs = new Set(midis.map(m => HarmonyWalkerModule.mod(m, 12)));
    for (const q of HW_FOLLOW_KINDS) {
      const iv = HW_QUALITIES[q];
      if (iv.length !== pcs.size) continue;
      for (const r of pcs) {
        if (iv.every(x => pcs.has((r + x) % 12))) return { root: r, q, pcs: iv.map(x => (r + x) % 12) };
      }
    }
    const root = HarmonyWalkerModule.mod(Math.min(...midis), 12);
    return { root, q: null, pcs: Array.from(pcs) };
  }

  upperChord(lower) {
    let pick = this.params.upper;
    const major = ['M', '7', 'maj7', 'aug'].includes(lower.q);
    if (pick === 'R') return this.makeChord(lower.root + (major ? 9 : 3), major ? 'm' : 'M');
    if (pick === 'L') return this.makeChord(lower.root + (major ? 4 : 8), major ? 'm' : 'M');
    if (pick === 'auto' || pick === 'random') {
      const list = pick === 'auto' ? (HW_UPPER_AUTO[lower.q] || ['II']) : ['II', 'bIII', 'bV', 'bVI', 'VI'];
      pick = list[Math.floor(Math.random() * list.length)];
    }
    const [off, q] = HW_UPPERS[pick] || HW_UPPERS.II;
    return this.makeChord(lower.root + off, q);
  }

  voiceChord(pcs) {
    const S = this.sys();
    const N = S.n;
    const c = this.center();
    const mod = HarmonyWalkerModule.mod;
    if (!this.voices || this.voiceSys !== S) {
      let root = c - Math.floor(N / 2) + mod(pcs[0] - (c - Math.floor(N / 2)), N);
      if (root > c) root -= N;
      this.voices = pcs.map(pc => root + mod(pc - pcs[0], N));
      this.voiceSys = S;
      return;
    }
    const near = (from, pc) => {
      let best = null;
      for (let n = from - N; n <= from + N; n++) {
        if (mod(n, N) !== pc) continue;
        const cost = Math.abs(n - from) + 0.3 * Math.abs(n - c);
        if (!best || cost < best.cost) best = { n, cost };
      }
      return best;
    };
    // As many voices as notes: a fourth note copies the top voice, a dropped note frees one voice
    const from = this.voices.slice();
    while (from.length < pcs.length) from.push(from[from.length - 1]);
    let bestSet = null;
    const k = pcs.length;
    const pick = (used, chosen) => {
      if (chosen.length === k) {
        const notes = chosen.map((v, x) => near(from[v], pcs[x]));
        const cost = notes.reduce((a, b) => a + b.cost, 0);
        if (!bestSet || cost < bestSet.cost) bestSet = { cost, notes: notes.map(x => x.n) };
        return;
      }
      for (let v = 0; v < from.length; v++) {
        if (used & (1 << v)) continue;
        pick(used | (1 << v), chosen.concat(v));
      }
    };
    pick(0, []);
    // Keep the chord around the Octave: when it has crept more than 4 steps away on average,
    // its outermost voice jumps a period back (otherwise a walk that keeps moving one way climbs forever)
    const v = bestSet.notes;
    for (let k = 0; k < v.length; k++) {
      const mean = v.reduce((a, b) => a + b, 0) / v.length;
      if (mean - c > 4) { const x = v.indexOf(Math.max(...v)); v[x] -= N; }
      else if (c - mean > 4) { const x = v.indexOf(Math.min(...v)); v[x] += N; }
      else break;
    }
    this.voices = v;
  }

  outputNotes() {
    const N = this.sys().n;
    const n = this.voices.slice().sort((a, b) => a - b);
    if (this.params.voicing === 'open' || this.params.voicing === 'wide') n[0] -= N;
    if (this.params.voicing === 'wide') n[n.length - 1] += N;
    // An upper structure stays above the chord it follows
    if (this.source() === 'upper' && this.followPlaying && this.lowerTop) {
      for (let k = 0; k < n.length; k++) while (n[k] <= this.lowerTop) n[k] += N;
    }
    return n.sort((a, b) => a - b);
  }

  static hz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Hz of a note in system steps (MIDI notes in 12-TET; in Bohlen-Pierce step 58 is the same as MIDI 54)
  stepHz(n) {
    const S = this.sys();
    if (S === HW_WEST) return HarmonyWalkerModule.hz(n);
    return HarmonyWalkerModule.hz(54) * Math.pow(2, (n - 58) * S.period / S.n / 1200);
  }

  // How far grid point (i, j) is from the equal-step pitch, in cents: just intonation (pure fifth 3/2
  // and third 5/4; in Bohlen-Pierce 7/3 and 5/3), or 19 / 31 equal steps per octave
  pointCents(i, j) {
    const t = this.params.tuning;
    const S = this.sys();
    const steps = (S.gi * i + S.gj * j) * S.period / S.n;
    if (t === 'just' || t === 'justc') return 1200 * (i * Math.log2(1.5) + j * Math.log2(1.25)) - steps;
    if (t === 'bpjust') return 1200 * (i * Math.log2(7 / 3) + j * Math.log2(5 / 3)) - steps;
    if (t === 'edo19') return (i * 11 + j * 6) * 1200 / 19 - steps;
    if (t === 'edo31') return (i * 18 + j * 10) * 1200 / 31 - steps;
    return 0;
  }

  // The grid points used for tuning: where the chord is (drifting), or for Just, centered, the copy
  // nearest the start (the grid repeats its notes every (0, 3) and (4, -1)). Drifting wanders freely
  // up to 50 cents, then moves to the copy where the root is nearest its normal pitch.
  tuningPoints() {
    if (['just', 'edo19', 'edo31'].includes(this.params.tuning) && this.sys() === HW_WEST) {
      const shifted = sh => this.points.map(([i, j]) => [i + sh[0], j + sh[1]]);
      let sh = this.tuneShift || [0, 0];
      if (Math.abs(this.pointCents(...shifted(sh)[0])) > 50) {
        let best = sh, bestC = Infinity;
        for (let a = -6; a <= 6; a++) {
          for (let b = -6; b <= 6; b++) {
            const s2 = [sh[0] + 4 * b, sh[1] + 3 * a - b];
            const c = Math.abs(this.pointCents(...shifted(s2)[0]));
            if (c < bestC - 0.01) { bestC = c; best = s2; }
          }
        }
        this.tuneShift = sh = best;
      }
      return shifted(sh);
    }
    if (this.params.tuning !== 'justc') return this.points;
    if (this.source() !== 'tonnetz') return this.chordPoints(this.chord, [0, 0]);
    let best = this.points, bestD = Infinity;
    for (let a = -6; a <= 6; a++) {
      for (let b = -6; b <= 6; b++) {
        const pts = this.points.map(([i, j]) => [i + 4 * b, j + 3 * a - b]);
        const [x, y] = HarmonyWalkerModule.centroid(pts);
        const d = x * x + y * y;
        if (d < bestD) { bestD = d; best = pts; }
      }
    }
    return best;
  }

  noteFreqs(notes) {
    const N = this.sys().n;
    const cents = {};
    this.tuningPoints().forEach(([i, j]) => { cents[this.pc(i, j)] = this.pointCents(i, j); });
    return notes.map(m => this.stepHz(m) * Math.pow(2, (cents[HarmonyWalkerModule.mod(m, N)] || 0) / 1200));
  }

  // ---- Playing ----
  chordSeconds() {
    if (this.followPlaying) return this.lowerGap || 2;   // as long as the chord below lasted last time
    const beat = this.clockLive() ? this.pulseGap * 4 : 60 / this.params.tempo;
    return beat * this.params.every;
  }

  clockLive() {
    return this.clockCables > 0 && this.pulseGap > 0 && this.audioCtx.currentTime - this.lastPulse < 3;
  }

  start() {
    if (this.playing) return;
    this.userStopped = false;
    if (this.source() === 'upper' && this.followHeld.size) { this.followPlaying = false; this.followChanged(); return; }
    if (window.synthApp && synthApp.ensureAudioContextRunning) synthApp.ensureAudioContextRunning();
    this.playing = true;
    this.pending = false;
    this.setStartChord();
    this.pulses = 0;
    this.nextTime = this.audioCtx.currentTime + 0.05;
    this.ensureTimer();
    this.schedule();
    this.updatePlayButton();
  }

  ensureTimer() {
    this.arpNext = this.audioCtx.currentTime + 0.05;
    this.arpPos = 0;
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 25);
  }

  stop() {
    this.playing = false;
    // In Upper structure, Stop keeps it quiet while the chord below plays on (until Play)
    this.userStopped = this.source() === 'upper' && this.followPlaying;
    this.followPlaying = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    clearTimeout(this.noteTimer);
    this.noteBus.update([]);
    const now = this.audioCtx.currentTime;
    this.gateOut.offset.cancelScheduledValues(now);
    this.gateOut.offset.setValueAtTime(0, now);
    this.arpGateOut.offset.cancelScheduledValues(now);
    this.arpGateOut.offset.setValueAtTime(0, now);
    this.updatePlayButton();
    this.renderSteps();
    this.requestDraw();
  }

  // Own tempo: chords on the audio clock, a little ahead. With a live CLOCK the pulses drive it instead.
  schedule() {
    if (!this.playing) return;
    this.scheduleArp();
    if (this.clockLive() || this.followPlaying) return;
    const now = this.audioCtx.currentTime;
    if (this.nextTime < now - 0.2) this.nextTime = now + 0.02;   // the page was asleep
    if (this.nextTime < now + 0.1) {
      this.advance(this.nextTime);
      this.nextTime += this.chordSeconds();
    }
  }

  // ---- Arpeggiator: the chord's notes one at a time, on the beat grid (Tempo or CLOCK) ----
  beatSeconds() {
    return this.clockLive() ? this.pulseGap * 4 : 60 / this.params.tempo;
  }

  // The order of the notes for a chord of m notes spread over the Arp Octaves (index into that list)
  arpOrder(m) {
    const oct = this.params.arpOct;
    const n = m * oct;
    const up = Array.from({ length: n }, (_, k) => k);
    switch (this.params.arp) {
      case 'down': return up.slice().reverse();
      case 'updown': return n > 2 ? up.concat(up.slice(1, -1).reverse()) : up;
      case 'broken': {
        // 1 3 5 3 in every octave (with 4 notes: 1 3 5 7 5 3)
        const out = [];
        for (let o = 0; o < oct; o++) {
          const b = o * m;
          for (let k = 0; k < m; k++) out.push(b + k);
          for (let k = m - 2; k >= 1; k--) out.push(b + k);
        }
        return out;
      }
      case 'threefour': {
        // A group of three then a group of four, so the accent keeps shifting against the beat
        return [0, 1, 2, 0, 1, 2, 3].map(k => k % n);
      }
      case 'additive': {
        // 1 2, 1 2 3, 1 2 3 4 ... up to all the notes, then shorter again
        const out = [];
        for (let len = 2; len <= Math.max(2, n); len++) for (let k = 0; k < len; k++) out.push(k % n);
        for (let len = n - 1; len >= 3; len--) for (let k = 0; k < len; k++) out.push(k);
        return out;
      }
      case 'random': return [-1];
      default: return up;
    }
  }

  scheduleArp() {
    const now = this.audioCtx.currentTime;
    if (this.params.arp === 'off' || !this.arpNotes) {
      this.arpNext = now + 0.02;
      return;
    }
    if (this.arpNext < now - 0.2) this.arpNext = now + 0.02;   // the page was asleep
    while (this.arpNext < now + 0.1) {
      const dur = this.beatSeconds() / HW_ARP_RATES[this.params.arpRate];
      const list = this.arpNotes;
      const order = this.arpOrder(list.m);
      const idx = order[0] === -1 ? Math.floor(Math.random() * list.f.length) : order[this.arpPos % order.length];
      this.arpPos++;
      const t = this.arpNext;
      this.arpOut.offset.setValueAtTime(list.f[idx % list.f.length], t);
      const g = this.arpGateOut.offset;
      g.setValueAtTime(0, t);
      g.setValueAtTime(1, t + 0.002);
      g.setValueAtTime(0, t + dur * 0.5);
      this.arpNext += dur;
    }
  }

  // The notes the arpeggio uses: the chord bottom to top, repeated an octave (a period) higher
  setArpNotes(freqs) {
    const S = this.sys();
    const up = Math.pow(2, S.period / 1200);
    const f = [];
    for (let o = 0; o < this.params.arpOct; o++) freqs.forEach(x => f.push(x * Math.pow(up, o)));
    this.arpNotes = { f, m: freqs.length };
  }

  onClockPulse(time) {
    if (this.lastPulse && time - this.lastPulse < 3) this.pulseGap = time - this.lastPulse;
    this.lastPulse = time;
    if (!this.playing || !this.pulseGap) return;
    // The arpeggio lines up with the beat on every 4th pulse
    if (this.pulses % 4 === 0 && this.params.arp !== 'off') this.arpNext = Math.max(time, this.audioCtx.currentTime);
    if (this.followPlaying) { this.pulses++; return; }
    if (this.pulses % (this.params.every * 4) === 0) this.advance(Math.max(time, this.audioCtx.currentTime));
    this.pulses++;
    this.nextTime = this.audioCtx.currentTime + this.chordSeconds();   // ready if the clock stops
  }

  // The next chord from the current Source
  nextChord() {
    const src = this.source();
    if (src === 'tonnetz') {
      this.stepIndex = (this.stepIndex + 1) % this.params.length;
      let move = this.steps[this.stepIndex];
      if (move === '?') {
        const options = ['P', 'L', 'R'].filter(m => m !== this.lastMove);   // the same move twice goes back
        move = options[Math.floor(Math.random() * options.length)];
      }
      if (move === '-') return false;
      this.tri = this.transform(this.tri, move);
      this.lastMove = move;
      this.chord = this.triChord(this.tri);
      return true;
    }
    if (src === 'progression') {
      const len = (HW_PROGS[this.params.progression] || HW_PROGS.axis).chords.length;
      this.stepIndex = (this.stepIndex + 1) % len;
      this.chord = this.progChord(this.stepIndex);
      return true;
    }
    if (src === 'markov' || src === 'markov7') {
      const chances = HW_CHANCES[this.degree];
      let r = Math.random();
      let next = this.degree;
      for (const d of Object.keys(chances)) {
        r -= chances[d];
        next = parseInt(d, 10);
        if (r <= 0) break;
      }
      this.degree = next;
      this.chord = this.degreeChord(next);
      return true;
    }
    if (src === 'upper') return false;   // changes only when the followed chord does
    // Half-step graph: any neighbour except the chord just left
    const graph = HarmonyWalkerModule.graph(src);
    const here = graph.get(HarmonyWalkerModule.setKey(this.chord));
    if (!here) return false;
    const prevKey = this.history.length ? HarmonyWalkerModule.setKey(this.history[this.history.length - 1]) : null;
    const options = here.next.filter(k => k !== prevKey);
    const pickKey = options[Math.floor(Math.random() * options.length)] || here.next[0];
    const nd = graph.get(pickKey);
    this.chord = this.makeChord(nd.root, nd.q);
    return true;
  }

  // The first call (or the first after a restart) plays the start chord; every later one moves on
  advance(t) {
    if (this.voices && !this.pending) {
      const before = this.chord;
      const beforePts = this.points;
      if (this.nextChord()) {
        this.history.push(before);
        this.trail.push(beforePts);
        if (this.history.length > 8) this.history.shift();
        if (this.trail.length > 6) this.trail.shift();
        this.points = this.source() === 'tonnetz'
          ? this.triPoints(this.tri)
          : this.chordPoints(this.chord, HarmonyWalkerModule.centroid(beforePts));
      }
    }
    this.pending = false;
    this.sendChord(t, true);
  }

  sendChord(t, gate) {
    const first = !this.voices || this.voiceSys !== this.sys();
    if (first || gate) this.voiceChord(this.chord.pcs);
    const notes = this.outputNotes();
    const freqs = this.noteFreqs(notes);
    const glide = this.params.glide / 1000;
    const outs = [0, 1, notes.length - 1];   // LOW, MID, HIGH: bottom, second, top
    [this.lowOut, this.midOut, this.highOut].forEach((o, k) => {
      const f = freqs[outs[k]];
      o.offset.cancelScheduledValues(t);
      if (glide > 0 && !first && this.lastOut) {
        o.offset.setValueAtTime(this.lastOut[k], t);
        o.offset.setTargetAtTime(f, t, glide / 3);
      } else {
        o.offset.setValueAtTime(f, t);
      }
    });
    this.lastOut = outs.map(k => freqs[k]);
    this.lastFreqsAll = freqs;
    this.setArpNotes(freqs);
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
      // With Glide each voice keeps its own key (bottom to top), so a Poly Synth slides that voice
      // to the new note without playing it again; without Glide changed notes are played again
      this.noteBus.update(notes.map((m, k) => ({ midiNote: glide > 0 ? 1000 + k : m, freq: freqs[k] })), glide);
      this.shownStep = this.stepIndex;
      this.updateReadout();
      this.renderSteps();
      this.requestDraw();
    }, wait);
  }

  onInputConnected(key, connected) {
    if (key === 'follow') {
      this.followCables = Math.max(0, this.followCables + (connected ? 1 : -1));
      return;
    }
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
      </div>
      <canvas id="${this.elId('display')}" class="hw-display" width="560" height="320"></canvas>
      <div class="hw-steps" id="${this.elId('steps')}"></div>
      <div class="ports-row hw-jacks">
        ${this.def.inputs.map(p => this.renderPort(p, 'in')).join('')}
        ${this.def.outputs.filter(p => p.inline).map(p => this.renderPort(p, 'out')).join('')}
      </div>
    `;
  }

  // The row under the display: the moves (Tonnetz), the progression's chords, or the last chords played
  renderSteps() {
    const box = this.el('steps');
    if (!box) return;
    const src = this.source();
    let html = '';
    if (src === 'tonnetz') {
      for (let k = 0; k < HW_MAX_STEPS; k++) {
        const cls = ['hw-step'];
        if (k >= this.params.length) cls.push('off');
        if (this.playing && k === this.shownStep) cls.push('now');
        const label = this.steps[k] === '-' ? '–' : this.steps[k];
        html += `<button class="${cls.join(' ')}" data-step="${k}">${label}</button>`;
      }
    } else if (src === 'progression') {
      const prog = HW_PROGS[this.params.progression] || HW_PROGS.axis;
      prog.chords.forEach((c, k) => {
        const now = this.playing && k === Math.max(0, this.shownStep);
        html += `<span class="hw-step hw-chip${now ? ' now' : ''}">${this.shortName(this.progChord(k))}</span>`;
      });
    } else {
      const list = this.history.slice(-(HW_MAX_STEPS - 1)).concat(this.chord ? [this.chord] : []);
      list.forEach((c, k) => {
        const now = this.playing && k === list.length - 1;
        html += `<span class="hw-step hw-chip${now ? ' now' : ''}">${this.shortName(c)}</span>`;
      });
    }
    box.innerHTML = html;
  }

  updateReadout() {
    const el = this.el('chord');
    if (!el || !this.chord) return;
    const prev = this.history.length ? this.history[this.history.length - 1] : null;
    let text = this.playing && prev ? `${this.chordName(prev)} to ${this.chordName(this.chord)}` : this.chordName(this.chord);
    if (this.source() === 'upper' && this.lower && this.followPlaying) {
      text = `${this.chordName(this.chord)} over ${this.shortName(this.lower)}`;
    }
    const t = this.params.tuning;
    if (t !== 'equal' && t !== 'bp') {
      // How far the chord's root sits from the equal-step pitch
      const [i, j] = this.tuningPoints()[0];
      const c = Math.round(this.pointCents(i, j));
      text += ` (${c > 0 ? '+' : ''}${c} c)`;
    }
    el.textContent = text;
  }

  onMount(card) {
    card.classList.add('hw-card');
    this.lastSys = this.sys();
    this.updateEnabled();
    this.renderSteps();
    this.updateReadout();
    const play = this.el('play');
    if (play) play.addEventListener('click', () => (this.playing ? this.stop() : this.start()));
    // Picking a Movement, Steps, Progression or Upper switches Source to the one that uses it
    const follows = { movement: 'tonnetz', length: 'tonnetz', progression: 'progression', upper: 'upper' };
    Object.keys(follows).forEach(id => {
      const ctl = this.el(`p_${id}`);
      if (!ctl) return;
      ctl.addEventListener(id === 'length' ? 'input' : 'change', () => {
        if (this.params.source !== follows[id] && this.sys() !== HW_BP) this.setParam('source', follows[id]);
      });
    });
    const steps = this.el('steps');
    if (steps) steps.addEventListener('click', e => {
      const b = e.target.closest('button.hw-step');
      if (!b || this.source() !== 'tonnetz') return;   // only the Tonnetz row has buttons
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

  // The grid follows the current chord: the view glides so the lit shape stays in the middle
  draw() {
    const cv = this.el('display');
    if (!cv || !this.points) return;
    const g = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const css = getComputedStyle(this.card);
    const text = css.getPropertyValue('--text-color').trim() || '#0f172a';
    const muted = css.getPropertyValue('--muted-text').trim() || '#64748b';
    const primary = css.getPropertyValue('--primary-color').trim() || '#2563eb';
    const border = css.getPropertyValue('--panel-border').trim() || '#e2e8f0';
    const panel = css.getPropertyValue('--panel-bg').trim() || '#ffffff';
    const names = this.sys().names;
    const dx = 124, dy = dx * Math.sqrt(3) / 2;
    const pos = (i, j) => [i * dx + j * dx / 2, -j * dy];
    const centerOf = pts => {
      const p = pts.map(([i, j]) => pos(i, j));
      return [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length];
    };
    const target = centerOf(this.points);
    if (!this.cam) this.cam = target.slice();
    this.cam[0] += (target[0] - this.cam[0]) * 0.18;
    this.cam[1] += (target[1] - this.cam[1]) * 0.18;
    const moving = Math.abs(target[0] - this.cam[0]) + Math.abs(target[1] - this.cam[1]) > 0.5;
    const sx = x => x - this.cam[0] + W / 2;
    const sy = y => y - this.cam[1] + H / 2;

    g.clearRect(0, 0, W, H);
    const j0 = Math.floor(-(this.cam[1] + H / 2) / dy) - 1, j1 = Math.ceil(-(this.cam[1] - H / 2) / dy) + 1;
    // A chord's shape: its points in order around their middle
    const shape = (pts, alpha) => {
      const [cx, cy] = centerOf(pts);
      const p = pts.map(([i, j]) => pos(i, j)).sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
      g.beginPath();
      p.forEach(([x, y], k) => { if (k === 0) g.moveTo(sx(x), sy(y)); else g.lineTo(sx(x), sy(y)); });
      g.closePath();
      g.globalAlpha = alpha;
      g.fillStyle = primary;
      g.fill();
      if (pts.length > 3 || alpha > 0.5) {
        g.lineWidth = 3;
        g.strokeStyle = primary;
        g.stroke();
      }
      g.globalAlpha = 1;
    };
    this.trail.forEach((pts, k) => shape(pts, 0.08 + 0.3 * (k + 1) / (this.trail.length + 1)));
    shape(this.points, this.playing ? 0.85 : 0.55);

    // Grid lines and note names
    const lit = new Set(this.points.map(c => c.join(',')));
    // Upper structure: the followed chord's notes get a thin ring in the text color
    const below = this.source() === 'upper' && this.followPlaying && this.lowerPoints
      ? new Set(this.lowerPoints.map(c => c.join(','))) : new Set();
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
        g.fillStyle = panel;
        g.fill();
        const under = !on && below.has(`${i},${j}`);
        g.lineWidth = on ? 4 : under ? 2.5 : 1.5;
        g.strokeStyle = on ? primary : under ? text : border;
        g.stroke();
        g.font = `${on ? 'bold ' : ''}25px system-ui, sans-serif`;
        g.fillStyle = on || under ? text : muted;
        g.fillText(names[this.pc(i, j)], sx(x), sy(y) + 1);
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
