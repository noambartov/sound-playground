// MetronomeModule.js - a metronome: a click sound on every beat (the first beat of the bar accented)
// and a CLOCK output for other modules. Tempo slider with a number box, Tap tempo, beats per bar,
// three click sounds and beat lights. Built on the shared template (ModuleBase.js).
// CLOCK follows the shared convention (architecture.md section 4): while playing, 1 for half a
// 16th note on every 16th note (4 pulses per beat), like the Drum Machine and Sequencer CLOCK.

class MetronomeModule extends ModuleBase {
  static def = {
    type: 'metronome',
    title: 'Metronome',
    width: 260,
    menu: { group: 'Controllers & Sequencing', label: 'Metronome' },
    params: [
      { id: 'tempo', label: 'Tempo', min: 20, max: 300, step: 1, value: 120, unit: 'BPM' },
      { id: 'beats', label: 'Beats per Bar', min: 1, max: 12, step: 1, value: 4 },
      { id: 'sound', label: 'Sound', kind: 'select', value: 'click',
        options: [['click', 'Click'], ['wood', 'Wood Block'], ['beep', 'Beep']] },
      { id: 'volume', label: 'Volume', min: 0, max: 100, step: 1, value: 70, unit: '%' },
      { id: 'accent', label: 'Accent', kind: 'toggle', value: true }
    ],
    outputs: [
      { id: 'click', label: 'CLICK', signal: 'audio', title: 'Click Sound Output',
        guide: { text: 'The click sound, one per beat, louder and higher on the first beat of the bar (with Accent on).', to: 'Output IN, Mixer, Recorder', match: ['output:in:in', 'mixer:in:ch_in', 'recorder:in:in', 'reverb:in:in_l'] },
        chip: 'Output / Mixer' },
      { id: 'clock', label: 'CLOCK', signal: 'gate', title: 'Clock Output',
        guide: { text: 'A short pulse on every 16th note (four per beat) while the Metronome plays. Keeps other modules in time with it, for example the Stereo Delay CLOCK, or an Envelope GATE IN for a 16th-note pattern.', to: 'Stereo Delay CLOCK, Envelope GATE IN, VCA CV', match: ['delay:in:clock', 'envelope:in:gate', 'vca:in:cv'] },
        chip: 'CLOCK in / Env GATE' }
    ]
  };

  build() {
    this.playing = false;
    this.step = 0;          // 16th-note counter inside the bar
    this.nextTime = 0;
    this.timer = null;
    this.visualQueue = [];
    this.taps = [];

    this.clickOut = this.own(this.audioCtx.createGain());
    this.clockOut = this.makeConstant(0);
    this.outputNodes = { click: this.clickOut, clock: this.clockOut };
  }

  onParamChange(id, value) {
    if (!this.clickOut) return;
    if (id === 'volume') this.clickOut.gain.setTargetAtTime(value / 100, this.audioCtx.currentTime, 0.01);
    if (id === 'tempo') {
      const box = this.el('bpm');
      if (box && document.activeElement !== box) box.value = String(Math.round(value));
    }
    if (id === 'beats') {
      if (this.step >= value * 4) this.step = 0;
      this.renderLights();
    }
  }

  // ---- Scheduler (look-ahead on the audio clock, a 16th note per step) ----
  stepDuration() {
    return 60 / this.params.tempo / 4;
  }

  start() {
    if (this.playing) return;
    if (window.synthApp && synthApp.ensureAudioContextRunning) synthApp.ensureAudioContextRunning();
    this.playing = true;
    this.step = 0;
    this.nextTime = this.audioCtx.currentTime + 0.06;
    this.visualQueue = [];
    this.timer = setInterval(() => this.schedule(), 25);
    this.schedule();
    this.startVisuals();
    this.updatePlayButton();
  }

  stop() {
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.visualQueue = [];
    const now = this.audioCtx.currentTime;
    this.clockOut.offset.cancelScheduledValues(now);
    this.clockOut.offset.setValueAtTime(0, now);
    this.setLight(-1);
    this.updatePlayButton();
  }

  schedule() {
    if (!this.playing) return;
    const ahead = this.audioCtx.currentTime + 0.12;
    while (this.nextTime < ahead) {
      const dur = this.stepDuration();
      const t = this.nextTime;
      // CLOCK: 1 for half a 16th note
      this.clockOut.offset.setValueAtTime(1, t);
      this.clockOut.offset.setValueAtTime(0, t + dur * 0.5);
      if (this.step % 4 === 0) {
        const beat = this.step / 4;
        this.playClick(t, beat === 0 && this.params.accent && this.params.beats > 1);
        this.visualQueue.push({ beat, time: t });
      }
      this.nextTime += dur;
      this.step = (this.step + 1) % (this.params.beats * 4);
    }
  }

