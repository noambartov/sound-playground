// DrumMachineModule.js - a four-row step drum machine (Kick, Snare, Hi-Hat, Cymbal) in the style of
// the classic Roland machines. Every sound is synthesized (oscillators, noise, filters), no samples.
// Each row: a Sound menu (classic models or Custom = a small oscillator + envelope + filter),
// Tune / Decay / Tone / Level / Pan, a grid of 16th-note steps (1 to 4 bars; tap = on, tap again =
// accent, tap again = off), and its own OUT (audio) and TRIG (gate) jacks. MAIN L / MAIN R carry the
// four rows mixed by their Pan. Built on the shared template (ModuleBase.js).

const DM_ROWS = [
  { key: 'kick', name: 'Kick', sounds: [['kick808', '808'], ['kick909', '909'], ['kick606', '606'], ['custom', 'Custom']] },
  { key: 'snare', name: 'Snare', sounds: [['snare808', '808'], ['snare909', '909'], ['rim', 'Rimshot'], ['clap', 'Clap'], ['custom', 'Custom']] },
  { key: 'hat', name: 'Hi-Hat', sounds: [['hat808c', '808 Closed'], ['hat808o', '808 Open'], ['hat909c', '909 Closed'], ['hat909o', '909 Open'], ['custom', 'Custom']] },
  { key: 'cym', name: 'Cymbal', sounds: [['cym808', '808 Cymbal'], ['crash909', '909 Crash'], ['ride', 'Ride'], ['cowbell', 'Cowbell'], ['custom', 'Custom']] }
];

// Row sliders: [id, label, min, max, step, default, format]
const DM_ROW_KNOBS = [
  ['tune', 'Tune', -12, 12, 1, 0, v => `${v > 0 ? '+' : ''}${v} st`],
  ['decay', 'Decay', 20, 300, 5, 100, v => `${v}%`],
  ['tone', 'Tone', 0, 100, 1, 50, v => `${v}%`],
  ['level', 'Level', 0, 100, 1, 80, v => `${v}%`],
  ['pan', 'Pan', -100, 100, 5, 0, v => (v === 0 ? 'C' : v < 0 ? `L${-v}` : `R${v}`)]
];

// Custom voice sliders (shown when Sound = Custom)
const DM_CUSTOM_KNOBS = [
  ['pitch', 'Pitch', 20, 2000, 1, 120, v => `${v} Hz`],
  ['penv', 'Pitch Env', 0, 48, 1, 12, v => `${v} st`],
  ['noise', 'Noise', 0, 100, 1, 0, v => `${v}%`],
  ['attack', 'Attack', 0, 100, 1, 1, v => `${v} ms`],
  ['cdecay', 'Decay', 10, 2000, 10, 250, v => `${v} ms`],
  ['cutoff', 'Cutoff', 40, 16000, 10, 4000, v => `${v} Hz`],
  ['reso', 'Resonance', 0, 20, 0.1, 1, v => `${(+v).toFixed(1)}`]
];

const DM_WAVES = [['sine', 'Sine'], ['triangle', 'Triangle'], ['square', 'Square'], ['sawtooth', 'Saw']];
const DM_DEFAULT_SOUNDS = ['kick808', 'snare808', 'hat808c', 'cym808'];
const DM_METAL = [205.3, 304.4, 369.6, 522.7, 540, 800]; // the 808's six square oscillators
// Loudness trim per sound, measured so every sound peaks at a similar level at MAIN L / R
const DM_TRIM = {
  kick808: 1, kick909: 0.65, kick606: 0.8, snare808: 0.6, snare909: 0.5, rim: 1.3, clap: 3.2,
  hat808c: 7, hat808o: 6, hat909c: 1.3, hat909o: 0.9, cym808: 5, crash909: 1, ride: 2.6, cowbell: 2.4, custom: 1
};

