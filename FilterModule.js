class FilterModule {
    constructor(id, audioContext) {
        this.id = id;
        this.ctx = audioContext;

        this.filterNode = this.ctx.createBiquadFilter();
        this.filterNode.type = 'lowpass';
        this.type = 'lowpass'; // menu value: a BiquadFilter type, or 'lowpass24'
        // Lowpass (24dB): a second lowpass stage in series (Moog-style steep slope). It follows the
        // same cutoff and modulation; the resonance stays on the first stage only (one peak).
        this.stage2 = this.ctx.createBiquadFilter();
        this.stage2.type = 'lowpass';
        this.stage2.Q.value = 0.707;
        this.outputNode = this.ctx.createGain();
        
        this.minFreq = 20;
        this.maxFreq = 15000;
        
        const defaultSliderVal = 0.5;
        this.currentFreq = this.sliderToFreq(defaultSliderVal);

        this.filterNode.frequency.setValueAtTime(this.currentFreq, this.ctx.currentTime);
        this.stage2.frequency.setValueAtTime(this.currentFreq, this.ctx.currentTime);
        this.resonance = 1.0; // intended Q; Q.value lags behind while the audio engine ramps
        this.filterNode.Q.setValueAtTime(this.resonance, this.ctx.currentTime);

        // Expanded modulation depth control (default 2400 Hz range)
        this.modDepth = 2400;
        this.modGain = this.ctx.createGain();
        this.modGain.gain.setValueAtTime(this.modDepth, this.ctx.currentTime);
        this.modGain.connect(this.filterNode.frequency);
        this.modGain.connect(this.stage2.frequency);
        this.stage2.connect(this.outputNode);
        this.filterNode.connect(this.outputNode);

        this.audioInput = this.filterNode;
        this.audioOutput = this.outputNode;
        this.cutoffModInput = this.modGain;
    }

    getState() {
        return {
            type: this.type,
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
                for (const f of [this.filterNode, this.stage2]) {
                    f.frequency.cancelScheduledValues(now);
                    f.frequency.setTargetAtTime(this.currentFreq, now, 0.01);
                }
            }
            const labelEl = document.getElementById(`cutoff_val_${this.id}`);
            if (labelEl) {
                labelEl.innerText = this.currentFreq >= 1000 ? (this.currentFreq / 1000).toFixed(1) + 'k' : Math.round(this.currentFreq);
            }
            const sliderVal = this.freqToSlider(this.currentFreq);
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

    // Cutoff slider curve: logarithmic, bent so the slider's midpoint reads 700 Hz.
    // freq = min * (max/min)^(pos^k), with k chosen so pos 0.5 lands on 700 Hz.
    cutoffCurve() {
        const span = Math.log(this.maxFreq / this.minFreq);
        return Math.log(Math.log(700 / this.minFreq) / span) / Math.log(0.5);
    }

    sliderToFreq(val) {
        const pos = Math.min(1, Math.max(0, parseFloat(val)));
        return this.minFreq * Math.pow(this.maxFreq / this.minFreq, Math.pow(pos, this.cutoffCurve()));
    }

    freqToSlider(freq) {
        const f = Math.min(this.maxFreq, Math.max(this.minFreq, freq));
        const t = Math.log(f / this.minFreq) / Math.log(this.maxFreq / this.minFreq);
        return Math.pow(t, 1 / this.cutoffCurve());
    }

    getAudioInput() { return this.audioInput; }
    getAudioOutput() { return this.audioOutput; }
    getCutoffInput() { return this.cutoffModInput; }

    setType(type) {
        const steep = type === 'lowpass24';
        this.type = type;
        this.filterNode.type = steep ? 'lowpass' : type;
        try { this.filterNode.disconnect(); } catch (e) {}
        this.filterNode.connect(steep ? this.stage2 : this.outputNode);
    }

    setCutoffFromSlider(sliderVal) {
        const freq = Math.max(20, Math.min(15000, this.sliderToFreq(sliderVal)));
        this.currentFreq = freq;

        const now = this.ctx ? this.ctx.currentTime : 0;
        if (this.ctx) {
            for (const f of [this.filterNode, this.stage2]) {
                f.frequency.cancelScheduledValues(now);
                f.frequency.setTargetAtTime(freq, now, 0.015);
            }
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

    // Typing an exact cutoff into the readout (valueEntry.js)
    getEntry(key) {
        if (key !== 'cutoff') return null;
        return { unit: 'Hz', decimals: 0, toSlider: f => this.freqToSlider(f), fromSlider: v => this.sliderToFreq(v),
            get: () => this.freqToSlider(this.currentFreq) };
    }

    renderHTML() {
        const currentSliderVal = this.freqToSlider(this.currentFreq);
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
                        <option value="lowpass" ${this.type === 'lowpass' ? 'selected' : ''}>Lowpass (12dB)</option>
                        <option value="lowpass24" ${this.type === 'lowpass24' ? 'selected' : ''}>Lowpass (24dB)</option>
                        <option value="highpass" ${this.type === 'highpass' ? 'selected' : ''}>Highpass</option>
                        <option value="bandpass" ${this.type === 'bandpass' ? 'selected' : ''}>Bandpass</option>
                        <option value="notch" ${this.type === 'notch' ? 'selected' : ''}>Notch</option>
                    </select>
                </div>

                <div class="control-group">
                    <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Cutoff: <span data-entry="@cutoff"><span id="cutoff_val_${this.id}">${displayFreq >= 1000 ? (displayFreq/1000).toFixed(1)+'k' : displayFreq}</span> Hz</span></label>
                    <input type="range" min="0" max="1" step="0.001" value="${currentSliderVal}" 
                        oninput="synthApp.getModule('${this.id}').setCutoffFromSlider(this.value)">
                </div>

                <div class="control-group">
                    <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Resonance (Q): <span id="q_val_${this.id}" data-entry="">${parseFloat(this.filterNode.Q.value).toFixed(1)}</span></label>
                    <input type="range" min="0.1" max="12" step="0.1" value="${this.filterNode.Q.value}" 
                        oninput="synthApp.getModule('${this.id}').setResonance(this.value); document.getElementById('q_val_${this.id}').innerText = parseFloat(this.value).toFixed(1);">
                </div>

                <div class="control-group">
                    <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">Mod Depth: <span id="mod_val_${this.id}" data-entry="unit:Hz">${Math.round(this.modDepth)}Hz</span></label>
                    <input type="range" min="0" max="10000" step="50" value="${this.modDepth}" 
                        oninput="synthApp.getModule('${this.id}').setModDepth(this.value)">
                </div>

                <div class="ports-row" style="display: flex; justify-content: space-around; align-items: center; padding-top: 8px; border-top: 1px solid var(--panel-border);">
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