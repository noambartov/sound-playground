/**
 * WebcamModule.js
 * Computer Vision Motion & Position Controller for Modular Synthesizer Sandbox.
 * Converts real-time video motion into CV (X, Y, Motion) and Gate audio signals.
 */
class WebcamModule {
  constructor(id, audioCtx) {
    this.id = id;
    this.audioCtx = audioCtx || (window.audioEngine ? window.audioEngine.getContext() : new (window.AudioContext || window.webkitAudioContext)());

    // הפרמטרים הפנימיים של המודול
    this.threshold = 30;    // סף רגישות לזיהוי שינוי בפיקסל (0-255)
    this.smoothing = 0.10;  // מקדם החלקת אות (0.01 - 0.5)
    this.cvDepth = 1000;    // מכפיל תדר להרחבת טווח ה-FM (הופך 0..1 ל-0..1000Hz)
    this.isStreaming = false;
    this.stream = null;
    this.animFrameId = null;

    // ערכי יעדים וערכים מוחלקים נוכחיים
    this.targetX = 0.5;
    this.targetY = 0.5;
    this.targetMotion = 0;
    this.targetGate = 0;

    this.currentX = 0.5;
    this.currentY = 0.5;
    this.currentMotion = 0;
    this.currentGate = 0;

    // יצירת AudioNodes מסוג ConstantSourceNode למוצאי ה-CV וה-Gate
    this.cvXNode = this.audioCtx.createConstantSource();
    this.cvYNode = this.audioCtx.createConstantSource();
    this.cvMotionNode = this.audioCtx.createConstantSource();
    this.gateNode = this.audioCtx.createConstantSource();

    // אתחול ערכים
    this.cvXNode.offset.value = 0.5 * this.cvDepth;
    this.cvYNode.offset.value = 0.5 * this.cvDepth;
    this.cvMotionNode.offset.value = 0;
    this.gateNode.offset.value = 0;

    // הפעלת מחוללי המתח
    this.cvXNode.start();
    this.cvYNode.start();
    this.cvMotionNode.start();
    this.gateNode.start();

    // Canvas נסתר לניתוח פרימים (Computer Vision Frame Diffing)
    this.offCanvas = document.createElement('canvas');
    this.offCanvas.width = 120;
    this.offCanvas.height = 90;
    this.offCtx = this.offCanvas.getContext('2d', { willReadFrequently: true });
    this.prevFrameData = null;
  }

  /**
   * החזרת ה-AudioNode הרלוונטי לפי שם הפורט
   */
  getNodeOrParamForPort(portName) {
    switch (portName) {
      case 'out_x':
      case 'x':
        return this.cvXNode;
      case 'out_y':
      case 'y':
        return this.cvYNode;
      case 'out_motion':
      case 'motion':
        return this.cvMotionNode;
      case 'out_gate':
      case 'gate':
        return this.gateNode;
      default:
        return this.cvXNode;
    }
  }

  getAudioOutput(portName) {
    return this.getNodeOrParamForPort(portName);
  }