class DrumMachineModule extends ModuleBase {
  static def = {
    type: 'drums',
    title: 'Drum Machine',
    aliases: ['drum_machine', 'drummachine'],
    width: 760,
    menu: { group: 'Controllers & Sequencing', label: 'Drum Machine' },
    params: [],
    outputs: [].concat(
      ...DM_ROWS.map(r => [
        { id: `${r.key}_out`, label: 'OUT', signal: 'audio', inline: true, title: `${r.name} Output`,
          guide: { text: `The ${r.name} alone, after its Level (not its Pan).`, to: 'Mixer IN, Filter IN, Reverb IN, any effect', match: ['mixer:in:ch_in', 'filter:in:audio', 'reverb:in:in_l', 'vca:in:audio', 'output:in:in'] },
          chip: 'Mixer / effects' },
        { id: `${r.key}_trig`, label: 'TRIG', signal: 'gate', inline: true, title: `${r.name} Trigger`,
          guide: { text: `A short pulse (half a step long) every time the ${r.name} row plays.`, to: 'Envelope GATE IN (to build your own sound with an Oscillator, Envelope and Filter), VCA CV', match: ['envelope:in:gate', 'vca:in:cv'] },
          chip: 'Env GATE / VCA CV' }
      ]),
      [
        { id: 'main_l', label: 'MAIN L', signal: 'audio', title: 'Main Left',
          guide: { text: 'All four drums mixed by their Pan, left side.', to: 'Output IN, Mixer, Reverb IN L, Recorder', match: ['output:in:in', 'mixer:in:ch_in', 'reverb:in:in_l', 'recorder:in:in', 'filter:in:audio'] },
          chip: 'Output / Reverb L' },
        { id: 'main_r', label: 'MAIN R', signal: 'audio', title: 'Main Right',
          guide: { text: 'All four drums mixed by their Pan, right side.', to: 'Output IN, Mixer, Reverb IN R', match: ['output:in:in', 'mixer:in:ch_in', 'reverb:in:in_r'] },
          chip: 'Output / Reverb R' }
      ])
  };

