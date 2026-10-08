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
    }

    getState() {
        const channelsData = {};
        Object.keys(this.channels).forEach(ch => {
            channelsData[ch] = {
                panValue: this.channels[ch].panValue,
                volumeValue: this.channels[ch].volumeValue
            };
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
            });

            const card = document.getElementById(`module_card_${this.id}`);
            if (card) {
                const container = document.getElementById(`mixer_channels_${this.id}`);
                if (container) {
                    container.innerHTML = Object.keys(this.channels).map(ch => `
                        <div class="mixer-channel-strip" style="display: flex; flex-direction: column; align-items: center; width: 85px; min-width: 85px; background: #ffffff; padding: 10px 6px; border-radius: 8px; border: 1px solid #e2e8f0; gap: 8px; box-sizing: border-box;">
                            ${this.renderChannelHTML(ch)}
                        </div>
                    `).join('');
                    if (window.synthApp) {
                        window.synthApp.bindPortEvents(card, this.id);
                    }
                }
            }
        }
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
        }
    }

    setMasterVolume(value) {
        this.masterVolumeValue = parseFloat(value);
        const now = this.ctx.currentTime;
        this.leftMaster.gain.setTargetAtTime(this.masterVolumeValue, now, 0.015);
        this.rightMaster.gain.setTargetAtTime(this.masterVolumeValue, now, 0.015);
    }

    addChannelUI() {
        const ch = this.addChannelData();
        const container = document.getElementById(`mixer_channels_${this.id}`);
        if (!container) return;

        const chEl = document.createElement('div');
        chEl.className = 'mixer-channel-strip';
        chEl.style.cssText = 'display: flex; flex-direction: column; align-items: center; width: 85px; min-width: 85px; background: #ffffff; padding: 10px 6px; border-radius: 8px; border: 1px solid #e2e8f0; gap: 8px; box-sizing: border-box;';
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
            <div style="font-weight: 700; font-size: 0.8rem; color: #0f172a; text-align: center; border-bottom: 1px solid #e2e8f0; width: 100%; padding-bottom: 4px;">CH ${ch}</div>
            
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
                <label style="font-size: 0.65rem; font-weight: 600; color: #64748b; text-align: center;">PAN</label>
                <input type="range" min="-1" max="1" step="0.05" value="${this.channels[ch].panValue}"
                    style="width: 100%; accent-color: #64748b;"
                    oninput="synthApp.getModule('${this.id}').setChannelPan(${ch}, this.value)">
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px; width: 100%; align-items: center; margin-top: 4px;">
                <label style="font-size: 0.65rem; font-weight: 600; color: #64748b; text-align: center;">VOL</label>
                <input type="range" min="0" max="1" step="0.01" value="${this.channels[ch].volumeValue}"
                    style="writing-mode: vertical-lr; direction: rtl; height: 80px; width: 14px; cursor: pointer; accent-color: #64748b;"
                    oninput="synthApp.getModule('${this.id}').setChannelVolume(${ch}, this.value)">
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
            <div class="node-body" style="display: flex; flex-direction: row; gap: 12px; padding: 12px; width: max-content; background: #ffffff;">
                
                <div style="display: flex; flex-direction: column; width: 100px; min-width: 100px; background: #ffffff; padding: 10px 8px; border-radius: 8px; border: 1px solid #cbd5e1; gap: 10px; box-sizing: border-box; align-items: center; justify-content: space-between;">
                    <div style="width: 100%; text-align: center; display: flex; flex-direction: column; align-items: center;">
                        <div style="font-weight: 700; font-size: 0.8rem; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; width: 100%;">MASTER</div>
                        
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

                        <div style="display: flex; flex-direction: column; gap: 4px; width: 100%; align-items: center;">
                            <label style="font-size: 0.65rem; font-weight: 600; color: #64748b;">MASTER VOL</label>
                            <input type="range" min="0" max="1" step="0.01" value="${this.masterVolumeValue}"
                                style="writing-mode: vertical-lr; direction: rtl; height: 80px; width: 14px; cursor: pointer; accent-color: #64748b;"
                                oninput="synthApp.getModule('${this.id}').setMasterVolume(this.value)">
                        </div>
                    </div>

                    <button class="add-module-btn" 
                        style="width: 100%; padding: 6px 4px; font-size: 0.7rem; font-weight: 700; text-align: center;"
                        onclick="synthApp.getModule('${this.id}').addChannelUI()">
                        + Add Channel
                    </button>
                </div>

                <div style="width: 1px; background: #e2e8f0; align-self: stretch;"></div>

                <div id="mixer_channels_${this.id}" style="display: flex; flex-direction: row; gap: 10px; align-items: stretch;">
                    ${Object.keys(this.channels).map(ch => `
                        <div class="mixer-channel-strip" style="display: flex; flex-direction: column; align-items: center; width: 85px; min-width: 85px; background: #ffffff; padding: 10px 6px; border-radius: 8px; border: 1px solid #e2e8f0; gap: 8px; box-sizing: border-box;">
                            ${this.renderChannelHTML(ch)}
                        </div>
                    `).join('')}
                </div>

            </div>
        `;
    }
}