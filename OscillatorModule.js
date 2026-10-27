class OscillatorModule {
  constructor(id, audioContext) {
    this.id = id;
    this.ctx = audioContext;

    this.currentType = 'square';
    this.currentFreq = 220;
    this.pulseWidth = 0.5;
    // Sawtooth shape: sawRise = share of the cycle spent rising from the bottom to the peak
    // (1 = classic saw, 0.5 = triangle, 0 = falling ramp); sawFlip turns the wave upside down.
    this.sawRise = 1;
    this.sawFlip = false;
    // Tuning relative to the Frequency slider or the note at PITCH IN (Minimoog style):
    // whole octaves, semitones and fine cents, summed into the oscillators' detune.
    this.octave = 0;     // -2..+2
    this.semitones = 0;  // -12..+12
    this.fine = 0;       // -50..+50 cents
    this.noiseSource = null; // started the first time the Noise waveform is chosen
    this.card = null;

    // Two oscillators (side A and side B) that always get the same frequency, so they stay in
    // phase. Normally only one side is heard; a Slope / Flip change is set on the silent side
    // and the sides crossfade, because swapping the wave of a sounding oscillator clicks.
    this.oscNode = this.ctx.createOscillator();
    this.oscB = this.ctx.createOscillator();
    this.sideGainA = this.ctx.createGain();
    this.sideGainB = this.ctx.createGain();
    this.sideGainB.gain.value = 0;
    this.activeSide = 0; // 0 = A, 1 = B
    this.fading = false;
    this.pendingWave = null;
    this.fadeTimer = null;
    this.mixNode = this.ctx.createGain();
    for (const [osc, g] of [[this.oscNode, this.sideGainA], [this.oscB, this.sideGainB]]) {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(this.currentFreq, this.ctx.currentTime);
      osc.connect(g);
      g.connect(this.mixNode);
    }

    this.shaperNode = this.ctx.createWaveShaper();
    this.shaperNode.curve = this.makePulseCurve(this.pulseWidth);

    this.outputGain = this.ctx.createGain();
    this.outputGain.gain.setValueAtTime(0.5, this.ctx.currentTime);

    this.audioOutput = this.outputGain;
    // FM IN: added to the frequency of both sides
    this.fmInput = this.ctx.createGain();
    this.fmInput.connect(this.oscNode.frequency);
    this.fmInput.connect(this.oscB.frequency);

    // PITCH IN: a note in Hz (Keyboard FREQ, Sequencer PITCH CV). While it is patched the
    // Frequency slider is set aside so the incoming note plays exactly in tune.
    this.pitchInput = this.ctx.createGain();
    this.pitchInput.connect(this.oscNode.frequency);
    this.pitchInput.connect(this.oscB.frequency);
    this.pitchConnections = 0;

    this.applyDetune();
    this.updateWaveformRouting();
    const t0 = this.ctx.currentTime;
    this.oscNode.start(t0);
    this.oscB.start(t0);
  }

  getState() {
    return {
      waveform: this.currentType,
      frequency: this.currentFreq,
      pulseWidth: this.pulseWidth,
      sawRise: this.sawRise,
      sawFlip: this.sawFlip,
      octave: this.octave,
      semitones: this.semitones,
      fine: this.fine
    };
  }

  setState(state) {
    if (!state) return;
    if (state.waveform !== undefined) this.setType(state.waveform);
    if (state.frequency !== undefined) this.setFrequency(state.frequency);
    if (state.pulseWidth !== undefined) this.setPulseWidth(state.pulseWidth);
    if (state.sawRise !== undefined) this.setSawRise(state.sawRise);
    if (state.sawFlip !== undefined) this.setSawFlip(state.sawFlip);
    for (const k of ['octave', 'semitones', 'fine']) if (state[k] !== undefined) this.setTune(k, state[k]);

    if (this.card) {
      const typeSelect = this.card.querySelector(`#osc_type_${this.id}`);
      if (typeSelect) typeSelect.value = this.currentType;

      const freqSlider = this.card.querySelector(`#osc_freq_${this.id}`);
      if (freqSlider) freqSlider.value = OscillatorModule.freqToSlider(this.currentFreq);

      this.updatePitchUI();

      const pwSlider = this.card.querySelector(`#osc_pw_${this.id}`);
      if (pwSlider) pwSlider.value = this.pulseWidth;

      const pwLabel = this.card.querySelector(`#pw_val_${this.id}`);
      if (pwLabel) pwLabel.innerText = `${Math.round(this.pulseWidth * 100)}%`;

      const riseSlider = this.card.querySelector(`#osc_rise_${this.id}`);
      if (riseSlider) riseSlider.value = this.sawRise;
      this.updateSawUI();
      this.updateTuneUI();
    }
  }

  getAudioOutput() { return this.audioOutput; }
  getFMInput() { return this.fmInput; }
  getAudioInput(portType) { return portType === 'pitch' ? this.pitchInput : this.fmInput; }

  // Called by app.js when a cable is plugged into / pulled out of one of this module's inputs
  onInputConnected(portType, connected) {
    if (portType !== 'pitch') return;
    this.pitchConnections = Math.max(0, this.pitchConnections + (connected ? 1 : -1));
    this.applyBaseFrequency();
    this.updatePitchUI();
  }

  applyBaseFrequency() {
    const target = this.pitchConnections > 0 ? 0 : this.currentFreq;
    const now = this.ctx.currentTime;
    for (const osc of [this.oscNode, this.oscB]) {
      osc.frequency.cancelScheduledValues(now);
      osc.frequency.setTargetAtTime(target, now, 0.003);
    }
  }

  setTune(key, val) {
    const lim = OscillatorModule.TUNE[key];
    if (!lim) return;
    const n = Math.round(parseFloat(val));
    this[key] = Math.min(lim.max, Math.max(lim.min, isNaN(n) ? 0 : n));
    this.applyDetune();
  }

  applyDetune() {
    const cents = this.octave * 1200 + this.semitones * 100 + this.fine;
    const now = this.ctx.currentTime;
    for (const osc of [this.oscNode, this.oscB]) {
      osc.detune.cancelScheduledValues(now);
      osc.detune.setTargetAtTime(cents, now, 0.005);
    }
  }

  updateTuneUI() {
    if (!this.card) return;
    for (const key of Object.keys(OscillatorModule.TUNE)) {
      const slider = this.card.querySelector(`#osc_${key}_${this.id}`);
      if (slider) slider.value = this[key];
      const label = this.card.querySelector(`#${key}_val_${this.id}`);
      if (label) label.innerText = OscillatorModule.TUNE[key].label(this[key]);
    }
  }

  updatePitchUI() {
    if (!this.card) return;
    const slider = this.card.querySelector(`#osc_freq_${this.id}`);
    const label = this.card.querySelector(`#freq_val_${this.id}`);
    const fromPitch = this.pitchConnections > 0;
    if (slider) slider.disabled = fromPitch;
    if (label) label.innerText = fromPitch ? 'from PITCH IN' : `${Math.round(this.currentFreq)} Hz`;
  }

  makePulseCurve(width) {
    const samples = 1024;
    const curve = new Float32Array(samples);
    const threshold = (width - 0.5) * 2;

    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      curve[i] = x >= threshold ? 1 : -1;
    }
    return curve;
  }

  // Band-limited saw that rises for `rise` of the cycle and falls for the rest (`flip` turns
  // it upside down), built from its Fourier series as a PeriodicWave. Shaping the browser's
  // sawtooth with a WaveShaper instead leaves a spike at every cycle (the band-limited jump
  // passes through the middle values), heard as clicks.
  makeSawWave(rise, flip) {
    const key = `${rise.toFixed(2)}|${flip ? 1 : 0}`;
    const cache = OscillatorModule.sawWaves.get(this.ctx) || new Map();
    OscillatorModule.sawWaves.set(this.ctx, cache);
    if (cache.has(key)) return cache.get(key);
    const N = OscillatorModule.SAW_HARMONICS;
    const real = new Float32Array(N + 1);
    const imag = new Float32Array(N + 1);
    for (let n = 1; n <= N; n++) {
      // (-1)^n shifts the wave by half a cycle so it lines up with the browser sawtooth
      // (which starts mid-ramp); crossfading between the two then never jumps.
      const sign = (flip ? -1 : 1) * (n % 2 ? -1 : 1);
      if (rise >= 1 || rise <= 0) {
        // Plain ramp (rising, or falling at 0): sine terms -2/(pi n) or +2/(pi n)
        imag[n] = sign * (rise >= 1 ? -2 : 2) / (Math.PI * n);
      } else {
        const A = 2 / (rise * (1 - rise));
        const th = 2 * Math.PI * n * rise;
        const k = 2 * A / (4 * Math.PI * Math.PI * n * n);
        real[n] = sign * -k * (1 - Math.cos(th));
        imag[n] = sign * k * Math.sin(th);
      }
    }
    const wave = this.ctx.createPeriodicWave(real, imag);
    cache.set(key, wave);
    return wave;
  }

  // The plain browser sawtooth is used untouched while the shape is the classic one.
  sawIsShaped() {
    return this.sawRise < 0.999 || this.sawFlip;
  }

  setSawRise(val) {
    this.sawRise = Math.min(1, Math.max(0, parseFloat(val)));
    if (this.currentType === 'sawtooth') this.crossfadeToSaw();
  }

  setSawFlip(on) {
    this.sawFlip = !!on;
    if (this.currentType === 'sawtooth') this.crossfadeToSaw();
    this.updateSawUI();
  }

  // Puts the current saw shape on one oscillator: the browser sawtooth for the classic shape,
  // else the band-limited PeriodicWave.
  applySawWave(osc) {
    if (this.sawIsShaped()) osc.setPeriodicWave(this.makeSawWave(this.sawRise, this.sawFlip));
    else osc.type = 'sawtooth';
  }

  // Slope / Flip change: set the new shape on the silent side and crossfade to it
  // (OscillatorModule.FADE seconds). While a fade runs the newest shape waits and is applied
  // right after it, so dragging the slider or an LFO on it never clicks.
  crossfadeToSaw() {
    if (this.ctx.state !== 'running') { this.updateWaveformRouting(); return; }
    const key = `${this.sawRise.toFixed(2)}|${this.sawFlip ? 1 : 0}`;
    if (this.fading) { this.pendingWave = key; return; }
    if (key === this.sawKey) return;
    this.sawKey = key;
    const next = 1 - this.activeSide;
    const oscs = [this.oscNode, this.oscB];
    const gains = [this.sideGainA, this.sideGainB];
    this.applySawWave(oscs[next]);
    const now = this.ctx.currentTime;
    const end = now + OscillatorModule.FADE;
    for (const [g, to] of [[gains[next], 1], [gains[this.activeSide], 0]]) {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(to, end);
    }
    this.activeSide = next;
    this.fading = true;
    this.fadeTimer = setTimeout(() => {
      this.fading = false;
      this.fadeTimer = null;
      if (this.pendingWave !== null && this.currentType === 'sawtooth') {
        this.pendingWave = null;
        this.crossfadeToSaw();
      }
      this.pendingWave = null;
    }, OscillatorModule.FADE * 1000 + 5);
  }

  updateSawUI() {
    if (!this.card) return;
    const label = this.card.querySelector(`#rise_val_${this.id}`);
    if (label) label.innerText = OscillatorModule.riseLabel(this.sawRise);
    const btn = this.card.querySelector(`#osc_flip_${this.id}`);
    if (btn) {
      btn.textContent = `Flip: ${this.sawFlip ? 'On' : 'Off'}`;
      btn.classList.toggle('active', this.sawFlip);
    }
  }

  setType(type) {
    this.currentType = type;
    this.updateWaveformRouting();

    if (this.card) {
      const pwmContainer = this.card.querySelector(`#pwm_container_${this.id}`);
      if (pwmContainer) {
        pwmContainer.style.display = (type === 'square') ? 'flex' : 'none';
      }
      const sawContainer = this.card.querySelector(`#saw_container_${this.id}`);
      if (sawContainer) sawContainer.style.display = (type === 'sawtooth') ? 'flex' : 'none';
      const tuneContainer = this.card.querySelector(`#tune_container_${this.id}`);
      if (tuneContainer) tuneContainer.style.display = (type === 'noise') ? 'none' : 'flex';
      const freqContainer = this.card.querySelector(`#freq_container_${this.id}`);
      if (freqContainer) freqContainer.style.display = (type === 'noise') ? 'none' : 'flex';
      if (window.synthApp && typeof synthApp.updateCables === 'function') synthApp.updateCables();
    }
  }

  setFrequency(freq) {
    this.currentFreq = parseFloat(freq);
    this.applyBaseFrequency();
  }

  setPulseWidth(val) {
    this.pulseWidth = parseFloat(val);
    if (this.currentType === 'square') {
      this.shaperNode.curve = this.makePulseCurve(this.pulseWidth);
    }
  }

  // Waveform menu change (or a load): both sides get the wave at once, side A is heard.
  updateWaveformRouting() {
    try { this.mixNode.disconnect(); this.shaperNode.disconnect(); } catch (e) {}
    if (this.noiseSource) try { this.noiseSource.disconnect(); } catch (e) {}
    if (this.fadeTimer) { clearTimeout(this.fadeTimer); this.fadeTimer = null; }
    this.fading = false;
    this.pendingWave = null;
    const now = this.ctx.currentTime;
    for (const [g, v] of [[this.sideGainA, 1], [this.sideGainB, 0]]) {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(v, now);
    }
    this.activeSide = 0;
    this.sawKey = null;

    const oscs = [this.oscNode, this.oscB];
    if (this.currentType === 'noise') {
      // White noise (Minimoog mixer's NOISE): a looped 2 s random buffer, pitch controls unused
      if (!this.noiseSource) {
        const len = this.ctx.sampleRate * 2;
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noiseSource = this.ctx.createBufferSource();
        this.noiseSource.buffer = buf;
        this.noiseSource.loop = true;
        this.noiseSource.start();
      }
      this.noiseSource.connect(this.outputGain);
    } else if (this.currentType === 'square') {
      oscs.forEach(o => { o.type = 'sawtooth'; });
      this.shaperNode.curve = this.makePulseCurve(this.pulseWidth);
      this.mixNode.connect(this.shaperNode);
      this.shaperNode.connect(this.outputGain);
    } else {
      if (this.currentType === 'sawtooth') {
        oscs.forEach(o => this.applySawWave(o));
        this.sawKey = `${this.sawRise.toFixed(2)}|${this.sawFlip ? 1 : 0}`;
      } else {
        oscs.forEach(o => { o.type = this.currentType; });
      }
      this.mixNode.connect(this.outputGain);
    }
  }

  // Typing an exact frequency into the readout (valueEntry.js): Hz, 1 Hz per arrow step
  getEntry(key) {
    if (key !== 'freq') return null;
    return { unit: 'Hz', step: 1, decimals: 2, toSlider: OscillatorModule.freqToSlider, fromSlider: OscillatorModule.sliderToFreq,
      get: () => OscillatorModule.freqToSlider(this.currentFreq) };
  }

  renderHTML() {
    return `
      <div class="node-header">
        <span>Oscillator (VCO)</span>
        <button class="delete-module-btn" title="Delete Module" onclick="synthApp.deleteNode('${this.id}')">×</button>
      </div>
      <div class="node-body" style="padding: 12px; display: flex; flex-direction: column; gap: 10px;">
        <div class="control-group">
          <label style="font-size: 11px; font-weight: 600;">Waveform</label>
          <select id="osc_type_${this.id}" class="control-select">
            <option value="square" ${this.currentType === 'square' ? 'selected' : ''}>Square / Pulse</option>
            <option value="sawtooth" ${this.currentType === 'sawtooth' ? 'selected' : ''}>Sawtooth</option>
            <option value="triangle" ${this.currentType === 'triangle' ? 'selected' : ''}>Triangle</option>
            <option value="sine" ${this.currentType === 'sine' ? 'selected' : ''}>Sine</option>
            <option value="noise" ${this.currentType === 'noise' ? 'selected' : ''}>Noise</option>
          </select>
        </div>

        <div class="control-group" id="freq_container_${this.id}" style="display: ${this.currentType === 'noise' ? 'none' : 'flex'};">
          <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Frequency: <span id="freq_val_${this.id}" data-entry="@freq">${Math.round(this.currentFreq)} Hz</span></label>
          <input type="range" id="osc_freq_${this.id}" min="0" max="1" step="0.001" value="${OscillatorModule.freqToSlider(this.currentFreq)}">
        </div>

        <div id="tune_container_${this.id}" style="display: ${this.currentType === 'noise' ? 'none' : 'flex'}; flex-direction: column; gap: 10px;">
          ${Object.entries(OscillatorModule.TUNE).map(([key, t]) => `
          <div class="control-group">
            <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">${t.name}: <span id="${key}_val_${this.id}" data-entry="unit:${t.unit}">${t.label(this[key])}</span></label>
            <input type="range" id="osc_${key}_${this.id}" min="${t.min}" max="${t.max}" step="1" value="${this[key]}">
          </div>`).join('')}
        </div>

        <div class="control-group" id="pwm_container_${this.id}" style="display: ${this.currentType === 'square' ? 'flex' : 'none'};">
          <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Pulse Width: <span id="pw_val_${this.id}" data-entry="scale:100;unit:%">${Math.round(this.pulseWidth * 100)}%</span></label>
          <input type="range" id="osc_pw_${this.id}" min="0.05" max="0.95" step="0.01" value="${this.pulseWidth}">
        </div>

        <div class="control-group" id="saw_container_${this.id}" style="display: ${this.currentType === 'sawtooth' ? 'flex' : 'none'};">
          <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Slope: <span id="rise_val_${this.id}" data-entry="scale:100;unit:% rise">${OscillatorModule.riseLabel(this.sawRise)}</span></label>
          <input type="range" id="osc_rise_${this.id}" min="0" max="1" step="0.01" value="${this.sawRise}">
          <button id="osc_flip_${this.id}" class="action-btn module-toggle osc-flip${this.sawFlip ? ' active' : ''}" title="Turn the wave upside down">Flip: ${this.sawFlip ? 'On' : 'Off'}</button>
        </div>

        <div class="ports-row" style="display: flex; justify-content: space-around; align-items: center; padding-top: 8px; border-top: 1px solid var(--panel-border);">
          <div class="port-group" style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700;">
            <div class="port port-in" data-node-id="${this.id}" data-port-type="pitch" title="Pitch Input"></div>
            <span>PITCH</span>
          </div>
          <div class="port-group" style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700;">
            <div class="port port-in" data-node-id="${this.id}" data-port-type="fm" title="FM Input"></div>
            <span>FM IN</span>
          </div>
          <div class="port-group" style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700;">
            <span>OUT</span>
            <div class="port port-out" data-node-id="${this.id}"></div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents(card) {
    this.card = card;
    card.style.width = '260px';

    const typeSelect = card.querySelector(`#osc_type_${this.id}`);
    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => this.setType(e.target.value));
    }

    const freqSlider = card.querySelector(`#osc_freq_${this.id}`);
    const freqLabel = card.querySelector(`#freq_val_${this.id}`);
    if (freqSlider) {
      freqSlider.addEventListener('input', (e) => {
        this.setFrequency(OscillatorModule.sliderToFreq(e.target.value));
        if (freqLabel && this.pitchConnections === 0) freqLabel.innerText = `${Math.round(this.currentFreq)} Hz`;
      });
    }

    for (const key of Object.keys(OscillatorModule.TUNE)) {
      const slider = card.querySelector(`#osc_${key}_${this.id}`);
      if (slider) slider.addEventListener('input', (e) => {
        this.setTune(key, e.target.value);
        this.updateTuneUI();
      });
    }

    const pwSlider = card.querySelector(`#osc_pw_${this.id}`);
    const pwLabel = card.querySelector(`#pw_val_${this.id}`);
    if (pwSlider) {
      pwSlider.addEventListener('input', (e) => {
        this.setPulseWidth(e.target.value);
        if (pwLabel) pwLabel.innerText = `${Math.round(e.target.value * 100)}%`;
      });
    }

    const riseSlider = card.querySelector(`#osc_rise_${this.id}`);
    if (riseSlider) {
      riseSlider.addEventListener('input', (e) => {
        this.setSawRise(e.target.value);
        this.updateSawUI();
      });
    }

    const flipBtn = card.querySelector(`#osc_flip_${this.id}`);
    if (flipBtn) flipBtn.addEventListener('click', () => this.setSawFlip(!this.sawFlip));
  }

  cleanup() {
    if (this.fadeTimer) clearTimeout(this.fadeTimer);
    for (const osc of [this.oscNode, this.oscB]) {
      if (osc) try { osc.stop(); osc.disconnect(); } catch (e) {}
    }
    for (const n of [this.sideGainA, this.sideGainB, this.mixNode, this.fmInput]) {
      if (n) try { n.disconnect(); } catch (e) {}
    }
    if (this.shaperNode) try { this.shaperNode.disconnect(); } catch (e) {}
    if (this.outputGain) try { this.outputGain.disconnect(); } catch (e) {}
    if (this.pitchInput) try { this.pitchInput.disconnect(); } catch (e) {}
    if (this.noiseSource) try { this.noiseSource.stop(); this.noiseSource.disconnect(); } catch (e) {}
  }
}