  // ---- Audio graph ----
  build() {
    this.tempo = 120;
    this.swing = 0;
    this.bars = 2;
    this.playing = false;
    this.currentStep = 0;
    this.nextTime = 0;
    this.timer = null;
    this.visualQueue = [];
    this.playheadStep = -1;

    // Shared white noise (2 s)
    const len = Math.floor(this.audioCtx.sampleRate * 2);
    this.noiseBuffer = this.audioCtx.createBuffer(1, len, this.audioCtx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    // Main stereo bus -> MAIN L / MAIN R
    this.mainBus = this.own(this.audioCtx.createGain());
    this.mainBus.channelCount = 2;
    this.mainBus.channelCountMode = 'explicit';
    this.splitter = this.own(this.audioCtx.createChannelSplitter(2));
    this.mainBus.connect(this.splitter);
    this.mainL = this.own(this.audioCtx.createGain());
    this.mainR = this.own(this.audioCtx.createGain());
    this.splitter.connect(this.mainL, 0);
    this.splitter.connect(this.mainR, 1);
    this.outputNodes.main_l = this.mainL;
    this.outputNodes.main_r = this.mainR;

    this.rows = DM_ROWS.map((r, i) => {
      const row = {
        key: r.key,
        sound: DM_DEFAULT_SOUNDS[i],
        knobs: {},
        custom: { wave: 'sine' },
        steps: new Array(64).fill(0)
      };
      DM_ROW_KNOBS.forEach(k => { row.knobs[k[0]] = k[5]; });
      DM_CUSTOM_KNOBS.forEach(k => { row.custom[k[0]] = k[5]; });
      row.level = this.own(this.audioCtx.createGain());   // row Level -> row OUT
      row.panner = this.own(this.audioCtx.createStereoPanner());
      row.level.connect(row.panner);
      row.panner.connect(this.mainBus);
      row.trig = this.makeConstant(0);
      this.outputNodes[`${r.key}_out`] = row.level;
      this.outputNodes[`${r.key}_trig`] = row.trig;
      this.applyRowMix(row);
      return row;
    });

    // A classic starting groove: kick on the beats 1 and 3, snare on 2 and 4, closed hats on every 8th
    for (let s = 0; s < 64; s += 16) {
      this.rows[0].steps[s] = 2; this.rows[0].steps[s + 8] = 1;
      this.rows[1].steps[s + 4] = 1; this.rows[1].steps[s + 12] = 1;
      for (let h = 0; h < 16; h += 2) this.rows[2].steps[s + h] = 1;
    }
    this.rows[3].steps[0] = 1;
  }

  applyRowMix(row) {
    const now = this.audioCtx.currentTime;
    row.level.gain.setTargetAtTime(row.knobs.level / 100, now, 0.01);
    row.panner.pan.setTargetAtTime(row.knobs.pan / 100, now, 0.01);
  }

  // ---- Sequencer (look-ahead scheduler on the audio clock) ----
  stepDuration() {
    return 60 / this.tempo / 4;
  }

  start() {
    if (this.playing) return;
    if (window.synthApp && synthApp.ensureAudioContextRunning) synthApp.ensureAudioContextRunning();
    this.playing = true;
    this.currentStep = 0;
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
    this.setPlayhead(-1);
    this.updatePlayButton();
  }

  schedule() {
    if (!this.playing) return;
    const ahead = this.audioCtx.currentTime + 0.12;
    while (this.nextTime < ahead) {
      const dur = this.stepDuration();
      // Swing delays every second 16th by up to half a step
      const t = this.nextTime + (this.currentStep % 2 === 1 ? (this.swing / 100) * dur * 0.5 : 0);
      this.rows.forEach(row => {
        const v = row.steps[this.currentStep];
        if (v) this.trigger(row, t, v === 2 ? 1 : 0.7, dur);
      });
      this.visualQueue.push({ step: this.currentStep, time: t });
      this.nextTime += dur;
      this.currentStep = (this.currentStep + 1) % (this.bars * 16);
    }
  }

  startVisuals() {
    const tick = () => {
      if (!this.playing) return;
      const now = this.audioCtx.currentTime;
      while (this.visualQueue.length && this.visualQueue[0].time <= now) {
        this.setPlayhead(this.visualQueue.shift().step);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  setPlayhead(step) {
    if (!this.card) return;
    this.card.querySelectorAll('.dm-step.dm-now').forEach(el => el.classList.remove('dm-now'));
    this.playheadStep = step;
    if (step < 0) return;
    this.card.querySelectorAll(`.dm-step[data-step="${step}"]`).forEach(el => el.classList.add('dm-now'));
  }

  // ---- Voices ----
  trigger(row, t, vel, stepDur) {
    // TRIG jack: 1 for half a step
    row.trig.offset.setValueAtTime(1, t);
    row.trig.offset.setValueAtTime(0, t + Math.max(0.01, stepDur * 0.5));

    const k = row.knobs;
    const p = {
      t, vel,
      tune: Math.pow(2, k.tune / 12),
      decay: k.decay / 100,
      tone: Math.pow(2, (k.tone - 50) / 25), // 0.25x .. 4x
      toneAmt: k.tone / 100,
      dest: this.audioCtx.createGain()
    };
    p.dest.gain.value = DM_TRIM[row.sound] || 1;
    p.dest.connect(row.level);
    // Release the trim node once the longest sound (crash at 300% decay) is over
    setTimeout(() => { try { p.dest.disconnect(); } catch (e) {} }, Math.max(0, (t - this.audioCtx.currentTime) * 1000) + 6000 * p.decay + 500);
    const voice = DrumMachineModule.VOICES[row.sound] || DrumMachineModule.VOICES.custom;
    try { voice.call(this, p, row); } catch (e) { console.warn('[DrumMachine] voice error', e); }
  }

  // Envelope gain: 0 -> peak over `attack`, exponential fall to silence over `decay`
  env(t, peak, attack, decay, dest) {
    const g = this.audioCtx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + Math.max(0.0005, attack));
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + Math.max(0.005, decay));
    g.connect(dest);
    return g;
  }

  osc(type, freq, t, end, dest) {
    const o = this.audioCtx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.connect(dest);
    o.start(t);
    o.stop(end);
    return o;
  }

  noise(t, end, dest) {
    const n = this.audioCtx.createBufferSource();
    n.buffer = this.noiseBuffer;
    n.loop = true;
    n.connect(dest);
    n.start(t, Math.random() * 1.5);
    n.stop(end);
    return n;
  }

  filter(type, freq, q, dest) {
    const f = this.audioCtx.createBiquadFilter();
    f.type = type;
    f.frequency.value = Math.min(20000, Math.max(20, freq));
    f.Q.value = q;
    f.connect(dest);
    return f;
  }

  // The 808's metallic source: six detuned square waves summed
  metal(t, end, tune, dest) {
    const sum = this.audioCtx.createGain();
    sum.gain.value = 1 / 6;
    sum.connect(dest);
    DM_METAL.forEach(f => this.osc('square', f * tune, t, end, sum));
    return sum;
  }

  kick({ t, vel, tune, decay, toneAmt, dest }, base, sweepFrom, sweepTime, len, click) {
    const d = len * decay;
    const amp = this.env(t, vel, 0.001, d, dest);
    const o = this.osc('sine', base * tune * sweepFrom, t, t + d + 0.05, amp);
    o.frequency.exponentialRampToValueAtTime(base * tune, t + sweepTime);
    if (click > 0 && toneAmt > 0) {
      const ce = this.env(t, vel * click * toneAmt * 2, 0.0005, 0.012, dest);
      this.noise(t, t + 0.03, this.filter('highpass', 1500, 0.7, ce));
    }
  }

  snare({ t, vel, tune, decay, tone, toneAmt, dest }, f1, f2, toneLen, noiseLen, noiseHp) {
    const te = this.env(t, vel * (1 - toneAmt * 0.6), 0.001, toneLen * decay, dest);
    this.osc('triangle', f1 * tune, t, t + toneLen * decay + 0.05, te);
    this.osc('sine', f2 * tune, t, t + toneLen * decay + 0.05, te);
    const ne = this.env(t, vel * (0.4 + toneAmt * 0.8), 0.001, noiseLen * decay, dest);
    this.noise(t, t + noiseLen * decay + 0.05, this.filter('highpass', noiseHp * tone, 0.8, ne));
  }

  hat({ t, vel, tune, decay, tone, dest }, len, style) {
    const d = len * decay;
    const e = this.env(t, vel * 0.8, 0.0005, d, dest);
    const hp = this.filter('highpass', 7000 * Math.sqrt(tone), 0.8, e);
    if (style === '808') {
      this.metal(t, t + d + 0.05, tune, this.filter('bandpass', 10000, 1, hp));
    } else {
      // 909: mostly noise with a little metal
      const mix = this.audioCtx.createGain();
      mix.connect(hp);
      const ng = this.audioCtx.createGain(); ng.gain.value = 0.8; ng.connect(mix);
      this.noise(t, t + d + 0.05, ng);
      const mg = this.audioCtx.createGain(); mg.gain.value = 0.5; mg.connect(mix);
      this.metal(t, t + d + 0.05, tune * 1.5, mg);
    }
  }

  static VOICES = {
    kick808(p) { this.kick(p, 50, 2.6, 0.06, 0.55, 0.4); },
    kick909(p) { this.kick(p, 55, 4.2, 0.03, 0.32, 1); },
    kick606(p) { this.kick(p, 68, 2.2, 0.025, 0.2, 0.6); },

    snare808(p) { this.snare(p, 180, 330, 0.12, 0.18, 1800); },
    snare909(p) {
      this.snare(p, 190, 340, 0.09, 0.26, 3000);
      // 909 snare: a quick pitch drop on the body
      const e = this.env(p.t, p.vel * 0.5, 0.0005, 0.04, p.dest);
      const o = this.osc('triangle', 260 * p.tune, p.t, p.t + 0.08, e);
      o.frequency.exponentialRampToValueAtTime(180 * p.tune, p.t + 0.04);
    },
    rim(p) {
      const e = this.env(p.t, p.vel * 0.9, 0.0002, 0.03 * p.decay, p.dest);
      const bp = this.filter('bandpass', 1700 * p.tone, 2, e);
      this.osc('square', 500 * p.tune, p.t, p.t + 0.08, bp);
      this.osc('triangle', 1720 * p.tune, p.t, p.t + 0.08, bp);
    },
    clap(p) {
      // Three quick bursts and a tail, through a band-pass, like the 808 / 909 clap circuit
      const bp = this.filter('bandpass', 1100 * p.tone, 1.2, p.dest);
      [0, 0.011, 0.022].forEach(off => {
        const e = this.env(p.t + off, p.vel, 0.0005, 0.01, bp);
        this.noise(p.t + off, p.t + off + 0.03, e);
      });
      const tail = this.env(p.t + 0.03, p.vel * 0.8, 0.001, 0.18 * p.decay, bp);
      this.noise(p.t + 0.03, p.t + 0.03 + 0.18 * p.decay + 0.05, tail);
    },

    hat808c(p) { this.hat(p, 0.05, '808'); },
    hat808o(p) { this.hat(p, 0.42, '808'); },
    hat909c(p) { this.hat(p, 0.045, '909'); },
    hat909o(p) { this.hat(p, 0.38, '909'); },

    cym808(p) {
      const d = 1.2 * p.decay;
      const e = this.env(p.t, p.vel * 0.7, 0.001, d, p.dest);
      const hp = this.filter('highpass', 5000 * Math.sqrt(p.tone), 0.7, e);
      this.metal(p.t, p.t + d + 0.05, p.tune, this.filter('bandpass', 7100, 0.9, hp));
      const lo = this.env(p.t, p.vel * 0.35, 0.001, d * 0.4, p.dest);
      this.metal(p.t, p.t + d * 0.4 + 0.05, p.tune, this.filter('bandpass', 3440, 1.2, lo));
    },
    crash909(p) {
      const d = 1.5 * p.decay;
      const e = this.env(p.t, p.vel * 0.7, 0.001, d, p.dest);
      const hp = this.filter('highpass', 4500 * Math.sqrt(p.tone), 0.6, e);
      const ng = this.audioCtx.createGain(); ng.gain.value = 0.9; ng.connect(hp);
      this.noise(p.t, p.t + d + 0.05, ng);
      const mg = this.audioCtx.createGain(); mg.gain.value = 0.4; mg.connect(hp);
      this.metal(p.t, p.t + d + 0.05, p.tune * 1.3, mg);
    },
    ride(p) {
      const d = 1.0 * p.decay;
      const e = this.env(p.t, p.vel * 0.6, 0.001, d, p.dest);
      const bp = this.filter('bandpass', 5200 * p.tone, 1.5, e);
      this.metal(p.t, p.t + d + 0.05, p.tune * 1.6, bp);
      const ping = this.env(p.t, p.vel * 0.15, 0.001, d * 0.6, p.dest);
      this.osc('sine', 3150 * p.tune, p.t, p.t + d * 0.6 + 0.05, ping);
    },
    cowbell(p) {
      const d = 0.35 * p.decay;
      const e = this.env(p.t, p.vel * 0.7, 0.0005, d, p.dest);
      const bp = this.filter('bandpass', 2640 * Math.sqrt(p.tone), 1, e);
      const sum = this.audioCtx.createGain(); sum.gain.value = 0.5; sum.connect(bp);
      this.osc('square', 540 * p.tune, p.t, p.t + d + 0.05, sum);
      this.osc('square', 800 * p.tune, p.t, p.t + d + 0.05, sum);
    },

    // Custom: oscillator (+ noise) with a pitch envelope, through a resonant low-pass, with an attack / decay envelope
    custom(p, row) {
      const c = row.custom;
      const att = c.attack / 1000;
      const d = (c.cdecay / 1000) * p.decay;
      const end = p.t + att + d + 0.05;
      const e = this.env(p.t, p.vel, att, d, p.dest);
      const lp = this.filter('lowpass', c.cutoff * p.tone, c.reso, e);
      const base = c.pitch * p.tune;
      const toneMix = this.audioCtx.createGain();
      toneMix.gain.value = 1 - c.noise / 100;
      toneMix.connect(lp);
      const o = this.osc(c.wave, base * Math.pow(2, c.penv / 12), p.t, end, toneMix);
      o.frequency.exponentialRampToValueAtTime(base, p.t + att + Math.min(0.08, d * 0.5) + 0.005);
      if (c.noise > 0) {
        const ng = this.audioCtx.createGain();
        ng.gain.value = c.noise / 100;
        ng.connect(lp);
        this.noise(p.t, end, ng);
      }
    }
  };

  // ---- UI ----
  slider(id, label, min, max, step, value, fmt) {
    return `<div class="dm-knob">
        <label class="module-label">${label}: <span id="${this.elId(`v_${id}`)}">${fmt(value)}</span></label>
        <input type="range" id="${this.elId(`p_${id}`)}" min="${min}" max="${max}" step="${step}" value="${value}">
      </div>`;
  }

  renderGrid(i) {
    const row = this.rows[i];
    let html = '';
    for (let b = 0; b < this.bars; b++) {
      html += '<div class="dm-bar">';
      for (let s = 0; s < 16; s++) {
        const n = b * 16 + s;
        const v = row.steps[n];
        html += `<button class="dm-step${s % 4 === 0 ? ' dm-beat' : ''}${v === 1 ? ' dm-on' : ''}${v === 2 ? ' dm-accent' : ''}" data-row="${i}" data-step="${n}" aria-label="Step ${n + 1}"></button>`;
      }
      html += '</div>';
    }
    return html;
  }

  renderRow(r, i) {
    const row = this.rows[i];
    const opts = r.sounds.map(([v, l]) => `<option value="${v}"${v === row.sound ? ' selected' : ''}>${l}</option>`).join('');
    const out = this.def.outputs.find(o => o.id === `${r.key}_out`);
    const trig = this.def.outputs.find(o => o.id === `${r.key}_trig`);
    const waves = DM_WAVES.map(([v, l]) => `<option value="${v}"${v === row.custom.wave ? ' selected' : ''}>${l}</option>`).join('');
    return `<div class="dm-row" data-row="${i}">
        <div class="dm-row-head">
          <span class="dm-row-name">${r.name}</span>
          <select id="${this.elId(`sound_${r.key}`)}" class="control-select dm-sound">${opts}</select>
          <button class="action-btn dm-small-btn" id="${this.elId(`clear_${r.key}`)}">Clear</button>
          <div class="dm-row-jacks">${this.renderPort(trig, 'out')}${this.renderPort(out, 'out')}</div>
        </div>
        <div class="dm-grid" id="${this.elId(`grid_${r.key}`)}">${this.renderGrid(i)}</div>
        <div class="dm-knobs">${DM_ROW_KNOBS.map(k => this.slider(`${r.key}_${k[0]}`, k[1], k[2], k[3], k[4], row.knobs[k[0]], k[6])).join('')}</div>
        <div class="dm-custom" id="${this.elId(`custom_${r.key}`)}"${row.sound === 'custom' ? '' : ' hidden'}>
          <div class="dm-knob"><label class="module-label">Wave</label>
            <select id="${this.elId(`wave_${r.key}`)}" class="control-select">${waves}</select></div>
          ${DM_CUSTOM_KNOBS.map(k => this.slider(`${r.key}_c_${k[0]}`, k[1], k[2], k[3], k[4], row.custom[k[0]], k[6])).join('')}
        </div>
      </div>`;
  }

  renderBody() {
    return `
      <div class="dm-top">
        <button class="action-btn dm-play" id="${this.elId('play')}">Play</button>
        <div class="dm-knob dm-tempo">
          <label class="module-label">Tempo
            <span class="dm-bpm-box"><input type="number" id="${this.elId('bpm')}" class="dm-bpm" min="40" max="240" step="1" value="${this.tempo}"> BPM</span>
          </label>
          <input type="range" id="${this.elId('p_tempo')}" min="40" max="240" step="1" value="${this.tempo}">
        </div>
        ${this.slider('swing', 'Swing', 0, 100, 1, this.swing, v => `${v}%`)}
        <div class="dm-bars">
          <span class="module-label">Bars: <span id="${this.elId('bars')}">${this.bars}</span></span>
          <div class="dm-bar-btns">
            <button class="action-btn dm-small-btn" id="${this.elId('addbar')}">Add Bar</button>
            <button class="action-btn dm-small-btn" id="${this.elId('rembar')}">Remove Bar</button>
          </div>
        </div>
      </div>
      ${DM_ROWS.map((r, i) => this.renderRow(r, i)).join('')}
    `;
  }

  onMount(card) {
    card.classList.add('dm-card');
    this.bindAll();
  }

  bindAll() {
    const card = this.card;
    const on = (name, ev, fn) => { const el = this.el(name); if (el) el.addEventListener(ev, fn); };

    on('play', 'click', () => (this.playing ? this.stop() : this.start()));
    on('p_tempo', 'input', e => this.setTempo(e.target.value, 'slider'));
    on('bpm', 'change', e => this.setTempo(e.target.value, 'box'));
    on('bpm', 'keydown', e => { if (e.key === 'Enter') e.target.blur(); e.stopPropagation(); });
    on('p_swing', 'input', e => { this.swing = parseFloat(e.target.value); this.setReadout('swing', `${this.swing}%`); });
    on('addbar', 'click', () => this.setBars(this.bars + 1));
    on('rembar', 'click', () => this.setBars(this.bars - 1));

    DM_ROWS.forEach((r, i) => {
      const row = this.rows[i];
      on(`sound_${r.key}`, 'change', e => this.setSound(i, e.target.value));
      on(`clear_${r.key}`, 'click', () => { row.steps.fill(0); this.redrawGrid(i); });
      on(`wave_${r.key}`, 'change', e => { row.custom.wave = e.target.value; });
      DM_ROW_KNOBS.forEach(k => on(`p_${r.key}_${k[0]}`, 'input', e => {
        row.knobs[k[0]] = parseFloat(e.target.value);
        this.setReadout(`${r.key}_${k[0]}`, k[6](row.knobs[k[0]]));
        if (k[0] === 'level' || k[0] === 'pan') this.applyRowMix(row);
      }));
      DM_CUSTOM_KNOBS.forEach(k => on(`p_${r.key}_c_${k[0]}`, 'input', e => {
        row.custom[k[0]] = parseFloat(e.target.value);
        this.setReadout(`${r.key}_c_${k[0]}`, k[6](row.custom[k[0]]));
      }));
      this.bindGrid(i);
    });
    this.updatePlayButton();
  }

  bindGrid(i) {
    const grid = this.el(`grid_${DM_ROWS[i].key}`);
    if (!grid) return;
    grid.addEventListener('click', e => {
      const btn = e.target.closest('.dm-step');
      if (!btn) return;
      const n = parseInt(btn.dataset.step, 10);
      const row = this.rows[i];
      row.steps[n] = (row.steps[n] + 1) % 3; // off -> on -> accent -> off
      btn.classList.toggle('dm-on', row.steps[n] === 1);
      btn.classList.toggle('dm-accent', row.steps[n] === 2);
      // Hear the step when switching it on while stopped
      if (!this.playing && row.steps[n]) {
        if (window.synthApp && synthApp.ensureAudioContextRunning) synthApp.ensureAudioContextRunning();
        this.trigger(row, this.audioCtx.currentTime + 0.01, row.steps[n] === 2 ? 1 : 0.7, this.stepDuration());
      }
    });
  }

  redrawGrid(i) {
    const grid = this.el(`grid_${DM_ROWS[i].key}`);
    if (grid) grid.innerHTML = this.renderGrid(i);
    if (this.playheadStep >= 0) this.setPlayhead(this.playheadStep);
  }

  setReadout(name, text) {
    const el = this.el(`v_${name}`);
    if (el) el.textContent = text;
  }

  setTempo(v, from) {
    const bpm = Math.round(Math.min(240, Math.max(40, parseFloat(v))));
    if (isNaN(bpm)) return;
    this.tempo = bpm;
    const slider = this.el('p_tempo');
    const box = this.el('bpm');
    if (slider && from !== 'slider') slider.value = String(bpm);
    if (box && (from !== 'box' || box.value !== String(bpm))) box.value = String(bpm);
  }

  setBars(n) {
    n = Math.min(4, Math.max(1, n));
    if (n === this.bars) return;
    this.bars = n;
    if (this.currentStep >= n * 16) this.currentStep = 0;
    const label = this.el('bars');
    if (label) label.textContent = String(n);
    this.rows.forEach((r, i) => this.redrawGrid(i));
  }

  setSound(i, sound) {
    const row = this.rows[i];
    if (!DM_ROWS[i].sounds.some(s => s[0] === sound)) return;
    row.sound = sound;
    const sel = this.el(`sound_${DM_ROWS[i].key}`);
    if (sel && sel.value !== sound) sel.value = sound;
    const custom = this.el(`custom_${DM_ROWS[i].key}`);
    if (custom) custom.hidden = sound !== 'custom';
  }

  updatePlayButton() {
    const btn = this.el('play');
    if (!btn) return;
    btn.textContent = this.playing ? 'Stop' : 'Play';
    btn.classList.toggle('active', this.playing);
  }

  // ---- State ----
  getExtraState() {
    return {
      tempo: this.tempo,
      swing: this.swing,
      bars: this.bars,
      rows: this.rows.map(r => ({
        sound: r.sound,
        knobs: Object.assign({}, r.knobs),
        custom: Object.assign({}, r.custom),
        steps: r.steps.join('')
      }))
    };
  }

  setExtraState(s) {
    if (s.tempo !== undefined) this.setTempo(s.tempo);
    if (s.swing !== undefined) {
      this.swing = Math.min(100, Math.max(0, parseFloat(s.swing) || 0));
      const sl = this.el('p_swing');
      if (sl) sl.value = String(this.swing);
      this.setReadout('swing', `${this.swing}%`);
    }
    if (Array.isArray(s.rows)) {
      s.rows.slice(0, 4).forEach((rs, i) => {
        const row = this.rows[i];
        const key = DM_ROWS[i].key;
        if (!rs) return;
        if (rs.sound) this.setSound(i, rs.sound);
        DM_ROW_KNOBS.forEach(k => {
          if (rs.knobs && rs.knobs[k[0]] !== undefined) {
            row.knobs[k[0]] = parseFloat(rs.knobs[k[0]]);
            const sl = this.el(`p_${key}_${k[0]}`);
            if (sl) sl.value = String(row.knobs[k[0]]);
            this.setReadout(`${key}_${k[0]}`, k[6](row.knobs[k[0]]));
          }
        });
        this.applyRowMix(row);
        if (rs.custom) {
          if (rs.custom.wave) {
            row.custom.wave = rs.custom.wave;
            const w = this.el(`wave_${key}`);
            if (w) w.value = rs.custom.wave;
          }
          DM_CUSTOM_KNOBS.forEach(k => {
            if (rs.custom[k[0]] !== undefined) {
              row.custom[k[0]] = parseFloat(rs.custom[k[0]]);
              const sl = this.el(`p_${key}_c_${k[0]}`);
              if (sl) sl.value = String(row.custom[k[0]]);
              this.setReadout(`${key}_c_${k[0]}`, k[6](row.custom[k[0]]));
            }
          });
        }
        if (typeof rs.steps === 'string') {
          row.steps = new Array(64).fill(0).map((_, n) => Math.min(2, parseInt(rs.steps[n], 10) || 0));
        }
      });
    }
    if (s.bars !== undefined) this.bars = Math.min(4, Math.max(1, parseInt(s.bars, 10) || 2));
    const label = this.el('bars');
    if (label) label.textContent = String(this.bars);
    this.rows.forEach((r, i) => this.redrawGrid(i));
  }

  destroy() {
    this.stop();
    this.rows.forEach(r => { try { r.level.disconnect(); r.panner.disconnect(); } catch (e) {} });
  }
}

ModuleBase.register(DrumMachineModule);
