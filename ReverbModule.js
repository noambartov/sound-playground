class ReverbModule {
  constructor(id, audioCtx) {
    this.id = id;
    this.audioCtx = audioCtx || (window.audioEngine ? window.audioEngine.getContext() : new (window.AudioContext || window.webkitAudioContext)());

    this.leftIn = this.audioCtx.createGain();
    this.rightIn = this.audioCtx.createGain();
    this.leftIn.channelCount = 1;
    this.leftIn.channelCountMode = 'explicit';
    this.rightIn.channelCount = 1;
    this.rightIn.channelCountMode = 'explicit';

    // Two convolvers (A / B): a new room is built in the silent one and crossfaded in,
    // so moving Radius or Decay never cuts the sound (swapping a convolver's buffer resets it)
    this.convolvers = [this.audioCtx.createConvolver(), this.audioCtx.createConvolver()];
    this.convFades = [this.audioCtx.createGain(), this.audioCtx.createGain()];
    this.convFades[1].gain.value = 0;
    this.activeConv = 0;
    this.fadeEnd = 0;
    this.irTimer = null;
    this.dampingFilter = this.audioCtx.createBiquadFilter();
    this.dampingFilter.type = 'lowpass';

    this.saturator = this.audioCtx.createWaveShaper();

    this.dryGainL = this.audioCtx.createGain();
    this.dryGainR = this.audioCtx.createGain();
    this.wetGainL = this.audioCtx.createGain();
    this.wetGainR = this.audioCtx.createGain();

    this.leftOut = this.audioCtx.createGain();
    this.rightOut = this.audioCtx.createGain();

    this.radius = 15;
    this.decay = 3.5;
    this.damping = 4000;
    this.warp = 25;
    this.mix = 0.4;

    this.leftIn.connect(this.dryGainL);
    this.rightIn.connect(this.dryGainR);
    this.dryGainL.connect(this.leftOut);
    this.dryGainR.connect(this.rightOut);

    this.leftIn.connect(this.dampingFilter);
    this.rightIn.connect(this.dampingFilter);
    this.dampingFilter.connect(this.saturator);
    for (let i = 0; i < 2; i++) {
      this.saturator.connect(this.convolvers[i]);
      this.convolvers[i].connect(this.convFades[i]);
      this.convFades[i].connect(this.wetGainL);
      this.convFades[i].connect(this.wetGainR);
    }

    this.wetGainL.connect(this.leftOut);
    this.wetGainR.connect(this.rightOut);

    this.updateGains();
    this.updateFilter();
    this.updateWarp();
    this.convolvers[0].buffer = this.generateSphereImpulse();
  }

  getState() {
    return {
      radius: this.radius,
      decay: this.decay,
      damping: this.damping,
      warp: this.warp,
      mix: this.mix
    };
  }

  setState(state) {
    if (!state) return;
    if (state.radius !== undefined) ReverbModule.updateParam(this.id, 'radius', state.radius);
    if (state.decay !== undefined) ReverbModule.updateParam(this.id, 'decay', state.decay);
    if (state.damping !== undefined) ReverbModule.updateParam(this.id, 'damping', state.damping);
    if (state.warp !== undefined) ReverbModule.updateParam(this.id, 'warp', state.warp);
    if (state.mix !== undefined) ReverbModule.updateParam(this.id, 'mix', state.mix);

    const card = document.getElementById(`module_card_${this.id}`);
    if (card) {
      ['radius', 'decay', 'damping', 'warp', 'mix'].forEach(p => {
        if (state[p] !== undefined) {
          const input = card.querySelector(`input[oninput*="${p}"]`);
          if (input) input.value = state[p];
        }
      });
    }
  }

  generateSphereImpulse() {
    const sampleRate = this.audioCtx.sampleRate;
    const length = Math.floor(sampleRate * Math.max(0.1, this.decay));
    const impulse = this.audioCtx.createBuffer(2, length, sampleRate);
    const leftBuffer = impulse.getChannelData(0);
    const rightBuffer = impulse.getChannelData(1);

    const sizeRatio = this.radius / 50; 
    const decayFactor = 3.5 / (this.decay * sampleRate);

    for (let i = 0; i < length; i++) {
      let envelope = Math.exp(-i * decayFactor);
      let sphericalMod = Math.sin(i / (sampleRate * 0.001 * sizeRatio + 1));
      
      let noiseL = (Math.random() * 2 - 1) * envelope;
      let noiseR = (Math.random() * 2 - 1) * envelope;

      leftBuffer[i] = noiseL * (0.8 + 0.2 * sphericalMod);
      rightBuffer[i] = noiseR * (0.8 - 0.2 * sphericalMod);
    }

    return impulse;
  }

  // Radius / Decay changed: build the new room in the silent convolver and crossfade to it.
  // While a crossfade is still running, the latest setting waits and is applied right after it.
  rebuildImpulse() {
    const ctx = this.audioCtx;
    const t = ctx.currentTime;
    if (ctx.state === 'running' && t < this.fadeEnd) {
      if (!this.irTimer) {
        this.irTimer = setTimeout(() => { this.irTimer = null; this.rebuildImpulse(); }, (this.fadeEnd - t) * 1000 + 10);
      }
      return;
    }
    const fade = ReverbModule.CROSSFADE;
    const next = 1 - this.activeConv;
    this.convolvers[next].buffer = this.generateSphereImpulse();
    [[this.convFades[next], 1], [this.convFades[this.activeConv], 0]].forEach(([g, to]) => {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(1 - to, t);
      g.gain.linearRampToValueAtTime(to, t + fade);
    });
    this.activeConv = next;
    this.fadeEnd = t + fade;
  }

  updateGains() {
    const now = this.audioCtx.currentTime;
    const timeConstant = 0.015;
    this.dryGainL.gain.setTargetAtTime(1 - this.mix, now, timeConstant);
    this.dryGainR.gain.setTargetAtTime(1 - this.mix, now, timeConstant);
    this.wetGainL.gain.setTargetAtTime(this.mix, now, timeConstant);
    this.wetGainR.gain.setTargetAtTime(this.mix, now, timeConstant);
  }

  updateFilter() {
    const now = this.audioCtx.currentTime;
    this.dampingFilter.frequency.setTargetAtTime(this.damping, now, 0.015);
  }

  updateWarp() {
    const k = this.warp;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      let x = (i * 2) / n_samples - 1;
      if (k === 0) {
        curve[i] = x;
      } else {
        curve[i] = ((3 + k * 0.3) * x * 20 * deg) / (Math.PI + k * 0.1 * Math.abs(x));
      }
    }
    this.saturator.curve = curve;
  }

  getAudioInput(portType) {
    if (portType === 'in_r') return this.rightIn;
    return this.leftIn;
  }

  getAudioOutput(portType) {
    if (portType === 'out_r') return this.rightOut;
    return this.leftOut;
  }

  renderHTML() {
    setTimeout(() => {
      const card = document.getElementById(`module_card_${this.id}`);
      if (card) card.style.width = '340px';
    }, 0);

    return `
      <div class="node-header">
        <span>Reverb</span>
        <button class="delete-module-btn" onclick="window.synthApp.deleteNode('${this.id}')">×</button>
      </div>
      <div class="node-body" style="padding: 12px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="control-group">
            <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Radius: <span id="val_radius_${this.id}">${this.radius}m</span></label>
            <input type="range" min="1" max="50" step="1" value="${this.radius}" oninput="ReverbModule.updateParam('${this.id}', 'radius', this.value)">
          </div>

          <div class="control-group">
            <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Decay: <span id="val_decay_${this.id}">${this.decay}s</span></label>
            <input type="range" min="0.2" max="12" step="0.1" value="${this.decay}" oninput="ReverbModule.updateParam('${this.id}', 'decay', this.value)">
          </div>

          <div class="control-group">
            <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Damping: <span id="val_damping_${this.id}">${this.damping}Hz</span></label>
            <input type="range" min="500" max="16000" step="100" value="${this.damping}" oninput="ReverbModule.updateParam('${this.id}', 'damping', this.value)">
          </div>

          <div class="control-group">
            <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Warp: <span id="val_warp_${this.id}">${this.warp}%</span></label>
            <input type="range" min="0" max="100" step="1" value="${this.warp}" oninput="ReverbModule.updateParam('${this.id}', 'warp', this.value)">
          </div>
        </div>

        <div class="control-group">
          <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Mix: <span id="val_mix_${this.id}">${Math.round(this.mix * 100)}%</span></label>
          <input type="range" min="0" max="1" step="0.01" value="${this.mix}" oninput="ReverbModule.updateParam('${this.id}', 'mix', this.value)">
        </div>

        <div class="ports-row" style="display: flex; justify-content: space-around; align-items: center; padding-top: 8px; border-top: 1px solid #e2e8f0; margin-top: 2px;">
          <div class="port-group" style="display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700;">
            <div class="port port-in" data-node-id="${this.id}" data-port-type="in_l"></div>
            <span>IN L</span>
          </div>
          <div class="port-group" style="display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700;">
            <div class="port port-in" data-node-id="${this.id}" data-port-type="in_r"></div>
            <span>IN R</span>
          </div>
          <div class="port-group" style="display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700;">
            <span>OUT L</span>
            <div class="port port-out" data-node-id="${this.id}" data-port-type="out_l"></div>
          </div>
          <div class="port-group" style="display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700;">
            <span>OUT R</span>
            <div class="port port-out" data-node-id="${this.id}" data-port-type="out_r"></div>
          </div>
        </div>
      </div>
    `;
  }

  static updateParam(id, param, value) {
    const mod = window.synthApp ? window.synthApp.getModule(id) : null;
    if (!mod) return;

    const valDisplay = document.getElementById(`val_${param}_${id}`);
    const numVal = parseFloat(value);

    if (param === 'radius') {
      mod.radius = numVal;
      if (valDisplay) valDisplay.textContent = `${numVal}m`;
      mod.rebuildImpulse();
    } else if (param === 'decay') {
      mod.decay = numVal;
      if (valDisplay) valDisplay.textContent = `${numVal}s`;
      mod.rebuildImpulse();
    } else if (param === 'damping') {
      mod.damping = numVal;
      if (valDisplay) valDisplay.textContent = `${numVal}Hz`;
      mod.updateFilter();
    } else if (param === 'warp') {
      mod.warp = numVal;
      if (valDisplay) valDisplay.textContent = `${numVal}%`;
      mod.updateWarp();
    } else if (param === 'mix') {
      mod.mix = numVal;
      if (valDisplay) valDisplay.textContent = `${Math.round(numVal * 100)}%`;
      mod.updateGains();
    }
  }
}

ReverbModule.CROSSFADE = 0.25;   // seconds from the old room to the new one