  /**
   * יצירת ה-HTML הפנימי של המודול
   */
  renderHTML() {
    return `
      <div class="node-header">
        <span class="node-title">Webcam CV</span>
        <button class="delete-module-btn" onclick="window.synthApp.deleteNode('${this.id}')" title="Delete Module">×</button>
      </div>
      <div class="node-body" style="padding: 12px; display: flex; flex-direction: column; gap: 10px;">
        <!-- אזור תצוגת המצלמה -->
        <div class="webcam-preview-container" style="position: relative; width: 100%; height: 110px; background: rgba(0,0,0,0.2); border-radius: 6px; border: 1px solid var(--panel-border, #374151); overflow: hidden; display: flex; align-items: center; justify-content: center;">
          <video id="video_${this.id}" autoplay playsinline muted style="display: none;"></video>
          <canvas id="canvas_${this.id}" width="160" height="120" style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1);"></canvas>
          
          <button id="btn_toggle_${this.id}" class="action-btn" onclick="WebcamModule.toggleCamera('${this.id}')" style="position: absolute; z-index: 10; padding: 6px 12px; font-size: 11px; cursor: pointer; background: rgba(31, 41, 55, 0.85); backdrop-filter: blur(4px); border: 1px solid var(--panel-border, #4b5563); color: #fff; border-radius: 4px;">
            Start Camera
          </button>
        </div>

        <!-- סליידר Threshold -->
        <div class="control-group">
          <div style="display: flex; justify-content: space-between; font-size: 11px;">
            <label>Sens (Thresh)</label>
            <span id="val_threshold_${this.id}">${this.threshold}</span>
          </div>
          <input type="range" min="5" max="100" value="${this.threshold}" oninput="WebcamModule.updateParam('${this.id}', 'threshold', this.value)">
        </div>

        <!-- סליידר Smoothing -->
        <div class="control-group">
          <div style="display: flex; justify-content: space-between; font-size: 11px;">
            <label>Smoothing</label>
            <span id="val_smoothing_${this.id}">${this.smoothing.toFixed(2)}</span>
          </div>
          <input type="range" min="0.01" max="0.4" step="0.01" value="${this.smoothing}" oninput="WebcamModule.updateParam('${this.id}', 'smoothing', this.value)">
        </div>

        <!-- סליידר CV Depth / Range (חדש) -->
        <div class="control-group">
          <div style="display: flex; justify-content: space-between; font-size: 11px;">
            <label>CV Depth (Hz)</label>
            <span id="val_cvDepth_${this.id}">${this.cvDepth}</span>
          </div>
          <input type="range" min="100" max="3000" step="50" value="${this.cvDepth}" oninput="WebcamModule.updateParam('${this.id}', 'cvDepth', this.value)">
        </div>

        <!-- אזור יציאות האות -->
        <div class="ports-container" style="margin-top: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding-top: 8px; border-top: 1px solid var(--panel-border, #374151);">
          
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; background: rgba(255,255,255,0.04); border-radius: 4px; font-size: 10px; font-weight: 700;">
            <span>X CV</span>
            <div class="port port-out" data-node-id="${this.id}" data-port-id="out_x" data-port-type="cv" title="X Position CV"></div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; background: rgba(255,255,255,0.04); border-radius: 4px; font-size: 10px; font-weight: 700;">
            <span>MOTION</span>
            <div class="port port-out" data-node-id="${this.id}" data-port-id="out_motion" data-port-type="cv" title="Motion Intensity CV"></div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; background: rgba(255,255,255,0.04); border-radius: 4px; font-size: 10px; font-weight: 700;">
            <span>Y CV</span>
            <div class="port port-out" data-node-id="${this.id}" data-port-id="out_y" data-port-type="cv" title="Y Position CV"></div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; background: rgba(255,255,255,0.04); border-radius: 4px; font-size: 10px; font-weight: 700;">
            <span>GATE</span>
            <div class="port port-out" data-node-id="${this.id}" data-port-id="out_gate" data-port-type="gate" title="Motion Gate Trigger"></div>
          </div>

        </div>
      </div>
    `;
  }

  renderUI() {
    return this.renderHTML();
  }

