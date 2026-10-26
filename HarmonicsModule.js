// HarmonicsModule.js - the harmonic (overtone) series of one note as 8, 12 or 16 separate pure sine waves.
// Output Hn plays exactly n x the fundamental (not the nearest piano note), so every partial can be
// sent to its own Mixer channel and its fader becomes that partial's volume (additive synthesis).
// The display lists each partial's frequency, nearest note and how far it is from that note in cents.
// Built on the shared template (ModuleBase.js). Owner's idea 2026-10-25, together with Timbre.

const HARM_MAX = 16;              // sines built; the Partials buttons show 8, 12 or 16 of them
const HARM_COUNTS = [8, 12, 16];
const HARM_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
// Interval names of the partials (above the nearest lower C), shown as Mixer channel names (greyed hint)
const HARM_INTERVALS = ['Fundamental', 'Octave', 'Fifth', '2 Octaves', 'Major 3rd', 'Fifth', 'Minor 7th', '3 Octaves',
  'Major 2nd', 'Major 3rd', 'Sharp 4th', 'Fifth', 'Minor 6th', 'Minor 7th', 'Major 7th', '4 Octaves'];
const HARM_LEVEL = 0.3;   // each sine's output level, so 8 partials at full fader stay below clipping

class HarmonicsModule extends ModuleBase {
  static def = {
    type: 'harmonics',
    title: 'Harmonics',
    width: 300,
    menu: { group: 'Sound Sources', label: 'Harmonics' },
    params: [
      { id: 'note', label: 'Fundamental', min: 24, max: 84, step: 1, value: 48,
        format: v => `${HarmonicsModule.noteName(v)} (${HarmonicsModule.midiToHz(v).toFixed(1)} Hz)`,
        entry: { unit: '', step: 1, format: v => HarmonicsModule.noteName(v), parse: t => RibbonModule.parseNote(t) } }
    ],
    inputs: [
      { id: 'pitch', label: 'PITCH', signal: 'cv', title: 'Pitch Input (fundamental)',
        guide: { text: 'Plays notes. The incoming note becomes the fundamental (H1) and all the partials follow it. While a cable is in, the Fundamental slider is set aside.', from: 'Keyboard FREQ, Sequencer PITCH CV, Ribbon PITCH', match: ['keyboard:out:freq', 'sequencer:out:pitch', 'ribbon:out:pitch', 'harmony:out:low'] },
        chip: 'Keyboard FREQ' }
    ],
    outputs: Array.from({ length: HARM_MAX }, (_, i) => ({
      id: `h${i + 1}`, label: `H${i + 1}`, signal: 'audio', inline: true, title: `Partial ${i + 1} Output (${i + 1} x fundamental)`,
      guide: { text: i === 0 ? 'The fundamental itself: a pure sine at the note you play.' : `A pure sine at ${i + 1} times the fundamental. Give it its own Mixer channel: the fader sets how loud this overtone is.`,
        to: 'Mixer IN (one channel per partial)', match: ['mixer:in:ch_in', 'oscilloscope:in:audio'] },
      chip: `Mixer CH ${i + 1}`
    }))
  };

  // Mixer channel hint (app.js updateMixerHints): the interval of the partial on that cable
  getMixerHint(portInfo) {
    const m = String(portInfo.id || portInfo.type || '').match(/^h(\d+)$/);
    return m ? HARM_INTERVALS[parseInt(m[1], 10) - 1] || null : null;
  }

