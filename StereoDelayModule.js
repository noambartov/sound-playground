// StereoDelayModule.js - a stereo delay with separate left / right control, reverse repeats, ping-pong,
// tempo sync from a CLOCK cable, and an echo display you can drag. The DSP runs in an AudioWorklet
// (delay-worklet.js). Built on the shared template (ModuleBase.js).

const SD_PARAMS = [
  // [id, label, min, max, step, default L, default R, format]
  ['time', 'Time', 10, 2000, 1, 375, 500, v => `${Math.round(v)} ms`],
  ['fb', 'Feedback', 0, 95, 1, 40, 40, v => `${Math.round(v)}%`],
  ['tone', 'Tone', 0, 100, 1, 60, 60, v => `${Math.round(v)}%`],
  ['level', 'Level', 0, 100, 1, 100, 100, v => `${Math.round(v)}%`],
  ['mix', 'Mix', 0, 100, 1, 35, 35, v => `${Math.round(v)}%`]
];

// Sync divisions in 16th notes
const SD_DIVS = [
  ['1', '1/16'], ['2', '1/8'], ['3', '1/8 dotted'], ['1.333', '1/8 triplet'],
  ['4', '1/4'], ['6', '1/4 dotted'], ['2.667', '1/4 triplet'], ['8', '1/2'], ['16', '1 bar']
];

const SD_SIDES = ['L', 'R'];
const SD_COLS = ['L', 'B', 'R']; // B = both sides
const SD_SPAN = 2.4;             // seconds shown across the echo display

class StereoDelayModule extends ModuleBase {
  static def = {
    type: 'delay',
    title: 'Stereo Delay',
    aliases: ['stereo_delay'],
    width: 460,
    menu: { group: 'Processors & Effects', label: 'Stereo Delay' },
    params: [],
    inputs: [
      { id: 'in_l', label: 'IN L', signal: 'audio', title: 'Left Input',
        guide: { text: 'The sound to echo, left side. If IN R is empty, this feeds both sides.', from: 'Oscillator, Filter, VCA, Drum Machine MAIN L, Mixer', match: ['oscillator:out:default', 'filter:out:default', 'vca:out:audio', 'drums:out:main_l', 'mixer:out:out_l', 'granular:out:out_l', 'audio_in:out:audio'] },
        chip: 'Osc / VCA / Drums' },
      { id: 'in_r', label: 'IN R', signal: 'audio', title: 'Right Input',
        guide: { text: 'The sound to echo, right side (optional).', from: 'Drum Machine MAIN R, Mixer OUT R, Granular OUT R', match: ['drums:out:main_r', 'mixer:out:out_r', 'granular:out:out_r'] },
        chip: 'Drums R / Mixer R' },
      { id: 'clock', label: 'CLOCK', signal: 'gate', title: 'Clock Input',
        guide: { text: 'A pulse on every 16th note. With Sync on, each side\'s Time follows this tempo and its division.', from: 'Drum Machine CLOCK, Sequencer CLOCK', match: ['drums:out:clock', 'sequencer:out:clock'] },
        chip: 'Drums / Seq CLOCK' }
    ],
    outputs: [
      { id: 'out_l', label: 'OUT L', signal: 'audio', title: 'Left Output',
        guide: { text: 'Left side: the dry sound plus its echoes (by Mix).', to: 'Output IN, Reverb IN L, Mixer, Recorder', match: ['output:in:in', 'reverb:in:in_l', 'mixer:in:ch_in', 'recorder:in:in'] },
        chip: 'Output / Reverb L' },
      { id: 'out_r', label: 'OUT R', signal: 'audio', title: 'Right Output',
        guide: { text: 'Right side: the dry sound plus its echoes (by Mix).', to: 'Output IN, Reverb IN R, Mixer', match: ['output:in:in', 'reverb:in:in_r', 'mixer:in:ch_in'] },
        chip: 'Output / Reverb R' }
    ]
  };

