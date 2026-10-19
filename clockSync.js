// clockSync.js - one shared way for modules to follow a CLOCK cable (architecture.md section 4).
// A clock is a gate pulse on every 16th note. A module with a CLOCK input uses a ClockFollower:
// - Clock sources that announce their pulses (Metronome, Drum Machine, Sequencer) carry a
//   ClockSource on their CLOCK output node. Their scheduler tells it each pulse's exact audio time
//   ahead of time, so a follower plays right on the beat and knows when the source starts and stops.
// - Any other gate signal (an LFO square, a Ribbon GATE...) is followed through a small AudioWorklet
//   that finds the rising edges; those pulses arrive a few milliseconds late, and a pause longer than
//   a second counts as stop, the next pulse as a new start.
// The follower calls onPulse(time, dur, index) for every 16th (index 0 = the source just started)
// and onStop() when the clock stops or the last CLOCK cable is pulled out.

class ClockSource {
  constructor() {
    this.listeners = new Set();
    this.index = -1;
  }

  // Called by the source's scheduler for every 16th it schedules. first = playback just started.
  pulse(time, dur, first = false) {
    this.index = first ? 0 : this.index + 1;
    this.listeners.forEach(l => { try { l.sourcePulse(time, dur, this.index); } catch (e) {} });
  }

  stop() {
    this.index = -1;
    this.listeners.forEach(l => { try { l.sourceStop(); } catch (e) {} });
  }

  // Attaches a ClockSource to a source's CLOCK output node (app.js passes that node to the follower)
  static attach(node) {
    node.clockSource = new ClockSource();
    return node.clockSource;
  }
}

const CLOCK_SYNC_WORKLET = `
  class ClockEdgeProcessor extends AudioWorkletProcessor {
    constructor() { super(); this.high = false; }
    process(inputs) {
      const ch = inputs[0] && inputs[0][0];
      if (ch) {
        for (let i = 0; i < ch.length; i++) {
          const v = ch[i];
          if (!this.high && v > 0.5) { this.high = true; this.port.postMessage(currentTime + i / sampleRate); }
          else if (this.high && v < 0.25) this.high = false;
        }
      }
      return true;
    }
  }
  registerProcessor('clock-edge-processor', ClockEdgeProcessor);
`;

class ClockFollower {
  // handlers: { onPulse(time, dur, index), onStop(), onCablesChanged(count) }
  constructor(ctx, handlers) {
    this.ctx = ctx;
    this.handlers = handlers || {};
    this.input = ctx.createGain();     // the CLOCK input jack
    this.cables = 0;
    this.sources = new Set();          // announcing sources plugged in
    this.running = false;
    this.lastEdge = 0;
    this.edgeIndex = -1;
    this.edgeDur = 0;
    this.watchdog = null;
    this.destroyed = false;
    ClockFollower.loadWorklet(ctx).then(() => {
      if (this.destroyed) return;
      this.edgeNode = new AudioWorkletNode(ctx, 'clock-edge-processor', { numberOfInputs: 1, numberOfOutputs: 1 });
      this.input.connect(this.edgeNode);
      // A silent path to the speakers keeps the detector running
      this.sink = ctx.createGain();
      this.sink.gain.value = 0;
      this.edgeNode.connect(this.sink);
      this.sink.connect(ctx.destination);
      this.edgeNode.port.onmessage = e => this.edge(e.data);
    }).catch(() => {});
  }

  static loadWorklet(ctx) {
    if (!ctx.audioWorklet) return Promise.reject(new Error('no AudioWorklet'));
    if (!ClockFollower.ready || ClockFollower.readyCtx !== ctx) {
      ClockFollower.readyCtx = ctx;
      const url = URL.createObjectURL(new Blob([CLOCK_SYNC_WORKLET], { type: 'application/javascript' }));
      ClockFollower.ready = ctx.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url));
    }
    return ClockFollower.ready;
  }

  get connected() { return this.cables > 0; }

  // Called from the module's onInputConnected(key, connected, source)
  cable(connected, source) {
    this.cables = Math.max(0, this.cables + (connected ? 1 : -1));
    const cs = source && source.clockSource;
    if (cs) {
      if (connected) { cs.listeners.add(this); this.sources.add(cs); }
      else {
        cs.listeners.delete(this);
        this.sources.delete(cs);
        if (!this.sources.size) this.halt();
      }
    }
    if (!this.cables) {
      this.sources.forEach(s => s.listeners.delete(this));
      this.sources.clear();
      this.halt();
    }
    if (this.handlers.onCablesChanged) this.handlers.onCablesChanged(this.cables);
  }

  // ---- Announced pulses (exact times) ----
  sourcePulse(time, dur, index) {
    this.running = true;
    if (this.handlers.onPulse) this.handlers.onPulse(time, dur, index);
  }

  sourceStop() {
    // Another announcing source may still be running; stop only when none is
    this.halt();
  }

  // ---- Detected pulses (any gate signal) ----
  edge(time) {
    if (!this.cables || this.sources.size) return;   // an announcing source already gives exact times
    const gap = time - this.lastEdge;
    const fresh = !this.running || !this.lastEdge || gap > 1;
    if (!fresh) this.edgeDur = gap;
    this.lastEdge = time;
    this.edgeIndex = fresh ? 0 : this.edgeIndex + 1;
    this.running = true;
    const dur = this.edgeDur || 0.125;
    if (this.handlers.onPulse) this.handlers.onPulse(Math.max(time, this.ctx.currentTime), dur, this.edgeIndex);
    this.armWatchdog(dur);
  }

  armWatchdog(dur) {
    clearTimeout(this.watchdog);
    this.watchdog = setTimeout(() => {
      if (!this.sources.size) this.halt();
    }, Math.max(1000, dur * 4000));
  }

  halt() {
    clearTimeout(this.watchdog);
    this.watchdog = null;
    this.lastEdge = 0;
    this.edgeIndex = -1;
    this.edgeDur = 0;
    if (!this.running) return;
    this.running = false;
    if (this.handlers.onStop) this.handlers.onStop();
  }

  destroy() {
    this.destroyed = true;
    clearTimeout(this.watchdog);
    this.sources.forEach(s => s.listeners.delete(this));
    this.sources.clear();
    [this.input, this.edgeNode, this.sink].forEach(n => { try { if (n) n.disconnect(); } catch (e) {} });
  }
}

window.ClockSource = ClockSource;
window.ClockFollower = ClockFollower;