  static noteName(midi) {
    const m = Math.round(midi);
    return `${HARM_NOTES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
  }

  static midiToHz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  build() {
    const ctx = this.audioCtx;
    this.pitchSources = new Set();   // nodes plugged into PITCH (their offset is read for the display)
    this.shownFreq = 0;
    this.pitchIn = this.own(ctx.createGain());
    this.oscs = [];
    const t0 = ctx.currentTime + 0.01;
    this.count = 8;
    for (let n = 1; n <= HARM_MAX; n++) {
      // PITCH (in Hz) times n drives partial n, so every partial follows the played note
      const mult = this.own(ctx.createGain());
      mult.gain.value = n;
      const osc = this.own(ctx.createOscillator());
      osc.type = 'sine';
      osc.frequency.value = 0;
      const out = this.own(ctx.createGain());
      out.gain.value = HARM_LEVEL;
      this.pitchIn.connect(mult);
      mult.connect(osc.frequency);
      osc.connect(out);
      osc.start(t0);   // all start together, so the partials stay in phase (the scope shows the textbook shape)
      this.oscs.push(osc);
      this.outputNodes[`h${n}`] = out;
    }
    this.inputNodes = { pitch: this.pitchIn };
  }

  onParamChange(id) {
    if (id === 'note') this.applyBase();
  }

  // Without a PITCH cable the slider sets the fundamental; with one the oscillators' own value is 0
  // and the cable alone sets the pitch (like the Oscillator module).
  applyBase() {
    if (!this.oscs) return;
    const f = this.pitchSources.size ? 0 : HarmonicsModule.midiToHz(this.params.note);
    const now = this.audioCtx.currentTime;
    this.oscs.forEach((osc, i) => {
      osc.frequency.cancelScheduledValues(now);
      osc.frequency.setTargetAtTime(f * (i + 1), now, 0.003);
    });
    this.updateDisplay();
  }

  onInputConnected(key, connected, source) {
    if (key !== 'pitch') return;
    if (connected) this.pitchSources.add(source || this.pitchIn);
    else if (source) this.pitchSources.delete(source);
    else this.pitchSources.clear();
    const slider = this.el('p_note');
    if (slider) slider.disabled = this.pitchSources.size > 0;
    this.applyBase();
  }

  // The fundamental shown in the display: the slider, or the value of the first PITCH source that has one
  currentFundamental() {
    if (!this.pitchSources.size) return HarmonicsModule.midiToHz(this.params.note);
    for (const s of this.pitchSources) {
      if (s && s.offset && s.offset.value > 0) return s.offset.value;
    }
    return 0;
  }

  renderBody() {
    const btns = HARM_COUNTS.map(n => `<button class="action-btn module-toggle harm-count-btn${n === this.count ? ' active' : ''}" data-count="${n}">${n}</button>`).join('');
    return `<div class="harm-count"><span class="module-label">Partials</span>${btns}</div>
      <div class="harm-head"><span>n</span><span>Hz</span><span>Note</span><span>Cents</span><span></span></div>
      <div class="harm-rows" id="${this.elId('rows')}">${this.renderRows()}</div>`;
  }

  renderRows() {
    const rows = [];
    for (let n = 1; n <= this.count; n++) {
      const out = this.def.outputs[n - 1];
      rows.push(`<div class="harm-row">
          <span class="harm-n">x${n}</span>
          <span class="harm-hz" id="${this.elId(`hz_${n}`)}"></span>
          <span class="harm-note" id="${this.elId(`note_${n}`)}"></span>
          <span class="harm-cents" id="${this.elId(`cents_${n}`)}"></span>
          <div class="harm-jack">${this.renderPort(out, 'out')}</div>
        </div>`);
    }
    return rows.join('');
  }

  onMount(card) {
    card.querySelectorAll('.harm-count-btn').forEach(b => b.addEventListener('click', () => {
      const n = parseInt(b.dataset.count, 10);
      if (n !== this.count) this.setCount(n, true);
    }));
    this.updateDisplay();
    // While a PITCH cable is in, follow the played note (read a few times a second)
    this.timer = setInterval(() => {
      if (!this.pitchSources.size) return;
      const f = this.currentFundamental();
      if (Math.abs(f - this.shownFreq) > 0.05) this.updateDisplay();
    }, 120);
  }

  updateDisplay() {
    if (!this.card) return;
    const f = this.currentFundamental();
    this.shownFreq = f;
    for (let n = 1; n <= this.count; n++) {
      const hz = this.el(`hz_${n}`), note = this.el(`note_${n}`), cents = this.el(`cents_${n}`);
      if (!hz) continue;
      if (!f) { hz.textContent = '-'; note.textContent = '-'; cents.textContent = ''; continue; }
      const fn = f * n;
      const midi = 69 + 12 * Math.log2(fn / 440);
      const nearest = Math.round(midi);
      const c = Math.round((midi - nearest) * 100);
      hz.textContent = fn >= 1000 ? fn.toFixed(0) : fn.toFixed(1);
      note.textContent = HarmonicsModule.noteName(nearest);
      cents.textContent = c === 0 ? '0' : (c > 0 ? `+${c}` : `${c}`);
    }
  }

  getExtraState() { return { count: this.count }; }

  setExtraState(state) {
    const n = HARM_COUNTS.includes(state.count) ? state.count : 8;
    if (n !== this.count) this.setCount(n, false);
  }

  // Shows 8, 12 or 16 partials. Pressed by the user (fromUser), the patch follows: every Mixer
  // that H1-H8 feed gets the extra channels and cables (Hn into the channel after H(n-1)'s), new
  // faders start at the Timbre recipe (or 0), cables from partials no longer shown are removed,
  // and modules the bigger cards now cover move aside (app.makeRoomFor). From setState (patch
  // load, Undo) only the card changes: the patch brings its own cables.
  setCount(n, fromUser) {
    const app = window.synthApp;
    const old = this.count;
    const partialOf = c => { const m = String((c.fromPortInfo || {}).id || '').match(/^h(\d+)$/); return m ? parseInt(m[1], 10) : 0; };
    // Partials no longer shown lose their cables, while their jacks are still on the card
    // (the audio is unplugged through the jack, so it must exist when the cable is removed)
    const mine = app ? app.connections.filter(c => c.fromNode === this.id && partialOf(c)) : [];
    if (fromUser && app) mine.filter(c => partialOf(c) > n).forEach(c => app.deleteConnection(c));
    this.count = n;
    if (this.card) {
      this.card.querySelectorAll('.harm-count-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.count, 10) === n));
      const rows = this.el('rows');
      if (rows) rows.innerHTML = this.renderRows();
      if (app) app.bindPortEvents(this.card, this.id);
      this.updateDisplay();
    }
    if (!fromUser || !app) return;
    const channelOf = c => { const i = c.toPortInfo || {}; const m = String(i.type || '').match(/^ch_in_(\d+)$/); return parseInt(i.channel || (m && m[1]), 10) || 0; };
    // Mixers fed by this module, and the channel H1 would sit in (from any partial's cable)
    const mixers = new Map();
    mine.filter(c => partialOf(c) <= old).forEach(c => {
      const mod = app.modules[c.toNode];
      if (!mod || mod.type !== 'mixer' || !channelOf(c) || mixers.has(c.toNode)) return;
      mixers.set(c.toNode, channelOf(c) - partialOf(c));
    });
    mixers.forEach((offset, mixId) => {
      const mixer = app.getModule(mixId);
      const added = [];
      // Fewer partials: the Mixer's last channels that no cable uses any more are removed
      // (only from the end, so the channel numbers of the others stay the same)
      if (n < old) {
        const used = ch => app.connections.some(c => (c.toNode === mixId && channelOf(c) === ch) ||
          (c.fromNode === mixId && String(((c.fromPortInfo || {}).type) || '') === `ch_out_${ch}`));
        while (mixer.channelCount > Math.max(1, n + offset) && !used(mixer.channelCount)) mixer.removeLastChannel();
        if (typeof mixer.refreshTimbreCount === 'function') mixer.refreshTimbreCount();
      }
      const recipe = typeof mixer.timbreRecipe === 'function' ? mixer.timbreRecipe() : [];
      for (let k = old + 1; k <= n; k++) {
        const ch = k + offset;
        if (ch < 1) continue;
        while (mixer.channelCount < ch) mixer.addChannelUI();
        const taken = app.connections.some(c => c.toNode === mixId && channelOf(c) === ch);
        const exists = app.connections.some(c => c.fromNode === this.id && partialOf(c) === k && c.toNode === mixId);
        if (taken || exists) continue;
        // The new channel's level is set before the cable goes in, so it never sounds at full volume
        mixer.setChannelVolume(ch, Math.round((recipe[k - 1] || 0) * 100) / 100);
        const conn = { fromNode: this.id, fromPortInfo: { id: `h${k}` }, toNode: mixId, toPortInfo: { channel: String(ch), type: `ch_in_${ch}` } };
        app.connections.push(conn);
        app.connectAudio(conn);
        added.push({ ch, partial: k });
      }
      if (typeof mixer.setNewPartialFaders === 'function') mixer.setNewPartialFaders(added);
    });
    app.updatePortConnectedClasses();
    app.makeRoomFor([this.id, ...mixers.keys()]);
  }

  destroy() {
    clearInterval(this.timer);
  }
}

ModuleBase.register(HarmonicsModule);