  startVisuals() {
    const tick = () => {
      if (!this.playing) return;
      const now = this.audioCtx.currentTime;
      while (this.visualQueue.length && this.visualQueue[0].time <= now) {
        this.setLight(this.visualQueue.shift().beat);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ---- Click voices ----
  playClick(t, accent) {
    const ctx = this.audioCtx;
    const g = ctx.createGain();
    g.connect(this.clickOut);
    const peak = accent ? 1 : 0.6;
    const sound = this.params.sound;
    let src;
    let len;
    if (sound === 'click') {
      // A very short noise burst through a band-pass
      len = 0.03;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
      src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = accent ? 4200 : 2600;
      bp.Q.value = 1.5;
      src.connect(bp);
      bp.connect(g);
      g.gain.setValueAtTime(peak * 3, t);
    } else {
      // Wood Block: a short pitched knock. Beep: a short sine tone.
      len = sound === 'wood' ? 0.06 : 0.09;
      src = ctx.createOscillator();
      src.type = sound === 'wood' ? 'triangle' : 'sine';
      const f = sound === 'wood' ? (accent ? 1700 : 1150) : (accent ? 1760 : 880);
      src.frequency.setValueAtTime(f, t);
      if (sound === 'wood') src.frequency.exponentialRampToValueAtTime(f * 0.85, t + len);
      src.connect(g);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    }
    src.start(t);
    src.stop(t + len + 0.01);
    src.onended = () => { try { g.disconnect(); } catch (e) {} };
  }

  // ---- Tap tempo: the average gap between the last taps (taps more than 2 s apart start over) ----
  tap() {
    const now = performance.now();
    if (this.taps.length && now - this.taps[this.taps.length - 1] > 2000) this.taps = [];
    this.taps.push(now);
    if (this.taps.length > 5) this.taps.shift();
    if (this.taps.length < 2) return;
    const gap = (this.taps[this.taps.length - 1] - this.taps[0]) / (this.taps.length - 1);
    this.setParam('tempo', Math.round(60000 / gap));
  }

  // ---- UI ----
  renderBody() {
    return `
      <div class="metro-top">
        <button class="action-btn metro-play" id="${this.elId('play')}">Play</button>
        <button class="action-btn metro-tap" id="${this.elId('tap')}">Tap</button>
      </div>
      <div class="metro-lights" id="${this.elId('lights')}"></div>
    `;
  }

  renderLights() {
    const box = this.el('lights');
    if (!box) return;
    let html = '';
    for (let i = 0; i < this.params.beats; i++) html += `<span class="metro-light${i === 0 ? ' metro-first' : ''}" data-beat="${i}"></span>`;
    box.innerHTML = html;
  }

  setLight(beat) {
    if (!this.card) return;
    this.card.querySelectorAll('.metro-light.metro-now').forEach(el => el.classList.remove('metro-now'));
    if (beat < 0) return;
    const el = this.card.querySelector(`.metro-light[data-beat="${beat}"]`);
    if (el) el.classList.add('metro-now');
  }

  onMount(card) {
    card.classList.add('metro-card');
    this.renderLights();

    // A number box next to the Tempo slider: type a tempo, then Enter
    const readout = this.el('v_tempo');
    if (readout) {
      readout.hidden = true;
      const box = document.createElement('span');
      box.className = 'dm-bpm-box';
      box.innerHTML = `<input type="number" id="${this.elId('bpm')}" class="dm-bpm" min="20" max="300" step="1" value="${this.params.tempo}"> BPM`;
      readout.after(box);
      const input = box.querySelector('input');
      input.addEventListener('change', e => {
        const v = parseFloat(e.target.value);
        if (isNaN(v)) { e.target.value = String(this.params.tempo); return; }
        this.setParam('tempo', Math.round(v));
        e.target.value = String(this.params.tempo);
      });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); e.stopPropagation(); });
    }

    const play = this.el('play');
    if (play) play.addEventListener('click', () => (this.playing ? this.stop() : this.start()));
    const tap = this.el('tap');
    if (tap) tap.addEventListener('pointerdown', e => { e.preventDefault(); this.tap(); });
    this.updatePlayButton();
  }

  updatePlayButton() {
    const btn = this.el('play');
    if (!btn) return;
    btn.textContent = this.playing ? 'Stop' : 'Play';
    btn.classList.toggle('active', this.playing);
  }

  destroy() {
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

ModuleBase.register(MetronomeModule);
