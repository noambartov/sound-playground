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
    this.card = null;

    this.oscNode = this.ctx.createOscillator();
    this.oscNode.type = 'sawtooth';
    this.oscNode.frequency.setValueAtTime(this.currentFreq, this.ctx.currentTime);

    this.shaperNode = this.ctx.createWaveShaper();
    this.shaperNode.curve = this.makePulseCurve(this.pulseWidth);

    this.outputGain = this.ctx.createGain();
    this.outputGain.gain.setValueAtTime(0.5, this.ctx.currentTime);

    this.audioOutput = this.outputGain;
    this.fmInput = this.oscNode.frequency;

    // PITCH IN: a note in Hz (Keyboard FREQ, Sequencer PITCH CV). While it is patched the
    // Frequency slider is set aside so the incoming note plays exactly in tune.
    this.pitchInput = this.ctx.createGain();
    this.pitchInput.connect(this.oscNode.frequency);
    this.pitchConnections = 0;

    this.updateWaveformRouting();
    this.oscNode.start();
  }

  getState() {
    return {
      waveform: this.currentType,
      frequency: this.currentFreq,
      pulseWidth: this.pulseWidth,
      sawRise: this.sawRise,
      sawFlip: this.sawFlip
    };
  }

  setState(state) {
    if (!state) return;
    if (state.waveform !== undefined) this.setType(state.waveform);
    if (state.frequency !== undefined) this.setFrequency(state.frequency);
    if (state.pulseWidth !== undefined) this.setPulseWidth(state.pulseWidth);
    if (state.sawRise !== undefined) this.setSawRise(state.sawRise);
    if (state.sawFlip !== undefined) this.setSawFlip(state.sawFlip);

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
    this.oscNode.frequency.cancelScheduledValues(now);
    this.oscNode.frequency.setTargetAtTime(target, now, 0.003);
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
    const sign = flip ? -1 : 1;
    for (let n = 1; n <= N; n++) {
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
    if (this.currentType === 'sawtooth') this.updateWaveformRouting();
  }

  setSawFlip(on) {
    this.sawFlip = !!on;
    if (this.currentType === 'sawtooth') this.updateWaveformRouting();
    this.updateSawUI();
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

  updateWaveformRouting() {
    try {
      this.oscNode.disconnect();
      this.shaperNode.disconnect();
    } catch (e) {}

    if (this.currentType === 'square') {
      this.oscNode.type = 'sawtooth';
      this.shaperNode.curve = this.makePulseCurve(this.pulseWidth);
      this.oscNode.connect(this.shaperNode);
      this.shaperNode.connect(this.outputGain);
    } else if (this.currentType === 'sawtooth' && this.sawIsShaped()) {
      this.oscNode.setPeriodicWave(this.makeSawWave(this.sawRise, this.sawFlip));
      this.oscNode.connect(this.outputGain);
    } else {
      this.oscNode.type = this.currentType;
      this.oscNode.connect(this.outputGain);
    }
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
          </select>
        </div>

        <div class="control-group">
          <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Frequency: <span id="freq_val_${this.id}">${Math.round(this.currentFreq)} Hz</span></label>
          <input type="range" id="osc_freq_${this.id}" min="0" max="1" step="0.001" value="${OscillatorModule.freqToSlider(this.currentFreq)}">
        </div>

        <div class="control-group" id="pwm_container_${this.id}" style="display: ${this.currentType === 'square' ? 'flex' : 'none'};">
          <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Pulse Width: <span id="pw_val_${this.id}">${Math.round(this.pulseWidth * 100)}%</span></label>
          <input type="range" id="osc_pw_${this.id}" min="0.05" max="0.95" step="0.01" value="${this.pulseWidth}">
        </div>

        <div class="control-group" id="saw_container_${this.id}" style="display: ${this.currentType === 'sawtooth' ? 'flex' : 'none'};">
          <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Slope: <span id="rise_val_${this.id}">${OscillatorModule.riseLabel(this.sawRise)}</span></label>
          <input type="range" id="osc_rise_${this.id}" min="0" max="1" step="0.01" value="${this.sawRise}">
          <button id="osc_flip_${this.id}" class="action-btn module-toggle osc-flip${this.sawFlip ? ' active' : ''}" title="Turn the wave upside down">Flip: ${this.sawFlip ? 'On' : 'Off'}</button>
        </div>

        <div class="ports-row" style="display: flex; justify-content: space-around; align-items: center; padding-top: 8px; border-top: 1px solid #3f3f46;">
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
    if (this.oscNode) {
      try { this.oscNode.stop(); this.oscNode.disconnect(); } catch (e) {}
    }
    if (this.shaperNode) try { this.shaperNode.disconnect(); } catch (e) {}
    if (this.outputGain) try { this.outputGain.disconnect(); } catch (e) {}
    if (this.pitchInput) try { this.pitchInput.disconnect(); } catch (e) {}
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

OscillatorModule.SAW_HARMONICS = 1024;
OscillatorModule.sawWaves = new WeakMap(); // AudioContext -> Map(key -> PeriodicWave)

// Slope readout: how much of the cycle rises and how much falls.
OscillatorModule.riseLabel = (rise) => {
  const up = Math.round(rise * 100);
  return `Rise ${up}% / Fall ${100 - up}%`;
};
