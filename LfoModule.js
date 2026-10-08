class LfoModule {
  constructor(id, audioCtx) {
    this.id = id;
    this.ctx = audioCtx;

    this.waveform = 'sine';
    this.rate = 2.0;
    this.depth = 50;

    this.oscNode = null;
    this.depthGainNode = null;
    this.rateGainNode = null;
    this.card = null;

    this.initAudioNodes();
  }

  getState() {
    return {
      waveform: this.waveform,
      rate: this.rate,
      depth: this.depth
    };
  }

  setState(state) {
    if (!state) return;
    if (state.waveform !== undefined) this.setWaveform(state.waveform);
    if (state.depth !== undefined) this.setDepth(state.depth);
    if (state.rate !== undefined) this.setRate(state.rate);

    if (this.card) {
      const waveSelect = this.card.querySelector(`#lfo_wave_${this.id}`);
      if (waveSelect) waveSelect.value = this.waveform;

      const depthSlider = this.card.querySelector(`#lfo_depth_${this.id}`);
      if (depthSlider) depthSlider.value = this.depth;

      const depthLabel = this.card.querySelector(`#val_depth_${this.id}`);
      if (depthLabel) depthLabel.innerText = `${Math.round(this.depth)}%`;

      const rateSlider = this.card.querySelector(`#lfo_rate_${this.id}`);
      if (rateSlider) rateSlider.value = LfoModule.rateToSlider(this.rate);

      const rateLabel = this.card.querySelector(`#val_rate_${this.id}`);
      if (rateLabel) rateLabel.innerText = `${this.rate.toFixed(1)} Hz`;

      this.drawWaveform();
    }
  }

  initAudioNodes() {
    this.depthGainNode = this.ctx.createGain();
    this.updateDepthGain(true);

    this.rateGainNode = this.ctx.createGain();
    this.rateGainNode.gain.setValueAtTime(5, this.ctx.currentTime);

    this.createSource();
  }

  createSource() {
    const now = this.ctx.currentTime;
    if (this.oscNode) {
      try {
        this.oscNode.stop(now + 0.005);
        this.oscNode.disconnect();
      } catch (e) {}
    }

    this.oscNode = this.ctx.createOscillator();
    this.oscNode.type = this.waveform;
    this.oscNode.frequency.setValueAtTime(this.rate, now);

    this.rateGainNode.connect(this.oscNode.frequency);
    this.oscNode.connect(this.depthGainNode);
    this.oscNode.start(now);
  }

  static sliderToRate(val) {
    const minR = 0.1;
    const maxR = 20.0;
    return minR * Math.pow(maxR / minR, val / 1000);
  }

  static rateToSlider(rate) {
    const minR = 0.1;
    const maxR = 20.0;
    return (Math.log(rate / minR) / Math.log(maxR / minR)) * 1000;
  }

  setWaveform(type) {
    this.waveform = type;
    this.createSource();
    this.drawWaveform();
  }

  setRateFromSlider(sliderVal) {
    const r = LfoModule.sliderToRate(sliderVal);
    this.setRate(r);
  }

  setRate(r) {
    this.rate = parseFloat(r);
    const now = this.ctx.currentTime;
    if (this.oscNode) {
      this.oscNode.frequency.cancelScheduledValues(now);
      this.oscNode.frequency.setTargetAtTime(this.rate, now, 0.005);
    }
    this.drawWaveform();
  }

  setDepth(val) {
    this.depth = parseFloat(val);
    this.updateDepthGain(false);
  }

  updateDepthGain(immediate = false) {
    if (this.depthGainNode) {
      const now = this.ctx.currentTime;
      const scaledDepth = (this.depth / 100) * 200;
      this.depthGainNode.gain.cancelScheduledValues(now);
      if (immediate) {
        this.depthGainNode.gain.setValueAtTime(scaledDepth, now);
      } else {
        this.depthGainNode.gain.setTargetAtTime(scaledDepth, now, 0.005);
      }
    }
  }

  resetPhase() {
    this.createSource();
  }

  getAudioOutput() { return this.depthGainNode; }
  getRateInput() { return this.rateGainNode; }

  renderHTML() {
    const initialSliderVal = LfoModule.rateToSlider(this.rate);

    return `
      <div class="node-header">
        <span>LFO Controller</span>
        <button class="delete-module-btn" title="Delete Module" onclick="synthApp.deleteNode('${this.id}')">×</button>
      </div>
      <div class="node-body" style="padding: 12px; display: flex; flex-direction: column; gap: 10px;">
        <canvas id="lfo_canvas_${this.id}" width="250" height="30" style="background: #18181b; border: 1px solid #3f3f46; border-radius: 6px; width: 100%; height: 30px;"></canvas>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="control-group">
            <label style="font-size: 11px; font-weight: 600;">Waveform</label>
            <select id="lfo_wave_${this.id}" class="control-select">
              <option value="sine" ${this.waveform === 'sine' ? 'selected' : ''}>Sine</option>
              <option value="triangle" ${this.waveform === 'triangle' ? 'selected' : ''}>Triangle</option>
              <option value="square" ${this.waveform === 'square' ? 'selected' : ''}>Square</option>
              <option value="sawtooth" ${this.waveform === 'sawtooth' ? 'selected' : ''}>Sawtooth</option>
            </select>
          </div>

          <div class="control-group">
            <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Depth: <span id="val_depth_${this.id}">${Math.round(this.depth)}%</span></label>
            <input type="range" id="lfo_depth_${this.id}" min="0" max="100" value="${this.depth}">
          </div>
        </div>

        <div class="control-group">
          <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Rate: <span id="val_rate_${this.id}">${this.rate.toFixed(1)} Hz</span></label>
          <input type="range" id="lfo_rate_${this.id}" min="0" max="1000" value="${initialSliderVal}">
        </div>

        <button id="lfo_sync_${this.id}" class="add-module-btn" style="text-align: center; font-size: 11px; padding: 6px; cursor: pointer;">
          Reset Phase (Sync)
        </button>

        <div class="ports-row" style="display: flex; justify-content: space-around; align-items: center; padding-top: 8px; border-top: 1px solid #3f3f46;">
          <div class="port-group" style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700;">
            <div class="port port-in" data-node-id="${this.id}" data-port-type="rate"></div>
            <span>RATE IN</span>
          </div>
          <div class="port-group" style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700;">
            <span>LFO OUT</span>
            <div class="port port-out" data-node-id="${this.id}"></div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents(card) {
    this.card = card;
    card.style.width = '280px';

    const waveSelect = card.querySelector(`#lfo_wave_${this.id}`);
    if (waveSelect) {
      waveSelect.addEventListener('change', (e) => this.setWaveform(e.target.value));
    }

    const depthSlider = card.querySelector(`#lfo_depth_${this.id}`);
    const depthLabel = card.querySelector(`#val_depth_${this.id}`);
    if (depthSlider) {
      depthSlider.addEventListener('input', (e) => {
        this.setDepth(e.target.value);
        if (depthLabel) depthLabel.innerText = `${Math.round(e.target.value)}%`;
      });
    }

    const rateSlider = card.querySelector(`#lfo_rate_${this.id}`);
    const rateLabel = card.querySelector(`#val_rate_${this.id}`);
    if (rateSlider) {
      rateSlider.addEventListener('input', (e) => {
        this.setRateFromSlider(e.target.value);
        if (rateLabel) rateLabel.innerText = `${this.rate.toFixed(1)} Hz`;
      });
    }

    const syncBtn = card.querySelector(`#lfo_sync_${this.id}`);
    if (syncBtn) {
      syncBtn.addEventListener('click', () => this.resetPhase());
    }

    this.drawWaveform();
  }

  drawWaveform() {
    if (!this.card) return;
    const canvas = this.card.querySelector(`#lfo_canvas_${this.id}`);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;

    if (this.waveform === 'sine') {
      for (let x = 0; x < w; x++) {
        const y = h / 2 + Math.sin((x / w) * Math.PI * 4) * (h / 3);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
    } else if (this.waveform === 'square') {
      for (let x = 0; x < w; x++) {
        const y = (x % (w / 2)) < (w / 4) ? h / 4 : (3 * h) / 4;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
    } else if (this.waveform === 'sawtooth') {
      for (let x = 0; x < w; x++) {
        const y = h - ((x % (w / 2)) / (w / 2)) * h;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
    } else if (this.waveform === 'triangle') {
      for (let x = 0; x < w; x++) {
        const phase = (x % (w / 2)) / (w / 2);
        const y = phase < 0.5 ? h - (phase * 2 * h) : (phase - 0.5) * 2 * h;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  cleanup() {
    if (this.oscNode) {
      try { this.oscNode.stop(); this.oscNode.disconnect(); } catch (e) {}
    }
    if (this.depthGainNode) try { this.depthGainNode.disconnect(); } catch (e) {}
    if (this.rateGainNode) try { this.rateGainNode.disconnect(); } catch (e) {}
  }
}