// Frequency slider curve: the slider moves 0..1 and maps to 20..4000 Hz on a
// logarithmic scale bent so the midpoint reads 200 Hz: freq = 20 * 200^(pos^k).
OscillatorModule.FREQ_MIN = 20;
OscillatorModule.FREQ_MAX = 4000;
OscillatorModule.FREQ_CURVE = Math.log(Math.log(200 / 20) / Math.log(4000 / 20)) / Math.log(0.5);
OscillatorModule.sliderToFreq = (val) => {
  const pos = Math.min(1, Math.max(0, parseFloat(val)));
  const { FREQ_MIN: lo, FREQ_MAX: hi, FREQ_CURVE: k } = OscillatorModule;
  return lo * Math.pow(hi / lo, Math.pow(pos, k));
};
OscillatorModule.freqToSlider = (freq) => {
  const { FREQ_MIN: lo, FREQ_MAX: hi, FREQ_CURVE: k } = OscillatorModule;
  const f = Math.min(hi, Math.max(lo, parseFloat(freq)));
  return Math.pow(Math.log(f / lo) / Math.log(hi / lo), 1 / k);
};

// Octave / Semitones / Fine sliders (setTune): ranges, names and readouts
OscillatorModule.signed = (n) => (n > 0 ? `+${n}` : `${n}`);
OscillatorModule.TUNE = {
  octave:    { name: 'Octave',    min: -2,  max: 2,  unit: 'oct', label: n => `${OscillatorModule.signed(n)} oct` },
  semitones: { name: 'Semitones', min: -12, max: 12, unit: 'st',  label: n => `${OscillatorModule.signed(n)} st` },
  fine:      { name: 'Fine',      min: -50, max: 50, unit: 'ct',  label: n => `${OscillatorModule.signed(n)} ct` }
};

OscillatorModule.SAW_HARMONICS = 1024;
OscillatorModule.FADE = 0.03; // Slope / Flip crossfade, seconds
OscillatorModule.sawWaves = new WeakMap(); // AudioContext -> Map(key -> PeriodicWave)

// Slope readout: how much of the cycle rises and how much falls.
OscillatorModule.riseLabel = (rise) => {
  const up = Math.round(rise * 100);
  return `Rise ${up}% / Fall ${100 - up}%`;
};
