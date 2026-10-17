// ADSR envelope drawn in the audio thread: input = gate (on above 0.2), output = envelope 0..1.
// Straight-line segments like the main-thread fallback: Attack from the current value to 1, Decay to
// Sustain, hold, Release from the current value to 0. Times in seconds (at least 3 ms) arrive by port.
const ADSR_WORKLET = `
class AdsrEnvProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.p = { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 };
        this.gate = false; this.stage = 0; this.v = 0; this.from = 0; this.t = 0; this.len = 1;
        this.port.onmessage = (e) => Object.assign(this.p, e.data);
    }
    begin(stage, seconds) {
        this.stage = stage; this.from = this.v; this.t = 0;
        this.len = Math.max(1, Math.max(0.003, seconds) * sampleRate);
    }
    process(inputs, outputs) {
        const gateIn = inputs[0] && inputs[0][0];
        const out = outputs[0][0];
        const p = this.p, sus = Math.min(1, Math.max(0, p.sustain));
        for (let i = 0; i < out.length; i++) {
            const on = gateIn ? gateIn[i] > 0.2 : false;
            if (on && !this.gate) this.begin(1, p.attack);
            else if (!on && this.gate) this.begin(4, p.release);
            this.gate = on;
            if (this.stage === 1) {
                this.v = this.from + (1 - this.from) * (++this.t / this.len);
                if (this.t >= this.len) { this.v = 1; this.begin(2, p.decay); }
            } else if (this.stage === 2) {
                this.v = 1 + (sus - 1) * (++this.t / this.len);
                if (this.t >= this.len) { this.v = sus; this.stage = 3; }
            } else if (this.stage === 3) {
                this.v += (sus - this.v) * 0.002;
            } else if (this.stage === 4) {
                this.v = this.from * (1 - ++this.t / this.len);
                if (this.t >= this.len) { this.v = 0; this.stage = 0; }
            }
            out[i] = this.v;
        }
        return true;
    }
}
registerProcessor('adsr-env-processor', AdsrEnvProcessor);
`;

class EnvelopeModule {
    constructor(id, audioCtx) {
        this.id = id;

        if (window.audioEngine && typeof window.audioEngine.getContext === 'function') {
            this.ctx = window.audioEngine.getContext();
        } else if (audioCtx) {
            this.ctx = audioCtx;
        } else {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }

        // ADSR Parameters (in seconds / ratio)
        this.attack = 0.01;   // 0.001s to 2s
        this.decay = 0.2;     // 0.001s to 2s
        this.sustain = 0.5;   // 0.0 to 1.0
        this.release = 0.3;   // 0.001s to 5s

        // Gate Input Node
        this.gateInputNode = this.ctx.createGain();

        // Output Envelope CV Node. The envelope itself is drawn sample by sample in an AudioWorklet
        // (ADSR_WORKLET) that also reads the gate, so it starts exactly when the gate rises. Scheduling
        // it from the main thread at ctx.currentTime started notes from a stale time and sometimes jumped
        // straight to the top of the attack: a click. envNode is only used by the fallback below.
        this.outNode = this.ctx.createGain();
        this.envNode = this.ctx.createConstantSource();
        this.envNode.offset.setValueAtTime(0, this.ctx.currentTime);
        this.envNode.connect(this.outNode);
        this.envNode.start();

        this.initGateDetector();
    }

    async initGateDetector() {
        try {
            if (this.ctx.audioWorklet) {
                if (!EnvelopeModule.workletReady) {
                    const blob = new Blob([ADSR_WORKLET], { type: 'application/javascript' });
                    const url = URL.createObjectURL(blob);
                    EnvelopeModule.workletReady = this.ctx.audioWorklet.addModule(url)
                        .finally(() => URL.revokeObjectURL(url));
                }
                await EnvelopeModule.workletReady;
                if (this.destroyed) return;

                this.adsrNode = new AudioWorkletNode(this.ctx, 'adsr-env-processor', {
                    numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1]
                });
                this.gateInputNode.connect(this.adsrNode);
                this.adsrNode.connect(this.outNode);
                this.sendParams();
                return;
            }
        } catch (err) {
            console.warn('AudioWorklet initialization fallback:', err);
        }

        // Lightweight Analyser Fallback if AudioWorklet is unavailable
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 32;
        this.gateInputNode.connect(this.analyser);
        const dataArray = new Float32Array(this.analyser.fftSize);
        let lastGateState = false;