  static async toggleCamera(id) {
    const mod = window.synthApp ? window.synthApp.getModule(id) : null;
    if (!mod) return;

    if (mod.isStreaming) {
      mod.stopCamera();
    } else {
      await mod.startCamera();
    }
  }

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 160 }, height: { ideal: 120 }, frameRate: { ideal: 30 } },
        audio: false
      });

      const video = document.getElementById(`video_${this.id}`);
      const btn = document.getElementById(`btn_toggle_${this.id}`);

      if (video) {
        video.srcObject = this.stream;
        await video.play();
        this.isStreaming = true;

        if (btn) {
          btn.textContent = 'Stop Camera';
          btn.style.background = 'rgba(220, 38, 38, 0.8)';
        }

        this.processVideoFrame();
      }
    } catch (err) {
      console.error('[WebcamModule] Access error:', err);
      alert('Could not access the camera. Please allow camera access in your browser.');
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.isStreaming = false;
    this.prevFrameData = null;

    const btn = document.getElementById(`btn_toggle_${this.id}`);
    if (btn) {
      btn.textContent = 'Start Camera';
      btn.style.background = 'rgba(31, 41, 55, 0.85)';
    }

    // איפוס מוצאי CV בעת עצירה
    const now = this.audioCtx.currentTime;
    this.cvXNode.offset.setTargetAtTime(0.5 * this.cvDepth, now, 0.05);
    this.cvYNode.offset.setTargetAtTime(0.5 * this.cvDepth, now, 0.05);
    this.cvMotionNode.offset.setTargetAtTime(0, now, 0.05);
    this.gateNode.offset.setTargetAtTime(0, now, 0.01);
  }

  processVideoFrame() {
    if (!this.isStreaming) return;

    const video = document.getElementById(`video_${this.id}`);
    const canvas = document.getElementById(`canvas_${this.id}`);

    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
      const w = this.offCanvas.width;
      const h = this.offCanvas.height;

      this.offCtx.drawImage(video, 0, 0, w, h);
      const currentFrame = this.offCtx.getImageData(0, 0, w, h);
      const currData = currentFrame.data;

      if (this.prevFrameData) {
        let sumX = 0;
        let sumY = 0;
        let changedPixels = 0;

        for (let i = 0; i < currData.length; i += 4) {
          const lumCurr = 0.299 * currData[i] + 0.587 * currData[i + 1] + 0.114 * currData[i + 2];
          const lumPrev = 0.299 * this.prevFrameData[i] + 0.587 * this.prevFrameData[i + 1] + 0.114 * this.prevFrameData[i + 2];

          const diff = Math.abs(lumCurr - lumPrev);

          if (diff > this.threshold) {
            const pixelIdx = i / 4;
            const x = pixelIdx % w;
            const y = Math.floor(pixelIdx / w);

            sumX += x;
            sumY += y;
            changedPixels++;
          }
        }

        if (changedPixels > 5) {
          this.targetX = 1.0 - ((sumX / changedPixels) / w);
          this.targetY = (sumY / changedPixels) / h;
          
          this.targetMotion = Math.min(1.0, changedPixels / (w * h * 0.15));
          this.targetGate = 1.0;
        } else {
          this.targetMotion = 0;
          this.targetGate = 0;
        }
      }

      this.prevFrameData = currData;

      // החלקת אותות
      this.currentX += (this.targetX - this.currentX) * this.smoothing;
      this.currentY += (this.targetY - this.currentY) * this.smoothing;
      this.currentMotion += (this.targetMotion - this.currentMotion) * this.smoothing;
      this.currentGate = this.targetGate;

      // עדכון ה-AudioNodes מוגדלים לפי ה-cvDepth
      const now = this.audioCtx.currentTime;
      this.cvXNode.offset.setTargetAtTime(this.currentX * this.cvDepth, now, 0.01);
      this.cvYNode.offset.setTargetAtTime((1.0 - this.currentY) * this.cvDepth, now, 0.01);
      this.cvMotionNode.offset.setTargetAtTime(this.currentMotion, now, 0.01);
      this.gateNode.offset.setTargetAtTime(this.currentGate, now, 0.005);

      // ציור כוונת HUD מעל הקנווס
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (this.currentMotion > 0.02) {
          ctx.save();
          const targetCanvasX = (1.0 - this.targetX) * canvas.width;
          const targetCanvasY = this.targetY * canvas.height;

          // מעגל זיהוי תנועה
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(targetCanvasX, targetCanvasY, 8 + this.currentMotion * 12, 0, Math.PI * 2);
          ctx.stroke();

          // כוונת מרכז (Crosshair)
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(targetCanvasX - 6, targetCanvasY);
          ctx.lineTo(targetCanvasX + 6, targetCanvasY);
          ctx.moveTo(targetCanvasX, targetCanvasY - 6);
          ctx.lineTo(targetCanvasX, targetCanvasY + 6);
          ctx.stroke();

          ctx.restore();
        }
      }
    }

    this.animFrameId = requestAnimationFrame(() => this.processVideoFrame());
  }

  getState() {
    return {
      threshold: this.threshold,
      smoothing: this.smoothing,
      cvDepth: this.cvDepth
    };
  }

  setState(state) {
    if (!state) return;

    if (state.threshold !== undefined) WebcamModule.updateParam(this.id, 'threshold', state.threshold);
    if (state.smoothing !== undefined) WebcamModule.updateParam(this.id, 'smoothing', state.smoothing);
    if (state.cvDepth !== undefined) WebcamModule.updateParam(this.id, 'cvDepth', state.cvDepth);

    const card = document.getElementById(`module_card_${this.id}`);
    if (card) {
      const threshInput = card.querySelector('input[oninput*="threshold"]');
      if (threshInput) threshInput.value = state.threshold;

      const smoothInput = card.querySelector('input[oninput*="smoothing"]');
      if (smoothInput) smoothInput.value = state.smoothing;

      const depthInput = card.querySelector('input[oninput*="cvDepth"]');
      if (depthInput) depthInput.value = state.cvDepth;
    }
  }

  static updateParam(id, param, value) {
    const mod = window.synthApp ? window.synthApp.getModule(id) : null;
    if (!mod) return;

    const numVal = parseFloat(value);
    const valDisplay = document.getElementById(`val_${param}_${id}`);

    if (param === 'threshold') {
      mod.threshold = numVal;
      if (valDisplay) valDisplay.textContent = Math.round(numVal);
    } else if (param === 'smoothing') {
      mod.smoothing = numVal;
      if (valDisplay) valDisplay.textContent = numVal.toFixed(2);
    } else if (param === 'cvDepth') {
      mod.cvDepth = numVal;
      if (valDisplay) valDisplay.textContent = Math.round(numVal);
    }
  }

  cleanup() {
    this.stopCamera();
    try {
      this.cvXNode.stop();
      this.cvYNode.stop();
      this.cvMotionNode.stop();
      this.gateNode.stop();

      this.cvXNode.disconnect();
      this.cvYNode.disconnect();
      this.cvMotionNode.disconnect();
      this.gateNode.disconnect();
    } catch (e) {}
  }

  destroy() {
    this.cleanup();
  }
}

window.WebcamModule = WebcamModule;