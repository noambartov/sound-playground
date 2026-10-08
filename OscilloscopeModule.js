class OscilloscopeModule {
  constructor(id, audioCtx) {
    this.id = id;
    this.audioCtx = audioCtx || (window.audioEngine ? window.audioEngine.getContext() : new (window.AudioContext || window.webkitAudioContext)());

    // צומת ניתוח אות בזמן אמת עבור התצוגה
    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 2048;

    this.dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

    this.animFrameId = null;
    this.canvas = null;
    this.canvasCtx = null;
  }

  renderHTML() {
    return `
      <div class="node-header">
        <span class="node-title">Oscilloscope</span>
        <button class="delete-module-btn" onclick="window.synthApp.deleteNode('${this.id}')" title="Delete Module">×</button>
      </div>
      <div class="node-body" style="padding: 10px; display: flex; flex-direction: column; gap: 10px;">
        <div class="control-group scope-container" style="text-align: center;">
          <canvas id="scope_canvas_${this.id}" width="240" height="120" style="background: #18181b; border-radius: 6px; border: 1px solid #3f3f46; display: block; margin: 0 auto;"></canvas>
        </div>

        <div class="ports-row" style="display: flex; justify-content: space-around; align-items: center; padding-top: 6px; border-top: 1px solid #e2e8f0;">
          <div class="port-group" style="display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700;">
            <div class="port port-in" data-port-type="audio" data-node-id="${this.id}" title="Audio Input"></div>
            <span>IN</span>
          </div>
          <div class="port-group">
            <!-- מודול תצוגה בקצה השרשרת -->
          </div>
        </div>
      </div>
    `;
  }

  bindEvents(card) {
    this.canvas = card.querySelector(`#scope_canvas_${this.id}`);
    if (this.canvas) {
      this.canvasCtx = this.canvas.getContext('2d');
      this.startDrawing();
    }
  }

  startDrawing() {
    if (!this.canvasCtx) return;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    const draw = () => {
      this.animFrameId = requestAnimationFrame(draw);

      const width = this.canvas.width;
      const height = this.canvas.height;

      this.analyserNode.getByteTimeDomainData(this.dataArray);

      // ניקוי הקנווס
      this.canvasCtx.fillStyle = '#18181b';
      this.canvasCtx.fillRect(0, 0, width, height);

      // ציור קו אופקי מרכזי (Zero Axis)
      this.canvasCtx.lineWidth = 1;
      this.canvasCtx.strokeStyle = '#27272a';
      this.canvasCtx.beginPath();
      this.canvasCtx.moveTo(0, height / 2);
      this.canvasCtx.lineTo(width, height / 2);
      this.canvasCtx.stroke();

      // זיהוי Zero-Crossing לייצוב התצוגה (Trigger System)
      let triggerIndex = 0;
      for (let i = 0; i < this.dataArray.length - 1; i++) {
        if (this.dataArray[i] < 128 && this.dataArray[i + 1] >= 128) {
          triggerIndex = i;
          break;
        }
      }

      // ציור צורת הגל
      this.canvasCtx.lineWidth = 2;
      this.canvasCtx.strokeStyle = '#10b981';
      this.canvasCtx.beginPath();

      const displayedSamples = this.dataArray.length - triggerIndex;
      const sliceWidth = width / displayedSamples;
      let x = 0;

      for (let i = triggerIndex; i < this.dataArray.length; i++) {
        const v = this.dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === triggerIndex) {
          this.canvasCtx.moveTo(x, y);
        } else {
          this.canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      this.canvasCtx.stroke();
    };

    draw();
  }

  getAudioInput(type) {
    return this.analyserNode;
  }

  getState() {
    return {};
  }

  setState(state) {
    // אין פרמטרים פנימיים לשמירה
  }

  cleanup() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    try {
      this.analyserNode.disconnect();
    } catch (e) {}
  }
}