        this.fallbackTimer = setInterval(() => {
            this.analyser.getFloatTimeDomainData(dataArray);
            const currentVal = dataArray[0] || 0;
            const isGateOn = currentVal > 0.2;
            if (!lastGateState && isGateOn) {
                this.triggerAttack();
            } else if (lastGateState && !isGateOn) {
                this.triggerRelease();
            }
            lastGateState = isGateOn;
        }, 12);
    }

    sendParams() {
        if (!this.adsrNode) return;
        this.adsrNode.port.postMessage({
            attack: this.attack, decay: this.decay, sustain: this.sustain, release: this.release
        });
    }

    // --- State Protocol ---
    getState() {
        return {
            attack: this.attack,
            decay: this.decay,
            sustain: this.sustain,
            release: this.release
        };
    }

    setState(state) {
        if (!state) return;
        if (state.attack !== undefined) this.setAttack(state.attack);
        if (state.decay !== undefined) this.setDecay(state.decay);
        if (state.sustain !== undefined) this.setSustain(state.sustain);
        if (state.release !== undefined) this.setRelease(state.release);

        const card = document.getElementById(`module_card_${this.id}`);
        if (card) {
            const aIn = card.querySelector('input[oninput*="setAttack"]');
            if (aIn) aIn.value = this.attack;
            const dIn = card.querySelector('input[oninput*="setDecay"]');
            if (dIn) dIn.value = this.decay;
            const sIn = card.querySelector('input[oninput*="setSustain"]');
            if (sIn) sIn.value = this.sustain;
            const rIn = card.querySelector('input[oninput*="setRelease"]');
            if (rIn) rIn.value = this.release;
        }
    }

    getAudioInput(portType) {
        return this.gateInputNode;
    }

    getAudioOutput(portType) {
        return this.outNode;
    }

    // --- ADSR Trigger Logic ---
    // The envelope is a chain of straight lines; this.points ([time, value] corners) remembers it,
    // so a new gate starts exactly from where the envelope is now. (cancelAndHoldAtTime followed by
    // a ramp jumps in Chrome when a note is played again during the release: a click.)
    valueAt(t) {
        const pts = this.points || [[0, 0]];
        if (t <= pts[0][0]) return pts[0][1];
        for (let i = 1; i < pts.length; i++) {
            const [t1, v1] = pts[i];
            if (t <= t1) {
                const [t0, v0] = pts[i - 1];
                return t1 > t0 ? v0 + (v1 - v0) * (t - t0) / (t1 - t0) : v1;
            }
        }
        return pts[pts.length - 1][1];
    }

    startFromNow(now) {
        const param = this.envNode.offset;
        const v = this.valueAt(now);
        param.cancelScheduledValues(now);
        param.setValueAtTime(v, now);
        this.points = [[now, v]];
    }

    rampTo(value, time) {
        this.envNode.offset.linearRampToValueAtTime(value, time);
        this.points.push([time, value]);
    }

    triggerAttack() {
        const now = this.ctx.currentTime;
        this.startFromNow(now);

        const attackTime = Math.max(0.003, this.attack);
        const decayTime = Math.max(0.003, this.decay);

        this.rampTo(1.0, now + attackTime);
        this.rampTo(this.sustain, now + attackTime + decayTime);
    }

    triggerRelease() {
        const now = this.ctx.currentTime;
        this.startFromNow(now);

        const releaseTime = Math.max(0.003, this.release);
        this.rampTo(0.0, now + releaseTime);
    }

    // --- Control Setters ---
    setAttack(val) {
        this.attack = parseFloat(val);
        this.sendParams();
        const label = document.getElementById(`env_a_val_${this.id}`);
        if (label) label.innerText = this.formatTime(this.attack);
    }

    setDecay(val) {
        this.decay = parseFloat(val);
        this.sendParams();
        const label = document.getElementById(`env_d_val_${this.id}`);
        if (label) label.innerText = this.formatTime(this.decay);
    }

    setSustain(val) {
        this.sustain = parseFloat(val);
        this.sendParams();
        const label = document.getElementById(`env_s_val_${this.id}`);
        if (label) label.innerText = Math.round(this.sustain * 100) + '%';
    }

    setRelease(val) {
        this.release = parseFloat(val);
        this.sendParams();
        const label = document.getElementById(`env_r_val_${this.id}`);
        if (label) label.innerText = this.formatTime(this.release);
    }

    formatTime(sec) {
        if (sec < 1) return Math.round(sec * 1000) + 'ms';
        return sec.toFixed(1) + 's';
    }

    cleanup() {
        if (this.fallbackTimer) {
            clearInterval(this.fallbackTimer);
        }
        this.destroyed = true;
        if (this.adsrNode) {
            try { this.adsrNode.disconnect(); } catch(e){}
        }
        try { this.outNode.disconnect(); } catch(e){}
        try { this.gateInputNode.disconnect(); } catch(e){}
        try { this.envNode.stop(); } catch(e){}
        try { this.envNode.disconnect(); } catch(e){}
    }

    // --- HTML Render ---
    renderHTML() {
        setTimeout(() => {
            const card = document.getElementById(`module_card_${this.id}`);
            if (card) {
                card.style.width = '240px';
            }
        }, 0);

        return `
            <div class="node-header">
                <span>Envelope Generator (ADSR)</span>
                <button class="delete-module-btn" onclick="synthApp.deleteNode('${this.id}')">×</button>
            </div>
            <div class="node-body" style="padding: 12px; display: flex; flex-direction: column; gap: 12px; background: #ffffff;">
                
                <!-- ADSR Vertical Sliders Grid -->
                <div style="display: flex; justify-content: space-between; gap: 6px; width: 100%;">
                    
                    <!-- Attack -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; background: #f8fafc; padding: 6px 2px; border-radius: 6px; border: 1px solid #e2e8f0;">
                        <span style="font-size: 0.65rem; font-weight: 700; color: #0f172a;">ATTACK</span>
                        <span id="env_a_val_${this.id}" style="font-size: 0.6rem; font-weight: 600; color: #64748b;">${this.formatTime(this.attack)}</span>
                        <input type="range" min="0.001" max="2" step="0.005" value="${this.attack}"
                            style="writing-mode: vertical-lr; direction: rtl; height: 75px; width: 12px; cursor: pointer; accent-color: #64748b;"
                            oninput="synthApp.getModule('${this.id}').setAttack(this.value)">
                    </div>

                    <!-- Decay -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; background: #f8fafc; padding: 6px 2px; border-radius: 6px; border: 1px solid #e2e8f0;">
                        <span style="font-size: 0.65rem; font-weight: 700; color: #0f172a;">DECAY</span>
                        <span id="env_d_val_${this.id}" style="font-size: 0.6rem; font-weight: 600; color: #64748b;">${this.formatTime(this.decay)}</span>
                        <input type="range" min="0.001" max="2" step="0.005" value="${this.decay}"
                            style="writing-mode: vertical-lr; direction: rtl; height: 75px; width: 12px; cursor: pointer; accent-color: #64748b;"
                            oninput="synthApp.getModule('${this.id}').setDecay(this.value)">
                    </div>

                    <!-- Sustain -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; background: #f8fafc; padding: 6px 2px; border-radius: 6px; border: 1px solid #e2e8f0;">
                        <span style="font-size: 0.65rem; font-weight: 700; color: #0f172a;">SUSTAIN</span>
                        <span id="env_s_val_${this.id}" style="font-size: 0.6rem; font-weight: 600; color: #64748b;">${Math.round(this.sustain * 100)}%</span>
                        <input type="range" min="0" max="1" step="0.01" value="${this.sustain}"
                            style="writing-mode: vertical-lr; direction: rtl; height: 75px; width: 12px; cursor: pointer; accent-color: #64748b;"
                            oninput="synthApp.getModule('${this.id}').setSustain(this.value)">
                    </div>

                    <!-- Release -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; background: #f8fafc; padding: 6px 2px; border-radius: 6px; border: 1px solid #e2e8f0;">
                        <span style="font-size: 0.65rem; font-weight: 700; color: #0f172a;">RELEASE</span>
                        <span id="env_r_val_${this.id}" style="font-size: 0.6rem; font-weight: 600; color: #64748b;">${this.formatTime(this.release)}</span>
                        <input type="range" min="0.001" max="5" step="0.01" value="${this.release}"
                            style="writing-mode: vertical-lr; direction: rtl; height: 75px; width: 12px; cursor: pointer; accent-color: #64748b;"
                            oninput="synthApp.getModule('${this.id}').setRelease(this.value)">
                    </div>

                </div>

                <!-- Input / Output Ports Matrix -->
                <div style="display: flex; justify-content: space-around; align-items: center; padding-top: 8px; border-top: 1px solid #e2e8f0;">
                    
                    <!-- Gate In (Orange accent) -->
                    <div class="port-group" style="display: flex; align-items: center; gap: 6px; font-size: 0.65rem; font-weight: 700;">
                        <div class="port port-in" data-node-id="${this.id}" data-port-type="gate" title="GATE IN: Connect to Sequencer Gate Output" style="border-color: #f97316;"></div>
                        <span>GATE IN</span>
                    </div>

                    <!-- Envelope Out (Purple accent) -->
                    <div class="port-group" style="display: flex; align-items: center; gap: 6px; font-size: 0.65rem; font-weight: 700;">
                        <span>ENV OUT</span>
                        <div class="port port-out" data-node-id="${this.id}" data-port-type="env" title="ENV OUT: Connect to VCA CV or Filter CV Input" style="border-color: #8b5cf6;"></div>
                    </div>

                </div>

            </div>
        `;
    }
}