// ChoraleEditor.js - the Chorale's big editor (the Edit button on ChoraleModule.js). The piece fills the
// screen as a piano roll of the four voices. Tap a note to select it, drag it to move it in time and pitch,
// drag its right end to change its length, double-tap an empty place to add a note to the chosen voice.
// The first change freezes the piece: from then on the Chorale loops it as it is (and saves it in the
// patch) until New. With Others follow on, the voices nobody edited are written again around each
// edited note (a chord that holds the edited notes, voiced by the Chorale's own voice leading); edited
// notes are marked and never moved by it. Reset goes back to the algorithm's piece, Undo steps back.
// Longer x2 / Shorter /2 stretch the whole piece, + Bar / - Bar add or cut a bar at the end.

const CHE_LO = 36, CHE_HI = 84;   // the pitch range shown (C2 to C6)
const CHE_X0 = 44;                // the note-name strip on the left
const CHE_MAX_LEN = 1024;         // 64 bars
const CHE_LEN_NAMES = { 1: '1/16', 2: '1/8', 3: 'dotted 1/8', 4: '1/4', 6: 'dotted 1/4', 8: '1/2', 12: 'dotted 1/2', 16: 'whole', 24: 'dotted whole' };

class ChoraleEditor {
  constructor(mod) {
    this.mod = mod;
    this.voice = 3;
    this.grid = 4;
    this.follow = true;
    this.zoom = 1;
    this.sx = 0;
    this.sel = null;
    this.drag = null;
    this.lastTap = null;
    this.open = false;
  }

  // ---- The piece as data ----
  static clone(p) {
    if (!p) return null;
    return {
      len: p.len,
      part: !!p.part,
      events: p.events.map(l => l.map(e => Object.assign({}, e))),
      slots: p.slots.map(s => ({ start: s.start, dur: s.dur, chord: s.chord, v: s.v.slice(), par: (s.par || []).slice() }))
    };
  }

  // A timeline as the Chorale wrote it -> plain numbers (rests become gaps); sel: an event to follow
  static freezeTimeline(mod, tl, sel) {
    const triad = mod.partTriad(null);
    let newSel = null;
    const events = tl.events.map((list, k) => {
      const out = [];
      let lastT = null;
      list.forEach(e => {
        let m = e.midi;
        if (m && typeof m === 'object') {
          if (m.drone) m = mod.resolve(m, 0);
          else if (m.tint != null) m = mod.tintNote(m.tint, m.i, lastT, triad);
          else m = null;
        }
        if (m == null) return;
        if (k === 2) lastT = m;
        const n = { start: e.start, len: e.len, midi: m };
        if (e === sel) newSel = n;
        out.push(n);
      });
      return out;
    });
    const slots = tl.slots.map(s => ({ start: s.start, dur: s.dur, chord: s.chord, v: s.v.slice(), par: [] }));
    const piece = { len: tl.len, part: !!tl.part, events, slots };
    ChoraleEditor.refreshSlots(mod, piece);
    return { piece, sel: newSel };
  }

  // For the saved patch: [start, len, midi, edited] per note, [start, dur, pcs, degree, name] per chord
  static pack(p) {
    if (!p) return null;
    return {
      len: p.len,
      part: p.part ? 1 : 0,
      ev: p.events.map(l => l.map(e => [e.start, e.len, e.midi, e.lock ? 1 : 0])),
      sl: p.slots.map(s => [s.start, s.dur, s.chord.pcs.slice(), s.chord.deg == null ? null : s.chord.deg, s.chord.label])
    };
  }

  static unpack(mod, d) {
    const num = x => typeof x === 'number' && isFinite(x);
    if (!d || !Array.isArray(d.ev) || d.ev.length !== 4 || !num(d.len) || d.len <= 0 || d.len > CHE_MAX_LEN) return null;
    const events = d.ev.map(l => (Array.isArray(l) ? l : [])
      .filter(e => Array.isArray(e) && num(e[0]) && num(e[1]) && num(e[2]) && e[1] > 0 && e[0] >= 0 && e[0] < d.len)
      .map(e => {
        const n = { start: e[0], len: Math.min(e[1], d.len - e[0]), midi: Math.max(CHE_LO, Math.min(CHE_HI, Math.round(e[2]))) };
        if (e[3]) n.lock = true;
        return n;
      })
      .sort((a, b) => a.start - b.start));
    const slots = (Array.isArray(d.sl) ? d.sl : [])
      .filter(s => Array.isArray(s) && num(s[0]) && num(s[1]) && s[0] >= 0 && s[0] < d.len && Array.isArray(s[2]) && s[2].length && s[2].every(num))
      .map(s => {
        const chord = mod.makeChord(s[2].slice(0, 4).map(x => ChoraleModule.mod(Math.round(x), 12)), num(s[3]) ? s[3] : null);
        if (typeof s[4] === 'string') chord.label = s[4].slice(0, 12);
        return { start: s[0], dur: s[1], chord, v: [null, null, null, null], par: [] };
      })
      .sort((a, b) => a.start - b.start);
    if (!slots.length || slots[0].start > 0) slots.unshift({ start: 0, dur: slots.length ? slots[0].start : d.len, chord: mod.degreeChord(0), v: [null, null, null, null], par: [] });
    const p = { len: d.len, part: !!d.part, events, slots };
    ChoraleEditor.refreshSlots(mod, p);
    return p;
  }

  static pitchAt(list, t) {
    const e = list.find(n => n.start <= t + 1e-6 && t + 1e-6 < n.start + n.len);
    return e ? e.midi : null;
  }

