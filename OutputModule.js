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

        this.inputGain = this.ctx.createGain();

        this.volumeGain = this.ctx.createGain();
        this.volumeGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

        this.thruGain = this.ctx.createGain();

        this.inputGain.connect(this.volumeGain);
        this.inputGain.connect(this.thruGain);

        this.connectToDestination();
    }

    getState() {
        return {
            volume: this.volumeGain ? this.volumeGain.gain.value : 0.8
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
        return this.inputGain; 
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
        const now = this.ctx ? this.ctx.currentTime : 0;
        this.volumeGain.gain.setTargetAtTime(volume, now, 0.015);
    }

    renderHTML() {
        const currentVol = this.volumeGain ? this.volumeGain.gain.value : 0.8;

        return `
            <div class="node-header">
                <span>Audio Output</span>
                <button class="delete-module-btn" onclick="synthApp.deleteNode('${this.id}')">×</button>
            </div>
            <div class="node-body" style="padding: 14px; display: flex; flex-direction: column; gap: 12px;">
                <div class="ctrl-row">
                    <label style="font-size: 11px; font-weight: 600; display: flex; justify-content: space-between;">
                        Master Volume: <span id="vol_val_${this.id}">${Math.round(currentVol * 100)}%</span>
                    </label>
                    <input type="range" min="0" max="1" step="0.01" value="${currentVol}" 
                        oninput="synthApp.getModule('${this.id}').setVolume(this.value); document.getElementById('vol_val_${this.id}').innerText = Math.round(this.value * 100) + '%';">
                </div>
                <div class="ports-matrix" style="display: flex; justify-content: space-around; align-items: center; padding-top: 8px; border-top: 1px solid #e2e8f0;">
                    <div class="port-group" style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700;">
                        <div class="port port-in" data-node-id="${this.id}" data-port-type="in" title="Stereo Audio Input"></div>
                        <span class="port-label">IN</span>
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