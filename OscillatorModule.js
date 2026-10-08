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
      if (freqSlider) freqSlider.value = this.currentFreq;

      const freqLabel = this.card.querySelector(`#freq_val_${this.id}`);
      if (freqLabel) freqLabel.innerText = `${Math.round(this.currentFreq)} Hz`;

      const pwSlider = this.card.querySelector(`#osc_pw_${this.id}`);
      if (pwSlider) pwSlider.value = this.pulseWidth;

      const pwLabel = this.card.querySelector(`#pw_val_${this.id}`);
      if (pwLabel) pwLabel.innerText = `${Math.round(this.pulseWidth * 100)}%`;
    }
  }

  getAudioOutput() { return this.audioOutput; }
  getFMInput() { return this.fmInput; }

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
    const now = this.ctx.currentTime;
    this.oscNode.frequency.cancelScheduledValues(now);
    this.oscNode.frequency.setTargetAtTime(this.currentFreq, now, 0.003);
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
          <input type="range" id="osc_freq_${this.id}" min="20" max="4000" step="1" value="${this.currentFreq}">
        </div>

        <div class="control-group" id="pwm_container_${this.id}" style="display: ${this.currentType === 'square' ? 'flex' : 'none'};">
          <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Pulse Width: <span id="pw_val_${this.id}">${Math.round(this.pulseWidth * 100)}%</span></label>
          <input type="range" id="osc_pw_${this.id}" min="0.05" max="0.95" step="0.01" value="${this.pulseWidth}">
        </div>

        <div class="ports-row" style="display: flex; justify-content: space-around; align-items: center; padding-top: 8px; border-top: 1px solid #3f3f46;">
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
        this.setFrequency(e.target.value);
        if (freqLabel) freqLabel.innerText = `${Math.round(e.target.value)} Hz`;
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
  }
}