  // The pitch at t, or after a rest the last one sung before it (for smooth voice leading)
  static pitchNear(list, t) {
    const m = ChoraleEditor.pitchAt(list, t);
    if (m != null) return m;
    const before = list.filter(n => n.start <= t + 1e-6);
    return before.length ? before[before.length - 1].midi : (list.length ? list[0].midi : null);
  }

  // Each chord's voicing (what every voice sings where it starts) and its parallels, after a change
  static refreshSlots(mod, p) {
    p.slots.forEach((s, i) => {
      s.v = p.events.map(l => ChoraleEditor.pitchAt(l, s.start));
      s.par = i ? mod.parallelsBetween(p.slots[i - 1].v, s.v) : [];
    });
  }

  // A voice sings one note at a time: a placed note cuts what it covers (a longer note around it splits)
  static place(list, n) {
    const end = n.start + n.len;
    for (let i = list.length - 1; i >= 0; i--) {
      const o = list[i];
      if (o === n) continue;
      const oe = o.start + o.len;
      if (oe <= n.start + 1e-6 || o.start >= end - 1e-6) continue;
      if (o.start < n.start) {
        o.len = n.start - o.start;
        if (oe > end + 1e-6) list.push(Object.assign({}, o, { start: end, len: oe - end }));
      } else if (oe > end + 1e-6) {
        o.len = oe - end;
        o.start = end;
      } else {
        list.splice(i, 1);
      }
    }
    if (!list.includes(n)) list.push(n);
    list.sort((a, b) => a.start - b.start);
  }

