// app.js - Optimized & Enhanced Sound Sandbox Core
if (!window.SoundSandboxApp) {
  class SoundSandboxApp {
    constructor() {
      this.theme = 'light';
      this.modules = {}; 
      this.connections = []; 

      this.scale = 1.0;
      this.panX = 0;
      this.panY = 0;

      this.isPresentationMode = false;
      this.isSpacePressed = false;
      this.tooltipsEnabled = true;

      this.selectedNodeIds = new Set();
      this.activeCable = null; 
      this.selectedConnection = null;
      this.cableHitPaths = [];
      this.cablesBehind = false;

      this.initResizeObserver();
      this.initAudioContext();
      this.initElements();
      this.initCanvas();
      this.bindEvents();
      this.bindCanvasInteractions();
      this.initDraggablePanels();
    }

    initResizeObserver() {
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          this.drawConnections();
        });
      }
    }

    updateCables() {
      this.drawConnections();
    }

    initAudioContext() {
      if (window.audioEngine && typeof window.audioEngine.getContext === 'function') {
        this.audioCtx = window.audioEngine.getContext();
      } else {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioCtx();
      }

      console.log(`[AudioEngine] Context initialized: ${this.audioCtx.sampleRate} Hz (State: ${this.audioCtx.state})`);

      const unlockAudio = () => {
        this.ensureAudioContextRunning();
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('touchend', unlockAudio);
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('mousedown', unlockAudio);
      };

      window.addEventListener('touchstart', unlockAudio, { passive: true });
      window.addEventListener('touchend', unlockAudio, { passive: true });
      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('mousedown', unlockAudio, { passive: true });
    }

    ensureAudioContextRunning() {
      if (window.audioEngine && typeof window.audioEngine.getContext === 'function') {
        this.audioCtx = window.audioEngine.getContext();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().then(() => {
          console.log(`[AudioEngine] Context resumed successfully`);
        }).catch((err) => {
          console.warn('[AudioEngine] Resume error:', err);
        });
      }
    }

    getModule(id) {
      return this.modules[id] ? this.modules[id].instance : null;
    }

    initElements() {
      this.clearBtn = document.getElementById('clear-workspace-btn');
      this.saveBtn = document.getElementById('save-patch-btn');
      this.loadBtn = document.getElementById('load-patch-btn');
      this.importFileInput = document.getElementById('import-patch-input');

      this.zoomInBtn = document.getElementById('zoom-in-btn');
      this.zoomOutBtn = document.getElementById('zoom-out-btn');
      this.zoomResetBtn = document.getElementById('zoom-reset-btn');
      this.zoomLevelDisplay = document.getElementById('zoom-level');
      this.themeToggleBtn = document.getElementById('theme-toggle-btn');
      this.presentationBtn = document.getElementById('presentation-mode-btn');
      this.tooltipsBtn = document.getElementById('toggle_tooltips_btn');
      this.cableLayerBtn = document.getElementById('cable-layer-btn');

      this.canvasContainer = document.getElementById('canvas-container');
      this.viewport = document.getElementById('workspace-viewport');
      this.modulesLayer = document.getElementById('modules-layer');
      this.selectionBox = document.getElementById('selection-box');
      this.canvas = document.getElementById('connections-canvas');
      this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    }

    initCanvas() {
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
      if (this.canvasContainer && this.canvas) {
        const dpr = window.devicePixelRatio || 1;
        const width = this.canvasContainer.clientWidth;
        const height = this.canvasContainer.clientHeight;

        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        if (this.ctx) {
          this.ctx.resetTransform();
          this.ctx.scale(dpr, dpr);
        }
        this.drawConnections();
      }
    }

    render() {
      this.drawConnections();
    }

    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
      document.body.className = `${this.theme}-theme`;
      if (this.themeToggleBtn) {
        this.themeToggleBtn.textContent = this.theme === 'light' ? 'Light' : 'Dark';
      }
      this.drawConnections();
    }

    togglePresentationMode() {
      this.isPresentationMode = !this.isPresentationMode;
      document.body.classList.toggle('presentation-mode', this.isPresentationMode);
      
      if (this.presentationBtn) {
        this.presentationBtn.classList.toggle('active', this.isPresentationMode);
        this.presentationBtn.textContent = this.isPresentationMode ? 'Edit Mode' : 'Play Mode';
      }
      
      this.drawConnections();
    }

    toggleTooltips() {
      this.tooltipsEnabled = !this.tooltipsEnabled;
      document.body.classList.toggle('tooltips-disabled', !this.tooltipsEnabled);
      if (this.tooltipsBtn) {
        this.tooltipsBtn.textContent = `Tooltips: ${this.tooltipsEnabled ? 'ON' : 'OFF'}`;
      }
    }

    showNotification(message) {
      let toast = document.getElementById('synth-toast-notification');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'synth-toast-notification';
        toast.style.cssText = `
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: #1e293b;
          color: #f8fafc;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          z-index: 99999;
          border: 1px solid #3b82f6;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: opacity 0.3s ease;
        `;
        document.body.appendChild(toast);
      }
      toast.innerHTML = `🔊 <span>${message}</span>`;
      toast.style.opacity = '1';
      toast.style.display = 'flex';

      if (this.toastTimeout) clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => { toast.style.display = 'none'; }, 300);
      }, 5500);
    }

    createModule(type, customId = null, customX = null, customY = null, state = null) {
      this.ensureAudioContextRunning();

      const id = customId || (type + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
      let instance = null;

      const WebcamClass = window.WebcamModule || (typeof WebcamModule !== 'undefined' ? WebcamModule : null);

      try {
        if (type === 'oscillator' && typeof OscillatorModule !== 'undefined') {
          instance = new OscillatorModule(id, this.audioCtx);
        } else if (type === 'granular' && typeof GranularModule !== 'undefined') {
          instance = new GranularModule(id, this.audioCtx);
        } else if (type === 'filter' && typeof FilterModule !== 'undefined') {
          instance = new FilterModule(id, this.audioCtx);
        } else if (type === 'lfo' && typeof LfoModule !== 'undefined') {
          instance = new LfoModule(id, this.audioCtx);
        } else if (type === 'mixer' && typeof MixerModule !== 'undefined') {
          instance = new MixerModule(id, this.audioCtx);
        } else if (type === 'vca' && typeof VcaModule !== 'undefined') {
          instance = new VcaModule(id, this.audioCtx);
        } else if (type === 'reverb' && typeof ReverbModule !== 'undefined') {
          instance = new ReverbModule(id, this.audioCtx);
        } else if (type === 'output' && typeof OutputModule !== 'undefined') {
          instance = new OutputModule(id, this.audioCtx);
        } else if (type === 'recorder' && typeof RecorderModule !== 'undefined') {
          instance = new RecorderModule(id, this.audioCtx);
        } else if (type === 'sequencer' && typeof SequencerModule !== 'undefined') {
          instance = new SequencerModule(id, this.audioCtx);
        } else if ((type === 'envelope' || type === 'adsr') && typeof EnvelopeModule !== 'undefined') {
          instance = new EnvelopeModule(id, this.audioCtx);
        } else if ((type === 'audio_in' || type === 'mic' || type === 'audio_input') && typeof AudioInputModule !== 'undefined') {
          instance = new AudioInputModule(id, this.audioCtx);
        } else if ((type === 'oscilloscope' || type === 'scope') && typeof OscilloscopeModule !== 'undefined') {
          instance = new OscilloscopeModule(id, this.audioCtx);
        } else if ((type === 'keyboard' || type === 'keys') && typeof KeyboardModule !== 'undefined') {
          instance = new KeyboardModule(id, this.audioCtx);
        } else if (['webcam', 'webcam_controller', 'webcam-controller', 'camera'].includes(type)) {
          if (WebcamClass) instance = new WebcamClass(id, this.audioCtx);
        }
      } catch (err) {
        console.error(`[SoundSandboxApp] Error instantiating module "${type}":`, err);
      }

      if (!instance) {
        console.warn(`[SoundSandboxApp] Module type "${type}" could not be created.`);
        this.showNotification(`לא ניתן ליצור מודול מסוג "${type}" - וודא שהסקריפט שלו נטען כראוי.`);
        return null;
      }

      const card = document.createElement('div');
      card.className = 'module-card';
      card.id = `module_card_${id}`;
      
      const spawnX = customX !== null ? customX : (220 - this.panX) / this.scale;
      const spawnY = customY !== null ? customY : (120 - this.panY) / this.scale;
      card.style.left = `${spawnX}px`;
      card.style.top = `${spawnY}px`;

      if (typeof instance.renderHTML === 'function') {
        card.innerHTML = instance.renderHTML();
      } else if (typeof instance.renderUI === 'function') {
        card.innerHTML = instance.renderUI();
      }

      this.modules[id] = { id, type, instance, card };

      if (typeof instance.bindEvents === 'function') {
        try { instance.bindEvents(card); } catch (e) {}
      }

      if (state && typeof instance.setState === 'function') {
        try { instance.setState(state); } catch (e) {}
      }

      const deleteBtn = card.querySelector('.delete-module-btn, .close-btn, .delete-btn, .action-btn-close');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteNode(id);
        });
      }

      this.makeDraggable(card, id);
      this.bindPortEvents(card, id);

      if (this.modulesLayer) this.modulesLayer.appendChild(card);
      if (this.resizeObserver) this.resizeObserver.observe(card);

      return instance;
    }

    bindEvents() {
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.add-module-btn');
        if (btn) {
          const type = btn.getAttribute('data-type');
          if (type) this.createModule(type);
        }
      });

      if (this.themeToggleBtn) this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
      if (this.presentationBtn) this.presentationBtn.addEventListener('click', () => this.togglePresentationMode());
      if (this.tooltipsBtn) this.tooltipsBtn.addEventListener('click', () => this.toggleTooltips());
      if (this.cableLayerBtn) this.cableLayerBtn.addEventListener('click', () => this.toggleCableLayer());
      if (this.saveBtn) this.saveBtn.addEventListener('click', () => this.exportPatch());

      if (this.loadBtn && this.importFileInput) {
        this.loadBtn.addEventListener('click', () => this.importFileInput.click());
        this.importFileInput.addEventListener('change', (e) => this.importPatch(e));
      }

      if (this.clearBtn) {
        this.clearBtn.addEventListener('click', () => {
          if (confirm('האם ברצונך לנקות את משטח העבודה?')) {
            this.clearWorkspace();
          }
        });
      }

      if (this.zoomInBtn) this.zoomInBtn.addEventListener('click', () => this.updateZoom(0.1));
      if (this.zoomOutBtn) this.zoomOutBtn.addEventListener('click', () => this.updateZoom(-0.1));
      if (this.zoomResetBtn) this.zoomResetBtn.addEventListener('click', () => {
        this.scale = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.applyViewportTransform();
      });

      window.addEventListener('keydown', (e) => {
        const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

        if ((e.key === ' ' || e.code === 'Space') && !isInputFocused) {
          this.isSpacePressed = true;
          if (this.canvasContainer) this.canvasContainer.style.cursor = 'grab';
        }

        if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputFocused) {
          if (this.selectedConnection) {
            e.preventDefault();
            this.deleteConnection(this.selectedConnection);
          } else if (this.selectedNodeIds.size > 0) {
            e.preventDefault();
            Array.from(this.selectedNodeIds).forEach(id => this.deleteNode(id));
          }
        }

        if (e.key === 'Escape') {
          if (this.activeCable) {
            this.activeCable = null;
            this.drawConnections();
          } else if (this.selectedConnection) {
            this.selectConnection(null);
          } else if (this.selectedNodeIds.size > 0) {
            this.selectedNodeIds.clear();
            this.updateSelectionUI();
          }
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.key === ' ' || e.code === 'Space') {
          this.isSpacePressed = false;
          if (this.canvasContainer) this.canvasContainer.style.cursor = '';
        }
      });
    }

    clearWorkspace() {
      this.connections.forEach(conn => this.disconnectAudio(conn));
      Object.keys(this.modules).forEach(id => this.deleteNode(id));

      if (this.modulesLayer) this.modulesLayer.innerHTML = '';
      this.modules = {};
      this.connections = [];
      this.selectedNodeIds.clear();
      this.selectedConnection = null;
      this.updatePortConnectedClasses();
      this.drawConnections();
    }

    exportPatch() {
      const patch = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        theme: this.theme,
        modules: Object.values(this.modules).map(m => {
          const card = m.card;
          return {
            id: m.id,
            type: m.type,
            x: parseFloat(card.style.left || 0),
            y: parseFloat(card.style.top || 0),
            state: typeof m.instance.getState === 'function' ? m.instance.getState() : {}
          };
        }),
        connections: this.connections
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(patch, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `synth_patch_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }

    importPatch(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const patch = JSON.parse(event.target.result);
          if (patch && typeof patch === 'object') {
            this.loadPatchData(patch);
          }
        } catch (err) {
          alert('שגיאה בטעינת הקובץ. אנא וודא כי מדובר בקובץ JSON תקין.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }

    loadPatchData(patch) {
      console.log("[SoundSandboxApp] Loading patch data...", patch);
      this.clearWorkspace();

      if (patch.theme && patch.theme !== this.theme) {
        this.toggleTheme();
      }

      if (Array.isArray(patch.modules)) {
        patch.modules.forEach(m => {
          let modState = m.state || {};
          if (m.type === 'output') {
            modState = { ...modState, masterVolume: 0, volume: 0, gain: 0 };
          }
          this.createModule(m.type, m.id, m.x, m.y, modState);
        });
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (Array.isArray(patch.connections)) {
            patch.connections.forEach(conn => {
              const normalizedConn = {
                fromNode: conn.fromNode || conn.fromModuleId,
                fromPortInfo: conn.fromPortInfo || { id: conn.fromPortId, type: conn.fromPortId, name: conn.fromPortId },
                toNode: conn.toNode || conn.toModuleId,
                toPortInfo: conn.toPortInfo || { id: conn.toPortId, type: conn.toPortId, name: conn.toPortId, channel: conn.channel }
              };

              const exists = this.connections.some(c => 
                c.fromNode === normalizedConn.fromNode && 
                c.toNode === normalizedConn.toNode &&
                (c.fromPortInfo?.id || c.fromPortInfo?.type) === (normalizedConn.fromPortInfo?.id || normalizedConn.fromPortInfo?.type) &&
                (c.toPortInfo?.id || c.toPortInfo?.type) === (normalizedConn.toPortInfo?.id || normalizedConn.toPortInfo?.type)
              );

              if (!exists) {
                this.connections.push(normalizedConn);
              }
              this.connectAudio(normalizedConn);
            });
          }

          Object.values(this.modules).forEach(m => {
            if (m.type === 'output' && m.instance) {
              if (typeof m.instance.setVolume === 'function') m.instance.setVolume(0);
              if (typeof m.instance.setMasterVolume === 'function') m.instance.setMasterVolume(0);
              const slider = m.card.querySelector('input[type="range"]');
              if (slider) slider.value = 0;
            }
          });

          this.updatePortConnectedClasses();
          this.resizeCanvas();
          this.render();
          this.showNotification('הפאץ\' נטען בהצלחה! הווליום הראשי אופס ל-0. יש להרים את ה-Master Volume במודול ה-Output כדי לשמוע צליל.');
        });
      });

      this.closeModal();
    }

    closeModal() {
      const modals = document.querySelectorAll('.modal, #help-modal, #preset-modal, .modal-overlay, [data-modal]');
      modals.forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('active', 'show', 'open');
      });
    }

    updateZoom(delta) {
      this.scale = Math.min(Math.max(this.scale + delta, 0.4), 2.2);
      this.applyViewportTransform();
    }

    applyViewportTransform() {
      if (this.zoomLevelDisplay) {
        this.zoomLevelDisplay.textContent = `${Math.round(this.scale * 100)}%`;
      }
      if (this.viewport) {
        this.viewport.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
      }
      this.drawConnections();
    }

    getNodeOrParamForPort(moduleId, portEl, isOutput) {
      const mod = this.getModule(moduleId);
      if (!mod) return null;

      const portId = portEl ? portEl.getAttribute('data-port-id') : null;
      const portName = portEl ? portEl.getAttribute('data-port-name') : null;
      const portType = portEl ? portEl.getAttribute('data-port-type') : null;
      const channel = portEl ? portEl.getAttribute('data-channel') : null;
      const targetVal = portId || portName || portType;

      if (isOutput) {
        if (typeof mod.getNodeOrParamForPort === 'function') return mod.getNodeOrParamForPort(targetVal);
        if (typeof mod.getCVOutput === 'function') return mod.getCVOutput(targetVal);
        if (typeof mod.getGateOutput === 'function') return mod.getGateOutput(targetVal);
        if (typeof mod.getAudioOutput === 'function') return mod.getAudioOutput(targetVal);
        return mod.audioOutput || mod.output || mod;
      } else {
        if (typeof mod.getNodeOrParamForPort === 'function') return mod.getNodeOrParamForPort(targetVal);
        if (channel && typeof mod.getChannelInput === 'function') return mod.getChannelInput(channel);
        if (targetVal === 'cutoff' && typeof mod.getCutoffInput === 'function') return mod.getCutoffInput();
        if (targetVal === 'rate' && typeof mod.getRateInput === 'function') return mod.getRateInput();
        if (targetVal === 'fm' && typeof mod.getFMInput === 'function') return mod.getFMInput();
        if (targetVal === 'cv' && typeof mod.getCVInput === 'function') return mod.getCVInput();
        if (targetVal === 'gate' && typeof mod.getGateInput === 'function') return mod.getGateInput();
        if (typeof mod.getAudioInput === 'function') return mod.getAudioInput(targetVal);
        return mod.audioInput || mod.input || mod.gainNode || mod;
      }
    }

    getPortElement(cardEl, isOutput, info = {}) {
      if (!cardEl) return null;
      // חיפוש רק בין שקעי הכיוון הנכון (יציאות או כניסות), כדי שכניסה ויציאה מאותו סוג לא יתבלבלו
      const ports = Array.from(cardEl.querySelectorAll(isOutput ? '.port-out, .output-port' : '.port-in, .input-port'));

      if (info.channel) {
        const chMatch = ports.find(p => p.getAttribute('data-channel') === String(info.channel));
        if (chMatch) return chMatch;
      }

      const targetVal = info.id || info.name || info.type;
      if (targetVal) {
        const match = ports.find(p => p.getAttribute('data-port-id') === targetVal)
          || ports.find(p => p.getAttribute('data-port-name') === targetVal)
          || ports.find(p => p.getAttribute('data-port-type') === targetVal);
        if (match) return match;
      }

      return ports[0] || cardEl.querySelector('.port');
    }

    updatePortConnectedClasses() {
      document.querySelectorAll('.port').forEach(p => {
        p.classList.remove('connected');
        p.style.removeProperty('--cable-color');
      });

      // כל שקע מחובר נצבע בצבע הכבל שלו, כדי לראות לאן כל כבל מחובר גם כשהכבלים מאחורי המודולים
      this.connections.forEach(conn => {
        const fromCard = document.getElementById(`module_card_${conn.fromNode}`);
        const toCard = document.getElementById(`module_card_${conn.toNode}`);
        const fromPort = fromCard ? this.getPortElement(fromCard, true, conn.fromPortInfo) : null;
        const toPort = toCard ? this.getPortElement(toCard, false, conn.toPortInfo) : null;
        const color = this.getConnectionColor(conn, fromPort);

        [fromPort, toPort].forEach(port => {
          if (!port) return;
          port.classList.add('connected');
          port.style.setProperty('--cable-color', color);
        });
      });
    }

    getConnectionColor(conn, fromPortEl) {
      const portType = (fromPortEl && fromPortEl.getAttribute('data-port-type')) || conn.fromPortInfo?.type || 'audio';
      const portKey = info => info?.channel || info?.id || info?.name || info?.type || 'p';
      const connId = `${conn.fromNode}_${portKey(conn.fromPortInfo)}_${conn.toNode}_${portKey(conn.toPortInfo)}`;
      return this.getCableColor(portType, connId);
    }

    getHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    }

    getCableColor(portType, connId = '') {
      const type = (portType || '').toLowerCase();
      const hash = this.getHash(connId);

      // Audio: Green range (Hue: 130° to 165°)
      if (type.includes('audio') || type === 'out' || type === 'in') {
        const hue = 130 + (hash % 35);
        const sat = 65 + (hash % 20);
        const light = 42 + (hash % 15);
        return `hsl(${hue}, ${sat}%, ${light}%)`;
      }

      // Gate / Trigger: Yellow/Orange range (Hue: 35° to 55°)
      if (type.includes('gate') || type.includes('trigger') || type.includes('trig')) {
        const hue = 35 + (hash % 20);
        const sat = 85 + (hash % 15);
        const light = 45 + (hash % 15);
        return `hsl(${hue}, ${sat}%, ${light}%)`;
      }

      // CV / FM / Cutoff / Mod: Blue/Indigo/Purple range (Hue: 200° to 260°)
      if (type.includes('cv') || type.includes('fm') || type.includes('cutoff') || type.includes('pitch') || type.includes('rate') || type.includes('bend')) {
        const hue = 200 + (hash % 60);
        const sat = 70 + (hash % 20);
        const light = 50 + (hash % 15);
        return `hsl(${hue}, ${sat}%, ${light}%)`;
      }

      // Fallback
      const hue = hash % 360;
      return `hsl(${hue}, 70%, 50%)`;
    }

    bindPortEvents(card, id) {
      const ports = card.querySelectorAll('.port');
      ports.forEach(port => {
        if (port.dataset.bound) return;
        port.dataset.bound = "true";

        port.addEventListener('pointerdown', (e) => {
          if (this.isPresentationMode) return;
          e.stopPropagation();
          if (e.cancelable) e.preventDefault();

          if (port.setPointerCapture) {
            try { port.setPointerCapture(e.pointerId); } catch(err) {}
          }
          this.ensureAudioContextRunning();

          const isOut = port.classList.contains('port-out') || port.classList.contains('output-port');
          const portId = port.getAttribute('data-port-id');
          const portType = port.getAttribute('data-port-type');

          // בדיקה אם יש כבר כבל מחובר בדיוק לשקע הזה (לפי האלמנט עצמו, לא לפי סוג השקע).
          // יציאה יכולה להזין כמה כבלים: גרירה מיציאה תמיד מוציאה כבל חדש, ורק Shift+גרירה שולפת את הכבל האחרון שחובר אליה.
          // כניסה מקבלת כבל אחד: גרירה ממנה שולפת את הכבל שמחובר אליה.
          let existingConnIndex = -1;
          if (isOut) {
            if (e.shiftKey) {
              for (let i = this.connections.length - 1; i >= 0; i--) {
                const c = this.connections[i];
                if (c.fromNode === id && this.getPortElement(card, true, c.fromPortInfo) === port) {
                  existingConnIndex = i;
                  break;
                }
              }
            }
          } else {
            existingConnIndex = this.connections.findIndex(c =>
              c.toNode === id && this.getPortElement(card, false, c.toPortInfo) === port
            );
          }

          const cRect = this.canvasContainer.getBoundingClientRect();

          if (existingConnIndex !== -1) {
            // שליפת כבל קיים -> ניתוק מהפורט הנוכחי והעברת הקצה לגרירה
            const conn = this.connections.splice(existingConnIndex, 1)[0];
            this.disconnectAudio(conn);
            this.updatePortConnectedClasses();

            const fixedNodeId = isOut ? conn.toNode : conn.fromNode;
            const fixedIsOut = !isOut;
            const fixedPortInfo = isOut ? conn.toPortInfo : conn.fromPortInfo;

            const fixedCard = document.getElementById(`module_card_${fixedNodeId}`);
            const fixedPortEl = this.getPortElement(fixedCard, fixedIsOut, fixedPortInfo);
            const fixedCenter = fixedPortEl ? this.getPortCenter(fixedPortEl) : this.getPortCenter(port);

            this.activeCable = {
              fromNode: fixedNodeId,
              fromPortEl: fixedPortEl,
              fromPortType: fixedIsOut ? 'out' : 'in',
              portTypeInfo: fixedPortInfo?.type || portType || 'audio',
              connId: `${fixedNodeId}_${fixedPortInfo?.id || 'port'}`,
              startX: fixedCenter.x,
              startY: fixedCenter.y,
              currentX: e.clientX - cRect.left,
              currentY: e.clientY - cRect.top
            };
          } else {
            // יצירת כבל חדש מפורט פנוי
            const pCenter = this.getPortCenter(port);
            this.activeCable = {
              fromNode: id,
              fromPortEl: port,
              fromPortType: isOut ? 'out' : 'in',
              portTypeInfo: portType || 'audio',
              connId: `${id}_${portId || portType || 'port'}`,
              startX: pCenter.x,
              startY: pCenter.y,
              currentX: e.clientX - cRect.left,
              currentY: e.clientY - cRect.top
            };
          }

          const onPointerMove = (moveEvent) => {
            if (this.activeCable) {
              const currentCRect = this.canvasContainer.getBoundingClientRect();
              this.activeCable.currentX = moveEvent.clientX - currentCRect.left;
              this.activeCable.currentY = moveEvent.clientY - currentCRect.top;
              this.drawConnections();
            }
          };

          const onPointerEnd = (upEvent) => {
            if (port.releasePointerCapture && upEvent.pointerId !== undefined) {
              try {
                if (port.hasPointerCapture(upEvent.pointerId)) port.releasePointerCapture(upEvent.pointerId);
              } catch(err) {}
            }

            const rawTarget = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
            const targetPort = rawTarget ? rawTarget.closest('.port') : null;

            if (targetPort && this.activeCable) {
              const targetNodeId = targetPort.getAttribute('data-node-id') || targetPort.closest('.module-card')?.id.replace('module_card_', '');
              const targetIsOut = targetPort.classList.contains('port-out') || targetPort.classList.contains('output-port');
              const activeIsOut = this.activeCable.fromPortType === 'out';

              if (targetNodeId && targetNodeId !== this.activeCable.fromNode && targetIsOut !== activeIsOut) {
                const fromId = activeIsOut ? this.activeCable.fromNode : targetNodeId;
                const fromPortEl = activeIsOut ? this.activeCable.fromPortEl : targetPort;
                const toId = activeIsOut ? targetNodeId : this.activeCable.fromNode;
                const toPortEl = activeIsOut ? targetPort : this.activeCable.fromPortEl;

                const connection = {
                  fromNode: fromId,
                  fromPortInfo: {
                    id: fromPortEl.getAttribute('data-port-id'),
                    type: fromPortEl.getAttribute('data-port-type'),
                    name: fromPortEl.getAttribute('data-port-name')
                  },
                  toNode: toId,
                  toPortInfo: {
                    channel: toPortEl.getAttribute('data-channel'),
                    id: toPortEl.getAttribute('data-port-id'),
                    type: toPortEl.getAttribute('data-port-type'),
                    name: toPortEl.getAttribute('data-port-name')
                  }
                };

                const fromCardEl = document.getElementById(`module_card_${fromId}`);
                const toCardEl = document.getElementById(`module_card_${toId}`);
                const isSameCable = c =>
                  c.fromNode === fromId && c.toNode === toId &&
                  this.getPortElement(fromCardEl, true, c.fromPortInfo) === fromPortEl &&
                  this.getPortElement(toCardEl, false, c.toPortInfo) === toPortEl;

                // אותו כבל בדיוק כבר קיים: לא מוסיפים כפילות
                if (!this.connections.some(isSameCable)) {
                  this.connections.push(connection);
                  this.connectAudio(connection);
                }
              }
            }

            // שמיטה באוויר (תמחק את הכבל במידה ונותק)
            this.activeCable = null;
            this.updatePortConnectedClasses();
            this.drawConnections();

            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerEnd);
            window.removeEventListener('pointercancel', onPointerEnd);
          };

          window.addEventListener('pointermove', onPointerMove);
          window.addEventListener('pointerup', onPointerEnd);
          window.addEventListener('pointercancel', onPointerEnd);
        });
      });
    }

    connectAudio(conn) {
      this.ensureAudioContextRunning();

      const fromCard = document.getElementById(`module_card_${conn.fromNode}`);
      const toCard = document.getElementById(`module_card_${conn.toNode}`);
      if (!fromCard || !toCard) return;

      const fromPortEl = this.getPortElement(fromCard, true, conn.fromPortInfo);
      const toPortEl = this.getPortElement(toCard, false, conn.toPortInfo);

      const source = this.getNodeOrParamForPort(conn.fromNode, fromPortEl, true);
      let target = this.getNodeOrParamForPort(conn.toNode, toPortEl, false);

      if (target && !(target instanceof AudioNode) && !(target instanceof AudioParam)) {
        target = target.input || target.audioInput || target.gainNode || target.destination || target;
      }

      if (source && target) {
        try {
          if (typeof source.connect === 'function') {
            source.connect(target);
          }
        } catch (err) {
          console.error(`[AudioConnect Error]`, err);
        }
      }
      this.updatePortConnectedClasses();
    }

    disconnectAudio(conn) {
      const fromCard = document.getElementById(`module_card_${conn.fromNode}`);
      const toCard = document.getElementById(`module_card_${conn.toNode}`);
      if (!fromCard || !toCard) return;

      const fromPortEl = this.getPortElement(fromCard, true, conn.fromPortInfo);
      const toPortEl = this.getPortElement(toCard, false, conn.toPortInfo);

      const source = this.getNodeOrParamForPort(conn.fromNode, fromPortEl, true);
      let target = this.getNodeOrParamForPort(conn.toNode, toPortEl, false);

      if (target && !(target instanceof AudioNode) && !(target instanceof AudioParam)) {
        target = target.input || target.audioInput || target.gainNode || target.destination || target;
      }

      if (source && typeof source.disconnect === 'function') {
        try {
          if (target) source.disconnect(target);
          else source.disconnect();
        } catch (err) {
          try { source.disconnect(); } catch (e) {}
        }
      }
      this.updatePortConnectedClasses();
    }

    bindCanvasInteractions() {
      let isSelecting = false;
      let isPanning = false;

      let startMouseX = 0, startMouseY = 0;
      let startPanX = 0, startPanY = 0;
      let startWorldX = 0, startWorldY = 0;

      this.canvasContainer.addEventListener('pointerdown', (e) => {
        this.ensureAudioContextRunning();

        if (this.isPresentationMode) return;

        if (e.target.closest('.module-card') || e.target.closest('.sidebar') || e.target.closest('.toolbar') || e.target.closest('.port')) {
          return;
        }

        const cRect = this.canvasContainer.getBoundingClientRect();
        const clickX = e.clientX - cRect.left;
        const clickY = e.clientY - cRect.top;

        const isCmdOrCtrlPressed = e.metaKey || e.ctrlKey;
        if (e.button === 0 && (isCmdOrCtrlPressed || this.isSpacePressed)) {
          e.preventDefault();
          isPanning = true;
          startMouseX = e.clientX;
          startMouseY = e.clientY;
          startPanX = this.panX;
          startPanY = this.panY;
          this.canvasContainer.style.cursor = 'grabbing';
          return;
        }

        // לחיצה על כבל: לחיצה ראשונה מסמנת אותו, לחיצה שנייה על כבל מסומן מוחקת אותו.
        // עובד רק על משטח העבודה הריק, כך שלחיצה בתוך מודול (סליידר, כפתור) לעולם לא נוגעת בכבל.
        if (e.button === 0) {
          const hitConn = this.findCableAt(clickX, clickY);
          if (hitConn) {
            e.preventDefault();
            if (hitConn === this.selectedConnection) {
              this.deleteConnection(hitConn);
            } else {
              this.selectConnection(hitConn);
            }
            return;
          }
        }
        if (this.selectedConnection) this.selectConnection(null);

        if (!e.shiftKey) {
          this.selectedNodeIds.clear();
          this.updateSelectionUI();
        }

        isSelecting = true;
        startWorldX = (clickX - this.panX) / this.scale;
        startWorldY = (clickY - this.panY) / this.scale;

        this.selectionBox.style.left = `${startWorldX}px`;
        this.selectionBox.style.top = `${startWorldY}px`;
        this.selectionBox.style.width = '0px';
        this.selectionBox.style.height = '0px';
        this.selectionBox.style.display = 'block';
      });

      window.addEventListener('pointermove', (e) => {
        if (isPanning) {
          const dx = e.clientX - startMouseX;
          const dy = e.clientY - startMouseY;
          this.panX = startPanX + dx;
          this.panY = startPanY + dy;
          this.applyViewportTransform();
          return;
        }

        if (!isSelecting || this.isPresentationMode) return;

        const cRect = this.canvasContainer.getBoundingClientRect();
        const currentScreenX = e.clientX - cRect.left;
        const currentScreenY = e.clientY - cRect.top;

        const currentWorldX = (currentScreenX - this.panX) / this.scale;
        const currentWorldY = (currentScreenY - this.panY) / this.scale;

        const left = Math.min(startWorldX, currentWorldX);
        const top = Math.min(startWorldY, currentWorldY);
        const width = Math.abs(currentWorldX - startWorldX);
        const height = Math.abs(currentWorldY - startWorldY);

        this.selectionBox.style.left = `${left}px`;
        this.selectionBox.style.top = `${top}px`;
        this.selectionBox.style.width = `${width}px`;
        this.selectionBox.style.height = `${height}px`;

        this.selectedNodeIds.clear();
        Object.keys(this.modules).forEach(id => {
          const card = document.getElementById(`module_card_${id}`);
          if (card) {
            const cardX = parseFloat(card.style.left || 0);
            const cardY = parseFloat(card.style.top || 0);
            const cardW = card.offsetWidth;
            const cardH = card.offsetHeight;

            if (
              cardX + cardW >= left && cardX <= left + width &&
              cardY + cardH >= top && cardY <= top + height
            ) {
              this.selectedNodeIds.add(id);
            }
          }
        });
        this.updateSelectionUI();
      });

      const stopPanOrSelect = (e) => {
        if (isPanning) {
          isPanning = false;
          this.canvasContainer.style.cursor = (e && (e.metaKey || e.ctrlKey || this.isSpacePressed)) ? 'grab' : '';
        }
        if (isSelecting) {
          isSelecting = false;
          this.selectionBox.style.display = 'none';
        }
      };

      window.addEventListener('pointerup', stopPanOrSelect);
      window.addEventListener('pointercancel', stopPanOrSelect);

      this.canvasContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.08 : -0.08;
        this.updateZoom(delta);
      }, { passive: false });
    }

    updateSelectionUI() {
      Object.keys(this.modules).forEach(id => {
        const card = document.getElementById(`module_card_${id}`);
        if (card) {
          if (this.selectedNodeIds.has(id)) card.classList.add('selected');
          else card.classList.remove('selected');
        }
      });
    }

    makeDraggable(element, id) {
      const header = element.querySelector('.node-header') || element;
      let isDragging = false;
      let initialPositions = {};

      header.addEventListener('pointerdown', (e) => {
        if (this.isPresentationMode) return;
        if (e.button && e.button !== 0) return;
        e.stopPropagation();

        if (!this.selectedNodeIds.has(id) && !e.shiftKey) {
          this.selectedNodeIds.clear();
          this.selectedNodeIds.add(id);
          this.updateSelectionUI();
        } else {
          this.selectedNodeIds.add(id);
          this.updateSelectionUI();
        }

        isDragging = true;
        const startMouseX = e.clientX;
        const startMouseY = e.clientY;

        this.selectedNodeIds.forEach(nodeId => {
          const card = document.getElementById(`module_card_${nodeId}`);
          if (card) {
            initialPositions[nodeId] = {
              x: parseFloat(card.style.left || 0),
              y: parseFloat(card.style.top || 0)
            };
          }
        });

        const onPointerMove = (moveEvent) => {
          if (!isDragging || this.isPresentationMode) return;
          const dx = (moveEvent.clientX - startMouseX) / this.scale;
          const dy = (moveEvent.clientY - startMouseY) / this.scale;

          this.selectedNodeIds.forEach(nodeId => {
            const card = document.getElementById(`module_card_${nodeId}`);
            if (card && initialPositions[nodeId]) {
              card.style.left = `${initialPositions[nodeId].x + dx}px`;
              card.style.top = `${initialPositions[nodeId].y + dy}px`;
            }
          });

          this.drawConnections();
        };

        const onPointerEnd = () => {
          isDragging = false;
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerEnd);
          window.removeEventListener('pointercancel', onPointerEnd);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerEnd);
        window.addEventListener('pointercancel', onPointerEnd);
      });
    }

    getPortCenter(portEl) {
      const cRect = this.canvasContainer.getBoundingClientRect();
      const pRect = portEl.getBoundingClientRect();
      return {
        x: pRect.left + pRect.width / 2 - cRect.left,
        y: pRect.top + pRect.height / 2 - cRect.top
      };
    }

    drawConnections() {
      if (!this.ctx) return;

      const dpr = window.devicePixelRatio || 1;
      this.ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);

      this.cableHitPaths = [];
      if (this.selectedConnection && !this.connections.includes(this.selectedConnection)) {
        this.selectedConnection = null;
      }

      if (this.isPresentationMode) return;

      this.connections.forEach(conn => {
        const fromCard = document.getElementById(`module_card_${conn.fromNode}`);
        const toCard = document.getElementById(`module_card_${conn.toNode}`);

        if (fromCard && toCard) {
          const fromPortEl = this.getPortElement(fromCard, true, conn.fromPortInfo);
          const toPortEl = this.getPortElement(toCard, false, conn.toPortInfo);

          if (fromPortEl && toPortEl) {
            const p1 = this.getPortCenter(fromPortEl);
            const p2 = this.getPortCenter(toPortEl);
            const color = this.getConnectionColor(conn, fromPortEl);

            const isSelected = conn === this.selectedConnection;
            const points = this.drawBezierCable(p1.x, p1.y, p2.x, p2.y, color, isSelected);
            this.cableHitPaths.push({ conn, points });
          }
        }
      });

      if (this.activeCable) {
        const color = this.getCableColor(this.activeCable.portTypeInfo, this.activeCable.connId);
        this.drawBezierCable(
          this.activeCable.startX,
          this.activeCable.startY,
          this.activeCable.currentX,
          this.activeCable.currentY,
          color
        );
      }
    }

    getBezierControlPoints(x1, y1, x2, y2) {
      // חישוב שקיעת עקומת Bezier (Sag Offset) לפי מרחק הפורטים
      const dx = (x2 - x1) * 0.25;
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const sag = Math.min(Math.max(dist * 0.35, 30), 220);
      return { cp1x: x1 + dx, cp1y: y1 + sag, cp2x: x2 - dx, cp2y: y2 + sag };
    }

    drawBezierCable(x1, y1, x2, y2, color, isSelected = false) {
      const { cp1x, cp1y, cp2x, cp2y } = this.getBezierControlPoints(x1, y1, x2, y2);

      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      const trace = () => {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
      };

      if (isSelected) {
        // הילה רחבה סביב כבל מסומן
        trace();
        this.ctx.strokeStyle = this.theme === 'dark' ? 'rgba(255, 255, 255, 0.35)' : 'rgba(15, 23, 42, 0.25)';
        this.ctx.lineWidth = 12;
        this.ctx.stroke();
      }

      trace();
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = isSelected ? 6 : 3.5;
      this.ctx.stroke();

      return { x1, y1, cp1x, cp1y, cp2x, cp2y, x2, y2 };
    }

    findCableAt(x, y, tolerance = 8) {
      const samples = 40;
      let best = null;
      let bestDist = tolerance;

      // מעבר מהסוף להתחלה כדי שהכבל שצויר אחרון (העליון) ייבחר קודם
      for (let i = this.cableHitPaths.length - 1; i >= 0; i--) {
        const { conn, points: b } = this.cableHitPaths[i];
        let prevX = b.x1, prevY = b.y1;
        for (let s = 1; s <= samples; s++) {
          const t = s / samples, u = 1 - t;
          const px = u * u * u * b.x1 + 3 * u * u * t * b.cp1x + 3 * u * t * t * b.cp2x + t * t * t * b.x2;
          const py = u * u * u * b.y1 + 3 * u * u * t * b.cp1y + 3 * u * t * t * b.cp2y + t * t * t * b.y2;
          const d = this.distanceToSegment(x, y, prevX, prevY, px, py);
          if (d < bestDist) {
            bestDist = d;
            best = conn;
          }
          prevX = px;
          prevY = py;
        }
      }
      return best;
    }

    distanceToSegment(x, y, ax, ay, bx, by) {
      const dx = bx - ax, dy = by - ay;
      const lenSq = dx * dx + dy * dy;
      let t = lenSq ? ((x - ax) * dx + (y - ay) * dy) / lenSq : 0;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
    }

    selectConnection(conn) {
      this.selectedConnection = conn;
      this.drawConnections();
    }

    deleteConnection(conn) {
      const index = this.connections.indexOf(conn);
      if (index !== -1) {
        this.connections.splice(index, 1);
        this.disconnectAudio(conn);
      }
      if (this.selectedConnection === conn) this.selectedConnection = null;
      this.updatePortConnectedClasses();
      this.drawConnections();
    }

    toggleCableLayer() {
      this.cablesBehind = !this.cablesBehind;
      document.body.classList.toggle('cables-behind', this.cablesBehind);
      if (this.cableLayerBtn) {
        this.cableLayerBtn.textContent = `Cables: ${this.cablesBehind ? 'Back' : 'Front'}`;
        this.cableLayerBtn.classList.toggle('active', this.cablesBehind);
      }
      try { localStorage.setItem('sp_cables_behind', this.cablesBehind ? '1' : '0'); } catch (e) {}
    }

    initDraggablePanels() {
      try {
        if (localStorage.getItem('sp_cables_behind') === '1') this.toggleCableLayer();
      } catch (e) {}

      const panels = [
        { el: document.querySelector('.sidebar'), handle: document.querySelector('.sidebar h3'), key: 'sp_panel_sidebar' },
        { el: document.querySelector('.toolbar'), handle: document.querySelector('.toolbar .panel-drag-handle'), key: 'sp_panel_toolbar' }
      ];

      panels.forEach(({ el, handle, key }) => {
        if (!el || !handle) return;
        handle.classList.add('panel-drag-handle');
        handle.title = 'Drag to move. Double-click to reset position.';

        const placeAt = (left, top) => {
          const maxLeft = Math.max(0, window.innerWidth - el.offsetWidth);
          const maxTop = Math.max(0, window.innerHeight - 40);
          left = Math.min(Math.max(0, left), maxLeft);
          top = Math.min(Math.max(0, top), maxTop);
          el.style.left = `${left}px`;
          el.style.top = `${top}px`;
          el.style.right = 'auto';
        };

        try {
          const saved = JSON.parse(localStorage.getItem(key) || 'null');
          if (saved && typeof saved.left === 'number' && typeof saved.top === 'number') placeAt(saved.left, saved.top);
        } catch (e) {}

        handle.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          const rect = el.getBoundingClientRect();
          const offsetX = e.clientX - rect.left;
          const offsetY = e.clientY - rect.top;
          el.classList.add('panel-dragging');

          const onMove = (moveEvent) => {
            placeAt(moveEvent.clientX - offsetX, moveEvent.clientY - offsetY);
          };
          const onUp = () => {
            el.classList.remove('panel-dragging');
            try {
              localStorage.setItem(key, JSON.stringify({ left: parseFloat(el.style.left), top: parseFloat(el.style.top) }));
            } catch (err) {}
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
          };
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
          window.addEventListener('pointercancel', onUp);
        });

        handle.addEventListener('dblclick', () => {
          el.style.left = '';
          el.style.top = '';
          el.style.right = '';
          try { localStorage.removeItem(key); } catch (e) {}
        });
      });
    }

    deleteNode(id) {
      const mod = this.getModule(id);
      if (mod) {
        if (typeof mod.destroy === 'function') try { mod.destroy(); } catch (e) {}
        if (typeof mod.cleanup === 'function') try { mod.cleanup(); } catch (e) {}
      }

      this.connections = this.connections.filter(c => {
        if (c.fromNode === id || c.toNode === id) {
          this.disconnectAudio(c);
          return false;
        }
        return true;
      });

      if (this.modules[id]) delete this.modules[id];
      this.selectedNodeIds.delete(id);
      
      const card = document.getElementById(`module_card_${id}`);
      if (card) {
        if (this.resizeObserver) this.resizeObserver.unobserve(card);
        card.remove();
      }
      this.updatePortConnectedClasses();
      this.drawConnections();
    }
  }

  window.SoundSandboxApp = SoundSandboxApp;
}

window.toggleTooltips = function() {
  if (window.synthApp && typeof window.synthApp.toggleTooltips === 'function') {
    window.synthApp.toggleTooltips();
  }
};

(function() {
  function startModularApp() {
    if (!window.synthApp && window.SoundSandboxApp) {
      window.synthApp = new window.SoundSandboxApp();
      window.app = window.synthApp;
    }
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startModularApp);
  } else {
    startModularApp();
  }
})();