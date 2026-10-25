class OutputModule {
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

        // Two inputs: IN L (port type "in", the old single input) and IN R. With nothing in IN R,
        // IN L plays as it is (a mono cable on both sides, a stereo signal stays stereo). Once IN R
        // has a cable, IN L goes to the left side only and IN R to the right side.
        this.inputGain = this.ctx.createGain();
        this.inputR = this.ctx.createGain();
        this.inRCables = 0;
        this.stereoBus = this.ctx.createGain();
        this.monoL = this.ctx.createGain();
        this.monoR = this.ctx.createGain();
        [this.monoL, this.monoR].forEach(g => {
            g.channelCount = 1;
            g.channelCountMode = 'explicit';
            g.channelInterpretation = 'speakers';
        });
        this.merger = this.ctx.createChannelMerger(2);
        this.monoL.connect(this.merger, 0, 0);
        this.monoR.connect(this.merger, 0, 1);
        this.inputR.connect(this.monoR);

        this.volumeGain = this.ctx.createGain();
        this.volume = 0.8; // intended volume; gain.value lags behind while the audio engine ramps
        // Start silent and rise to the volume, so a new patch or preset starts without a click
        this.volumeGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.volumeGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.015);

        this.thruGain = this.ctx.createGain();

        this.stereoBus.connect(this.volumeGain);
        this.stereoBus.connect(this.thruGain);
        this.updateRouting();

        this.connectToDestination();
    }

    getState() {
        return {
            volume: this.volume
        };
    }

    setState(state) {
        if (!state) return;
        if (state.volume !== undefined) {
            this.setVolume(state.volume);
            const volLabel = document.getElementById(`vol_val_${this.id}`);
            if (volLabel) volLabel.innerText = Math.round(state.volume * 100) + '%';
            const volInput = document.querySelector(`#module_card_${this.id} input[oninput*="setVolume"]`);
            if (volInput) volInput.value = state.volume;
        }
    }

    connectToDestination() {
        if (window.audioEngine && typeof window.audioEngine.getMasterInput === 'function') {
            this.volumeGain.connect(window.audioEngine.getMasterInput());
        } else {
            this.volumeGain.connect(this.ctx.destination);
        }
    }

    getAudioInput(portType) {
        this.ensureAudioRunning();
        return portType === 'in_r' ? this.inputR : this.inputGain;
    }

    // app.js tells us when a cable is plugged into or pulled out of an input
    onInputConnected(key, connected) {
        if (key !== 'in_r') return;
        this.inRCables = Math.max(0, this.inRCables + (connected ? 1 : -1));
        this.updateRouting();
    }

    updateRouting() {
        const stereo = this.inRCables > 0;
        if (this.isStereo === stereo) return;
        this.isStereo = stereo;
        try { this.inputGain.disconnect(); } catch (e) {}
        try { this.merger.disconnect(); } catch (e) {}
        if (stereo) {
            this.inputGain.connect(this.monoL);
            this.merger.connect(this.stereoBus);
        } else {
            this.inputGain.connect(this.stereoBus);
        }
    }

    getAudioOutput(portType) {
        return this.thruGain;
    }

    ensureAudioRunning() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    setVolume(val) {
        this.ensureAudioRunning();
        const volume = parseFloat(val);
        this.volume = volume;
        const now = this.ctx ? this.ctx.currentTime : 0;
        this.volumeGain.gain.setTargetAtTime(volume, now, 0.015);
    }

    renderHTML() {
        const currentVol = this.volume;
        // Wider than the default card so IN L, IN R and THRU OUT fit in one row
        setTimeout(() => {
            const card = document.getElementById(`module_card_${this.id}`);
            if (card) card.style.width = '260px';
        }, 0);

        return `
            <div class="node-header">
                <span>Audio Output</span>
                <button class="delete-module-btn" onclick="synthApp.deleteNode('${this.id}')">×</button>
            </div>
            <div class="node-body" style="padding: 14px; display: flex; flex-direction: column; gap: 12px;">
                <div class="ctrl-row">
                    <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">
                        Master Volume: <span id="vol_val_${this.id}" data-entry="scale:100;unit:%">${Math.round(currentVol * 100)}%</span>
                    </label>
                    <input type="range" min="0" max="1" step="0.01" value="${currentVol}" 
                        oninput="synthApp.getModule('${this.id}').setVolume(this.value); document.getElementById('vol_val_${this.id}').innerText = Math.round(this.value * 100) + '%';">
                </div>
                <div class="ports-matrix" style="display: flex; justify-content: space-between; gap: 8px; align-items: center; padding-top: 8px; border-top: 1px solid var(--panel-border);">
                    <div class="port-group" style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700;">
                        <div class="port port-in" data-node-id="${this.id}" data-port-type="in" title="Left Audio Input"></div>
                        <span class="port-label">IN L</span>
                    </div>
                    <div class="port-group" style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700;">
                        <div class="port port-in" data-node-id="${this.id}" data-port-type="in_r" title="Right Audio Input"></div>
                        <span class="port-label">IN R</span>
                    </div>
                    <div class="port-group" style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700;">
                        <span class="port-label">THRU OUT</span>
                        <div class="port port-out" data-node-id="${this.id}" data-port-type="out" title="Stereo Pass-through Output"></div>
                    </div>
                </div>
            </div>
        `;
    }
}