  build() {
    this.side = {};
    SD_SIDES.forEach((s, i) => {
      const v = {};
      SD_PARAMS.forEach(p => { v[p[0]] = p[5 + i]; });
      v.rev = false;
      v.div = i === 0 ? '3' : '4';
      this.side[s] = v;
    });
    this.pingpong = false;
    this.sync = false;
    this.clockInterval = 0;     // measured seconds per 16th
    this.lastClockAt = 0;
    this.inRCables = 0;
    this.pulses = [];           // display: input hits travelling across
    this.lastPeak = 0;
    this.lastPulseAt = 0;
    this.dragging = null;

    const ctx = this.audioCtx;
    this.inL = this.own(ctx.createGain());
    this.inR = this.own(ctx.createGain());
    this.clockIn = this.own(ctx.createGain());
    this.outL = this.own(ctx.createGain());
    this.outR = this.own(ctx.createGain());
    this.merger = this.own(ctx.createChannelMerger(2));
    this.splitter = this.own(ctx.createChannelSplitter(2));
    this.inL.connect(this.merger, 0, 0);
    this.inR.connect(this.merger, 0, 1);
    this.splitter.connect(this.outL, 0);
    this.splitter.connect(this.outR, 1);
    this.inputNodes = { in_l: this.inL, in_r: this.inR, clock: this.clockIn };
    this.outputNodes = { out_l: this.outL, out_r: this.outR };

    // Input level for the display
    this.analyser = this.own(ctx.createAnalyser());
    this.analyser.fftSize = 512;
    this.analyserBuf = new Float32Array(this.analyser.fftSize);
    this.inL.connect(this.analyser);
    this.inR.connect(this.analyser);

    StereoDelayModule.loadWorklet(ctx).then(() => {
      if (this.destroyed) return;
      this.node = new AudioWorkletNode(ctx, 'stereo-delay', {
        numberOfInputs: 2, numberOfOutputs: 1, outputChannelCount: [2],
        channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'discrete'
      });
      this.merger.connect(this.node, 0, 0);
      this.clockIn.connect(this.node, 0, 1);
      this.node.connect(this.splitter);
      this.node.port.onmessage = e => { if (e.data && e.data.clock) this.onClock(e.data.clock); };
      this.sendParams();
    }).catch(err => console.warn('[StereoDelay] worklet failed to load', err));
  }

  static loadWorklet(ctx) {
    if (!ctx.__delayWorklet) ctx.__delayWorklet = ctx.audioWorklet.addModule('delay-worklet.js?v=1');
    return ctx.__delayWorklet;
  }

  // ---- Values ----
  // Effective delay time of a side in seconds (from the clock when Sync is on and a clock is running)
  effectiveTime(s) {
    if (this.sync && this.clockInterval) return Math.min(2, this.clockInterval * parseFloat(this.side[s].div));
    return this.side[s].time / 1000;
  }

  sendParams() {
    if (!this.node) return;
    const L = this.side.L;
    const R = this.side.R;
    this.node.port.postMessage({
      time: [this.effectiveTime('L'), this.effectiveTime('R')],
      fb: [L.fb / 100, R.fb / 100],
      tone: [L.tone / 100, R.tone / 100],
      level: [L.level / 100, R.level / 100],
      mix: [L.mix / 100, R.mix / 100],
      rev: [L.rev, R.rev],
      pingpong: this.pingpong,
      monoR: this.inRCables === 0
    });
  }

  onClock(interval) {
    const changed = Math.abs(interval - this.clockInterval) > 0.002;
    this.clockInterval = interval;
    this.lastClockAt = performance.now();
    if (changed) {
      if (this.sync) this.sendParams();
      this.updateSyncUI();
    }
  }

  onInputConnected(key, connected) {
    if (key !== 'in_r') return;
    this.inRCables = Math.max(0, this.inRCables + (connected ? 1 : -1));
    this.sendParams();
  }

  // Sets a value on one side ('L' / 'R') or both ('B'), then refreshes the controls and the DSP
  setValue(col, id, value) {
    const sides = col === 'B' ? SD_SIDES : [col];
    sides.forEach(s => { this.side[s][id] = value; });
    this.sendParams();
    this.refreshControls(col === 'B' ? null : col, id);
  }

