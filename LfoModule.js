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

    // Tap of the raw waveform (-1..1) for the live preview dot and for slider modulation (modulation.js)
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 32;
    this.analyserBuf = new Float32Array(this.analyser.fftSize);

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
    this.oscNode.connect(this.analyser);
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

  // Raw LFO value (-1..1) read from an analyser tap, scaled by Depth. Used by modulation.js for slider modulation.
  getKnobModValue() {
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.analyserBuf);
    return this.analyserBuf[this.analyserBuf.length - 1] * (this.depth / 100);
  }

  getKnobModDepth() { return this.depth / 100; }

  renderHTML() {
    const initialSliderVal = LfoModule.rateToSlider(this.rate);

    return `
      <div class="node-header">
        <span>LFO</span>
        <button class="delete-module-btn" title="Delete Module" onclick="synthApp.deleteNode('${this.id}')">×</button>
      </div>
      <div class="node-body" style="padding: 12px; display: flex; flex-direction: column; gap: 10px;">
        <canvas id="lfo_canvas_${this.id}" class="lfo-preview" width="392" height="72"></canvas>

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
          <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Rate: <span id="val_rate_${this.id}">${this.rate.toFixed(1)} Hz</span></label>
          <input type="range" id="lfo_rate_${this.id}" min="0" max="1000" value="${initialSliderVal}">
        </div>

        <div class="control-group">
          <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Depth: <span id="val_depth_${this.id}">${Math.round(this.depth)}%</span></label>
          <input type="range" id="lfo_depth_${this.id}" min="0" max="100" value="${this.depth}">
        </div>

        <button id="lfo_sync_${this.id}" class="action-btn">Reset Phase</button>

        <div class="ports-row" style="display: flex; justify-content: space-around; align-items: center; padding-top: 8px; border-top: 1px solid #3f3f46;">
          <div class="port-group" style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700;">
            <div class="port port-in" data-node-id="${this.id}" data-port-type="rate" title="Rate Input"></div>
            <span>RATE IN</span>
          </div>
          <div class="port-group" style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700;">
            <span>OUT</span>
            <div class="port port-out" data-node-id="${this.id}" title="LFO Output"></div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents(card) {
    this.card = card;

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

    this.startPreviewLoop();
  }

  startPreviewLoop() {
    if (this.previewRunning) return;
    this.previewRunning = true;
    const tick = () => {
      if (!this.previewRunning) return;
      this.drawWaveform();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Wave shape (one value per x, -1..1) for the preview, two cycles wide
  static shapeAt(waveform, t) {
    const ph = (t * 2) % 1;
    if (waveform === 'sine') return Math.sin(ph * Math.PI * 2);
    if (waveform === 'square') return ph < 0.5 ? 1 : -1;
    if (waveform === 'sawtooth') return ph * 2 - 1;
    return ph < 0.25 ? ph * 4 : ph < 0.75 ? 2 - ph * 4 : ph * 4 - 4; // triangle
  }

  // Theme-aware preview: the wave shape in the muted color, a dot at the right showing the live value
  drawWaveform() {
    if (!this.card) return;
    const canvas = this.card.querySelector(`#lfo_canvas_${this.id}`);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const css = getComputedStyle(this.card);
    const muted = css.getPropertyValue('--muted-text').trim() || '#64748b';
    const primary = css.getPropertyValue('--primary-color').trim() || '#2563eb';
    const pad = 8;
    const dotX = w - pad - 6;
    const amp = (h / 2 - pad) * Math.max(0.15, this.depth / 100);
    const yFor = v => h / 2 - v * amp;

    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.strokeStyle = muted;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    for (let x = pad; x <= dotX - 14; x++) {
      const y = yFor(LfoModule.shapeAt(this.waveform, (x - pad) / (dotX - 14 - pad)));
      x === pad ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    let live = 0;
    if (this.analyser) {
      this.analyser.getFloatTimeDomainData(this.analyserBuf);
      live = Math.max(-1, Math.min(1, this.analyserBuf[this.analyserBuf.length - 1]));
    }
    ctx.beginPath();
    ctx.fillStyle = primary;
    ctx.arc(dotX, yFor(live), 6, 0, Math.PI * 2);
    ctx.fill();
  }

  cleanup() {
    this.previewRunning = false;
    if (this.oscNode) {
      try { this.oscNode.stop(); this.oscNode.disconnect(); } catch (e) {}
    }
    if (this.depthGainNode) try { this.depthGainNode.disconnect(); } catch (e) {}
    if (this.rateGainNode) try { this.rateGainNode.disconnect(); } catch (e) {}
    if (this.analyser) try { this.analyser.disconnect(); } catch (e) {}
  }
}