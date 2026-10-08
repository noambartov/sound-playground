class FilterModule {
    constructor(id, audioContext) {
        this.id = id;
        this.ctx = audioContext;

        this.filterNode = this.ctx.createBiquadFilter();
        this.filterNode.type = 'lowpass';
        
        this.minFreq = 20;
        this.maxFreq = 15000;
        
        const defaultSliderVal = 0.5;
        this.currentFreq = this.sliderToFreq(defaultSliderVal);

        this.filterNode.frequency.setValueAtTime(this.currentFreq, this.ctx.currentTime);
        this.resonance = 1.0; // intended Q; Q.value lags behind while the audio engine ramps
        this.filterNode.Q.setValueAtTime(this.resonance, this.ctx.currentTime);

        // Expanded modulation depth control (default 2400 Hz range)
        this.modDepth = 2400;
        this.modGain = this.ctx.createGain();
        this.modGain.gain.setValueAtTime(this.modDepth, this.ctx.currentTime);
        this.modGain.connect(this.filterNode.frequency);

        this.audioInput = this.filterNode;
        this.audioOutput = this.filterNode;
        this.cutoffModInput = this.modGain;
    }

    getState() {
        return {
            type: this.filterNode ? this.filterNode.type : 'lowpass',
            frequency: this.currentFreq,
            resonance: this.resonance,
            modDepth: this.modDepth
        };
    }

    setState(state) {
        if (!state) return;
        if (state.type !== undefined) {
            this.setType(state.type);
            const sel = document.querySelector(`#module_card_${this.id} select`);
            if (sel) sel.value = state.type;
        }
        if (state.frequency !== undefined) {
            this.currentFreq = state.frequency;
            const now = this.ctx ? this.ctx.currentTime : 0;
            if (this.ctx) {
                this.filterNode.frequency.cancelScheduledValues(now);
                this.filterNode.frequency.setTargetAtTime(this.currentFreq, now, 0.01);
            }
            const labelEl = document.getElementById(`cutoff_val_${this.id}`);
            if (labelEl) {
                labelEl.innerText = this.currentFreq >= 1000 ? (this.currentFreq / 1000).toFixed(1) + 'k' : Math.round(this.currentFreq);
            }
            const minLog = Math.log(this.minFreq);
            const maxLog = Math.log(this.maxFreq);
            const sliderVal = (Math.log(this.currentFreq) - minLog) / (maxLog - minLog);
            const slider = document.querySelector(`#module_card_${this.id} input[oninput*="setCutoffFromSlider"]`);
            if (slider) slider.value = sliderVal;
        }
        if (state.resonance !== undefined) {
            this.setResonance(state.resonance);
            const qLabel = document.getElementById(`q_val_${this.id}`);
            if (qLabel) qLabel.innerText = parseFloat(state.resonance).toFixed(1);
            const qSlider = document.querySelector(`#module_card_${this.id} input[oninput*="setResonance"]`);
            if (qSlider) qSlider.value = state.resonance;
        }
        if (state.modDepth !== undefined) {
            this.setModDepth(state.modDepth);
            const modLabel = document.getElementById(`mod_val_${this.id}`);
            if (modLabel) modLabel.innerText = Math.round(state.modDepth) + 'Hz';
            const modSlider = document.querySelector(`#module_card_${this.id} input[oninput*="setModDepth"]`);
            if (modSlider) modSlider.value = state.modDepth;
        }
    }

    sliderToFreq(val) {
        const normalized = parseFloat(val);
        const minLog = Math.log(this.minFreq);
        const maxLog = Math.log(this.maxFreq);
        return Math.exp(minLog + (maxLog - minLog) * normalized);
    }

    getAudioInput() { return this.audioInput; }
    getAudioOutput() { return this.audioOutput; }
    getCutoffInput() { return this.cutoffModInput; }

    setType(type) {
        this.filterNode.type = type;
    }

    setCutoffFromSlider(sliderVal) {
        const freq = Math.max(20, Math.min(15000, this.sliderToFreq(sliderVal)));
        this.currentFreq = freq;

        const now = this.ctx ? this.ctx.currentTime : 0;
        if (this.ctx) {
            this.filterNode.frequency.cancelScheduledValues(now);
            this.filterNode.frequency.setTargetAtTime(freq, now, 0.015);
        }

        const labelEl = document.getElementById(`cutoff_val_${this.id}`);
        if (labelEl) {
            labelEl.innerText = freq >= 1000 ? (freq / 1000).toFixed(1) + 'k' : Math.round(freq);
        }
    }

    setResonance(val) {
        const qVal = Math.min(12.0, Math.max(0.1, parseFloat(val)));
        this.resonance = qVal;
        const now = this.ctx ? this.ctx.currentTime : 0;
        if (this.ctx) {
            this.filterNode.Q.cancelScheduledValues(now);
            this.filterNode.Q.setTargetAtTime(qVal, now, 0.015);
        }
    }

    setModDepth(val) {
        const modVal = Math.min(10000, Math.max(0, parseFloat(val)));
        this.modDepth = modVal;
        const now = this.ctx ? this.ctx.currentTime : 0;
        if (this.ctx) {
            this.modGain.gain.cancelScheduledValues(now);
            this.modGain.gain.setTargetAtTime(modVal, now, 0.015);
        }
        const labelEl = document.getElementById(`mod_val_${this.id}`);
        if (labelEl) {
            labelEl.innerText = Math.round(modVal) + 'Hz';
        }
    }

    renderHTML() {
        const minLog = Math.log(this.minFreq);
        const maxLog = Math.log(this.maxFreq);
        const currentSliderVal = (Math.log(this.currentFreq) - minLog) / (maxLog - minLog);
        const displayFreq = Math.round(this.currentFreq);

        setTimeout(() => {
            const card = document.getElementById(`module_card_${this.id}`);
            if (card) card.style.width = '260px';
        }, 0);

        return `
            <div class="node-header">
                <span>Filter</span>
                <button class="delete-module-btn" onclick="synthApp.deleteNode('${this.id}')">×</button>
            </div>
            <div class="node-body" style="padding: 12px; display: flex; flex-direction: column; gap: 10px;">
                <div class="control-group">
                    <label style="font-size: 11px; font-weight: 600;">Type</label>
                    <select class="control-select" onchange="synthApp.getModule('${this.id}').setType(this.value)">
                        <option value="lowpass" ${this.filterNode.type === 'lowpass' ? 'selected' : ''}>Lowpass (12dB)</option>
                        <option value="highpass" ${this.filterNode.type === 'highpass' ? 'selected' : ''}>Highpass</option>
                        <option value="bandpass" ${this.filterNode.type === 'bandpass' ? 'selected' : ''}>Bandpass</option>
                        <option value="notch" ${this.filterNode.type === 'notch' ? 'selected' : ''}>Notch</option>
                    </select>
                </div>

                <div class="control-group">
                    <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Cutoff: <span id="cutoff_val_${this.id}">${displayFreq >= 1000 ? (displayFreq/1000).toFixed(1)+'k' : displayFreq}</span> Hz</label>
                    <input type="range" min="0" max="1" step="0.001" value="${currentSliderVal}" 
                        oninput="synthApp.getModule('${this.id}').setCutoffFromSlider(this.value)">
                </div>

                <div class="control-group">
                    <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Resonance (Q): <span id="q_val_${this.id}">${parseFloat(this.filterNode.Q.value).toFixed(1)}</span></label>
                    <input type="range" min="0.1" max="12" step="0.1" value="${this.filterNode.Q.value}" 
                        oninput="synthApp.getModule('${this.id}').setResonance(this.value); document.getElementById('q_val_${this.id}').innerText = parseFloat(this.value).toFixed(1);">
                </div>

                <div class="control-group">
                    <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Mod Depth: <span id="mod_val_${this.id}">${Math.round(this.modDepth)}Hz</span></label>
                    <input type="range" min="0" max="10000" step="50" value="${this.modDepth}" 
                        oninput="synthApp.getModule('${this.id}').setModDepth(this.value)">
                </div>

                <div class="ports-row" style="display: flex; justify-content: space-around; align-items: center; padding-top: 8px; border-top: 1px solid #e2e8f0;">
                    <div class="port-group" style="display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700;">
                        <div class="port port-in" data-node-id="${this.id}" data-port-type="audio"></div>
                        <span>IN</span>
                    </div>
                    <div class="port-group" style="display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700;">
                        <div class="port port-in" data-node-id="${this.id}" data-port-type="cutoff" title="Cutoff Modulation Input"></div>
                        <span>CUT MOD</span>
                    </div>
                    <div class="port-group" style="display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700;">
                        <span>OUT</span>
                        <div class="port port-out" data-node-id="${this.id}"></div>
                    </div>
                </div>
            </div>
        `;
    }
}