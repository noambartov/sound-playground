class GranularModule {
  constructor(id, audioCtx) {
    this.id = id;
    this.audioCtx = audioCtx || (window.audioEngine ? window.audioEngine.getContext() : new (window.AudioContext || window.webkitAudioContext)());

    this.outputL = this.audioCtx.createGain();
    this.outputR = this.audioCtx.createGain();

    this.inputL = this.audioCtx.createGain();
    this.inputR = this.audioCtx.createGain();

    this.cv1Node = this.audioCtx.createGain();
    this.cv2Node = this.audioCtx.createGain();

    this.sourceMode = 'live';

    this.bufferSizeSeconds = 5;
    const sr = this.audioCtx.sampleRate;
    this.liveBuffer = this.audioCtx.createBuffer(2, Math.floor(sr * this.bufferSizeSeconds), sr);
    this.fileBuffer = null;
    this.reversedBuffer = null;
    this.writePos = 0;

    this.position = 0.5;
    this.grainSize = 0.1;
    this.density = 20;
    this.pitch = 1.0;
    this.spray = 0.1;
    this.reverseProb = 0.0;

    this.cv1Target = 'position';
    this.cv2Target = 'pitch';

    this.card = null;
    this.nextGrainTime = 0;
    this.isEngineRunning = false;

    this.initLiveRecorder();
    this.startEngine();
  }

  getState() {
    return {
      sourceMode: this.sourceMode,
      position: this.position,
      grainSize: this.grainSize,
      density: this.density,
      pitch: this.pitch,
      spray: this.spray,
      reverseProb: this.reverseProb,
      cv1Target: this.cv1Target,
      cv2Target: this.cv2Target
    };
  }

  setState(state) {
    if (!state) return;
    if (state.sourceMode !== undefined) this.sourceMode = state.sourceMode;
    if (state.position !== undefined) this.position = parseFloat(state.position);
    if (state.grainSize !== undefined) this.grainSize = parseFloat(state.grainSize);
    if (state.density !== undefined) {
      this.density = parseInt(state.density);
    }
    if (state.pitch !== undefined) this.pitch = parseFloat(state.pitch);
    if (state.spray !== undefined) this.spray = parseFloat(state.spray);
    if (state.reverseProb !== undefined) this.reverseProb = parseFloat(state.reverseProb);
    if (state.cv1Target !== undefined) this.cv1Target = state.cv1Target;
    if (state.cv2Target !== undefined) this.cv2Target = state.cv2Target;

    if (this.card) {
      const getEl = (sel) => this.card.querySelector(sel);
      const srcSel = getEl(`#source_mode_${this.id}`);
      if (srcSel) srcSel.value = this.sourceMode;
      
      const posSlider = getEl(`#pos_slider_${this.id}`);
      if (posSlider) posSlider.value = this.position;
      const posVal = getEl(`#pos_val_${this.id}`);
      if (posVal) posVal.textContent = `${Math.round(this.position * 100)}%`;

      const sizeSlider = getEl(`#size_slider_${this.id}`);
      if (sizeSlider) sizeSlider.value = Math.round(this.grainSize * 1000);
      const sizeVal = getEl(`#size_val_${this.id}`);
      if (sizeVal) sizeVal.textContent = `${Math.round(this.grainSize * 1000)}ms`;

      const densSlider = getEl(`#dens_slider_${this.id}`);
      if (densSlider) densSlider.value = this.density;
      const densVal = getEl(`#dens_val_${this.id}`);
      if (densVal) densVal.textContent = `${this.density}/s`;

      const pitchSlider = getEl(`#pitch_slider_${this.id}`);
      if (pitchSlider) pitchSlider.value = this.pitch;
      const pitchVal = getEl(`#pitch_val_${this.id}`);
      if (pitchVal) pitchVal.textContent = `${this.pitch.toFixed(2)}x`;

      const spraySlider = getEl(`#spray_slider_${this.id}`);
      if (spraySlider) spraySlider.value = this.spray;
      const sprayVal = getEl(`#spray_val_${this.id}`);
      if (sprayVal) sprayVal.textContent = `${Math.round(this.spray * 100)}%`;

      const revSlider = getEl(`#rev_slider_${this.id}`);
      if (revSlider) revSlider.value = this.reverseProb;
      const revVal = getEl(`#rev_val_${this.id}`);
      if (revVal) revVal.textContent = `${Math.round(this.reverseProb * 100)}%`;

      const cv1Sel = getEl(`#cv1_target_${this.id}`);
      if (cv1Sel) cv1Sel.value = this.cv1Target;

      const cv2Sel = getEl(`#cv2_target_${this.id}`);
      if (cv2Sel) cv2Sel.value = this.cv2Target;

      this.drawWaveform();
    }
  }

  initLiveRecorder() {
    this.analyserL = this.audioCtx.createAnalyser();
    this.analyserR = this.audioCtx.createAnalyser();
    this.analyserL.fftSize = 2048;
    this.analyserR.fftSize = 2048;

    this.inputL.connect(this.analyserL);
    this.inputR.connect(this.analyserR);

    const dataL = new Float32Array(this.analyserL.fftSize);
    const dataR = new Float32Array(this.analyserR.fftSize);

    this.recTimer = setInterval(() => {
      if (this.sourceMode !== 'live') return;

      this.analyserL.getFloatTimeDomainData(dataL);
      this.analyserR.getFloatTimeDomainData(dataR);

      const liveL = this.liveBuffer.getChannelData(0);
      const liveR = this.liveBuffer.getChannelData(1);
      const maxLen = this.liveBuffer.length;

      const chunk = 128;
      for (let i = 0; i < chunk; i++) {
        liveL[this.writePos] = dataL[i] || 0;
        liveR[this.writePos] = dataR[i] || 0;
        this.writePos = (this.writePos + 1) % maxLen;
      }
    }, 15);
  }

  getActiveBuffer() {
    return this.sourceMode === 'file' ? this.fileBuffer : this.liveBuffer;
  }

  renderHTML() {
    setTimeout(() => {
      const card = document.getElementById(`module_card_${this.id}`);
      if (card) card.style.width = '380px';
    }, 0);

    return `
      <div class="node-header">
        <span>Granular Cloud</span>
        <button class="delete-module-btn" onclick="window.synthApp.deleteNode('${this.id}')">×</button>
      </div>

      <div class="node-body" style="padding: 12px; display: flex; flex-direction: column; gap: 10px;">
        
        <div style="display: flex; flex-direction: column; gap: 8px; background: #f8fafc; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
          <div style="display: flex; gap: 8px; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <label style="font-size: 11px; font-weight: 600;">Source:</label>
              <select id="source_mode_${this.id}" class="control-select" style="font-size: 11px; padding: 2px 4px;">
                <option value="live" ${this.sourceMode === 'live' ? 'selected' : ''}>Live Input</option>
                <option value="file" ${this.sourceMode === 'file' ? 'selected' : ''}>Audio File</option>
              </select>
            </div>

            <div id="file_controls_${this.id}" style="display: ${this.sourceMode === 'file' ? 'block' : 'none'};">
              <button id="btn_upload_${this.id}" class="add-module-btn" style="font-size: 10px; padding: 3px 8px;">Load File</button>
              <input type="file" id="file_input_${this.id}" accept="audio/*" style="display:none;">
            </div>
          </div>

          <canvas id="waveform_${this.id}" width="340" height="40" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; width: 100%; height: 40px;"></canvas>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
          <div class="control-group">
            <label style="font-size: 10px; font-weight: 600;">CV 1 Target</label>
            <select id="cv1_target_${this.id}" class="control-select">
              <option value="position" ${this.cv1Target === 'position' ? 'selected' : ''}>Position</option>
              <option value="grainSize" ${this.cv1Target === 'grainSize' ? 'selected' : ''}>Grain Size</option>
              <option value="density" ${this.cv1Target === 'density' ? 'selected' : ''}>Density</option>
              <option value="pitch" ${this.cv1Target === 'pitch' ? 'selected' : ''}>Pitch</option>
              <option value="spray" ${this.cv1Target === 'spray' ? 'selected' : ''}>Spray</option>
            </select>
          </div>
          <div class="control-group">
            <label style="font-size: 10px; font-weight: 600;">CV 2 Target</label>
            <select id="cv2_target_${this.id}" class="control-select">
              <option value="pitch" ${this.cv2Target === 'pitch' ? 'selected' : ''}>Pitch</option>
              <option value="position" ${this.cv2Target === 'position' ? 'selected' : ''}>Position</option>
              <option value="grainSize" ${this.cv2Target === 'grainSize' ? 'selected' : ''}>Grain Size</option>
              <option value="density" ${this.cv2Target === 'density' ? 'selected' : ''}>Density</option>
              <option value="spray" ${this.cv2Target === 'spray' ? 'selected' : ''}>Spray</option>
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div class="control-group">
            <label style="font-size: 10px; font-weight: 600; display: flex; justify-content: space-between;">Position: <span id="pos_val_${this.id}">${Math.round(this.position * 100)}%</span></label>
            <input type="range" id="pos_slider_${this.id}" min="0" max="1" step="0.01" value="${this.position}">
          </div>
          <div class="control-group">
            <label style="font-size: 10px; font-weight: 600; display: flex; justify-content: space-between;">Size: <span id="size_val_${this.id}">${Math.round(this.grainSize * 1000)}ms</span></label>
            <input type="range" id="size_slider_${this.id}" min="10" max="500" step="1" value="${Math.round(this.grainSize * 1000)}">
          </div>
          <div class="control-group">
            <label style="font-size: 10px; font-weight: 600; display: flex; justify-content: space-between;">Density: <span id="dens_val_${this.id}">${this.density}/s</span></label>
            <input type="range" id="dens_slider_${this.id}" min="1" max="100" step="1" value="${this.density}">
          </div>
          <div class="control-group">
            <label style="font-size: 10px; font-weight: 600; display: flex; justify-content: space-between;">Pitch: <span id="pitch_val_${this.id}">${this.pitch.toFixed(2)}x</span></label>
            <input type="range" id="pitch_slider_${this.id}" min="0.25" max="4" step="0.01" value="${this.pitch}">
          </div>
          <div class="control-group">
            <label style="font-size: 10px; font-weight: 600; display: flex; justify-content: space-between;">Spray: <span id="spray_val_${this.id}">${Math.round(this.spray * 100)}%</span></label>
            <input type="range" id="spray_slider_${this.id}" min="0" max="1" step="0.01" value="${this.spray}">
          </div>
          <div class="control-group">
            <label style="font-size: 10px; font-weight: 600; display: flex; justify-content: space-between;">Reverse: <span id="rev_val_${this.id}">${Math.round(this.reverseProb * 100)}%</span></label>
            <input type="range" id="rev_slider_${this.id}" min="0" max="1" step="0.01" value="${this.reverseProb}">
          </div>
        </div>

        <div class="ports-row" style="display: flex; justify-content: space-around; align-items: center; padding-top: 8px; border-top: 1px solid #e2e8f0; margin-top: 2px;">
          <div class="port-group" style="display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700;">
            <div class="port port-in" data-port-type="in_l" data-node-id="${this.id}"></div>
            <span>IN L</span>
          </div>
          <div class="port-group" style="display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700;">
            <div class="port port-in" data-port-type="in_r" data-node-id="${this.id}"></div>
            <span>IN R</span>
          </div>
          <div class="port-group" style="display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700;">
            <div class="port port-in" data-port-type="cv1" data-node-id="${this.id}"></div>
            <span>CV 1</span>
          </div>
          <div class="port-group" style="display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700;">
            <div class="port port-in" data-port-type="cv2" data-node-id="${this.id}"></div>
            <span>CV 2</span>
          </div>
          <div class="port-group" style="display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700;">
            <span>OUT L</span>
            <div class="port port-out" data-port-type="out_l" data-node-id="${this.id}"></div>
          </div>
          <div class="port-group" style="display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700;">
            <span>OUT R</span>
            <div class="port port-out" data-port-type="out_r" data-node-id="${this.id}"></div>
          </div>
        </div>

      </div>
    `;
  }

  bindEvents(card) {
    this.card = card;
    const getEl = (sel) => card.querySelector(sel);

    const interactiveEls = card.querySelectorAll('input, select, button, canvas');
    interactiveEls.forEach(el => {
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
      el.addEventListener('mousedown', (e) => e.stopPropagation());
    });

    const sourceSel = getEl(`#source_mode_${this.id}`);
    const fileControls = getEl(`#file_controls_${this.id}`);
    if (sourceSel) {
      sourceSel.addEventListener('change', (e) => {
        this.sourceMode = e.target.value;
        if (fileControls) {
          fileControls.style.display = this.sourceMode === 'file' ? 'block' : 'none';
        }
        this.drawWaveform();
      });
    }

    const fileInput = getEl(`#file_input_${this.id}`);
    const uploadBtn = getEl(`#btn_upload_${this.id}`);

    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          this.audioCtx.decodeAudioData(evt.target.result, (decoded) => {
            this.setBuffer(decoded);
          });
        };
        reader.readAsArrayBuffer(file);
      });
    }

    const posSlider = getEl(`#pos_slider_${this.id}`);
    if (posSlider) {
      posSlider.addEventListener('input', (e) => {
        this.position = parseFloat(e.target.value);
        getEl(`#pos_val_${this.id}`).textContent = `${Math.round(this.position * 100)}%`;
        this.drawWaveform();
      });
    }

    const sizeSlider = getEl(`#size_slider_${this.id}`);
    if (sizeSlider) {
      sizeSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        this.grainSize = val / 1000;
        getEl(`#size_val_${this.id}`).textContent = `${val}ms`;
      });
    }

    const densSlider = getEl(`#dens_slider_${this.id}`);
    if (densSlider) {
      densSlider.addEventListener('input', (e) => {
        this.density = parseInt(e.target.value);
        getEl(`#dens_val_${this.id}`).textContent = `${this.density}/s`;
      });
    }

    const pitchSlider = getEl(`#pitch_slider_${this.id}`);
    if (pitchSlider) {
      pitchSlider.addEventListener('input', (e) => {
        this.pitch = parseFloat(e.target.value);
        getEl(`#pitch_val_${this.id}`).textContent = `${this.pitch.toFixed(2)}x`;
      });
    }

    const spraySlider = getEl(`#spray_slider_${this.id}`);
    if (spraySlider) {
      spraySlider.addEventListener('input', (e) => {
        this.spray = parseFloat(e.target.value);
        getEl(`#spray_val_${this.id}`).textContent = `${Math.round(this.spray * 100)}%`;
      });
    }

    const revSlider = getEl(`#rev_slider_${this.id}`);
    if (revSlider) {
      revSlider.addEventListener('input', (e) => {
        this.reverseProb = parseFloat(e.target.value);
        getEl(`#rev_val_${this.id}`).textContent = `${Math.round(this.reverseProb * 100)}%`;
      });
    }

    const cv1Sel = getEl(`#cv1_target_${this.id}`);
    if (cv1Sel) {
      cv1Sel.addEventListener('change', (e) => {
        this.cv1Target = e.target.value;
      });
    }

    const cv2Sel = getEl(`#cv2_target_${this.id}`);
    if (cv2Sel) {
      cv2Sel.addEventListener('change', (e) => {
        this.cv2Target = e.target.value;
      });
    }

    this.drawWaveform();
  }

  setBuffer(buffer) {
    this.fileBuffer = buffer;
    
    // יצירת עותק הפוך מראש בזיכרון ללא שימוש ב-playbackRate שלילי
    const sr = buffer.sampleRate;
    this.reversedBuffer = this.audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sr);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const src = buffer.getChannelData(c);
      const dest = this.reversedBuffer.getChannelData(c);
      for (let i = 0; i < src.length; i++) {
        dest[i] = src[src.length - 1 - i];
      }
    }

    if (this.sourceMode === 'file') {
      this.drawWaveform();
    }
  }

  startEngine() {
    this.isEngineRunning = true;
    this.nextGrainTime = this.audioCtx.currentTime;

    const scheduler = () => {
      if (!this.isEngineRunning) return;

      const scheduleAheadTime = 0.1; // שניות קדימה לתזמון מדויק בשעון הקול
      while (this.nextGrainTime < this.audioCtx.currentTime + scheduleAheadTime) {
        this.triggerGrainAt(this.nextGrainTime);
        const intervalSec = 1.0 / Math.max(1, this.density);
        this.nextGrainTime += intervalSec;
      }

      if (this.sourceMode === 'live') {
        this.drawWaveform();
      }

      setTimeout(scheduler, 25);
    };

    scheduler();
  }

  triggerGrainAt(time) {
    const activeBuf = this.getActiveBuffer();
    if (!activeBuf) return;

    const isReverse = Math.random() < this.reverseProb;
    const targetBuffer = (isReverse && this.sourceMode === 'file' && this.reversedBuffer) 
      ? this.reversedBuffer 
      : activeBuf;

    const grainSource = this.audioCtx.createBufferSource();
    grainSource.buffer = targetBuffer;

    const grainGain = this.audioCtx.createGain();
    const panner = this.audioCtx.createStereoPanner ? this.audioCtx.createStereoPanner() : null;

    let pos = this.position;
    if (this.spray > 0) {
      const jitter = (Math.random() - 0.5) * 2 * this.spray;
      pos = Math.max(0, Math.min(1, pos + jitter));
    }

    let grainOffset = 0;
    if (this.sourceMode === 'live') {
      const totalLen = activeBuf.duration;
      const writeTime = (this.writePos / activeBuf.length) * totalLen;
      grainOffset = (writeTime + pos * totalLen) % totalLen;
    } else {
      grainOffset = pos * activeBuf.duration;
    }

    grainSource.playbackRate.value = Math.max(0.1, this.pitch);

    const dur = Math.max(0.01, this.grainSize);
    const attack = dur * 0.3;
    const release = dur * 0.3;

    grainGain.gain.setValueAtTime(0.0001, time);
    grainGain.gain.linearRampToValueAtTime(0.5, time + attack);
    grainGain.gain.setValueAtTime(0.5, time + dur - release);
    grainGain.gain.linearRampToValueAtTime(0.0001, time + dur);

    grainSource.connect(grainGain);
    if (panner) {
      panner.pan.value = (Math.random() - 0.5) * 0.8;
      grainGain.connect(panner);
      panner.connect(this.outputL);
      panner.connect(this.outputR);
    } else {
      grainGain.connect(this.outputL);
      grainGain.connect(this.outputR);
    }

    try {
      grainSource.start(time, grainOffset, dur);
      grainSource.stop(time + dur + 0.02);
    } catch (e) {}
  }

  getAudioOutput(portType) {
    if (portType === 'out_r') return this.outputR;
    return this.outputL;
  }

  getAudioInput(portType) {
    if (portType === 'in_r') return this.inputR;
    if (portType === 'in_l') return this.inputL;
    if (portType === 'cv2') return this.cv2Node;
    return this.cv1Node;
  }

  drawWaveform() {
    if (!this.card) return;
    const canvas = this.card.querySelector(`#waveform_${this.id}`);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    const activeBuf = this.getActiveBuffer();

    if (!activeBuf || (this.sourceMode === 'file' && !this.fileBuffer)) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No Audio Loaded', w / 2, h / 2 + 3);
      return;
    }

    const data = activeBuf.getChannelData(0);
    const step = Math.ceil(data.length / w);
    const amp = h / 2;

    ctx.fillStyle = '#64748b';
    for (let i = 0; i < w; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[i * step + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
    }

    let posX = this.position * w;
    if (this.sourceMode === 'live') {
      const writePercent = this.writePos / activeBuf.length;
      posX = ((writePercent + this.position) % 1) * w;

      const writeX = writePercent * w;
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(writeX, 0);
      ctx.lineTo(writeX, h);
      ctx.stroke();
    }

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(posX, 0);
    ctx.lineTo(posX, h);
    ctx.stroke();
  }

  cleanup() {
    this.isEngineRunning = false;
    if (this.recTimer) clearInterval(this.recTimer);
  }
}