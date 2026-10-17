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

    // The room itself is an AudioWorklet (REVERB_WORKLET below): 8 feedback delay lines whose
    // lengths (Radius) and feedback (Decay) glide smoothly, so both sliders move like any other.
    // Until the worklet is loaded the wet path is silent.
    this.room = null;
    this.roomIn = this.audioCtx.createGain();
    this.roomOut = this.audioCtx.createGain();
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
    // With nothing in IN R, the IN L sound is the dry sound on both sides (a mono source stays centered)
    this.inRCables = 0;
    this.leftIn.connect(this.dryGainR);
    this.monoDryR = true;
    this.dryGainL.connect(this.leftOut);
    this.dryGainR.connect(this.rightOut);

    this.leftIn.connect(this.dampingFilter);
    this.rightIn.connect(this.dampingFilter);
    this.dampingFilter.connect(this.saturator);
    this.saturator.connect(this.roomIn);
    // The room is stereo: its left channel goes to OUT L and its right channel to OUT R
    this.roomSplit = this.audioCtx.createChannelSplitter(2);
    this.roomOut.connect(this.roomSplit);
    this.roomSplit.connect(this.wetGainL, 0);
    this.roomSplit.connect(this.wetGainR, 1);

    this.wetGainL.connect(this.leftOut);
    this.wetGainR.connect(this.rightOut);

    this.updateGains();
    this.updateFilter();
    this.updateWarp();

    ReverbModule.loadWorklet(this.audioCtx).then(() => {
      if (this.destroyed) return;
      this.room = new AudioWorkletNode(this.audioCtx, 'reverb-room', {
        numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2],
        channelCount: 1, channelCountMode: 'explicit',
        parameterData: { radius: this.radius, decay: this.decay }
      });
      this.roomIn.connect(this.room);
      this.room.connect(this.roomOut);
    }).catch(err => console.warn('Reverb: AudioWorklet unavailable, reverb is silent.', err));
  }

  static loadWorklet(ctx) {
    if (!ctx.audioWorklet) return Promise.reject(new Error('AudioWorklet not supported'));
    if (!ReverbModule.workletReady || ReverbModule.workletCtx !== ctx) {
      ReverbModule.workletCtx = ctx;
      const url = URL.createObjectURL(new Blob([REVERB_WORKLET], { type: 'application/javascript' }));
      ReverbModule.workletReady = ctx.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url));
    }
    return ReverbModule.workletReady;
  }

  // Radius / Decay: the worklet glides to the new value by itself
  updateRoom() {
    if (!this.room) return;
    const t = this.audioCtx.currentTime;
    this.room.parameters.get('radius').setValueAtTime(this.radius, t);
    this.room.parameters.get('decay').setValueAtTime(this.decay, t);
  }

  cleanup() {
    this.destroyed = true;
    if (this.room) {
      this.room.port.postMessage('stop');
      try { this.room.disconnect(); } catch (e) {}
    }
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

  // app.js tells us when a cable is plugged into or pulled out of an input
  onInputConnected(key, connected) {
    if (key !== 'in_r') return;
    this.inRCables = Math.max(0, this.inRCables + (connected ? 1 : -1));
    const mono = this.inRCables === 0;
    if (mono === this.monoDryR) return;
    this.monoDryR = mono;
    if (mono) this.leftIn.connect(this.dryGainR);
    else { try { this.leftIn.disconnect(this.dryGainR); } catch (e) {} }
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
      mod.updateRoom();
    } else if (param === 'decay') {
      mod.decay = numVal;
      if (valDisplay) valDisplay.textContent = `${numVal}s`;
      mod.updateRoom();
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

// The room (runs on the audio thread). Mono in, stereo out.
// Input diffusion: 4 allpass filters in a row. Then 8 delay lines (prime-ish lengths times a
// size factor from Radius) mixed back into each other through a Householder matrix
// (y = x - 2/8 * sum), each with a gentle one-pole low-pass in its loop. Feedback per line
// g = 10^(-3 * length / (Decay * sampleRate)), so the tail falls 60 dB in Decay seconds.
// Line lengths glide (time constant ~40 ms, read with linear interpolation), so moving Radius
// sounds like a smooth sweep instead of a jump; Decay is applied every block. The output is
// scaled by 0.29 * sqrt(1 - mean feedback^2) so a longer Decay is not much louder.
const REVERB_WORKLET = `
const LINE_MS = [29.7, 37.1, 41.1, 43.7, 53.3, 59.9, 67.7, 73.1];
const AP_MS = [4.8, 3.6, 12.7, 9.3];
const AP_G = 0.7;
const sizeOf = r => 0.25 + (Math.max(1, Math.min(50, r)) / 50) * 1.75;

class ReverbRoom extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'radius', defaultValue: 15, minValue: 1, maxValue: 50, automationRate: 'k-rate' },
      { name: 'decay', defaultValue: 3.5, minValue: 0.2, maxValue: 12, automationRate: 'k-rate' }
    ];
  }
  constructor(opts) {
    super();
    const sr = sampleRate;
    this.alive = true;
    this.port.onmessage = e => { if (e.data === 'stop') this.alive = false; };
    const maxLen = Math.ceil(0.075 * 2 * sr) + 4;
    this.lines = LINE_MS.map(ms => ({ buf: new Float32Array(maxLen), pos: 0, base: ms / 1000 * sr, len: 0, lp: 0, g: 0 }));
    this.aps = AP_MS.map(ms => ({ buf: new Float32Array(Math.ceil(ms / 1000 * sr)), pos: 0 }));
    const p = (opts && opts.parameterData) || {};
    this.size = sizeOf(p.radius !== undefined ? p.radius : 15);
    this.lines.forEach(l => { l.len = l.base * this.size; });
    this.slew = 1 - Math.exp(-1 / (0.04 * sr));
    this.maxLen = maxLen;
  }
  process(inputs, outputs, params) {
    if (!this.alive) return false;
    const input = inputs[0] && inputs[0][0];
    const outL = outputs[0][0], outR = outputs[0][1];
    const n = outL.length;
    const targetSize = sizeOf(params.radius[0]);
    const decaySamples = params.decay[0] * sampleRate;
    const lines = this.lines, aps = this.aps, maxLen = this.maxLen, slew = this.slew;
    let gm = 0;
    for (const l of lines) { l.g = Math.pow(10, -3 * l.len / decaySamples); gm += l.g / 8; }
    // Longer tails hold more energy: scale the output so the level stays about the same
    const outGain = 0.29 * Math.sqrt(1 - gm * gm);
    const g0 = this.outGain === undefined ? outGain : this.outGain;
    const taps = new Float32Array(8);
    for (let i = 0; i < n; i++) {
      // input diffusion
      let x = input ? input[i] : 0;
      for (const a of aps) {
        const d = a.buf[a.pos];
        const y = d - AP_G * x;
        a.buf[a.pos] = x + AP_G * y;
        a.pos = (a.pos + 1) % a.buf.length;
        x = y;
      }
      this.size += (targetSize - this.size) * slew;
      // read every line (fractional, linear interpolation)
      let sum = 0;
      for (let k = 0; k < 8; k++) {
        const l = lines[k];
        l.len = l.base * this.size;
        let rp = l.pos - l.len;
        if (rp < 0) rp += maxLen;
        const i0 = Math.floor(rp), fr = rp - i0;
        const i1 = (i0 + 1) % maxLen;
        let v = l.buf[i0] + (l.buf[i1] - l.buf[i0]) * fr;
        l.lp += (v - l.lp) * 0.6;   // damping inside the loop
        v = l.lp * l.g;
        taps[k] = v;
        sum += v;
      }
      const h = sum * 0.25;
      let L = 0, R = 0;
      for (let k = 0; k < 8; k++) {
        const l = lines[k];
        const fb = taps[k] - h;
        l.buf[l.pos] = fb + ((k & 1) ? -x : x);
        l.pos = (l.pos + 1) % maxLen;
        if (k & 1) R += taps[k]; else L += taps[k];
      }
      const og = g0 + (outGain - g0) * (i / n);
      outL[i] = L * og;
      outR[i] = R * og;
    }
    this.outGain = outGain;
    return true;
  }
}
registerProcessor('reverb-room', ReverbRoom);
`;
