// KeyboardModule.js
class KeyboardModule {
  constructor(id, audioCtx) {
    this.id = id;
    this.audioCtx = audioCtx;

    this.baseOctave = 3; // C3 כברירת מחדל
    this.activeKeyOrder = []; // מעקב אחר סדר לחיצת התווים

    // יציאות אות CV
    this.freqNode = this.audioCtx.createConstantSource();
    this.freqNode.offset.setValueAtTime(261.63, this.audioCtx.currentTime); // C4
    this.freqNode.start();

    this.gateNode = this.audioCtx.createConstantSource();
    this.gateNode.offset.setValueAtTime(0, this.audioCtx.currentTime);
    this.gateNode.start();

    this.bendNode = this.audioCtx.createConstantSource();
    this.bendNode.offset.setValueAtTime(0, this.audioCtx.currentTime); // ערך בין 1- ל- 1+
    this.bendNode.start();

    // מיפוי מקשי מקלדת המחשב לחצי טונים (0 עד 24)
    this.keyMap = {
      'z': 0,  's': 1,  'x': 2,  'd': 3,  'c': 4,  'v': 5,  'g': 6,  'b': 7,  'h': 8,  'n': 9,  'j': 10, 'm': 11,
      'q': 12, '2': 13, 'w': 14, '3': 15, 'e': 16, 'r': 17, '5': 18, 't': 19, '6': 20, 'y': 21, '7': 22, 'u': 23, 'i': 24
    };

    this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    // WebMIDI variables
    this.midiAccess = null;
    this.selectedMidiInput = null;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMIDIMessage = this.handleMIDIMessage.bind(this);
    this.isMouseDown = false;

    this.initMIDI();
  }

