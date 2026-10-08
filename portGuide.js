// portGuide.js - Jack hints: a small card on hover ("what is this jack, where does it go")
// and highlighting of matching jacks while a cable is being dragged.
// Single source of truth for jack descriptions (English only, like the rest of the site UI).

(function () {
  // Key format: "<moduleType>:<in|out>:<portKey>"
  // portKey = data-port-id || data-port-name || data-port-type || "default"; mixer channel numbers are dropped.
  const AUDIO_DESTS = ['filter:in:audio', 'vca:in:audio', 'mixer:in:ch_in', 'reverb:in:in_l', 'output:in:in', 'oscilloscope:in:audio', 'granular:in:in_l', 'recorder:in:in'];
  const MOD_DESTS = ['filter:in:cutoff', 'vca:in:cv', 'oscillator:in:fm', 'granular:in:cv1', 'granular:in:cv2', 'lfo:in:rate', 'oscilloscope:in:audio'];
  const AUDIO_SOURCES = ['oscillator:out:default', 'granular:out:out_l', 'audio_in:out:audio', 'mixer:out:out_l', 'filter:out:default', 'vca:out:audio', 'reverb:out:out_l'];
  const MOD_SOURCES = ['lfo:out:default', 'envelope:out:env', 'webcam:out:out_x', 'webcam:out:out_y', 'webcam:out:out_motion'];
  const GATE_SOURCES = ['keyboard:out:gate', 'sequencer:out:gate', 'webcam:out:out_gate'];

  const GUIDE = {
    // Sound sources
    'oscillator:in:fm': { name: 'FM IN', signal: 'CV', text: 'Pushes the pitch up and down. An LFO here gives vibrato; another oscillator gives metallic FM tones. Keyboard FREQ or Sequencer PITCH here plays notes.', from: 'LFO OUT, Keyboard FREQ, Sequencer PITCH CV, another Oscillator OUT', match: ['lfo:out:default', 'keyboard:out:freq', 'sequencer:out:pitch', 'oscillator:out:default', 'webcam:out:out_x', 'webcam:out:out_y'] },
    'oscillator:out:default': { name: 'OUT', signal: 'Audio', text: 'The raw tone of the oscillator.', to: 'Filter IN, VCA IN, Mixer IN, Reverb IN L, Output IN, Oscilloscope IN', match: AUDIO_DESTS },

    'granular:in:in_l': { name: 'IN L', signal: 'Audio', text: 'Sound to cut into tiny grains (left side).', from: 'Mic / Audio In OUT, Oscillator OUT, Mixer OUT L', match: AUDIO_SOURCES },
    'granular:in:in_r': { name: 'IN R', signal: 'Audio', text: 'Sound to cut into tiny grains (right side).', from: 'Mic / Audio In OUT, Oscillator OUT, Mixer OUT R', match: AUDIO_SOURCES.concat(['mixer:out:out_r', 'reverb:out:out_r']) },
    'granular:in:cv1': { name: 'CV 1', signal: 'CV', text: 'Moves the setting chosen in the CV 1 menu (grain position by default).', from: 'LFO OUT, Webcam X / Y / MOTION, Envelope ENV OUT', match: MOD_SOURCES },
    'granular:in:cv2': { name: 'CV 2', signal: 'CV', text: 'Moves the setting chosen in the CV 2 menu (grain pitch by default).', from: 'LFO OUT, Webcam X / Y / MOTION, Envelope ENV OUT', match: MOD_SOURCES },
    'granular:out:out_l': { name: 'OUT L', signal: 'Audio', text: 'The grain cloud, left side.', to: 'Filter IN, Reverb IN L, VCA IN, Output IN', match: AUDIO_DESTS },
    'granular:out:out_r': { name: 'OUT R', signal: 'Audio', text: 'The grain cloud, right side.', to: 'Reverb IN R, Mixer IN, Output IN', match: AUDIO_DESTS.concat(['reverb:in:in_r']) },

    'audio_in:out:audio': { name: 'OUT', signal: 'Audio', text: 'Live sound from your microphone or sound card.', to: 'Filter IN, Granular IN L, Reverb IN L, VCA IN, Output IN', match: AUDIO_DESTS },

    // Controllers
    'keyboard:out:freq': { name: 'FREQ', signal: 'CV', text: 'The pitch of the key you play.', to: 'Oscillator FM IN', match: ['oscillator:in:fm'] },
    'keyboard:out:gate': { name: 'GATE', signal: 'Gate', text: 'On while a key is held, off when you let go.', to: 'Envelope GATE IN', match: ['envelope:in:gate'] },
    'keyboard:out:bend': { name: 'BEND', signal: 'CV', text: 'The pitch bend wheel.', to: 'Oscillator FM IN, Filter CUT MOD', match: ['oscillator:in:fm', 'filter:in:cutoff'] },

    'sequencer:out:pitch': { name: 'PITCH CV', signal: 'CV', text: 'The note of the current step.', to: 'Oscillator FM IN', match: ['oscillator:in:fm'] },
    'sequencer:out:gate': { name: 'GATE', signal: 'Gate', text: 'A short pulse on every active step.', to: 'Envelope GATE IN', match: ['envelope:in:gate'] },

    'webcam:out:out_x': { name: 'X CV', signal: 'CV', text: 'Where the movement is, left to right.', to: 'Filter CUT MOD, Oscillator FM IN, Granular CV 1', match: MOD_DESTS },
    'webcam:out:out_y': { name: 'Y CV', signal: 'CV', text: 'Where the movement is, bottom to top.', to: 'Filter CUT MOD, Oscillator FM IN, Granular CV 2', match: MOD_DESTS },
    'webcam:out:out_motion': { name: 'MOTION', signal: 'CV', text: 'How much movement there is.', to: 'VCA CV, Granular CV 1, Filter CUT MOD', match: MOD_DESTS },
    'webcam:out:out_gate': { name: 'GATE', signal: 'Gate', text: 'Fires when movement passes the threshold.', to: 'Envelope GATE IN', match: ['envelope:in:gate'] },

    // Processors and effects
    'filter:in:audio': { name: 'IN', signal: 'Audio', text: 'The sound to filter.', from: 'Oscillator OUT, Granular OUT, Mic / Audio In OUT, Mixer OUT', match: AUDIO_SOURCES },
    'filter:in:cutoff': { name: 'CUT MOD', signal: 'CV', text: 'Moves the cutoff, making the sound brighter or darker.', from: 'Envelope ENV OUT, LFO OUT, Webcam X / Y', match: MOD_SOURCES.concat(['keyboard:out:bend']) },
    'filter:out:default': { name: 'OUT', signal: 'Audio', text: 'The filtered sound.', to: 'VCA IN, Reverb IN L, Output IN, Oscilloscope IN', match: AUDIO_DESTS },

    'vca:in:audio': { name: 'IN', signal: 'Audio', text: 'The sound whose volume the VCA controls.', from: 'Oscillator OUT, Filter OUT, Granular OUT', match: AUDIO_SOURCES },
    'vca:in:cv': { name: 'CV', signal: 'CV', text: 'Opens the volume. From an Envelope each note fades in and out; from an LFO you get tremolo.', from: 'Envelope ENV OUT, LFO OUT, Webcam MOTION', match: MOD_SOURCES },
    'vca:out:audio': { name: 'OUT', signal: 'Audio', text: 'The sound after the volume control.', to: 'Reverb IN L, Mixer IN, Output IN, Recorder IN', match: AUDIO_DESTS },

    'mixer:in:ch_in': { name: 'IN', signal: 'Audio', text: 'One channel of the mixer. Each channel has its own level and pan.', from: 'Any audio OUT', match: AUDIO_SOURCES },
    'mixer:out:ch_out': { name: 'DIR OUT', signal: 'Audio', text: 'This channel alone, after its level knob.', to: 'Reverb IN, Filter IN, Oscilloscope IN', match: AUDIO_DESTS },
    'mixer:out:out_l': { name: 'OUT L', signal: 'Audio', text: 'All channels mixed, left side.', to: 'Output IN, Reverb IN L, Recorder IN', match: AUDIO_DESTS },
    'mixer:out:out_r': { name: 'OUT R', signal: 'Audio', text: 'All channels mixed, right side.', to: 'Reverb IN R, Output IN', match: AUDIO_DESTS.concat(['reverb:in:in_r']) },

    'reverb:in:in_l': { name: 'IN L', signal: 'Audio', text: 'Sound to send into the room (left).', from: 'VCA OUT, Filter OUT, Mixer OUT L, Oscillator OUT', match: AUDIO_SOURCES },
    'reverb:in:in_r': { name: 'IN R', signal: 'Audio', text: 'Sound to send into the room (right).', from: 'Mixer OUT R, Granular OUT R', match: AUDIO_SOURCES.concat(['mixer:out:out_r', 'granular:out:out_r']) },
    'reverb:out:out_l': { name: 'OUT L', signal: 'Audio', text: 'The sound with its reverb, left side.', to: 'Output IN, Recorder IN, Oscilloscope IN', match: AUDIO_DESTS },
    'reverb:out:out_r': { name: 'OUT R', signal: 'Audio', text: 'The sound with its reverb, right side.', to: 'Output IN, Mixer IN', match: AUDIO_DESTS },

    // Modulation
    'envelope:in:gate': { name: 'GATE IN', signal: 'Gate', text: 'Starts the envelope when a note begins and releases it when the note ends.', from: 'Keyboard GATE, Sequencer GATE, Webcam GATE', match: GATE_SOURCES },
    'envelope:out:env': { name: 'ENV OUT', signal: 'CV', text: 'The Attack / Decay / Sustain / Release shape.', to: 'VCA CV (note volume), Filter CUT MOD (note brightness)', match: ['vca:in:cv', 'filter:in:cutoff', 'granular:in:cv1', 'granular:in:cv2', 'oscilloscope:in:audio'] },

    'lfo:in:rate': { name: 'RATE IN', signal: 'CV', text: 'Speeds the LFO up and slows it down.', from: 'Another LFO OUT, Webcam X / Y, Envelope ENV OUT', match: MOD_SOURCES },
    'lfo:out:default': { name: 'LFO OUT', signal: 'CV', text: 'A slow repeating wobble.', to: 'Filter CUT MOD (wah), VCA CV (tremolo), Oscillator FM IN (vibrato)', match: MOD_DESTS },

    // Output and monitoring
    'output:in:in': { name: 'IN', signal: 'Audio', text: 'Goes to your speakers. Raise Master Volume to hear it.', from: 'The last module in your chain: VCA, Reverb, Filter, Mixer', match: AUDIO_SOURCES },
    'output:out:out': { name: 'THRU OUT', signal: 'Audio', text: 'A copy of what reaches the Output, before Master Volume.', to: 'Recorder IN, Oscilloscope IN', match: ['recorder:in:in', 'oscilloscope:in:audio'] },
    'oscilloscope:in:audio': { name: 'IN', signal: 'Any', text: 'Draws the signal so you can see it. It has no output: to also hear the sound, patch the same source into the Output too.', from: 'Any OUT', match: AUDIO_SOURCES.concat(MOD_SOURCES) },
    'recorder:in:in': { name: 'IN', signal: 'Audio', text: 'The sound to record as a WAV file.', from: 'VCA OUT, Reverb OUT, Mixer OUT, Output THRU OUT', match: AUDIO_SOURCES.concat(['output:out:out']) },
    'recorder:out:out': { name: 'THRU', signal: 'Audio', text: 'Passes the sound on unchanged.', to: 'Output IN', match: ['output:in:in'] }
  };

  const TYPE_ALIASES = { scope: 'oscilloscope', keys: 'keyboard', adsr: 'envelope', mic: 'audio_in', audio_input: 'audio_in', webcam_controller: 'webcam', 'webcam-controller': 'webcam', camera: 'webcam' };

  function moduleTypeOf(port) {
    const card = port.closest('.module-card');
    const id = port.getAttribute('data-node-id') || (card ? card.id.replace('module_card_', '') : null);
    const mod = id && window.synthApp && window.synthApp.modules ? window.synthApp.modules[id] : null;
    const t = mod ? mod.type : null;
    return TYPE_ALIASES[t] || t;
  }

  function portKey(port) {
    const dir = port.classList.contains('port-out') || port.classList.contains('output-port') ? 'out' : 'in';
    let key = port.getAttribute('data-port-id') || port.getAttribute('data-port-name') || port.getAttribute('data-port-type') || 'default';
    key = key.replace(/^(ch_in|ch_out)_\d+$/, '$1');
    return `${moduleTypeOf(port)}:${dir}:${key}`;
  }

  function guideFor(port) {
    return GUIDE[portKey(port)] || null;
  }

  // ---------- Hover card ----------
  let hintEl = null;
  let showTimer = null;
  let currentPort = null;

  function ensureHintEl() {
    if (hintEl) return hintEl;
    hintEl = document.createElement('div');
    hintEl.id = 'port-hint';
    hintEl.className = 'port-hint';
    hintEl.setAttribute('role', 'tooltip');
    document.body.appendChild(hintEl);
    return hintEl;
  }

  function hintsEnabled() {
    return !document.body.classList.contains('tooltips-disabled') && !document.body.classList.contains('cable-dragging');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function showHint(port) {
    const g = guideFor(port);
    if (!g) return;
    const el = ensureHintEl();
    const isOut = portKey(port).includes(':out:');
    const where = isOut ? (g.to ? `<div class="port-hint-where"><span>Connect to</span> ${escapeHtml(g.to)}</div>` : '')
                        : (g.from ? `<div class="port-hint-where"><span>Connect from</span> ${escapeHtml(g.from)}</div>` : '');
    el.innerHTML = `
      <div class="port-hint-head"><strong>${escapeHtml(g.name)}</strong><span class="port-hint-dir">${isOut ? 'Output' : 'Input'} · ${escapeHtml(g.signal)}</span></div>
      <div class="port-hint-text">${escapeHtml(g.text)}</div>${where}`;
    el.style.display = 'block';

    const r = port.getBoundingClientRect();
    const w = el.offsetWidth, h = el.offsetHeight;
    let left = r.left + r.width / 2 - w / 2;
    let top = r.top - h - 10;
    if (top < 8) top = r.bottom + 10;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    requestAnimationFrame(() => el.classList.add('visible'));
  }

  function hideHint() {
    clearTimeout(showTimer);
    currentPort = null;
    if (hintEl) {
      hintEl.classList.remove('visible');
      hintEl.style.display = 'none';
    }
  }

  document.addEventListener('pointerover', (e) => {
    const port = e.target.closest ? e.target.closest('.port') : null;
    if (!port || port === currentPort) return;
    // The card replaces the browser's own slow tooltip
    if (port.hasAttribute('title')) {
      port.setAttribute('data-title', port.getAttribute('title'));
      port.removeAttribute('title');
    }
    hideHint();
    if (!hintsEnabled()) return;
    currentPort = port;
    showTimer = setTimeout(() => { if (currentPort === port && hintsEnabled()) showHint(port); }, 250);
  });

  document.addEventListener('pointerout', (e) => {
    const port = e.target.closest ? e.target.closest('.port') : null;
    if (port && port === currentPort && !port.contains(e.relatedTarget)) hideHint();
  });

  // ---------- Highlight while dragging a cable ----------
  function clearHighlights() {
    document.body.classList.remove('cable-dragging');
    document.querySelectorAll('.port-suggested, .port-compatible, .port-incompatible').forEach(p => {
      p.classList.remove('port-suggested', 'port-compatible', 'port-incompatible');
    });
  }

  function applyHighlights() {
    const app = window.synthApp;
    const cable = app && app.activeCable;
    if (!cable || !cable.fromPortEl) return;
    const srcPort = cable.fromPortEl;
    const srcIsOut = cable.fromPortType === 'out';
    const srcKey = portKey(srcPort);
    const srcGuide = GUIDE[srcKey];
    const suggested = new Set(srcGuide ? srcGuide.match : []);

    document.body.classList.add('cable-dragging');
    document.querySelectorAll('.module-card .port').forEach(p => {
      if (p === srcPort) return;
      const pIsOut = p.classList.contains('port-out') || p.classList.contains('output-port');
      const sameModule = p.closest('.module-card') === srcPort.closest('.module-card');
      if (pIsOut === srcIsOut || sameModule) {
        p.classList.add('port-incompatible');
        return;
      }
      const k = portKey(p);
      const otherGuide = GUIDE[k];
      const isSuggested = suggested.has(k) || (otherGuide && otherGuide.match && otherGuide.match.includes(srcKey));
      p.classList.add(isSuggested ? 'port-suggested' : 'port-compatible');
    });
  }

  // Capture phase: the app stops propagation on port presses
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest || !e.target.closest('.port')) return;
    hideHint();
    setTimeout(applyHighlights, 0);
  }, true);
  window.addEventListener('pointerup', () => setTimeout(clearHighlights, 0), true);
  window.addEventListener('pointercancel', () => setTimeout(clearHighlights, 0), true);

  window.portGuide = { GUIDE, portKey, guideFor };
})();
