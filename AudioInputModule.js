class AudioInputModule {
  constructor(id, audioCtx) {
    this.id = id;
    this.audioCtx = audioCtx || (window.audioEngine ? window.audioEngine.getContext() : new (window.AudioContext || window.webkitAudioContext)());

    this.gainVal = 0.7;
    this.useCompressor = true;
    this.isActive = false;

    // דרג הגבר כניסה
    this.inputGainNode = this.audioCtx.createGain();
    this.inputGainNode.gain.value = this.gainVal;

    // קומפרסור להחלקת עוצמות ומניעת עיוותים
    this.compressor = this.audioCtx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-20, this.audioCtx.currentTime);
    this.compressor.knee.setValueAtTime(25, this.audioCtx.currentTime);
    this.compressor.ratio.setValueAtTime(8, this.audioCtx.currentTime);
    this.compressor.attack.setValueAtTime(0.005, this.audioCtx.currentTime);
    this.compressor.release.setValueAtTime(0.2, this.audioCtx.currentTime);

    // אנלייזר למדידת עוצמת השמע בלייב (Visual Signal Indicator)
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 64;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.animFrameId = null;

    // יציאה ראשית
    this.outputNode = this.audioCtx.createGain();
    this.outputNode.gain.value = 1.0;

    this.mediaStream = null;
    this.sourceNode = null;
  }

  renderHTML() {
    return `
      <div class="node-header">
        <span class="node-title">Mic / Audio In</span>
        <button class="delete-module-btn" onclick="window.synthApp.deleteNode('${this.id}')" title="Delete Module">×</button>
      </div>
      <div class="node-body" style="padding: 12px; display: flex; flex-direction: column; gap: 10px;">
        <div class="control-group button-group">
          <button id="mic_toggle_${this.id}" class="action-btn" style="width: 100%; padding: 6px; cursor: pointer;">Enable Mic</button>
        </div>

        <div class="control-group">
          <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Input Level: <span id="val_gain_${this.id}">${Math.round(this.gainVal * 100)}%</span></label>
          <input type="range" id="gain_${this.id}" min="0" max="1.5" step="0.02" value="${this.gainVal}">
        </div>

        <div class="control-group checkbox-group" style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="comp_toggle_${this.id}" ${this.useCompressor ? 'checked' : ''}>
          <label for="comp_toggle_${this.id}" style="font-size: 11px; cursor: pointer;">Auto-Level & Anti-Clip</label>
        </div>

        <div>
          <div style="font-size: 10px; color: #888; margin-bottom: 3px;">Signal Indicator</div>
          <div style="width: 100%; height: 6px; background: #222; border-radius: 3px; overflow: hidden;">
            <div id="meter_bar_${this.id}" style="width: 0%; height: 100%; background: #4caf50; transition: width 0.05s ease;"></div>
          </div>
        </div>

        <div class="status-indicator" id="status_${this.id}" style="font-size: 11px; text-align: center; opacity: 0.8;">
          Status: Off
        </div>

        <div class="ports-row" style="display: flex; justify-content: space-around; align-items: center; padding-top: 6px; border-top: 1px solid #e2e8f0;">
          <div class="port-group"></div>
          <div class="port-group" style="display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700;">
            <span>OUT</span>
            <div class="port port-out" data-port-type="audio" data-node-id="${this.id}" title="Audio Output"></div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents(card) {
    const toggleBtn = card.querySelector(`#mic_toggle_${this.id}`);
    const gainInput = card.querySelector(`#gain_${this.id}`);
    const compCheckbox = card.querySelector(`#comp_toggle_${this.id}`);

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleMicrophone(toggleBtn, card);
      });
    }

    if (gainInput) {
      gainInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.setGain(val);
        const display = card.querySelector(`#val_gain_${this.id}`);
        if (display) display.textContent = `${Math.round(val * 100)}%`;
      });
    }

    if (compCheckbox) {
      compCheckbox.addEventListener('change', (e) => {
        this.useCompressor = e.target.checked;
        this.reconnectChain();
      });
    }
  }

  async toggleMicrophone(btn, card) {
    if (!this.isActive) {
      await this.startMicrophone(btn, card);
    } else {
      this.stopMicrophone(btn, card);
    }
  }

  watchMicInterruptions(btn, card) {
    if (this.onPageReturn) return;
    this.onPageReturn = () => {
      if (document.visibilityState !== 'visible' || !this.isActive || !this.mediaStream) return;
      const live = this.mediaStream.getAudioTracks().some(t => t.readyState === 'live');
      if (!live) {
        this.stopMicrophone(btn, card);
        this.startMicrophone(btn, card);
      }
    };
    document.addEventListener('visibilitychange', this.onPageReturn);
    window.addEventListener('pageshow', this.onPageReturn);
  }

  async startMicrophone(btn, card) {
    if (this.audioCtx.state !== 'running' && this.audioCtx.state !== 'closed') {
      try { await this.audioCtx.resume(); } catch (e) {}
    }

    const statusEl = card ? card.querySelector(`#status_${this.id}`) : null;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1
        }
      });

      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.reconnectChain();

      // iPad / iPhone may cut the microphone while another app is open: reconnect it on return.
      this.watchMicInterruptions(btn, card);

      this.isActive = true;
      if (btn) {
        btn.textContent = 'Mute Mic';
        btn.classList.add('recording-active');
      }
      if (statusEl) statusEl.textContent = 'Status: Live';

      this.startMeterUpdate(card);
    } catch (err) {
      console.error('[AudioInputModule] Microphone access error:', err);
      if (statusEl) statusEl.textContent = 'Status: Access Denied';
    }
  }

  reconnectChain() {
    if (!this.sourceNode) return;

    try { this.sourceNode.disconnect(); } catch (e) {}
    try { this.inputGainNode.disconnect(); } catch (e) {}
    try { this.compressor.disconnect(); } catch (e) {}

    this.sourceNode.connect(this.analyser);
    this.sourceNode.connect(this.inputGainNode);

    if (this.useCompressor) {
      this.inputGainNode.connect(this.compressor);
      this.compressor.connect(this.outputNode);
    } else {
      this.inputGainNode.connect(this.outputNode);
    }
  }

  startMeterUpdate(card) {
    const meterBar = card ? card.querySelector(`#meter_bar_${this.id}`) : null;
    if (!meterBar) return;

    const update = () => {
      if (!this.isActive) {
        meterBar.style.width = '0%';
        return;
      }

      this.analyser.getByteFrequencyData(this.dataArray);
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        sum += this.dataArray[i];
      }
      const average = sum / this.dataArray.length;
      const percentage = Math.min(100, Math.round((average / 128) * 100));

      meterBar.style.width = `${percentage}%`;
      meterBar.style.backgroundColor = percentage > 85 ? '#f44336' : '#4caf50';

      this.animFrameId = requestAnimationFrame(update);
    };

    update();
  }

  stopMicrophone(btn, card) {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch (e) {}
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.isActive = false;

    const meterBar = card ? card.querySelector(`#meter_bar_${this.id}`) : null;
    if (meterBar) meterBar.style.width = '0%';

    const statusEl = card ? card.querySelector(`#status_${this.id}`) : null;
    if (btn) {
      btn.textContent = 'Enable Mic';
      btn.classList.remove('recording-active');
    }
    if (statusEl) statusEl.textContent = 'Status: Off';
  }

  setGain(val) {
    this.gainVal = val;
    if (this.inputGainNode && this.inputGainNode.gain) {
      const now = this.audioCtx.currentTime;
      this.inputGainNode.gain.setTargetAtTime(this.gainVal, now, 0.015);
    }
  }

  getState() {
    return {
      gainVal: this.gainVal,
      useCompressor: this.useCompressor
    };
  }

  setState(state) {
    if (!state) return;
    if (state.gainVal !== undefined) this.setGain(state.gainVal);
    if (state.useCompressor !== undefined) this.useCompressor = state.useCompressor;

    const card = document.getElementById(`module_card_${this.id}`);
    if (card) {
      const input = card.querySelector(`#gain_${this.id}`);
      const display = card.querySelector(`#val_gain_${this.id}`);
      const compCheckbox = card.querySelector(`#comp_toggle_${this.id}`);
      if (input) input.value = this.gainVal;
      if (display) display.textContent = `${Math.round(this.gainVal * 100)}%`;
      if (compCheckbox) compCheckbox.checked = this.useCompressor;
    }
  }

  getAudioOutput() {
    return this.outputNode;
  }

  cleanup() {
    if (this.onPageReturn) {
      document.removeEventListener('visibilitychange', this.onPageReturn);
      window.removeEventListener('pageshow', this.onPageReturn);
      this.onPageReturn = null;
    }
    this.stopMicrophone();
    if (this.outputNode) {
      try { this.outputNode.disconnect(); } catch (e) {}
    }
  }
}