  // ---- UI ----
  cellSlider(col, p) {
    const v = this.colValue(col, p[0]);
    return `<div class="sd-cell">
        <span class="sd-readout" id="${this.elId(`v_${p[0]}_${col}`)}">${p[7](v)}</span>
        <input type="range" id="${this.elId(`p_${p[0]}_${col}`)}" min="${p[2]}" max="${p[3]}" step="${p[4]}" value="${v}" aria-label="${p[1]} ${col === 'B' ? 'Both' : col}">
      </div>`;
  }

  colValue(col, id) {
    if (col !== 'B') return this.side[col][id];
    return (this.side.L[id] + this.side.R[id]) / 2;
  }

  renderBody() {
    const head = `<div class="sd-grid sd-head"><span></span><span>Left</span><span>Both</span><span>Right</span></div>`;
    const rows = SD_PARAMS.map(p => `<div class="sd-grid"><span class="sd-name">${p[1]}</span>${SD_COLS.map(c => this.cellSlider(c, p)).join('')}</div>`).join('');
    const divOpts = sel => SD_DIVS.map(([v, l]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${l}</option>`).join('');
    const divRow = `<div class="sd-grid" id="${this.elId('divrow')}"${this.sync ? '' : ' hidden'}><span class="sd-name">Division</span>${SD_COLS.map(c =>
      `<div class="sd-cell"><select class="control-select" id="${this.elId(`div_${c}`)}">${divOpts(c === 'B' ? (this.side.L.div === this.side.R.div ? this.side.L.div : '') : this.side[c].div)}</select></div>`).join('')}</div>`;
    const revRow = `<div class="sd-grid"><span class="sd-name">Reverse</span>${SD_COLS.map(c =>
      `<div class="sd-cell"><button class="action-btn dm-small-btn sd-toggle" id="${this.elId(`rev_${c}`)}">Off</button></div>`).join('')}</div>`;
    return `
      <canvas id="${this.elId('display')}" class="sd-display" width="872" height="240"></canvas>
      <div class="sd-hint">Drag a dot: left / right sets Time, up / down sets Feedback.</div>
      ${head}${rows}${revRow}${divRow}
      <div class="sd-bottom">
        <button class="action-btn dm-small-btn sd-toggle" id="${this.elId('pingpong')}">Ping-Pong: Off</button>
        <button class="action-btn dm-small-btn sd-toggle" id="${this.elId('sync')}">Sync: Off</button>
        <span class="sd-clock" id="${this.elId('clockinfo')}">No clock</span>
      </div>
    `;
  }

  onMount(card) {
    card.classList.add('sd-card');
    const on = (name, ev, fn) => { const el = this.el(name); if (el) el.addEventListener(ev, fn); };
    SD_PARAMS.forEach(p => SD_COLS.forEach(c => on(`p_${p[0]}_${c}`, 'input', e => this.setValue(c, p[0], parseFloat(e.target.value)))));
    SD_COLS.forEach(c => {
      on(`rev_${c}`, 'click', () => {
        const next = c === 'B' ? !(this.side.L.rev && this.side.R.rev) : !this.side[c].rev;
        this.setValue(c, 'rev', next);
      });
      on(`div_${c}`, 'change', e => { if (e.target.value) this.setValue(c, 'div', e.target.value); });
    });
    on('pingpong', 'click', () => { this.pingpong = !this.pingpong; this.sendParams(); this.refreshControls(); });
    on('sync', 'click', () => { this.sync = !this.sync; this.sendParams(); this.refreshControls(); });
    this.bindDisplay();
    this.refreshControls();
    this.startDisplay();
  }

  // Brings every widget in line with the values (skipping the slider the user is moving)
  refreshControls(skipCol, skipId) {
    if (!this.card) return;
    SD_PARAMS.forEach(p => SD_COLS.forEach(c => {
      const v = this.colValue(c, p[0]);
      const sl = this.el(`p_${p[0]}_${c}`);
      if (sl && !(c === skipCol && p[0] === skipId) && document.activeElement !== sl) sl.value = String(v);
      const ro = this.el(`v_${p[0]}_${c}`);
      if (ro) ro.textContent = p[7](v);
    }));
    SD_COLS.forEach(c => {
      const on = c === 'B' ? this.side.L.rev && this.side.R.rev : this.side[c].rev;
      const btn = this.el(`rev_${c}`);
      if (btn) { btn.textContent = on ? 'On' : 'Off'; btn.classList.toggle('active', on); }
      const sel = this.el(`div_${c}`);
      if (sel) sel.value = c === 'B' ? (this.side.L.div === this.side.R.div ? this.side.L.div : '') : this.side[c].div;
    });
    const pp = this.el('pingpong');
    if (pp) { pp.textContent = `Ping-Pong: ${this.pingpong ? 'On' : 'Off'}`; pp.classList.toggle('active', this.pingpong); }
    const sy = this.el('sync');
    if (sy) { sy.textContent = `Sync: ${this.sync ? 'On' : 'Off'}`; sy.classList.toggle('active', this.sync); }
    const divRow = this.el('divrow');
    if (divRow) divRow.hidden = !this.sync;
    this.updateSyncUI();
  }

  updateSyncUI() {
    const info = this.el('clockinfo');
    const live = this.clockInterval && performance.now() - this.lastClockAt < 3000;
    if (info) info.textContent = live ? `Clock: ${Math.round(60 / (this.clockInterval * 4))} BPM` : 'No clock';
    // While synced to a running clock, the Time readouts show the synced time and the sliders rest
    SD_COLS.forEach(c => {
      const sl = this.el(`p_time_${c}`);
      const ro = this.el(`v_time_${c}`);
      const synced = this.sync && this.clockInterval;
      if (sl) sl.disabled = !!synced;
      if (ro) {
        const ms = c === 'B' ? (this.effectiveTime('L') + this.effectiveTime('R')) * 500 : this.effectiveTime(c) * 1000;
        ro.textContent = synced ? `${Math.round(ms)} ms` : `${Math.round(this.colValue(c, 'time'))} ms`;
      }
    });
  }

  // ---- Echo display ----
  // The list of echoes a single input hit makes: { side: 0 | 1, at: seconds, amp: 0..1, rev }
  echoes() {
    const T = [this.effectiveTime('L'), this.effectiveTime('R')];
    const fb = [this.side.L.fb / 100, this.side.R.fb / 100];
    const lvl = [this.side.L.level / 100, this.side.R.level / 100];
    const rev = [this.side.L.rev, this.side.R.rev];
    const list = [];
    if (this.pingpong) {
      let t = 0, amp = 1, s = 0;
      for (let k = 0; k < 24 && amp > 0.02; k++) {
        t += T[s];
        if (t > SD_SPAN) break;
        list.push({ side: s, at: t, amp: amp * lvl[s], rev: rev[s], first: k < 2 });
        amp *= fb[s];
        s = 1 - s;
      }
    } else {
      for (let s = 0; s < 2; s++) {
        let amp = 1;
        for (let k = 1; k < 40 && amp > 0.02; k++) {
          const t = k * T[s];
          if (t > SD_SPAN) break;
          list.push({ side: s, at: t, amp: amp * lvl[s], rev: rev[s], first: k === 1 });
          amp *= fb[s];
        }
      }
    }
    return list;
  }

  startDisplay() {
    const tick = () => {
      if (this.destroyed || !this.card || !this.card.isConnected) return;
      this.detectHits();
      this.drawDisplay();
      if (this.sync && this.clockInterval && performance.now() - this.lastClockAt > 3000) this.updateSyncUI();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // A new pulse travels across the display on every input hit (a jump in level)
  detectHits() {
    this.analyser.getFloatTimeDomainData(this.analyserBuf);
    let peak = 0;
    for (let i = 0; i < this.analyserBuf.length; i++) peak = Math.max(peak, Math.abs(this.analyserBuf[i]));
    const now = performance.now() / 1000;
    if (peak > 0.03 && peak > this.lastPeak * 1.6 && now - this.lastPulseAt > 0.08) {
      this.pulses.push({ t0: now, amp: Math.min(1, peak) });
      this.lastPulseAt = now;
    }
    this.lastPeak = peak * 0.92 + this.lastPeak * 0.08;
    this.pulses = this.pulses.filter(p => now - p.t0 < SD_SPAN + 0.3).slice(-12);
  }

  geom() {
    const c = this.el('display');
    const w = c.width;
    const h = c.height;
    const padX = 36;
    const laneH = (h - 24) / 2;
    return { c, w, h, padX, laneH, x: t => padX + (t / SD_SPAN) * (w - padX - 12), y: (s, amp) => 12 + s * laneH + laneH * (0.85 - 0.7 * amp) };
  }

  // The drag handle sits on the first repeat; its height shows that side's Feedback
  handleY(g, si) {
    return 12 + si * g.laneH + g.laneH * 0.85 - g.laneH * 0.7 * (this.side[SD_SIDES[si]].fb / 95);
  }

  drawDisplay() {
    const c = this.el('display');
    if (!c) return;
    const g = this.geom();
    const ctx = c.getContext('2d');
    const css = getComputedStyle(this.card);
    const muted = css.getPropertyValue('--muted-text').trim() || '#64748b';
    const primary = css.getPropertyValue('--primary-color').trim() || '#2563eb';
    const text = css.getPropertyValue('--text-color').trim() || '#0f172a';
    const border = css.getPropertyValue('--panel-border').trim() || '#e2e8f0';
    const now = performance.now() / 1000;
    ctx.clearRect(0, 0, g.w, g.h);

    // Lanes and labels
    ctx.font = '600 20px system-ui, sans-serif';
    for (let s = 0; s < 2; s++) {
      const top = 12 + s * g.laneH;
      ctx.strokeStyle = border;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(g.padX, top + g.laneH * 0.85);
      ctx.lineTo(g.w - 12, top + g.laneH * 0.85);
      ctx.stroke();
      ctx.fillStyle = muted;
      ctx.fillText(s === 0 ? 'L' : 'R', 8, top + g.laneH * 0.6);
    }
    // Beat grid when synced
    if (this.sync && this.clockInterval) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      for (let t = this.clockInterval * 4; t < SD_SPAN; t += this.clockInterval * 4) {
        ctx.beginPath();
        ctx.moveTo(g.x(t), 8);
        ctx.lineTo(g.x(t), g.h - 8);
        ctx.stroke();
      }
    }

    // Travelling pulses
    this.pulses.forEach(p => {
      const age = now - p.t0;
      if (age > SD_SPAN) return;
      ctx.strokeStyle = primary;
      ctx.globalAlpha = 0.35 * p.amp + 0.15;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(g.x(age), 8);
      ctx.lineTo(g.x(age), g.h - 8);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Echoes: a stem per repeat (a forward repeat leans right, a reverse repeat leans left),
    // lit up when a pulse passes it
    this.echoes().forEach(e => {
      let glow = 0;
      this.pulses.forEach(p => {
        const since = now - p.t0 - e.at;
        if (since >= 0 && since < 0.35) glow = Math.max(glow, p.amp * (1 - since / 0.35));
      });
      const x = g.x(e.at);
      const base = 12 + e.side * g.laneH + g.laneH * 0.85;
      const top = g.y(e.side, e.amp);
      const wdt = 14;
      ctx.fillStyle = primary;
      ctx.globalAlpha = 0.25 + 0.5 * e.amp + 0.25 * glow;
      ctx.beginPath();
      if (e.rev) { ctx.moveTo(x - wdt, base); ctx.lineTo(x, top); ctx.lineTo(x, base); }
      else { ctx.moveTo(x, base); ctx.lineTo(x, top); ctx.lineTo(x + wdt, base); }
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      if (glow > 0.02) {
        ctx.beginPath();
        ctx.arc(x, top, 6 + glow * 10, 0, Math.PI * 2);
        ctx.fillStyle = primary;
        ctx.globalAlpha = glow * 0.6;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // The first repeat of each side is the handle you can drag
      if (e.first) {
        const hy = this.handleY(g, e.side);
        ctx.strokeStyle = primary;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, base);
        ctx.lineTo(x, hy);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(x, hy, 9, 0, Math.PI * 2);
        ctx.fillStyle = primary;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = text;
        ctx.stroke();
      }
    });
  }

  bindDisplay() {
    const c = this.el('display');
    if (!c) return;
    const toLocal = ev => {
      const r = c.getBoundingClientRect();
      return { x: (ev.clientX - r.left) * (c.width / r.width), y: (ev.clientY - r.top) * (c.height / r.height) };
    };
    c.addEventListener('pointerdown', ev => {
      const pt = toLocal(ev);
      const g = this.geom();
      // Grab the nearest first-repeat handle
      let best = null;
      this.echoes().filter(e => e.first).forEach(e => {
        const d = Math.hypot(g.x(e.at) - pt.x, this.handleY(g, e.side) - pt.y);
        if (d < 40 && (!best || d < best.d)) best = { d, side: e.side };
      });
      if (!best) {
        // Otherwise the lane that was touched
        best = { side: pt.y < 12 + g.laneH ? 0 : 1 };
      }
      ev.preventDefault();
      ev.stopPropagation();
      this.dragging = { side: SD_SIDES[best.side], id: ev.pointerId };
      try { c.setPointerCapture(ev.pointerId); } catch (e) {}
      this.dragTo(pt);
    });
    c.addEventListener('pointermove', ev => {
      if (!this.dragging || ev.pointerId !== this.dragging.id) return;
      this.dragTo(toLocal(ev));
    });
    const end = ev => { if (this.dragging && ev.pointerId === this.dragging.id) this.dragging = null; };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
  }

  dragTo(pt) {
    const g = this.geom();
    const s = this.dragging.side;
    const si = s === 'L' ? 0 : 1;
    // Up / down: Feedback (the handle height)
    const top = 12 + si * g.laneH;
    const frac = Math.min(1, Math.max(0, (top + g.laneH * 0.85 - pt.y) / (g.laneH * 0.7)));
    this.side[s].fb = Math.round(frac * 95);
    // Left / right: Time (or the nearest division when synced)
    const t = Math.min(2, Math.max(0.01, ((pt.x - g.padX) / (g.w - g.padX - 12)) * SD_SPAN));
    if (this.sync && this.clockInterval) {
      let bestDiv = this.side[s].div;
      let bestD = Infinity;
      SD_DIVS.forEach(([v]) => {
        const d = Math.abs(this.clockInterval * parseFloat(v) - t);
        if (d < bestD) { bestD = d; bestDiv = v; }
      });
      this.side[s].div = bestDiv;
    } else {
      this.side[s].time = Math.round(t * 1000);
    }
    this.sendParams();
    this.refreshControls();
  }

  // ---- State ----
  getExtraState() {
    return { L: Object.assign({}, this.side.L), R: Object.assign({}, this.side.R), pingpong: this.pingpong, sync: this.sync };
  }

  setExtraState(s) {
    SD_SIDES.forEach(side => {
      const v = s[side];
      if (!v) return;
      SD_PARAMS.forEach(p => {
        if (v[p[0]] !== undefined) this.side[side][p[0]] = Math.min(p[3], Math.max(p[2], parseFloat(v[p[0]])));
      });
      if (v.rev !== undefined) this.side[side].rev = !!v.rev;
      if (v.div !== undefined && SD_DIVS.some(d => d[0] === String(v.div))) this.side[side].div = String(v.div);
    });
    if (s.pingpong !== undefined) this.pingpong = !!s.pingpong;
    if (s.sync !== undefined) this.sync = !!s.sync;
    this.sendParams();
    this.refreshControls();
  }

  destroy() {
    this.destroyed = true;
    if (this.node) {
      try { this.node.disconnect(); } catch (e) {}
      this.node.port.onmessage = null;
    }
  }
}

ModuleBase.register(StereoDelayModule);
