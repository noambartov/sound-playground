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

        // Output Envelope CV Node
        this.envNode = this.ctx.createConstantSource();
        this.envNode.offset.setValueAtTime(0, this.ctx.currentTime);
        this.envNode.start();

        // High-performance AudioWorklet Gate Detector (replaces ScriptProcessorNode)
        this.initGateDetector();
    }

    async initGateDetector() {
        try {
            if (this.ctx.audioWorklet) {
                if (!EnvelopeModule.workletRegistered) {
                    const workletCode = `
                        class GateDetectorProcessor extends AudioWorkletProcessor {
                            constructor() {
                                super();
                                this.lastGateState = false;
                            }
                            process(inputs) {
                                const input = inputs[0];
                                if (input && input[0] && input[0].length > 0) {
                                    const channel = input[0];
                                    for (let i = 0; i < channel.length; i++) {
                                        const isGateOn = channel[i] > 0.2;
                                        if (!this.lastGateState && isGateOn) {
                                            this.port.postMessage({ type: 'gateOn' });
                                        } else if (this.lastGateState && !isGateOn) {
                                            this.port.postMessage({ type: 'gateOff' });
                                        }
                                        this.lastGateState = isGateOn;
                                    }
                                }
                                return true;
                            }
                        }
                        registerProcessor('gate-detector-processor', GateDetectorProcessor);
                    `;
                    const blob = new Blob([workletCode], { type: 'application/javascript' });
                    const url = URL.createObjectURL(blob);
                    await this.ctx.audioWorklet.addModule(url);
                    URL.revokeObjectURL(url);
                    EnvelopeModule.workletRegistered = true;
                }

                this.gateWorklet = new AudioWorkletNode(this.ctx, 'gate-detector-processor');
                this.gateInputNode.connect(this.gateWorklet);
                this.gateWorklet.port.onmessage = (e) => {
                    if (e.data.type === 'gateOn') {
                        this.triggerAttack();
                    } else if (e.data.type === 'gateOff') {
                        this.triggerRelease();
                    }
                };
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
        return this.envNode;
    }

    // --- ADSR Trigger Logic ---
    triggerAttack() {
        const now = this.ctx.currentTime;
        const param = this.envNode.offset;

        if (param.cancelAndHoldAtTime) {
            param.cancelAndHoldAtTime(now);
        } else {
            param.cancelScheduledValues(now);
            param.setValueAtTime(param.value, now);
        }

        const attackTime = Math.max(0.003, this.attack);
        const decayTime = Math.max(0.003, this.decay);

        param.linearRampToValueAtTime(1.0, now + attackTime);
        param.linearRampToValueAtTime(this.sustain, now + attackTime + decayTime);
    }

    triggerRelease() {
        const now = this.ctx.currentTime;
        const param = this.envNode.offset;

        if (param.cancelAndHoldAtTime) {
            param.cancelAndHoldAtTime(now);
        } else {
            param.cancelScheduledValues(now);
            param.setValueAtTime(param.value, now);
        }

        const releaseTime = Math.max(0.003, this.release);
        param.linearRampToValueAtTime(0.0, now + releaseTime);
    }

    // --- Control Setters ---
    setAttack(val) {
        this.attack = parseFloat(val);
        const label = document.getElementById(`env_a_val_${this.id}`);
        if (label) label.innerText = this.formatTime(this.attack);
    }

    setDecay(val) {
        this.decay = parseFloat(val);
        const label = document.getElementById(`env_d_val_${this.id}`);
        if (label) label.innerText = this.formatTime(this.decay);
    }

    setSustain(val) {
        this.sustain = parseFloat(val);
        const label = document.getElementById(`env_s_val_${this.id}`);
        if (label) label.innerText = Math.round(this.sustain * 100) + '%';
    }

    setRelease(val) {
        this.release = parseFloat(val);
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
        if (this.gateWorklet) {
            try { this.gateWorklet.disconnect(); } catch(e){}
        }
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