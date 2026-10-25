class MixerModule {
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

        this.masterVolumeValue = 1;

        this.leftMaster = this.ctx.createGain();
        this.rightMaster = this.ctx.createGain();
        this.masterGainNode = this.ctx.createGain();

        this.leftMaster.connect(this.masterGainNode);
        this.rightMaster.connect(this.masterGainNode);

        this.channels = {};
        this.channelCount = 0;

        this.addChannelData();

        // TIMBRE input (TimbreModule.js): not sound but a list of levels for faders 1, 2, 3, ...
        this.timbreInput = { setTimbreLevels: levels => this.applyTimbreLevels(levels) };
    }

    // Moves the channel faders to a Timbre recipe (adding channels if the recipe has more).
    // The sound changes at once; the faders on the card glide there so the change can be seen.
    applyTimbreLevels(levels) {
        if (!Array.isArray(levels)) return;
        while (this.channelCount < levels.length) this.addChannelUI();
        const card = document.getElementById(`module_card_${this.id}`);
        const glides = [];
        levels.forEach((v, i) => {
            const ch = i + 1;
            const level = Math.round(Math.max(0, Math.min(1, v)) * 100) / 100;
            this.setChannelVolume(ch, level);
            const slider = card ? card.querySelector(`input[type="range"][oninput*="setChannelVolume(${ch},"]`) : null;
            if (slider) glides.push({ slider, from: parseFloat(slider.value) || 0, to: level });
        });
        cancelAnimationFrame(this.timbreGlide);
        const start = performance.now();
        const step = now => {
            const t = Math.min(1, (now - start) / 350);
            const e = 1 - Math.pow(1 - t, 3);
            glides.forEach(g => { g.slider.value = String(g.from + (g.to - g.from) * e); });
            if (t < 1) { this.timbreGlide = requestAnimationFrame(step); return; }
            // Last frame: a real input event, so anything showing the fader's number updates too
            glides.forEach(g => {
                g.slider.value = String(g.to);
                g.slider.dispatchEvent(new Event('input', { bubbles: true }));
            });
        };
        this.timbreGlide = requestAnimationFrame(step);
    }

    getState() {
        const channelsData = {};
        Object.keys(this.channels).forEach(ch => {
            channelsData[ch] = {
                panValue: this.channels[ch].panValue,
                volumeValue: this.channels[ch].volumeValue
            };
            if (this.channels[ch].label) channelsData[ch].label = this.channels[ch].label;
        });
        return {
            masterVolumeValue: this.masterVolumeValue,
            channels: channelsData
        };
    }

    setState(state) {
        if (!state) return;
        if (state.masterVolumeValue !== undefined) {
            this.setMasterVolume(state.masterVolumeValue);
            const masterInput = document.querySelector(`#module_card_${this.id} input[oninput*="setMasterVolume"]`);
            if (masterInput) masterInput.value = state.masterVolumeValue;
        }
        if (state.channels) {
            Object.keys(state.channels).forEach(ch => {
                if (!this.channels[ch]) {
                    this.addChannelData();
                }
                const chData = state.channels[ch];
                if (chData.panValue !== undefined) {
                    this.setChannelPan(ch, chData.panValue);
                }
                if (chData.volumeValue !== undefined) {
                    this.setChannelVolume(ch, chData.volumeValue);
                }
                this.channels[ch].label = chData.label || '';
            });

            const card = document.getElementById(`module_card_${this.id}`);
            if (card) {
                const container = document.getElementById(`mixer_channels_${this.id}`);
                if (container) {
                    container.innerHTML = Object.keys(this.channels).map(ch => `
                        <div class="mixer-channel-strip" style="display: flex; flex-direction: column; align-items: center; width: 85px; min-width: 85px; background: var(--panel-bg); padding: 10px 6px; border-radius: 8px; border: 1px solid var(--panel-border); gap: 8px; box-sizing: border-box;">
                            ${this.renderChannelHTML(ch)}
                        </div>
                    `).join('');
                    if (window.synthApp) {
                        window.synthApp.bindPortEvents(card, this.id);
                    }
                    this.setLabelHints(this.labelHints);
                }
            }
        }
    }

    // Channel name box (owner's idea 2026-10-18): a short name typed under "CH n", saved with the patch.
    setChannelLabel(channelIndex, value) {
        const ch = this.channels[channelIndex];
        if (ch) ch.label = String(value || '').slice(0, 12);
    }

    // Called by the app whenever cables change: an empty box shows the plugged-in module's name, greyed.
    setLabelHints(hints) {
        this.labelHints = hints || {};
        const card = document.getElementById(`module_card_${this.id}`);
        if (!card) return;
        card.querySelectorAll('.mixer-ch-label').forEach(input => {
            input.placeholder = this.labelHints[input.dataset.channel] || 'Name';
        });
    }

    escapeAttr(text) {
        return String(text || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    addChannelData() {
        this.channelCount++;
        const ch = this.channelCount;

        const inputGain = this.ctx.createGain();
        const channelGain = this.ctx.createGain();
        const directOutGain = this.ctx.createGain();

        const leftGain = this.ctx.createGain();
        const rightGain = this.ctx.createGain();

        inputGain.connect(channelGain);
        channelGain.connect(directOutGain);
        channelGain.connect(leftGain);
        channelGain.connect(rightGain);

        leftGain.connect(this.leftMaster);
        rightGain.connect(this.rightMaster);

        this.channels[ch] = {
            inputNode: inputGain,
            gainNode: channelGain,
            directOutNode: directOutGain,
            leftGain: leftGain,
            rightGain: rightGain,
            panValue: 0,
            volumeValue: 1
        };

        this.updateChannelPanGain(ch, 0);

        return ch;
    }

    updateChannelPanGain(chIndex, panVal) {
        const ch = this.channels[chIndex];
        if (!ch) return;
        
        const pan = Math.max(-1, Math.min(1, parseFloat(panVal)));
        const lVal = Math.cos((pan + 1) * Math.PI / 4);
        const rVal = Math.sin((pan + 1) * Math.PI / 4);

        const now = this.ctx.currentTime;
        // החלקה מעריכית למניעת קליקים ו-Zipper Noise
        ch.leftGain.gain.setTargetAtTime(lVal, now, 0.015);
        ch.rightGain.gain.setTargetAtTime(rVal, now, 0.015);
    }

    getChannelInput(channelIndex) {
        const ch = this.channels[channelIndex];
        return ch ? ch.inputNode : null;
    }

    getAudioInput(portType, channelIndex) {
        if (portType === 'timbre') return this.timbreInput;
        if (channelIndex && this.channels[channelIndex]) {
            return this.channels[channelIndex].inputNode;
        }
        if (portType && portType.startsWith('ch_in_')) {
            const ch = portType.replace('ch_in_', '');
            return this.channels[ch] ? this.channels[ch].inputNode : null;
        }
        return this.channels[1] ? this.channels[1].inputNode : null;
    }

    getAudioOutput(portType) {
        if (portType === 'out_l') return this.leftMaster;
        if (portType === 'out_r') return this.rightMaster;
        
        if (portType && portType.startsWith('ch_out_')) {
            const ch = portType.replace('ch_out_', '');
            return this.channels[ch] ? this.channels[ch].directOutNode : null;
        }

        return this.masterGainNode;
    }

    setChannelPan(channelIndex, value) {
        const ch = this.channels[channelIndex];
        if (ch) {
            ch.panValue = parseFloat(value);
            this.updateChannelPanGain(channelIndex, ch.panValue);
        }
    }

    setChannelVolume(channelIndex, value) {
        const ch = this.channels[channelIndex];
        if (ch && ch.gainNode) {
            ch.volumeValue = parseFloat(value);
            ch.gainNode.gain.setTargetAtTime(ch.volumeValue, this.ctx.currentTime, 0.015);
            const readout = document.getElementById(`mix_vol_val_${this.id}_${channelIndex}`);
            if (readout) readout.textContent = Math.round(ch.volumeValue * 100);
        }
    }

    setMasterVolume(value) {
        this.masterVolumeValue = parseFloat(value);
        const now = this.ctx.currentTime;
        this.leftMaster.gain.setTargetAtTime(this.masterVolumeValue, now, 0.015);
        this.rightMaster.gain.setTargetAtTime(this.masterVolumeValue, now, 0.015);
        const readout = document.getElementById(`mix_master_val_${this.id}`);
        if (readout) readout.textContent = Math.round(this.masterVolumeValue * 100);
    }

    addChannelUI() {
        const ch = this.addChannelData();
        const container = document.getElementById(`mixer_channels_${this.id}`);
        if (!container) return;

        const chEl = document.createElement('div');
        chEl.className = 'mixer-channel-strip';
        chEl.style.cssText = 'display: flex; flex-direction: column; align-items: center; width: 85px; min-width: 85px; background: var(--panel-bg); padding: 10px 6px; border-radius: 8px; border: 1px solid var(--panel-border); gap: 8px; box-sizing: border-box;';
        chEl.innerHTML = this.renderChannelHTML(ch);

        container.appendChild(chEl);

        const card = document.getElementById(`module_card_${this.id}`);
        if (card) {
            card.style.width = 'max-content';
            card.style.maxWidth = 'none';

            if (window.synthApp) {
                window.synthApp.bindPortEvents(card, this.id);
            }
        }
    }

    renderChannelHTML(ch) {
        return `
            <div style="font-weight: 700; font-size: 0.8rem; color: var(--text-color); text-align: center; border-bottom: 1px solid var(--panel-border); width: 100%; padding-bottom: 4px;">CH ${ch}</div>
            <input type="text" class="mixer-ch-label" data-channel="${ch}" maxlength="12" spellcheck="false" autocomplete="off"
                value="${this.escapeAttr(this.channels[ch].label)}" placeholder="${this.escapeAttr((this.labelHints || {})[ch] || 'Name')}"
                aria-label="CH ${ch} name" title="Channel name"
                oninput="synthApp.getModule('${this.id}').setChannelLabel(${ch}, this.value)">
            
            <div style="display: flex; flex-direction: column; gap: 6px; align-items: center; width: 100%;">
                <div class="port-group" style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                    <span style="font-size: 0.65rem; font-weight: 700;">IN</span>
                    <div class="port port-in" data-node-id="${this.id}" data-channel="${ch}" data-port-type="ch_in_${ch}" title="CH ${ch} Input"></div>
                </div>
                <div class="port-group" style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                    <span style="font-size: 0.65rem; font-weight: 700;">DIR OUT</span>
                    <div class="port port-out" data-node-id="${this.id}" data-channel="${ch}" data-port-type="ch_out_${ch}" title="CH ${ch} Direct Out"></div>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 2px; width: 100%; align-items: center; margin-top: 2px;">
                <label style="font-size: 0.65rem; font-weight: 600; color: var(--muted-text); text-align: center;">PAN</label>
                <input type="range" min="-1" max="1" step="0.05" value="${this.channels[ch].panValue}"
                    style="width: 100%; accent-color: var(--muted-text);"
                    oninput="synthApp.getModule('${this.id}').setChannelPan(${ch}, this.value)">
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px; width: 100%; align-items: center; margin-top: 4px;">
                <label style="font-size: 0.65rem; font-weight: 600; color: var(--muted-text); text-align: center;">VOL</label>
                <input type="range" min="0" max="1" step="0.01" value="${this.channels[ch].volumeValue}"
                    style="writing-mode: vertical-lr; direction: rtl; height: 80px; width: 14px; cursor: pointer; accent-color: var(--muted-text);"
                    oninput="synthApp.getModule('${this.id}').setChannelVolume(${ch}, this.value)">
                <span class="mixer-vol-val" id="mix_vol_val_${this.id}_${ch}" data-entry="scale:100;unit:" title="Tap to type a volume (0-100)">${Math.round(this.channels[ch].volumeValue * 100)}</span>
            </div>
        `;
    }

    renderHTML() {
        setTimeout(() => {
            const card = document.getElementById(`module_card_${this.id}`);
            if (card) {
                card.style.width = 'max-content';
                card.style.maxWidth = 'none';
            }
        }, 0);

        return `
            <div class="node-header">
                <span>Audio Mixer</span>
                <button class="delete-module-btn" onclick="synthApp.deleteNode('${this.id}')">×</button>
            </div>
            <div class="node-body" style="display: flex; flex-direction: row; gap: 12px; padding: 12px; width: max-content; background: var(--panel-bg);">
                
                <div style="display: flex; flex-direction: column; width: 100px; min-width: 100px; background: var(--panel-bg); padding: 10px 8px; border-radius: 8px; border: 1px solid var(--btn-border); gap: 10px; box-sizing: border-box; align-items: center; justify-content: space-between;">
                    <div style="width: 100%; text-align: center; display: flex; flex-direction: column; align-items: center;">
                        <div style="font-weight: 700; font-size: 0.8rem; color: var(--text-color); border-bottom: 1px solid var(--panel-border); padding-bottom: 4px; margin-bottom: 8px; width: 100%;">MASTER</div>
                        
                        <div style="display: flex; justify-content: space-around; width: 100%; margin-bottom: 10px;">
                            <div class="port-group" style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                                <span style="font-size: 0.65rem; font-weight: 700;">OUT L</span>
                                <div class="port port-out" data-node-id="${this.id}" data-port-type="out_l" title="Left Output"></div>
                            </div>
                            <div class="port-group" style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                                <span style="font-size: 0.65rem; font-weight: 700;">OUT R</span>
                                <div class="port port-out" data-node-id="${this.id}" data-port-type="out_r" title="Right Output"></div>
                            </div>
                        </div>

                        <div class="port-group" style="display: flex; flex-direction: column; align-items: center; gap: 2px; margin-bottom: 10px;">
                            <span style="font-size: 0.65rem; font-weight: 700;">TIMBRE</span>
                            <div class="port port-in" data-node-id="${this.id}" data-port-type="timbre" title="Timbre Input (sets the channel faders)"></div>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 4px; width: 100%; align-items: center;">
                            <label style="font-size: 0.65rem; font-weight: 600; color: var(--muted-text);">MASTER VOL</label>
                            <input type="range" min="0" max="1" step="0.01" value="${this.masterVolumeValue}"
                                style="writing-mode: vertical-lr; direction: rtl; height: 80px; width: 14px; cursor: pointer; accent-color: var(--muted-text);"
                                oninput="synthApp.getModule('${this.id}').setMasterVolume(this.value)">
                            <span class="mixer-vol-val" id="mix_master_val_${this.id}" data-entry="scale:100;unit:" title="Tap to type a volume (0-100)">${Math.round(this.masterVolumeValue * 100)}</span>
                        </div>
                    </div>

                    <button class="add-module-btn" 
                        style="width: 100%; padding: 6px 4px; font-size: 0.7rem; font-weight: 700; text-align: center;"
                        onclick="synthApp.getModule('${this.id}').addChannelUI()">
                        + Add Channel
                    </button>
                </div>

                <div style="width: 1px; background: var(--panel-border); align-self: stretch;"></div>

                <div id="mixer_channels_${this.id}" style="display: flex; flex-direction: row; gap: 10px; align-items: stretch;">
                    ${Object.keys(this.channels).map(ch => `
                        <div class="mixer-channel-strip" style="display: flex; flex-direction: column; align-items: center; width: 85px; min-width: 85px; background: var(--panel-bg); padding: 10px 6px; border-radius: 8px; border: 1px solid var(--panel-border); gap: 8px; box-sizing: border-box;">
                            ${this.renderChannelHTML(ch)}
                        </div>
                    `).join('')}
                </div>

            </div>
        `;
    }
}