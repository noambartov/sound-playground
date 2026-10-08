class SequencerModule {
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

        // Parameters
        this.bpm = 120;
        this.playMode = 'forward'; // 'forward' | 'backward' | 'pingpong' | 'random'
        this.octaveRange = 3;
        this.isPlaying = false;
        this.currentStep = -1;
        this.direction = 1;

        // Lookahead Scheduler properties
        this.nextNoteTime = 0.0;
        this.lookaheadInterval = null;
        this.scheduleAheadTime = 0.1; // 100ms lookahead
        this.scheduledStepsQueue = []; // For UI synchronization
        this.animFrameId = null;

        // Dynamic steps
        this.steps = [
            { active: true, pitch: 0.0 },
            { active: true, pitch: 0.25 },
            { active: true, pitch: 0.5 },
            { active: true, pitch: 0.75 }
        ];

        // CV Outputs
        this.pitchNode = this.ctx.createConstantSource();
        this.pitchNode.offset.setValueAtTime(110, this.ctx.currentTime);
        this.pitchNode.start();

        this.gateNode = this.ctx.createConstantSource();
        this.gateNode.offset.setValueAtTime(0, this.ctx.currentTime);
        this.gateNode.start();
    }

    // --- State Protocol ---
    getState() {
        return {
            bpm: this.bpm,
            playMode: this.playMode,
            octaveRange: this.octaveRange,
            steps: JSON.parse(JSON.stringify(this.steps))
        };
    }

    setState(state) {
        if (!state) return;
        if (state.bpm !== undefined) this.bpm = state.bpm;
        if (state.playMode !== undefined) this.playMode = state.playMode;
        if (state.octaveRange !== undefined) this.octaveRange = state.octaveRange;
        if (Array.isArray(state.steps)) this.steps = JSON.parse(JSON.stringify(state.steps));

        this.renderStepGrid();
        
        const card = document.getElementById(`module_card_${this.id}`);
        if (card) {
            const bpmInput = card.querySelector('input[oninput*="updateBpm"]');
            if (bpmInput) bpmInput.value = this.bpm;
            const modeSelect = card.querySelector('select[onchange*="setMode"]');
            if (modeSelect) modeSelect.value = this.playMode;
            const octInput = card.querySelector('input[oninput*="setOctave"]');
            if (octInput) octInput.value = this.octaveRange;
            const octLabel = document.getElementById(`seq_oct_val_${this.id}`);
            if (octLabel) octLabel.innerText = `${this.octaveRange} OCT`;
            const bpmLabel = document.getElementById(`seq_bpm_val_${this.id}`);
            if (bpmLabel) bpmLabel.innerText = `${this.bpm} BPM`;
        }
    }

    getAudioOutput(portType) {
        this.ensureAudioRunning();
        if (portType === 'gate') {
            return this.gateNode;
        }
        return this.pitchNode;
    }

    ensureAudioRunning() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    // --- Sequencer Logic & Lookahead Scheduler ---
    togglePlay() {
        this.ensureAudioRunning();
        this.isPlaying = !this.isPlaying;
        
        const playBtn = document.getElementById(`seq_play_btn_${this.id}`);
        if (playBtn) {
            playBtn.innerText = this.isPlaying ? 'Stop' : 'Play';
            if (this.isPlaying) playBtn.classList.add('danger-btn');
            else playBtn.classList.remove('danger-btn');
        }

        if (this.isPlaying) {
            this.currentStep = -1;
            this.direction = 1;
            this.nextNoteTime = this.ctx.currentTime + 0.02;
            this.scheduledStepsQueue = [];

            // Start High Precision Scheduler Loop (ticking every 25ms)
            this.lookaheadInterval = setInterval(() => this.scheduler(), 25);
            this.requestUIUpdate();
        } else {
            if (this.lookaheadInterval) clearInterval(this.lookaheadInterval);
            if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
            
            const now = this.ctx.currentTime;
            this.gateNode.offset.setValueAtTime(0, now);
            this.clearStepHighlights();
            this.scheduledStepsQueue = [];
        }
    }

    scheduler() {
        // Schedule all steps that fall within our lookahead window
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleStep(this.nextNoteTime);
            this.advanceStep();
        }
    }

    advanceStep() {
        const secondsPer16th = (60.0 / this.bpm) / 4.0;
        this.nextNoteTime += secondsPer16th;

        const total = this.steps.length;
        if (total === 0) return;

        switch (this.playMode) {
            case 'backward':
                this.currentStep = (this.currentStep - 1 + total) % total;
                break;

            case 'pingpong':
                if (this.currentStep <= 0) this.direction = 1;
                else if (this.currentStep >= total - 1) this.direction = -1;
                this.currentStep += this.direction;
                if (this.currentStep < 0) this.currentStep = 0;
                if (this.currentStep >= total) this.currentStep = total - 1;
                break;

            case 'random':
                this.currentStep = Math.floor(Math.random() * total);
                break;

            case 'forward':
            default:
                this.currentStep = (this.currentStep + 1) % total;
                break;
        }
    }

    scheduleStep(time) {
        if (this.currentStep < 0 || this.currentStep >= this.steps.length) return;

        const step = this.steps[this.currentStep];
        const stepDurationSec = (60.0 / this.bpm) / 4.0;
        const gateDurationSec = stepDurationSec * 0.75;
        const rampTime = 0.002; // 2ms ramp for smooth anti-click transitions

        if (step && step.active) {
            const baseFreq = 110;
            const freq = baseFreq * Math.pow(2, step.pitch * this.octaveRange);
            
            // Pitch scheduling
            this.pitchNode.offset.setValueAtTime(freq, time);
            
            // Gate ON with anti-click ramp
            this.gateNode.offset.setValueAtTime(0.0, time);
            this.gateNode.offset.linearRampToValueAtTime(1.0, time + rampTime);
            
            // Gate OFF with anti-click ramp
            const gateOffTime = time + gateDurationSec;
            this.gateNode.offset.setValueAtTime(1.0, gateOffTime - rampTime);
            this.gateNode.offset.linearRampToValueAtTime(0.0, gateOffTime);
        } else {
            this.gateNode.offset.setValueAtTime(0.0, time);
        }

        // Push to queue for UI sync
        this.scheduledStepsQueue.push({ stepIndex: this.currentStep, time: time });
    }

    requestUIUpdate() {
        if (!this.isPlaying) return;

        const currentTime = this.ctx.currentTime;
        while (this.scheduledStepsQueue.length > 0 && this.scheduledStepsQueue[0].time <= currentTime) {
            const currentUI = this.scheduledStepsQueue.shift();
            this.highlightActiveStepUI(currentUI.stepIndex);
        }

        this.animFrameId = requestAnimationFrame(() => this.requestUIUpdate());
    }

    // --- Dynamic Steps Management ---
    addStep() {
        this.steps.push({ active: true, pitch: 0.5 });
        this.renderStepGrid();
    }

    removeStep() {
        if (this.steps.length > 1) {
            this.steps.pop();
            if (this.currentStep >= this.steps.length) {
                this.currentStep = 0;
            }
            this.renderStepGrid();
        }
    }

    toggleStepActive(index) {
        if (this.steps[index]) {
            this.steps[index].active = !this.steps[index].active;
            this.renderStepGrid();
        }
    }

    updateStepPitch(index, val) {
        if (this.steps[index]) {
            this.steps[index].pitch = parseFloat(val);
        }
    }

    // --- UI Updates ---
    highlightActiveStepUI(index) {
        this.clearStepHighlights();
        const stepEl = document.getElementById(`seq_step_${this.id}_${index}`);
        if (stepEl) {
            stepEl.style.borderColor = '#0284c7';
            stepEl.style.boxShadow = '0 0 6px rgba(2, 132, 199, 0.4)';
        }
    }

    clearStepHighlights() {
        const card = document.getElementById(`module_card_${this.id}`);
        if (card) {
            const allSteps = card.querySelectorAll('.seq-step-box');
            allSteps.forEach(el => {
                el.style.borderColor = '#e2e8f0';
                el.style.boxShadow = 'none';
            });
        }
    }

    renderStepGrid() {
        const container = document.getElementById(`seq_steps_container_${this.id}`);
        if (!container) return;

        const card = document.getElementById(`module_card_${this.id}`);
        if (card) {
            card.style.width = 'max-content';
            card.style.maxWidth = 'none';
        }

        let html = '';
        this.steps.forEach((step, idx) => {
            html += `
                <div id="seq_step_${this.id}_${idx}" class="seq-step-box" style="display: flex; flex-direction: column; align-items: center; width: 55px; min-width: 55px; background: #ffffff; padding: 8px 4px; border-radius: 8px; border: 1px solid #e2e8f0; gap: 8px; box-sizing: border-box;">
                    <div style="font-weight: 700; font-size: 0.75rem; color: #0f172a; text-align: center; border-bottom: 1px solid #e2e8f0; width: 100%; padding-bottom: 2px;">#${idx + 1}</div>
                    
                    <button class="tool-btn" style="padding: 2px 4px; font-size: 0.65rem; font-weight: 700; width: 100%; opacity: ${step.active ? '1' : '0.4'};" 
                        onclick="SequencerModule.toggleStepActive('${this.id}', ${idx})">
                        ${step.active ? 'ON' : 'OFF'}
                    </button>

                    <div style="display: flex; flex-direction: column; gap: 4px; width: 100%; align-items: center; margin-top: 4px;">
                        <input type="range" min="0" max="1" step="0.01" value="${step.pitch}"
                            style="writing-mode: vertical-lr; direction: rtl; height: 80px; width: 14px; cursor: pointer; accent-color: #64748b;"
                            oninput="SequencerModule.updateStepPitch('${this.id}', ${idx}, this.value)">
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        if (card && window.synthApp) {
            window.synthApp.bindPortEvents(card, this.id);
        }
    }

    cleanup() {
        this.isPlaying = false;
        if (this.lookaheadInterval) clearInterval(this.lookaheadInterval);
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        try { this.pitchNode.stop(); } catch(e){}
        try { this.gateNode.stop(); } catch(e){}
    }

    // --- Static Event Handlers ---
    static togglePlay(id) {
        const mod = window.synthApp ? window.synthApp.getModule(id) : null;
        if (mod) mod.togglePlay();
    }

    static addStep(id) {
        const mod = window.synthApp ? window.synthApp.getModule(id) : null;
        if (mod) mod.addStep();
    }

    static removeStep(id) {
        const mod = window.synthApp ? window.synthApp.getModule(id) : null;
        if (mod) mod.removeStep();
    }

    static updateBpm(id, val) {
        const mod = window.synthApp ? window.synthApp.getModule(id) : null;
        if (mod) {
            mod.bpm = parseFloat(val);
            const label = document.getElementById(`seq_bpm_val_${id}`);
            if (label) label.innerText = `${mod.bpm} BPM`;
        }
    }

    static setMode(id, mode) {
        const mod = window.synthApp ? window.synthApp.getModule(id) : null;
        if (mod) mod.playMode = mode;
    }

    static setOctave(id, val) {
        const mod = window.synthApp ? window.synthApp.getModule(id) : null;
        if (mod) {
            mod.octaveRange = parseInt(val);
            const label = document.getElementById(`seq_oct_val_${id}`);
            if (label) label.innerText = `${mod.octaveRange} OCT`;
        }
    }

    static toggleStepActive(id, index) {
        const mod = window.synthApp ? window.synthApp.getModule(id) : null;
        if (mod) mod.toggleStepActive(index);
    }

    static updateStepPitch(id, index, val) {
        const mod = window.synthApp ? window.synthApp.getModule(id) : null;
        if (mod) mod.updateStepPitch(index, val);
    }

    // --- HTML Render ---
    renderHTML() {
        setTimeout(() => {
            this.renderStepGrid();
            const card = document.getElementById(`module_card_${this.id}`);
            if (card) {
                card.style.width = 'max-content';
                card.style.maxWidth = 'none';
            }
        }, 0);

        return `
            <div class="node-header">
                <span>Step Sequencer</span>
                <button class="delete-module-btn" onclick="synthApp.deleteNode('${this.id}')">×</button>
            </div>
            <div class="node-body" style="display: flex; flex-direction: row; gap: 12px; padding: 12px; width: max-content; background: #ffffff;">
                
                <!-- Fixed Left Control Panel -->
                <div style="display: flex; flex-direction: column; width: 140px; min-width: 140px; background: #ffffff; padding: 10px 8px; border-radius: 8px; border: 1px solid #cbd5e1; gap: 8px; box-sizing: border-box; align-items: center;">
                    <div style="font-weight: 700; font-size: 0.8rem; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; width: 100%; text-align: center;">CONTROL</div>
                    
                    <!-- Play & Mode -->
                    <div style="display: flex; gap: 4px; width: 100%;">
                        <button id="seq_play_btn_${this.id}" class="tool-btn" style="flex: 1; font-weight: 700; padding: 4px; font-size: 0.75rem;" 
                            onclick="SequencerModule.togglePlay('${this.id}')">Play</button>
                        
                        <select onchange="SequencerModule.setMode('${this.id}', this.value)" style="padding: 2px 4px; border-radius: 4px; border: 1px solid #cbd5e1; font-size: 0.8rem; font-weight: 700;">
                            <option value="forward" ${this.playMode === 'forward' ? 'selected' : ''}>→</option>
                            <option value="backward" ${this.playMode === 'backward' ? 'selected' : ''}>←</option>
                            <option value="pingpong" ${this.playMode === 'pingpong' ? 'selected' : ''}>⇄</option>
                            <option value="random" ${this.playMode === 'random' ? 'selected' : ''}>RND</option>
                        </select>
                    </div>

                    <!-- Tempo -->
                    <div style="display: flex; flex-direction: column; gap: 2px; width: 100%;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.65rem; font-weight: 700; color: #64748b;">
                            <span>TEMPO</span>
                            <span id="seq_bpm_val_${this.id}">${this.bpm} BPM</span>
                        </div>
                        <input type="range" min="30" max="300" step="1" value="${this.bpm}" style="width: 100%; accent-color: #64748b;"
                            oninput="SequencerModule.updateBpm('${this.id}', this.value)">
                    </div>

                    <!-- Octave Range -->
                    <div style="display: flex; flex-direction: column; gap: 2px; width: 100%;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.65rem; font-weight: 700; color: #64748b;">
                            <span>OCTAVE</span>
                            <span id="seq_oct_val_${this.id}">${this.octaveRange} OCT</span>
                        </div>
                        <input type="range" min="1" max="7" step="1" value="${this.octaveRange}" style="width: 100%; accent-color: #64748b;"
                            oninput="SequencerModule.setOctave('${this.id}', this.value)">
                    </div>

                    <!-- Step Add/Remove Buttons -->
                    <div style="display: flex; gap: 4px; width: 100%; margin-top: 2px;">
                        <button class="add-module-btn" style="flex: 1; padding: 4px 2px; font-size: 0.65rem; font-weight: 700; text-align: center;" 
                            onclick="SequencerModule.addStep('${this.id}')">+ Step</button>
                        <button class="add-module-btn" style="flex: 1; padding: 4px 2px; font-size: 0.65rem; font-weight: 700; text-align: center;" 
                            onclick="SequencerModule.removeStep('${this.id}')">- Step</button>
                    </div>

                    <!-- Outputs Section -->
                    <div style="display: flex; justify-content: space-around; width: 100%; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 2px;">
                        <div class="port-group" style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                            <span style="font-size: 0.65rem; font-weight: 700;">PITCH CV</span>
                            <div class="port port-out" data-node-id="${this.id}" data-port-type="pitch" title="Pitch CV Output"></div>
                        </div>
                        <div class="port-group" style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                            <span style="font-size: 0.65rem; font-weight: 700;">GATE</span>
                            <div class="port port-out" data-node-id="${this.id}" data-port-type="gate" title="Gate Output"></div>
                        </div>
                    </div>
                </div>

                <!-- Vertical Divider -->
                <div style="width: 1px; background: #e2e8f0; align-self: stretch;"></div>

                <!-- Right Expanding Steps Section -->
                <div id="seq_steps_container_${this.id}" style="display: flex; flex-direction: row; gap: 8px; align-items: stretch;">
                </div>

            </div>
        `;
    }
}