  // Notes the Chorale wrote that now touch on the same pitch become one
  static mergeTies(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const a = list[i - 1], b = list[i];
      if (!a.lock && !b.lock && a.midi === b.midi && Math.abs(a.start + a.len - b.start) < 1e-6) {
        a.len += b.len;
        list.splice(i, 1);
      }
    }
  }

  // ---- Opening and closing ----
  show() {
    const mod = this.mod;
    if (!mod.fixed && !mod.timeline) {
      mod.timeline = mod.buildTimeline();
      mod.tick = 0;
    }
    if (!this.piece()) return;
    if (!this.el) this.build();
    document.body.appendChild(this.el);
    this.open = true;
    this.sel = null;
    window.addEventListener('keydown', this.onKey, true);
    window.addEventListener('resize', this.onResize);
    this.updateBar();
    this.layout();
    if (window.ResizeObserver && !this.ro) {
      this.ro = new ResizeObserver(() => this.layout());
      this.ro.observe(this.area);
    }
  }

  close() {
    if (!this.open) return;
    this.open = false;
    this.stopAudition();
    window.removeEventListener('keydown', this.onKey, true);
    window.removeEventListener('resize', this.onResize);
    if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
    this.mod.requestDraw();
  }

  piece() {
    return this.mod.fixed || this.mod.timeline;
  }

  build() {
    const voices = [3, 2, 1, 0].map(k => `<button class="action-btn che-btn che-voice" data-v="${k}">${CH_VOICE_NAMES[k]}</button>`).join('');
    const lens = [[1, '1/16'], [2, '1/8'], [4, '1/4'], [8, '1/2'], [16, 'Whole']]
      .map(([v, n]) => `<button class="action-btn che-btn" data-len="${v}">${n}</button>`).join('');
    const el = document.createElement('div');
    el.className = 'che-overlay';
    el.innerHTML = `
      <div class="che-bar">
        <button class="action-btn che-btn che-play" data-a="play">Play</button>
        <button class="action-btn che-btn" data-a="undo">Undo</button>
        <button class="action-btn che-btn" data-a="reset">Reset</button>
        <button class="action-btn che-btn" data-a="new">New</button>
        <span class="che-gap"></span>
        ${voices}
        <button class="action-btn che-btn" data-a="mute">Mute</button>
        <span class="che-gap"></span>
        <button class="action-btn che-btn" data-a="follow">Others follow: On</button>
        <label class="che-label">Grid
          <select class="control-select che-grid">
            <option value="1">1/16</option><option value="2">1/8</option><option value="4" selected>1/4</option>
            <option value="8">1/2</option><option value="0.25">Free</option>
          </select>
        </label>
        <span class="che-gap"></span>
        <button class="action-btn che-btn" data-a="x2">Longer x2</button>
        <button class="action-btn che-btn" data-a="half">Shorter /2</button>
        <button class="action-btn che-btn" data-a="addbar">+ Bar</button>
        <button class="action-btn che-btn" data-a="cutbar">- Bar</button>
        <span class="che-gap"></span>
        <button class="action-btn che-btn" data-a="zoomout">Zoom -</button>
        <button class="action-btn che-btn" data-a="zoomin">Zoom +</button>
        <button class="action-btn che-btn che-done" data-a="close">Done</button>
      </div>
      <div class="che-bar che-selbar">
        <span class="che-info"></span>
        ${lens}
        <button class="action-btn che-btn" data-len="dot">Dotted</button>
        <span class="che-gap"></span>
        <button class="action-btn che-btn" data-a="up">Up</button>
        <button class="action-btn che-btn" data-a="down">Down</button>
        <button class="action-btn che-btn" data-a="octup">Oct up</button>
        <button class="action-btn che-btn" data-a="octdown">Oct down</button>
        <button class="action-btn che-btn" data-a="delete">Delete</button>
      </div>
      <div class="che-area"><canvas class="che-canvas"></canvas></div>
      <input type="range" class="che-scroll" min="0" max="1000" value="0" step="1">
    `;
    this.el = el;
    this.cv = el.querySelector('.che-canvas');
    this.area = el.querySelector('.che-area');
    this.scrollEl = el.querySelector('.che-scroll');
    this.info = el.querySelector('.che-info');
    // Keep the workspace from seeing what happens in here
    ['pointerdown', 'mousedown', 'touchstart', 'wheel', 'click', 'dblclick', 'contextmenu'].forEach(type => {
      el.addEventListener(type, e => e.stopPropagation());
    });
    el.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      if (b.dataset.v != null) { this.voice = parseInt(b.dataset.v, 10); this.updateBar(); this.requestDraw(); return; }
      if (b.dataset.len) { this.setLength(b.dataset.len); return; }
      this.action(b.dataset.a);
    });
    el.querySelector('.che-grid').addEventListener('change', e => { this.grid = parseFloat(e.target.value); this.requestDraw(); });
    this.scrollEl.addEventListener('input', () => {
      this.sx = parseFloat(this.scrollEl.value) / 1000 * this.maxScroll();
      this.requestDraw();
    });
    this.cv.addEventListener('pointerdown', e => this.down(e));
    this.cv.addEventListener('pointermove', e => this.move(e));
    this.cv.addEventListener('pointerup', e => this.up(e));
    this.cv.addEventListener('pointercancel', e => this.up(e));
    this.cv.addEventListener('wheel', e => {
      e.preventDefault();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      this.scrollTo(this.sx + d);
    }, { passive: false });
    this.onKey = e => this.key(e);
    this.onResize = () => this.layout();
  }

  layout() {
    if (!this.open) return;
    const r = this.area.getBoundingClientRect();
    this.w = Math.max(200, r.width);
    this.h = Math.max(160, r.height);
    const dpr = window.devicePixelRatio || 1;
    this.cv.width = Math.round(this.w * dpr);
    this.cv.height = Math.round(this.h * dpr);
    this.cv.style.width = `${this.w}px`;
    this.cv.style.height = `${this.h}px`;
    this.dpr = dpr;
    this.scrollTo(this.sx);
  }

  // ---- Geometry ----
  ppt() {
    const p = this.piece();
    const len = p ? p.len : 64;
    return Math.max(10, (this.w - CHE_X0 - 12) / len) * this.zoom;
  }

  maxScroll() {
    const p = this.piece();
    return Math.max(0, CHE_X0 + (p ? p.len : 0) * this.ppt() + 12 - this.w);
  }

  scrollTo(x) {
    const max = this.maxScroll();
    this.sx = Math.max(0, Math.min(max, x));
    if (this.scrollEl) {
      this.scrollEl.style.visibility = max > 0 ? 'visible' : 'hidden';
      this.scrollEl.value = max > 0 ? String(Math.round(this.sx / max * 1000)) : '0';
    }
    this.requestDraw();
  }

  rowH() {
    return (this.h - 6 - 30) / (CHE_HI - CHE_LO + 1);
  }

  X(t) { return CHE_X0 + t * this.ppt() - this.sx; }
  Y(m) { return 6 + (CHE_HI - m) * this.rowH(); }
  tickAt(x) { return (x - CHE_X0 + this.sx) / this.ppt(); }
  midiAt(y) { return Math.max(CHE_LO, Math.min(CHE_HI, CHE_HI - Math.floor((y - 6) / this.rowH()))); }

  snap(t) {
    const g = this.grid || 0.25;
    return Math.round(t / g) * g;
  }

  // ---- Editing ----
  // Before any change: remember the state for Undo, and freeze the piece if it is still the Chorale's own
  begin() {
    const mod = this.mod;
    mod.undoStack.push({ f: ChoraleEditor.pack(mod.fixed), o: ChoraleEditor.pack(mod.fixedOriginal) });
    if (mod.undoStack.length > 60) mod.undoStack.shift();
    if (!mod.fixed) {
      const tl = mod.timeline;
      const a = ChoraleEditor.freezeTimeline(mod, tl, this.sel);
      const b = ChoraleEditor.freezeTimeline(mod, tl, null);
      mod.fixed = a.piece;
      mod.fixedOriginal = b.piece;
      if (this.sel) this.sel = a.sel;
      if (mod.tick >= mod.fixed.len) mod.tick = 0;
    }
  }

  // After a change: chord voicings, the card, the readout
  done() {
    const mod = this.mod;
    if (mod.fixed) ChoraleEditor.refreshSlots(mod, mod.fixed);
    mod.updateReadout();
    mod.requestDraw();
    this.updateBar();
  }

  voiceOf(n) {
    const p = this.piece();
    return p ? p.events.findIndex(l => l.includes(n)) : -1;
  }

  // An edited note goes in its place; with Others follow the other voices are written around it
  commit(k, n) {
    const p = this.mod.fixed;
    n.lock = true;
    ChoraleEditor.place(p.events[k], n);
    if (this.follow) {
      if (p.part) this.followPart(k, n);
      else this.followChorale(k, n);
    }
    this.done();
  }

  // The chord that holds the notes that must stay (pcs), the one before if it still fits
  chooseChord(pcs, old) {
    const mod = this.mod;
    if (!pcs.length || pcs.every(pc => old.pcs.includes(pc))) return old;
    const cands = [];
    for (let d = 0; d < 7; d++) {
      [false, true].forEach(cad => {
        cands.push({ ch: mod.degreeChord(d, { cadence: cad }), extra: d === old.deg ? 0 : 0.3 });
        if (d === 4 || d === 1) cands.push({ ch: mod.degreeChord(d, { seventh: true, cadence: cad }), extra: 0.8 });
      });
    }
    for (let r = 0; r < 12; r++) {
      [4, 3].forEach(third => cands.push({ ch: mod.makeChord([r, (r + third) % 12, (r + 7) % 12]), extra: 2.5 }));
    }
    const scale = mod.scalePcs(true);
    let best = null;
    cands.forEach(c => {
      const miss = pcs.filter(pc => !c.ch.pcs.includes(pc)).length;
      // Outside the key: the fewer foreign notes the better (A major for a C# in C major)
      let cost = miss * 10 + c.extra + c.ch.pcs.filter(pc => !scale.includes(pc)).length * 0.6;
      if (c.ch.q === 'dim' || c.ch.q === 'aug') cost += 1.5;
      if (!best || cost < best.cost) best = { ch: c.ch, cost };
    });
    return best.ch;
  }

  // Chorale styles: the chord slots under the edited note get a chord that holds it (and the other notes
  // that must stay), and the free voices sing that chord, voiced from the chord before
  followChorale(k, n) {
    const mod = this.mod;
    const p = mod.fixed;
    const s = n.start, e = n.start + n.len;
    // A note that starts inside a chord starts a new one
    const inside = p.slots.findIndex(sl => sl.start < s - 1e-6 && sl.start + sl.dur > s + 1e-6);
    if (inside >= 0) {
      const sl = p.slots[inside];
      const rest = sl.start + sl.dur - s;
      sl.dur = s - sl.start;
      p.slots.splice(inside + 1, 0, { start: s, dur: rest, chord: sl.chord, v: sl.v.slice(), par: [] });
    }
    const melody = mod.params.source === 'melody';
    p.slots.forEach((sl, i) => {
      const end = sl.start + sl.dur;
      if (sl.start >= e - 1e-6 || end <= s + 1e-6) return;
      const kept = [0, 1, 2, 3].map(v => v === k || (melody && v === 3)
        || p.events[v].some(x => x.lock && x.start < end - 1e-6 && x.start + x.len > sl.start + 1e-6));
      const at = Math.max(sl.start, s);
      const fixed = [0, 1, 2, 3].map(v => (kept[v] ? ChoraleEditor.pitchAt(p.events[v], v === k ? at : sl.start) : null));
      if (kept.every(Boolean)) return;
      const pcs = fixed.filter(m => m != null).map(m => ChoraleModule.mod(m, 12));
      const chord = this.chooseChord(pcs, sl.chord);
      const prevSl = p.slots[i - 1];
      let prev = prevSl ? p.events.map(l => ChoraleEditor.pitchNear(l, prevSl.start)) : null;
      if (prev && prev.some(m => m == null)) prev = null;
      const v = mod.lead(prev, chord, { fixed, prevChord: prevSl ? prevSl.chord : null, steady: true });
      sl.chord = chord;
      for (let f = 0; f < 4; f++) {
        if (kept[f]) continue;
        ChoraleEditor.place(p.events[f], { start: sl.start, len: sl.dur, midi: v[f] });
      }
    });
    for (let f = 0; f < 4; f++) ChoraleEditor.mergeTies(p.events[f]);
  }

  // Arvo Part: a melody (soprano) note brings its tintinnabuli note (alto) and its mirror (tenor) along
  followPart(k, n) {
    if (k !== 3) return;
    const mod = this.mod;
    const p = mod.fixed;
    const i = p.events[3].filter(x => x.start < n.start).length;
    const triad = mod.partTriad(null);
    const lastT = ChoraleEditor.pitchAt(p.events[2], n.start - 0.01);
    const alto = mod.tintNote(n.midi, i, lastT, triad);
    const tenor = mod.partFromLine([{ start: 0, len: 1, midi: n.midi }], 1, false).events[1][0].midi;
    [[2, alto], [1, tenor]].forEach(([v, m]) => {
      const list = p.events[v];
      if (list.some(x => x.lock && x.start < n.start + n.len && x.start + x.len > n.start)) return;
      ChoraleEditor.place(list, { start: n.start, len: n.len, midi: m });
      ChoraleEditor.mergeTies(list);
    });
  }

  setLength(which) {
    const n = this.sel;
    if (!n) return;
    this.begin();
    const sel = this.sel;
    const k = this.voiceOf(sel);
    const p = this.mod.fixed;
    const len = which === 'dot' ? sel.len * 1.5 : parseFloat(which);
    sel.len = Math.max(0.25, Math.min(len, p.len - sel.start));
    this.commit(k, sel);
  }

  transpose(d) {
    if (!this.sel) return;
    this.begin();
    const sel = this.sel;
    const k = this.voiceOf(sel);
    sel.midi = Math.max(CHE_LO, Math.min(CHE_HI, sel.midi + d));
    this.audition(k, sel.midi, 0.35);
    this.commit(k, sel);
  }

  deleteSel() {
    if (!this.sel) return;
    this.begin();
    const k = this.voiceOf(this.sel);
    if (k >= 0) this.mod.fixed.events[k].splice(this.mod.fixed.events[k].indexOf(this.sel), 1);
    this.sel = null;
    this.done();
  }

  addNote(t, midi) {
    const p = this.piece();
    const g = this.grid >= 1 ? this.grid : 1;
    const start = Math.max(0, Math.min(p.len - 0.25, Math.floor(t / (this.grid || 0.25)) * (this.grid || 0.25)));
    this.begin();
    const n = { start, len: Math.min(g, this.mod.fixed.len - start), midi };
    this.sel = n;
    this.audition(this.voice, midi, 0.35);
    this.commit(this.voice, n);
  }

  // Augmentation (x2) / diminution (/2) of the whole piece
  stretch(f) {
    this.begin();
    const p = this.mod.fixed;
    p.len *= f;
    p.events.forEach(l => l.forEach(e => { e.start *= f; e.len *= f; }));
    p.slots.forEach(s => { s.start *= f; s.dur *= f; });
    this.mod.tick = Math.floor(this.mod.tick * f);
    if (this.mod.tick >= p.len) this.mod.tick = 0;
    this.done();
    this.scrollTo(this.sx * f);
  }

  // A new bar written by the Chorale, going on from where the piece ends
  addBar() {
    const mod = this.mod;
    this.begin();
    const p = mod.fixed;
    const saved = [mod.lastVoicing, mod.lastChord, mod.phraseNo, mod.partCount];
    let tl;
    if (p.part) {
      tl = mod.partPhrase();
    } else {
      const last = p.slots[p.slots.length - 1];
      const v = p.events.map(l => ChoraleEditor.pitchAt(l, p.len - 0.01));
      mod.lastVoicing = v.every(m => m != null) ? v : null;
      mod.lastChord = last ? last.chord : null;
      mod.phraseNo = Math.max(1, mod.phraseNo || 0);
      tl = mod.freePhrase();
    }
    [mod.lastVoicing, mod.lastChord, mod.phraseNo, mod.partCount] = saved;
    const add = ChoraleEditor.freezeTimeline(mod, tl, null).piece;
    const off = p.len;
    add.events.forEach((l, k) => l.forEach(e => {
      if (e.start >= 16) return;
      p.events[k].push({ start: off + e.start, len: Math.min(e.len, 16 - e.start), midi: e.midi });
    }));
    add.slots.forEach(s => {
      if (s.start >= 16) return;
      p.slots.push({ start: off + s.start, dur: Math.min(s.dur, 16 - s.start), chord: s.chord, v: [], par: [] });
    });
    p.len += 16;
    p.events.forEach(l => ChoraleEditor.mergeTies(l));
    this.done();
    this.scrollTo(this.maxScroll());
  }

  cutBar() {
    const p = this.piece();
    if (!p || p.len <= 16) return;
    this.begin();
    const f = this.mod.fixed;
    const len = f.len % 16 ? Math.floor(f.len / 16) * 16 : f.len - 16;
    f.events.forEach((l, k) => {
      f.events[k] = l.filter(e => e.start < len - 1e-6);
      f.events[k].forEach(e => { e.len = Math.min(e.len, len - e.start); });
    });
    f.slots = f.slots.filter(s => s.start < len - 1e-6);
    f.slots.forEach(s => { s.dur = Math.min(s.dur, len - s.start); });
    f.len = len;
    if (this.sel && this.voiceOf(this.sel) < 0) this.sel = null;
    if (this.mod.tick >= len) this.mod.tick = 0;
    this.done();
    this.scrollTo(this.sx);
  }

  undo() {
    const mod = this.mod;
    const s = mod.undoStack.pop();
    if (!s) return;
    mod.fixed = ChoraleEditor.unpack(mod, s.f);
    mod.fixedOriginal = ChoraleEditor.unpack(mod, s.o);
    if (!mod.fixed && !mod.timeline) mod.timeline = mod.buildTimeline();
    this.sel = null;
    if (mod.tick >= (this.piece() ? this.piece().len : 0)) mod.tick = 0;
    this.done();
    this.scrollTo(this.sx);
  }

  // Back to the algorithm's own piece (still looped as it is)
  reset() {
    const mod = this.mod;
    if (!mod.fixedOriginal) return;
    mod.undoStack.push({ f: ChoraleEditor.pack(mod.fixed), o: ChoraleEditor.pack(mod.fixedOriginal) });
    mod.fixed = ChoraleEditor.clone(mod.fixedOriginal);
    this.sel = null;
    if (mod.tick >= mod.fixed.len) mod.tick = 0;
    this.done();
    this.scrollTo(this.sx);
  }

  // Let the Chorale write a new piece with its current settings
  newPiece() {
    const mod = this.mod;
    mod.undoStack.push({ f: ChoraleEditor.pack(mod.fixed), o: ChoraleEditor.pack(mod.fixedOriginal) });
    mod.fixed = null;
    mod.fixedOriginal = null;
    mod.timeline = mod.buildTimeline();
    mod.tick = 0;
    this.sel = null;
    this.done();
    this.scrollTo(0);
  }

  action(a) {
    const mod = this.mod;
    const p = this.piece();
    switch (a) {
      case 'play': if (mod.playing) mod.stop(); else mod.start(); break;
      case 'undo': this.undo(); break;
      case 'reset': this.reset(); break;
      case 'new': this.newPiece(); break;
      case 'mute':
        mod.muted[this.voice] = !mod.muted[this.voice];
        if (mod.muted[this.voice] && mod.playing) mod.setVoice(this.voice, null, mod.audioCtx.currentTime, true);
        break;
      case 'follow': this.follow = !this.follow; break;
      case 'x2': if (p && p.len * 2 <= CHE_MAX_LEN) this.stretch(2); break;
      case 'half': if (p && p.len >= 8) this.stretch(0.5); break;
      case 'addbar': if (p && p.len + 16 <= CHE_MAX_LEN) this.addBar(); break;
      case 'cutbar': this.cutBar(); break;
      case 'zoomin': this.zoomBy(1.5); break;
      case 'zoomout': this.zoomBy(1 / 1.5); break;
      case 'up': this.transpose(1); break;
      case 'down': this.transpose(-1); break;
      case 'octup': this.transpose(12); break;
      case 'octdown': this.transpose(-12); break;
      case 'delete': this.deleteSel(); break;
      case 'close': this.close(); return;
      default: return;
    }
    this.updateBar();
    this.requestDraw();
  }

  zoomBy(f) {
    const mid = this.tickAt(this.w / 2);
    this.zoom = Math.max(0.25, Math.min(6, this.zoom * f));
    this.scrollTo(CHE_X0 + mid * this.ppt() - this.w / 2);
  }

  key(e) {
    if (!this.open) return;
    const t = e.target;
    if (t && t.tagName === 'SELECT') return;
    let handled = true;
    if (e.key === 'Escape') this.close();
    else if (e.key === 'Delete' || e.key === 'Backspace') this.deleteSel();
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') this.undo();
    else if (e.key === 'ArrowUp') this.transpose(e.shiftKey ? 12 : 1);
    else if (e.key === 'ArrowDown') this.transpose(e.shiftKey ? -12 : -1);
    else handled = false;
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
      this.updateBar();
      this.requestDraw();
    }
  }

  // ---- Hearing a note while it is moved (when the Chorale is not playing) ----
  audition(k, midi, release) {
    const mod = this.mod;
    if (mod.playing) return;
    if (window.synthApp && synthApp.ensureAudioContextRunning) synthApp.ensureAudioContextRunning();
    const t = mod.audioCtx.currentTime;
    mod.setVoice(k, midi, t, true);
    this.auditioning = k;
    clearTimeout(this.auditionTimer);
    if (release) this.auditionTimer = setTimeout(() => this.stopAudition(), release * 1000);
  }

  stopAudition() {
    clearTimeout(this.auditionTimer);
    const mod = this.mod;
    if (this.auditioning == null || mod.playing) { this.auditioning = null; return; }
    mod.setVoice(this.auditioning, null, mod.audioCtx.currentTime);
    this.auditioning = null;
  }

  // ---- Pointer ----
  hit(x, y) {
    const p = this.piece();
    if (!p) return null;
    const rh = this.rowH();
    const pad = Math.max(0, (18 - rh) / 2);
    const order = [this.voice].concat([3, 2, 1, 0].filter(k => k !== this.voice));
    for (const k of order) {
      for (const n of p.events[k]) {
        if (typeof n.midi !== 'number') continue;
        const x0 = this.X(n.start), x1 = this.X(n.start + n.len);
        const y0 = this.Y(n.midi);
        if (x >= x0 - 2 && x <= x1 + 6 && y >= y0 - pad && y <= y0 + rh + pad) {
          const edge = x >= x1 - Math.min(14, (x1 - x0) / 3);
          return { k, n, edge };
        }
      }
    }
    return null;
  }

  pos(e) {
    const r = this.cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  down(e) {
    if (this.drag) return;
    e.preventDefault();
    const { x, y } = this.pos(e);
    try { this.cv.setPointerCapture(e.pointerId); } catch (err) {}
    const h = x > CHE_X0 ? this.hit(x, y) : null;
    if (h) {
      this.sel = h.n;
      this.voice = h.k;
      this.drag = { mode: h.edge ? 'len' : 'move', id: e.pointerId, k: h.k, cx: e.clientX, cy: e.clientY, start: h.n.start, len: h.n.len, midi: h.n.midi, moved: false };
      this.audition(h.k, h.n.midi, 0);
      this.updateBar();
      this.requestDraw();
      return;
    }
    const now = performance.now();
    const lt = this.lastTap;
    if (lt && now - lt.t < 400 && Math.abs(lt.x - x) < 24 && Math.abs(lt.y - y) < 24 && x > CHE_X0) {
      this.lastTap = null;
      this.addNote(this.tickAt(x), this.midiAt(y));
      return;
    }
    this.lastTap = { t: now, x, y };
    this.drag = { mode: 'pan', id: e.pointerId, cx: e.clientX, sx: this.sx, moved: false };
  }

  move(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.cx, dy = e.clientY - (d.cy || 0);
    if (!d.moved && Math.abs(dx) + Math.abs(d.mode === 'pan' ? 0 : dy) < 5) return;
    if (d.mode === 'pan') {
      d.moved = true;
      this.scrollTo(d.sx - dx);
      return;
    }
    if (!d.moved) {
      d.moved = true;
      this.begin();   // freezes the piece: this.sel is now the frozen copy of the note
    }
    const n = this.sel;
    const p = this.mod.fixed;
    if (!n) return;
    const ppt = this.ppt();
    if (d.mode === 'move') {
      n.start = Math.max(0, Math.min(p.len - n.len, this.snap(d.start + dx / ppt)));
      const m = Math.max(CHE_LO, Math.min(CHE_HI, d.midi - Math.round(dy / this.rowH())));
      if (m !== n.midi) { n.midi = m; this.audition(d.k, m, 0); }
    } else {
      const g = this.grid || 0.25;
      const end = Math.max(n.start + g, Math.min(p.len, this.snap(d.start + d.len + dx / ppt)));
      n.len = end - n.start;
    }
    this.updateInfo();
    this.requestDraw();
    this.mod.requestDraw();
  }

  up(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this.drag = null;
    this.stopAudition();
    if (d.mode === 'pan') {
      if (!d.moved && this.sel) { this.sel = null; this.updateBar(); this.requestDraw(); }
      return;
    }
    if (d.moved && this.sel) this.commit(d.k, this.sel);
    this.requestDraw();
  }

  // ---- The bars of buttons ----
  updateBar() {
    if (!this.el) return;
    const mod = this.mod;
    const p = this.piece();
    const q = s => this.el.querySelector(s);
    const following = mod.follower && mod.follower.connected;
    const play = q('[data-a="play"]');
    play.textContent = following ? 'CLOCK' : mod.playing ? 'Stop' : 'Play';
    play.disabled = !!following;
    play.classList.toggle('active', mod.playing);
    q('[data-a="undo"]').disabled = !mod.undoStack.length;
    q('[data-a="reset"]').disabled = !mod.fixedOriginal;
    this.el.querySelectorAll('.che-voice').forEach(b => b.classList.toggle('active', parseInt(b.dataset.v, 10) === this.voice));
    const mute = q('[data-a="mute"]');
    mute.classList.toggle('active', mod.muted[this.voice]);
    mute.textContent = `Mute ${CH_VOICE_NAMES[this.voice]}`;
    const follow = q('[data-a="follow"]');
    follow.textContent = `Others follow: ${this.follow ? 'On' : 'Off'}`;
    follow.classList.toggle('active', this.follow);
    q('[data-a="x2"]').disabled = !p || p.len * 2 > CHE_MAX_LEN;
    q('[data-a="half"]').disabled = !p || p.len < 8;
    q('[data-a="addbar"]').disabled = !p || p.len + 16 > CHE_MAX_LEN;
    q('[data-a="cutbar"]').disabled = !p || p.len <= 16;
    this.el.querySelectorAll('.che-selbar button').forEach(b => { b.disabled = !this.sel; });
    this.updateInfo();
  }

  updateInfo() {
    if (!this.info) return;
    const n = this.sel;
    if (!n) {
      this.info.textContent = 'Tap a note to select it. Drag it to move it, drag its right end to change its length. Double-tap an empty place to add a note.';
      this.info.classList.add('che-hint');
      return;
    }
    this.info.classList.remove('che-hint');
    const k = this.voiceOf(n);
    const name = `${CH_NAMES[ChoraleModule.mod(n.midi, 12)]}${Math.floor(n.midi / 12) - 1}`;
    const len = CHE_LEN_NAMES[n.len] || `${+(n.len).toFixed(2)} sixteenths`;
    this.info.textContent = `${k >= 0 ? CH_VOICE_NAMES[k] : ''} ${name}, ${len}`;
  }

  // ---- Drawing ----
  requestDraw() {
    if (!this.open || this.drawPending) return;
    this.drawPending = true;
    requestAnimationFrame(() => {
      this.drawPending = false;
      if (this.open) { this.updatePlayState(); this.draw(); }
    });
  }

  updatePlayState() {
    const play = this.el && this.el.querySelector('[data-a="play"]');
    const mod = this.mod;
    if (!play) return;
    const following = mod.follower && mod.follower.connected;
    const text = following ? 'CLOCK' : mod.playing ? 'Stop' : 'Play';
    if (play.textContent !== text) this.updateBar();
  }

  draw() {
    const mod = this.mod;
    const p = this.piece();
    const g = this.cv.getContext('2d');
    const W = this.w, H = this.h;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const css = getComputedStyle(this.el);
    const text = css.getPropertyValue('--text-color').trim() || '#0f172a';
    const muted = css.getPropertyValue('--muted-text').trim() || '#64748b';
    const primary = css.getPropertyValue('--primary-color').trim() || '#2563eb';
    const border = css.getPropertyValue('--panel-border').trim() || '#e2e8f0';
    const subtle = css.getPropertyValue('--subtle-bg').trim() || '#f1f5f9';
    const bg = css.getPropertyValue('--panel-bg').trim() || '#ffffff';
    const colors = [text, '#10b981', '#f59e0b', primary];
    const rh = this.rowH();
    const bottom = this.Y(CHE_LO) + rh;
    g.clearRect(0, 0, W, H);
    if (!p) return;
    const ppt = this.ppt();
    const xEnd = this.X(p.len);
    // Rows: the notes of the key lightly shaded
    const scale = mod.scalePcs(true);
    g.fillStyle = subtle;
    for (let m = CHE_LO; m <= CHE_HI; m++) {
      if (scale.includes(ChoraleModule.mod(m, 12))) g.fillRect(CHE_X0, this.Y(m), Math.max(0, xEnd - CHE_X0), rh);
    }
    // Time lines: grid, beats, bars
    const step = this.grid >= 1 ? this.grid : 1;
    for (let t = 0; t <= p.len + 1e-6; t += step) {
      const x = this.X(t);
      if (x < CHE_X0 || x > W) continue;
      const barLine = Math.abs(t % 16) < 1e-6, beat = Math.abs(t % 4) < 1e-6;
      if (!barLine && !beat && step * ppt < 6) continue;
      g.strokeStyle = border;
      g.globalAlpha = barLine ? 1 : beat ? 0.7 : 0.35;
      g.lineWidth = barLine ? 2 : 1;
      g.beginPath();
      g.moveTo(x, 6);
      g.lineTo(x, bottom);
      g.stroke();
    }
    g.globalAlpha = 1;
    // C lines
    g.strokeStyle = border;
    g.lineWidth = 1;
    for (let m = 36; m <= CHE_HI; m += 12) {
      g.beginPath();
      g.moveTo(CHE_X0, this.Y(m) + rh);
      g.lineTo(xEnd, this.Y(m) + rh);
      g.stroke();
    }
    // Chord names along the bottom
    g.font = 'bold 14px system-ui, sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    let lastX = -99;
    p.slots.forEach(sl => {
      const x = this.X(sl.start);
      if (x > W || this.X(sl.start + sl.dur) < CHE_X0) return;
      g.strokeStyle = border;
      g.beginPath();
      g.moveTo(x, bottom);
      g.lineTo(x, H - 2);
      g.stroke();
      if (p.part || x - lastX < 30) return;
      lastX = x;
      g.fillStyle = mod.shownSlot === sl && mod.playing ? text : muted;
      g.fillText(sl.chord.label, x + 4, H - 14);
    });
    if (p.part) {
      g.fillStyle = muted;
      g.fillText(`tintinnabuli on ${CH_NAMES[mod.tonic()]}`, CHE_X0 + 6, H - 14);
    }
    // The notes: the chosen voice in front
    const order = [0, 1, 2, 3].filter(k => k !== this.voice).concat([this.voice]);
    order.forEach(k => {
      const active = k === this.voice;
      g.globalAlpha = mod.muted[k] ? 0.15 : active ? 1 : 0.4;
      p.events[k].forEach(n => {
        let m = n.midi;
        if (m && typeof m === 'object') m = m.drone ? mod.resolve(m, 0) : m.tint != null ? mod.tintNote(m.tint, m.i, null, mod.partTriad(null)) : null;
        if (m == null) return;
        const x0 = this.X(n.start), x1 = this.X(n.start + n.len);
        if (x1 < CHE_X0 || x0 > W) return;
        const y0 = this.Y(m) + 1, hh = Math.max(3, rh - 2);
        g.fillStyle = colors[k];
        g.fillRect(x0 + 1, y0, Math.max(3, x1 - x0 - 2), hh);
        if (n.lock) {
          g.strokeStyle = text;
          g.lineWidth = 1.5;
          g.strokeRect(x0 + 1.5, y0 + 0.5, Math.max(2, x1 - x0 - 3), hh - 1);
        }
        if (n === this.sel) {
          g.globalAlpha = 1;
          g.strokeStyle = '#ef4444';
          g.lineWidth = 3;
          g.strokeRect(x0, y0 - 1.5, Math.max(4, x1 - x0), hh + 3);
          g.fillStyle = '#ef4444';
          g.fillRect(x1 - 5, y0 - 1.5, 5, hh + 3);
          g.globalAlpha = mod.muted[k] ? 0.15 : active ? 1 : 0.4;
        }
      });
    });
    g.globalAlpha = 1;
    // Parallel fifths / octaves in red
    g.strokeStyle = '#ef4444';
    g.lineWidth = 3;
    p.slots.forEach((sl, i) => (sl.par || []).forEach(([a, b]) => {
      const pv = p.slots[i - 1] && p.slots[i - 1].v;
      if (!pv) return;
      [a, b].forEach(k => {
        if (pv[k] == null || sl.v[k] == null) return;
        const x = this.X(sl.start);
        g.beginPath();
        g.moveTo(x - 12, this.Y(pv[k]) + rh / 2);
        g.lineTo(x + 12, this.Y(sl.v[k]) + rh / 2);
        g.stroke();
      });
    }));
    // The play line (and the view follows it)
    if (mod.playing && (mod.params.source !== 'chords')) {
      const t = Math.max(0, (mod.drawTick || 0) - 1) + 0.5;
      let x = this.X(t);
      if (!this.drag && (x < CHE_X0 || x > W - 20)) {
        this.sx = Math.max(0, Math.min(this.maxScroll(), CHE_X0 + t * ppt - CHE_X0 - 40));
        this.scrollTo(this.sx);
        x = this.X(t);
      }
      g.strokeStyle = text;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x, 6);
      g.lineTo(x, bottom);
      g.stroke();
    }
    // The note-name strip on the left
    g.fillStyle = bg;
    g.fillRect(0, 0, CHE_X0, H);
    g.strokeStyle = border;
    g.beginPath();
    g.moveTo(CHE_X0 - 0.5, 0);
    g.lineTo(CHE_X0 - 0.5, H);
    g.stroke();
    g.font = '12px system-ui, sans-serif';
    g.textAlign = 'right';
    for (let m = CHE_LO; m <= CHE_HI; m++) {
      const pc = ChoraleModule.mod(m, 12);
      if (pc !== 0 && (rh < 11 || ![4, 7].includes(pc))) continue;
      g.fillStyle = pc === 0 ? text : muted;
      g.fillText(`${CH_NAMES[pc]}${Math.floor(m / 12) - 1}`, CHE_X0 - 6, this.Y(m) + rh / 2);
    }
    // Voice ranges of the chosen voice, as a bracket
    const [rlo, rhi] = CH_RANGES[this.voice];
    g.fillStyle = colors[this.voice];
    g.globalAlpha = 0.6;
    g.fillRect(2, this.Y(rhi), 3, this.Y(rlo) + rh - this.Y(rhi));
    g.globalAlpha = 1;
    g.textAlign = 'left';
  }
}
