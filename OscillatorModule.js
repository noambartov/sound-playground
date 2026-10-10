class OscillatorModule {
  constructor(id, audioContext) {
    this.id = id;
    this.ctx = audioContext;

    this.currentType = 'square';
    this.currentFreq = 220;
    this.pulseWidth = 0.5;
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
      pulseWidth: this.pulseWidth
    };
  }

  setState(state) {
    if (!state) return;
    if (state.waveform !== undefined) this.setType(state.waveform);
    if (state.frequency !== undefined) this.setFrequency(state.frequency);
    if (state.pulseWidth !== undefined) this.setPulseWidth(state.pulseWidth);

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

  setType(type) {
    this.currentType = type;
    this.updateWaveformRouting();

    if (this.card) {
      const pwmContainer = this.card.querySelector(`#pwm_container_${this.id}`);
      if (pwmContainer) {
        pwmContainer.style.display = (type === 'square') ? 'flex' : 'none';
      }
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
