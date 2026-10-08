class VcaModule {
  constructor(id, audioCtx) {
    this.id = id;
    this.audioCtx = audioCtx;
    this.card = null;

    // יצירת רכיב ה-Gain של Web Audio API
    this.gainNode = this.audioCtx.createGain();
    this.gainValue = 0.0; // intended gain; gain.value lags behind while the audio engine ramps
    this.gainNode.gain.setValueAtTime(0.0, this.audioCtx.currentTime); // ברירת מחדל: שקט (נפתח רק כשמגיעה מעטפת/CV)

    this.audioInput = this.gainNode;
    this.audioOutput = this.gainNode;
  }

  getState() {
    return { gain: this.gainValue };
  }

  setState(state) {
    if (!state) return;
    if (state.gain !== undefined) {
      this.setGain(state.gain);

      if (this.card) {
        const gainSlider = this.card.querySelector(`#vca_gain_${this.id}`);
        if (gainSlider) gainSlider.value = state.gain;

        const gainVal = this.card.querySelector(`#vca_val_${this.id}`);
        if (gainVal) gainVal.textContent = `${Math.round(state.gain * 100)}%`;
      }
    }
  }

  setGain(val) {
    const gainVal = Math.max(0, Math.min(1, parseFloat(val)));
    this.gainValue = gainVal;
    const now = this.audioCtx.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setTargetAtTime(gainVal, now, 0.003);
  }

  getAudioInput(type) {
    // אם החיבור מגיע לכניסת CV, מחברים אותו ישירות אל פרמטר ה-gain
    if (type === 'cv' || type === 'gain') {
      return this.gainNode.gain;
    }
    return this.audioInput;
  }

  getAudioOutput() {
    return this.audioOutput;
  }

  renderHTML() {
    return `
      <div class="node-header">
        <span>VCA (Amplifier)</span>
        <button class="delete-module-btn" title="Delete Module" onclick="synthApp.deleteNode('${this.id}')">✕</button>
      </div>
      <div class="node-body" style="padding: 12px; display: flex; flex-direction: column; gap: 10px;">
        <div class="control-group">
          <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Initial Gain: <span id="vca_val_${this.id}">${Math.round(this.gainNode.gain.value * 100)}%</span></label>
          <input type="range" id="vca_gain_${this.id}" min="0" max="1" step="0.01" value="${this.gainNode.gain.value}">
        </div>

        <div class="ports-row" style="display: flex; justify-content: space-around; align-items: center; padding-top: 8px; border-top: 1px solid #3f3f46;">
          <div class="port-group" style="display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700;">
            <div class="port port-in" data-node-id="${this.id}" data-port-type="audio" title="Audio Input"></div>
            <span>IN</span>
          </div>
          <div class="port-group" style="display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700;">
            <div class="port port-in" data-node-id="${this.id}" data-port-type="cv" title="CV / Envelope Input"></div>
            <span>CV</span>
          </div>
          <div class="port-group" style="display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700;">
            <span>OUT</span>
            <div class="port port-out" data-node-id="${this.id}" data-port-type="audio" title="Audio Output"></div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents(card) {
    this.card = card;
    card.style.width = '240px';

    const gainSlider = card.querySelector(`#vca_gain_${this.id}`);
    const gainVal = card.querySelector(`#vca_val_${this.id}`);

    if (gainSlider) {
      gainSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.setGain(val);
        if (gainVal) gainVal.textContent = `${Math.round(val * 100)}%`;
      });
    }
  }

  cleanup() {
    try {
      this.gainNode.disconnect();
    } catch (e) {}
  }
}