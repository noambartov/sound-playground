class RecorderModule {
    constructor(id, audioCtx) {
        this.id = id;

        // אתחול AudioContext לפי התבנית Standard
        if (window.audioEngine && typeof window.audioEngine.getContext === 'function') {
            this.ctx = window.audioEngine.getContext();
        } else if (audioCtx) {
            this.ctx = audioCtx;
        } else {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }

        // הגדרת הגדרות הקלטה
        this.format = 'wav'; // always WAV (an old 'mp3' choice wrote WAV data under a .mp3 name that nothing could open)
        this.targetLufs = -10; // עוצמת יעד -10 LUFS
        this.isRecording = false;

        // 1. Audio Nodes: Input Gain
        this.inputGain = this.ctx.createGain();

        // 2. Audio Nodes: Brickwall Limiter למניעת דיסטורשן בזמן אמת
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.setValueAtTime(-1.0, this.ctx.currentTime);
        this.limiter.knee.setValueAtTime(0.0, this.ctx.currentTime);
        this.limiter.ratio.setValueAtTime(20.0, this.ctx.currentTime);
        this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.limiter.release.setValueAtTime(0.100, this.ctx.currentTime);

        // 3. Audio Nodes: Thru Pass-through Output
        this.thruGain = this.ctx.createGain();

        // חיווט פנימי
        this.inputGain.connect(this.limiter);
        this.inputGain.connect(this.thruGain);

        // אוגרי PCM להקלטה
        this.recordedLeft = [];
        this.recordedRight = [];
        this.processorNode = null;
        this.startTime = 0;
        this.timerInterval = null;
    }

    // --- פרוטוקול שמירת/שחזור מצב (State Protocol) ---
    getState() {
        return {
            format: this.format,
            targetLufs: this.targetLufs
        };
    }

    setState(state) {
        if (!state) return;
        // Old patches may say 'mp3'; recordings are always saved as WAV.
        this.format = 'wav';
    }

    // --- חיבורי פורטים למערכת הכבלים ---
    getAudioInput(portType) {
        this.ensureAudioRunning();
        return this.inputGain;
    }

    getAudioOutput(portType) {
        return this.thruGain;
    }

    getNodeOrParamForPort(portName) {
        if (portName === 'in' || !portName) return this.inputGain;
        if (portName === 'out' || portName === 'thru') return this.thruGain;
        return this.inputGain;
    }

    ensureAudioRunning() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    // --- מתודת תפעול ההקלטה ---
    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    startRecording() {
        this.ensureAudioRunning();
        this.isRecording = true;
        this.recordedLeft = [];
        this.recordedRight = [];

        const bufferSize = 4096;
        this.processorNode = this.ctx.createScriptProcessor(bufferSize, 2, 2);

        this.processorNode.onaudioprocess = (e) => {
            if (!this.isRecording) return;
            const left = e.inputBuffer.getChannelData(0);
            const right = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : left;

            this.recordedLeft.push(new Float32Array(left));
            this.recordedRight.push(new Float32Array(right));
        };

        this.limiter.connect(this.processorNode);
        this.processorNode.connect(this.ctx.destination);

        this.startTime = Date.now();
        this.updateUIState(true);
        this.timerInterval = setInterval(() => this.updateTimerUI(), 200);
    }

    stopRecording() {
        this.isRecording = false;
        if (this.timerInterval) clearInterval(this.timerInterval);

        if (this.processorNode) {
            try {
                this.processorNode.disconnect();
                this.limiter.disconnect(this.processorNode);
            } catch (e) {}
            this.processorNode = null;
        }

        this.updateUIState(false);
        this.processAndDownload();
    }

    // --- חישוב LUFS ונרמול עוצמה ---
    processAndDownload() {
        if (this.recordedLeft.length === 0) return;

        const leftBuffer = this.mergeBuffers(this.recordedLeft);
        const rightBuffer = this.mergeBuffers(this.recordedRight);

        const measuredLUFS = this.calculateLUFS(leftBuffer, rightBuffer);

        const targetLUFS = this.targetLufs;
        let gainDb = targetLUFS - measuredLUFS;
        let gainFactor = Math.pow(10, gainDb / 20);

        const normLeft = new Float32Array(leftBuffer.length);
        const normRight = new Float32Array(rightBuffer.length);
        const ceiling = 0.966; // -0.3 dB Ceiling

        for (let i = 0; i < leftBuffer.length; i++) {
            let sampleL = leftBuffer[i] * gainFactor;
            let sampleR = rightBuffer[i] * gainFactor;

            normLeft[i] = Math.max(-ceiling, Math.min(ceiling, sampleL));
            normRight[i] = Math.max(-ceiling, Math.min(ceiling, sampleR));
        }

        const statusLabel = document.getElementById(`rec_status_${this.id}`);
        if (statusLabel) {
            statusLabel.innerText = `LUFS: ${measuredLUFS.toFixed(1)} -> ${targetLUFS} LUFS`;
        }

        const blob = this.encodeAudioBlob(normLeft, normRight, this.ctx.sampleRate, this.format);
        const filename = `synth_recording_${Date.now()}.wav`;

        this.triggerDownload(blob, filename);
    }

    mergeBuffers(channelBuffers) {
        let totalLength = 0;
        for (let i = 0; i < channelBuffers.length; i++) {
            totalLength += channelBuffers[i].length;
        }
        const result = new Float32Array(totalLength);
        let offset = 0;
        for (let i = 0; i < channelBuffers.length; i++) {
            result.set(channelBuffers[i], offset);
            offset += channelBuffers[i].length;
        }
        return result;
    }

    calculateLUFS(left, right) {
        let sumSquare = 0;
        const total = left.length;
        for (let i = 0; i < total; i++) {
            const l = left[i];
            const r = right[i];
            sumSquare += (l * l + r * r) / 2;
        }
        const meanSquare = sumSquare / (total || 1);
        if (meanSquare <= 0) return -70;
        return 10 * Math.log10(meanSquare) - 0.691;
    }

    encodeAudioBlob(left, right, sampleRate, format) {
        const numChannels = 2;
        const length = left.length * numChannels * 2;
        const buffer = new ArrayBuffer(44 + length);
        const view = new DataView(buffer);

        const writeString = (offset, str) => {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * 2, true);
        view.setUint16(32, numChannels * 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length, true);

        let offset = 44;
        for (let i = 0; i < left.length; i++) {
            let sL = Math.max(-1, Math.min(1, left[i]));
            view.setInt16(offset, sL < 0 ? sL * 0x8000 : sL * 0x7FFF, true);
            offset += 2;

            let sR = Math.max(-1, Math.min(1, right[i]));
            view.setInt16(offset, sR < 0 ? sR * 0x8000 : sR * 0x7FFF, true);
            offset += 2;
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }

    triggerDownload(blob, filename) {
        // iPad / iPhone: open the share sheet ("Save to Files"), like saving a patch.
        // A plain download link there can leave a grey, unopenable file.
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        if (isIOS && typeof File === 'function' && navigator.canShare) {
            const file = new File([blob], filename, { type: 'audio/wav' });
            if (navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: filename }).catch(err => {
                    if (err && err.name === 'AbortError') return;
                    this.downloadFile(blob, filename);
                });
                return;
            }
        }
        this.downloadFile(blob, filename);
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Keep the file data alive long enough for the browser to finish saving it.
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        if (window.synthApp && typeof window.synthApp.showNotification === 'function') {
            window.synthApp.showNotification(`Recording saved as ${filename} (in your Downloads folder).`);
        }
    }

    // --- עדכוני UI ---
    updateTimerUI() {
        const elapsedSec = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
        const secs = String(elapsedSec % 60).padStart(2, '0');
        const timerEl = document.getElementById(`rec_timer_${this.id}`);
        if (timerEl) timerEl.innerText = `${mins}:${secs}`;
    }

    updateUIState(recording) {
        const btn = document.getElementById(`rec_btn_${this.id}`);
        const statusEl = document.getElementById(`rec_status_${this.id}`);
        if (btn) {
            btn.innerText = recording ? 'Stop & Export' : 'Record';
            if (recording) {
                btn.classList.add('danger-btn');
                btn.style.background = '#ef4444';
                btn.style.color = '#ffffff';
            } else {
                btn.classList.remove('danger-btn');
                btn.style.background = '';
                btn.style.color = '';
            }
        }
        if (statusEl && recording) {
            statusEl.innerText = 'Recording... Target: -10 LUFS';
        }
    }

    static toggleRecord(id) {
        const mod = window.synthApp ? window.synthApp.getModule(id) : null;
        if (mod) mod.toggleRecording();
    }

    renderHTML() {
        return `
            <div class="node-header">
                <span class="node-title">Audio Recorder</span>
                <button class="delete-module-btn" onclick="window.synthApp.deleteNode('${this.id}')" title="Delete Module">×</button>
            </div>
            <div class="node-body" style="padding: 12px; display: flex; flex-direction: column; gap: 10px;">
                
                <div class="ctrl-row" style="display: flex; flex-direction: column; gap: 6px;">
                    <button id="rec_btn_${this.id}" class="action-btn" style="width: 100%; padding: 8px; font-weight: 700; cursor: pointer;" onclick="RecorderModule.toggleRecord('${this.id}')">
                        Record
                    </button>
                    <div style="display: flex; justify-content: space-between; font-size: 10px; opacity: 0.8; font-weight: 600;">
                        <span>Timer: <span id="rec_timer_${this.id}">00:00</span></span>
                        <span>Target: -10 LUFS</span>
                    </div>
                    <div id="rec_status_${this.id}" style="font-size: 10px; text-align: center; color: #a1a1aa;">Ready</div>
                </div>

                <div class="ports-row" style="display: flex; justify-content: space-around; align-items: center; padding-top: 8px; border-top: 1px solid #3f3f46;">
                    <div class="port-group" style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700;">
                        <div class="port port-in" data-node-id="${this.id}" data-port-id="in" data-port-type="audio" title="Audio Input to Record"></div>
                        <span>IN</span>
                    </div>
                    <div class="port-group" style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700;">
                        <span>THRU</span>
                        <div class="port port-out" data-node-id="${this.id}" data-port-id="out" data-port-type="audio" title="Pass-through Output"></div>
                    </div>
                </div>

            </div>
        `;
    }

    cleanup() {
        this.stopRecording();
        try {
            this.inputGain.disconnect();
            this.thruGain.disconnect();
            this.limiter.disconnect();
        } catch (e) {}
    }
}