  initMIDI() {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(
        (access) => {
          this.midiAccess = access;
          this.midiAccess.onstatechange = () => this.updateMIDIDevices();
          this.updateMIDIDevices();
        },
        (err) => console.warn('[KeyboardModule] MIDI access failed:', err)
      );
    }
  }

  updateMIDIDevices() {
    const card = document.getElementById(`module_card_${this.id}`);
    if (!card) return;
    const select = card.querySelector(`#midi_input_select_${this.id}`);
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Select MIDI Input --</option>';

    if (this.midiAccess) {
      const inputs = this.midiAccess.inputs.values();
      for (let input of inputs) {
        const opt = document.createElement('option');
        opt.value = input.id;
        opt.textContent = input.name || `MIDI Device ${input.id}`;
        select.appendChild(opt);
      }
    }

    select.value = currentVal;
    this.bindMIDIInput(select.value);
  }

  bindMIDIInput(inputId) {
    if (this.selectedMidiInput) {
      this.selectedMidiInput.onmidimessage = null;
      this.selectedMidiInput = null;
    }

    if (inputId && this.midiAccess) {
      const input = this.midiAccess.inputs.get(inputId);
      if (input) {
        this.selectedMidiInput = input;
        this.selectedMidiInput.onmidimessage = this.handleMIDIMessage;
      }
    }
  }

  handleMIDIMessage(e) {
    const [status, note, velocity] = e.data;
    const command = status >> 4;

    // Note On (command 9)
    if (command === 9 && velocity > 0) {
      this.pressMIDINote(note);
    } 
    // Note Off (command 8 or command 9 with velocity 0)
    else if (command === 8 || (command === 9 && velocity === 0)) {
      this.releaseMIDINote(note);
    } 
    // Pitch Bend (command 14 / 0xE)
    else if (command === 14) {
      const rawBend = ((e.data[2] << 7) | e.data[1]); // 0..16383 (Center ~8192)
      const normBend = (rawBend - 8192) / 8192; // -1.0 to +1.0
      this.setPitchBendValue(normBend);
    }
  }

  pressMIDINote(midiNote) {
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    const sourceId = `midi_${midiNote}`;

    this.activeKeyOrder = this.activeKeyOrder.filter(k => k.sourceId !== sourceId);
    this.activeKeyOrder.push({ keyIdx: null, midiNote, sourceId, freq });

    // הבלטת קליד ויזואלי אם המקש נופל בטווח הוויזואלי המוצג
    const visualBaseMidi = (this.baseOctave + 1) * 12;
    const keyIdx = midiNote - visualBaseMidi;
    if (keyIdx >= 0 && keyIdx <= 24) {
      this.updateKeyVisual(keyIdx, true);
    }

    this.updateOutput();
  }

  releaseMIDINote(midiNote) {
    const sourceId = `midi_${midiNote}`;
    this.activeKeyOrder = this.activeKeyOrder.filter(k => k.sourceId !== sourceId);

    const visualBaseMidi = (this.baseOctave + 1) * 12;
    const keyIdx = midiNote - visualBaseMidi;
    if (keyIdx >= 0 && keyIdx <= 24) {
      this.updateKeyVisual(keyIdx, false);
    }

    this.updateOutput();
  }

  setPitchBendValue(val) {
    const clamped = Math.max(-1, Math.min(1, val));
    const now = this.audioCtx.currentTime;
    this.bendNode.offset.cancelScheduledValues(now);
    this.bendNode.offset.setTargetAtTime(clamped, now, 0.005);

    const card = document.getElementById(`module_card_${this.id}`);
    if (card) {
      const wheel = card.querySelector(`#bend_wheel_${this.id}`);
      if (wheel) wheel.value = clamped;
    }
  }

  renderHTML() {
    return `
      <div class="node-header">
        <span class="node-title">Keyboard Controller</span>
        <button class="delete-module-btn" title="Delete Module" onclick="synthApp.deleteNode('${this.id}')">×</button>
      </div>
      <div class="node-body" style="min-width: 580px; padding: 12px;">
        
        <!-- Controls Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background: #222; padding: 6px 10px; border-radius: 4px;">
          
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 0.75rem; color: #aaa;">MIDI In:</span>
            <select id="midi_input_select_${this.id}" style="background: #111; color: #fff; border: 1px solid #444; border-radius: 3px; font-size: 0.75rem; padding: 2px 4px; max-width: 170px;">
              <option value="">-- Select MIDI Input --</option>
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            <button id="oct_down_${this.id}" style="background: #333; color: #fff; border: 1px solid #555; border-radius: 3px; padding: 2px 8px; cursor: pointer; font-size: 0.8rem;">-</button>
            <span style="font-size: 0.8rem; color: #eee; font-weight: bold; min-width: 65px; text-align: center;" id="oct_val_${this.id}">Oct C${this.baseOctave}</span>
            <button id="oct_up_${this.id}" style="background: #333; color: #fff; border: 1px solid #555; border-radius: 3px; padding: 2px 8px; cursor: pointer; font-size: 0.8rem;">+</button>
          </div>

          <div style="font-size: 0.9rem; color: #4caf50; font-weight: bold; font-family: monospace;" id="note_display_${this.id}">
            --
          </div>
        </div>

        <!-- Visual Keyboard Wrapper -->
        <div class="keyboard-wrapper" style="display: flex; height: 130px; background: #111; padding: 8px; border-radius: 6px; border: 1px solid #333; user-select: none;">
          
          <!-- Pitch Bend Wheel -->
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 40px; margin-right: 10px; border-right: 1px solid #333; padding-right: 8px;">
            <span style="font-size: 0.65rem; color: #888; margin-bottom: 4px; font-weight: bold;">PITCH</span>
            <input type="range" id="bend_wheel_${this.id}" min="-1" max="1" step="0.01" value="0" style="writing-mode: bt-lr; appearance: slider-vertical; width: 16px; height: 90px; cursor: pointer;">
            <span style="font-size: 0.6rem; color: #666; margin-top: 2px;">BEND</span>
          </div>

          <!-- Keys Container -->
          <div id="keys_container_${this.id}" style="position: relative; flex: 1; display: flex; height: 100%;">
            ${this.renderKeys()}
          </div>
        </div>

        <div style="font-size: 0.7rem; color: #888; margin-top: 8px; text-align: center;">
          PC Keyboard: Row 1-2 [Z..M] = Lower Octave | Row 3-4 [Q..I] = Upper Octave
        </div>

        <!-- Output CV Ports with Destination Labels -->
        <div class="ports-container" style="margin-top: 12px; display: flex; justify-content: space-around; background: #1a1a1a; padding: 6px; border-radius: 4px;">
          <div class="port-group" style="display: flex; align-items: center; gap: 6px;">
            <div class="port port-out" data-port-type="cv" data-port-name="freq" data-node-id="${this.id}" title="Pitch CV (Hz)"></div>
            <span class="port-label" style="font-size: 0.75rem; font-weight: bold; color: #ddd;">FREQ <small style="color:#888;">(Oscillator)</small></span>
          </div>
          <div class="port-group" style="display: flex; align-items: center; gap: 6px;">
            <div class="port port-out" data-port-type="cv" data-port-name="gate" data-node-id="${this.id}" title="Gate Trigger (0V / 1V)"></div>
            <span class="port-label" style="font-size: 0.75rem; font-weight: bold; color: #ddd;">GATE <small style="color:#888;">(Envelope)</small></span>
          </div>
          <div class="port-group" style="display: flex; align-items: center; gap: 6px;">
            <div class="port port-out" data-port-type="cv" data-port-name="bend" data-node-id="${this.id}" title="Pitch Bend CV (-1..+1)"></div>
            <span class="port-label" style="font-size: 0.75rem; font-weight: bold; color: #ddd;">BEND <small style="color:#888;">(Pitch Shift)</small></span>
          </div>
        </div>

      </div>
    `;
  }

  renderKeys() {
    const whiteKeyIndices = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24];
    const blackKeyMap = {
      1: 0, 3: 1, 6: 3, 8: 4, 10: 5, 13: 7, 15: 8, 18: 10, 20: 11, 22: 12
    };

    let html = '';
    
    whiteKeyIndices.forEach((keyIdx) => {
      html += `
        <div class="key white-key" data-key-idx="${keyIdx}" style="flex: 1; background: #e0e0e0; border: 1px solid #222; border-radius: 0 0 4px 4px; cursor: pointer; box-sizing: border-box; transition: background 0.05s;"></div>
      `;
    });

    const whiteWidthPercent = 100 / 15;
    
    Object.keys(blackKeyMap).forEach((blackIdxStr) => {
      const blackIdx = parseInt(blackIdxStr);
      const afterWhiteIdx = blackKeyMap[blackIdx];
      const leftPercent = (afterWhiteIdx + 1) * whiteWidthPercent - (whiteWidthPercent * 0.32);
      
      html += `
        <div class="key black-key" data-key-idx="${blackIdx}" style="position: absolute; left: ${leftPercent}%; width: ${whiteWidthPercent * 0.64}%; height: 60%; background: #222; border-radius: 0 0 3px 3px; z-index: 2; cursor: pointer; border: 1px solid #000; box-shadow: 2px 2px 4px rgba(0,0,0,0.4); transition: background 0.05s;"></div>
      `;
    });

    return html;
  }

  bindEvents(card) {
    card.style.width = '620px';
    this.updateMIDIDevices();

    const select = card.querySelector(`#midi_input_select_${this.id}`);
    if (select) {
      select.addEventListener('change', (e) => {
        this.bindMIDIInput(e.target.value);
      });
    }

    const octDown = card.querySelector(`#oct_down_${this.id}`);
    const octUp = card.querySelector(`#oct_up_${this.id}`);
    const octVal = card.querySelector(`#oct_val_${this.id}`);

    if (octDown) {
      octDown.addEventListener('click', () => {
        if (this.baseOctave > 1) {
          this.baseOctave--;
          if (octVal) octVal.textContent = `Oct C${this.baseOctave}`;
        }
      });
    }

    if (octUp) {
      octUp.addEventListener('click', () => {
        if (this.baseOctave < 6) {
          this.baseOctave++;
          if (octVal) octVal.textContent = `Oct C${this.baseOctave}`;
        }
      });
    }

    const keysContainer = card.querySelector(`#keys_container_${this.id}`);
    if (keysContainer) {
      keysContainer.addEventListener('mousedown', (e) => {
        const keyEl = e.target.closest('.key');
        if (keyEl) {
          this.isMouseDown = true;
          const keyIdx = parseInt(keyEl.dataset.keyIdx);
          this.pressKey(keyIdx, 'mouse');
        }
      });

      keysContainer.addEventListener('mouseover', (e) => {
        if (this.isMouseDown) {
          const keyEl = e.target.closest('.key');
          if (keyEl) {
            const keyIdx = parseInt(keyEl.dataset.keyIdx);
            this.pressKey(keyIdx, 'mouse');
          }
        }
      });

      keysContainer.addEventListener('mouseup', () => {
        this.isMouseDown = false;
        this.releaseAllMouseKeys();
      });

      keysContainer.addEventListener('mouseleave', () => {
        this.isMouseDown = false;
        this.releaseAllMouseKeys();
      });
    }

    const bendWheel = card.querySelector(`#bend_wheel_${this.id}`);
    if (bendWheel) {
      bendWheel.addEventListener('input', (e) => {
        this.setPitchBendValue(parseFloat(e.target.value));
      });

      const resetBend = () => {
        this.setPitchBendValue(0);
      };

      bendWheel.addEventListener('mouseup', resetBend);
      bendWheel.addEventListener('mouseleave', resetBend);
      bendWheel.addEventListener('touchend', resetBend);
    }

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  handleKeyDown(e) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    if (e.repeat) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return; // shortcuts such as Cmd+Z do not play notes

    const char = e.key.toLowerCase();
    if (this.keyMap.hasOwnProperty(char)) {
      const keyIdx = this.keyMap[char];
      this.pressKey(keyIdx, `kb_${char}`);
    }
  }

  handleKeyUp(e) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

    const char = e.key.toLowerCase();
    if (this.keyMap.hasOwnProperty(char)) {
      const keyIdx = this.keyMap[char];
      this.releaseKey(keyIdx, `kb_${char}`);
    }
  }

  pressKey(keyIdx, sourceId = 'mouse') {
    const midiNote = (this.baseOctave + 1) * 12 + keyIdx;
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

    this.activeKeyOrder = this.activeKeyOrder.filter(k => !(k.keyIdx === keyIdx && k.sourceId === sourceId));
    this.activeKeyOrder.push({ keyIdx, sourceId, freq, midiNote });

    this.updateOutput();
    this.updateKeyVisual(keyIdx, true);
  }

  releaseKey(keyIdx, sourceId = 'mouse') {
    this.activeKeyOrder = this.activeKeyOrder.filter(k => !(k.keyIdx === keyIdx && k.sourceId === sourceId));
    
    const stillPressed = this.activeKeyOrder.some(k => k.keyIdx === keyIdx);
    if (!stillPressed) {
      this.updateKeyVisual(keyIdx, false);
    }

    this.updateOutput();
  }

  releaseAllMouseKeys() {
    this.activeKeyOrder = this.activeKeyOrder.filter(k => k.sourceId !== 'mouse');
    
    const card = document.getElementById(`module_card_${this.id}`);
    if (card) {
      const allKeys = card.querySelectorAll('.key');
      allKeys.forEach(k => {
        const keyIdx = parseInt(k.dataset.keyIdx);
        const stillPressedByKb = this.activeKeyOrder.some(item => item.keyIdx === keyIdx);
        if (!stillPressedByKb) {
          this.updateKeyVisual(keyIdx, false);
        }
      });
    }

    this.updateOutput();
  }

  updateOutput() {
    const card = document.getElementById(`module_card_${this.id}`);
    const noteDisplay = card ? card.querySelector(`#note_display_${this.id}`) : null;
    const now = this.audioCtx.currentTime;

    if (this.activeKeyOrder.length > 0) {
      const topNote = this.activeKeyOrder[this.activeKeyOrder.length - 1];
      
      this.freqNode.offset.cancelScheduledValues(now);
      this.freqNode.offset.setTargetAtTime(topNote.freq, now, 0.003);

      this.gateNode.offset.cancelScheduledValues(now);
      this.gateNode.offset.setTargetAtTime(1.0, now, 0.002);

      if (noteDisplay) {
        const noteName = this.noteNames[topNote.midiNote % 12];
        const octave = Math.floor(topNote.midiNote / 12) - 1;
        noteDisplay.textContent = `${noteName}${octave} (${Math.round(topNote.freq)}Hz)`;
      }
    } else {
      this.gateNode.offset.cancelScheduledValues(now);
      this.gateNode.offset.setTargetAtTime(0.0, now, 0.003);
      if (noteDisplay) {
        noteDisplay.textContent = '--';
      }
    }
  }

  updateKeyVisual(keyIdx, isPressed) {
    const card = document.getElementById(`module_card_${this.id}`);
    if (!card) return;

    const keyEl = card.querySelector(`.key[data-key-idx="${keyIdx}"]`);
    if (!keyEl) return;

    const isWhite = keyEl.classList.contains('white-key');
    if (isPressed) {
      keyEl.style.background = isWhite ? '#4caf50' : '#2e7d32';
    } else {
      keyEl.style.background = isWhite ? '#e0e0e0' : '#222';
    }
  }

  getCVOutput(portName) {
    if (portName === 'freq') return this.freqNode;
    if (portName === 'gate') return this.gateNode;
    if (portName === 'bend') return this.bendNode;
    return this.freqNode;
  }

  cleanup() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);

    if (this.selectedMidiInput) {
      this.selectedMidiInput.onmidimessage = null;
    }
    
    if (this.freqNode) try { this.freqNode.stop(); this.freqNode.disconnect(); } catch (e) {}
    if (this.gateNode) try { this.gateNode.stop(); this.gateNode.disconnect(); } catch (e) {}
    if (this.bendNode) try { this.bendNode.stop(); this.bendNode.disconnect(); } catch (e) {}
  }
}