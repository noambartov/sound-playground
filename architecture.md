# Modular Synthesizer Sandbox - Architecture & Specification (v_5)

## 1. Overview
A browser-based, interactive modular synthesizer sandbox built with pure HTML5, CSS3, ES6 JavaScript, and the Web Audio API. Designed with a modular Eurorack-inspired workflow, clean visual aesthetic, responsive canvas routing, and support for audio processing, control voltage (CV) routing, and experimental modulation sources (such as Granular synthesis and Webcam tracking).

---

## 2. File Hierarchy & Roles

### Core Application & UI Logic
- **`index.html`**: Main entry point. Houses the DOM skeleton including the categorized floating Sidebar, Toolbar (Zoom, Theme toggle, Clear, Presentation Mode, Tooltips, Help), Canvas Viewport overlay (`#connections-canvas`), Help & Presets Modal (`#help-modal`), and scripts loading order.
- **`styles.css`**: Complete application design system using CSS Custom Properties (`:root` / `.dark-theme`). Defines Clean White & Dark theme colors, module card layouts, wide granular card layouts, VU meter animations, cable canvas positioning (`z-index: 30`), custom scrollbars, and modal layouts.
- **`app.js` (`SoundSandboxApp`)**: Main controller class managing:
  - Global application state, module registry, and viewport Zoom/Pan (`Cmd`/`Ctrl` + Left-Click drag).
  - Web Audio Context initialization and user interaction audio unlock.
  - **Dynamic Cable Redrawing & `ResizeObserver` Integration:** Automated observation of DOM element size changes inside module cards (e.g., dynamically showing/hiding sliders like Pulse Width). Triggers immediate cable repositioning and canvas redraws (`drawConnections()`), alongside manual control via `updateCables()`.
  - **Robust Instantiation & Webcam Fallback:** Enhanced type alias mapping (supporting `webcam`, `webcam_controller`, `webcam-controller`, `camera`) and graceful fallbacks/alerts if required module scripts are unmapped or missing.
  - Interactive cable connection drawing (dynamic Bezier curves color-coded by port type) on `#connections-canvas`.
  - Module lifecycle (spawning, dragging, selecting, deletion with `unobserve`, clear canvas).
  - Presentation / Play Mode toggling (`isPresentationMode`).
  - Global tooltips state management (`toggleTooltips()`).
- **`audioEngine.js`**: Centralized Web Audio engine wrapper. Standardizes `AudioContext` management, master input/output node routing, global volume control, and dynamic hardware sample rate detection.
- **`PatchManager.js`**: Handles JSON serialization and deserialization of synthesizer patches (saving canvas layouts, module parameters, active settings, and cable wire connections). **Note:** this file is currently *not* loaded by `index.html`; the live save/load logic is `exportPatch()` / `loadPatchData()` inside `app.js`.
- **`help.js`**: Manual & Preset Booklet Controller (`HelpController`). Manages modal visibility, Escape key and backdrop click listeners, full bilingual language toggling (HE/EN) with RTL/LTR layout handling, dynamic multi-tab navigation (Quick Start, Module Guide, Signal Flow, Presets, Shortcuts), live search filtering (`.searchable-item`), and loading curated preset Eurorack patches (`EURORACK_PRESETS`) directly into the canvas via `window.synthApp.loadPatchData()`. Fully self-initializing (`window.helpController`) on `DOMContentLoaded` or immediate ready state.

### Audio Processing & Generation Modules
- **`OscillatorModule.js` (VCO)**: Primary sound source (`OscillatorNode`). Features waveform selection (sawtooth, square, triangle, sine), pitch tuning, fine tune, octave controls, pulse width modulation, and `FM` modulation input port.
- **`AudioInputModule.js`**: Real-time microphone/external audio input capture via `getUserMedia`. Includes input Gain control, ON/OFF toggle, and a live VU meter for visual feedback.
- **`FilterModule.js` (VCF)**: Frequency filter (`BiquadFilterNode`). Lowpass/Highpass/Bandpass modes, Cutoff frequency slider, Resonance (Q), and `Cutoff CV` modulation input port.
- **`EnvelopeModule.js` (EG)**: ADSR Envelope Generator. Controls: Attack, Decay, Sustain, Release, manual Trigger button, Gain shaping, and CV voltage generator for external parameter modulation.
- **`VcaModule.js` (VCA)**: Voltage Controlled Amplifier. Amplitude modulation control. Default gain starts at 0.0 to prevent audio leakage until triggered by CV. Ports: Audio `IN`, Audio `OUT`, and `CV` input.
- **`LfoModule.js` (LFO)**: Low Frequency Modulation Oscillator. Rate (Hz), Depth, Waveform selector, Rate CV input, and LFO CV `OUT` port.
- **`MixerModule.js`**: Multi-channel audio summing mixer. Dynamic channel gain, per-channel Stereo Panning (`StereoPannerNode`), mute/solo controls, master level control, and split `OUT L` / `OUT R` output ports.
- **`ReverbModule.js`**: Algorithmic / Impulse Response Reverb effect processor. Controls for Mix (Dry/Wet), Decay Time, Pre-delay, and Tone filter.
- **`GranularModule.js`**: Advanced Granular Synthesis engine. Real-time grain extraction from loaded audio files. Controls for Grain Size, Density, Pitch, Spray (Jitter), Grain Pan, and dual assignable CV modulation inputs (`cv1`, `cv2`).
- **`OutputModule.js`**: Final audio destination node. Direct bridge to `AudioContext.destination` with master gain slider, volume level meter, and pass-through `THRU` output.
- **`OscilloscopeModule.js`**: Visual audio monitor (`AnalyserNode`). Real-time oscilloscope waveform rendering on HTML5 Canvas.

### Control & Interactive Signal Modules
- **`KeyboardModule.js`**: Virtual musical keyboard interface. On-screen keys and computer keyboard listeners generating standard `PITCH CV` and `GATE` trigger signals.
- **`SequencerModule.js`**: 8/16 Step Sequencer. BPM tempo control, direction modes, step pitch sliders, ON/OFF step switches. Outputs `PITCH CV` and `GATE` signals.
- **`WebcamModule.js`**: Computer-vision Control Voltage generator. Tracks brightness/motion from webcam feed via HTML5 Video element and outputs dynamic `CV` modulation signal. Supports alias type spawning (`webcam`, `webcam_controller`, `webcam-controller`, `camera`) and includes safe runtime verification of `WebcamModule.js` script presence with explicit DOM/console user warnings if uninitialized.
- **`RecorderModule.js`**: Master audio recorder (`MediaRecorder` / PCM WAV encoding). Captures real-time output with dynamic sample rate header matching hardware interface (44.1kHz, 48kHz, 96kHz).

---

## 3. Strict UI, Visual & Audio Preferences (Design Rules)

### 1. No Icons in Modules Rule (כלל איסור אייקונים במודולים)
- **חוק ברזל:** אין להשתמש באייקונים או אימוג'ים בתוך רכיבי המודולים (כותרות מודול, כפתורי תפעול, כפתורי מחיקה, תפריט Sidebar, או תוויות פורטים).
- **חלופה:** יש להשתמש בטקסט שמי קריא בלבד (לדוגמה: "Delete" או "X" במקום אייקון פח, "Audio Input" במקום אייקון מיקרופון, "Oscillator" במקום אייקון גל).

### 2. Design System & Theming
- Fully implemented via CSS Custom Properties (`--bg-color`, `--panel-bg`, `--primary-color`, `--panel-border`, `--text-color`).
- Clean White light theme as default with full Dark Theme support toggled via `.dark-theme` on `<body>`.
- Modular cards use explicit shadow layers (`var(--shadow-sm)`), smooth border transitions (`var(--transition-fast)`), and rounded corners (`var(--radius-lg)`).

### 3. Module Card Structure & Constraints
- **Card Width**: Standard modules must maintain a `min-width: 220px` (or `width: 220px`). Large modules (e.g., Granular Engine) use wide double-panel grid layouts (`width: 500px`).
- **Vertical Flex Layout**: Card body (`.node-body`) uses flexbox layout (`flex-direction: column`, `padding: 12px`, `gap: 10px`).
- **Ports Container Docking**: The ports section (`.ports-container`, `.ports-row`) **must always** use `margin-top: auto` to dock ports cleanly at the bottom of the card, preventing text overlapping or card overflows.
- **Control Uniformity**: Standard buttons use `.action-btn`. Continuous range inputs (`input[type="range"]`) must always include an accompanying numeric text readout displaying the active unit (`Hz`, `ms`, `%`, `dB`).

### 4. Accessibility & Focus Indicators
- Clear keyboard focus indicators (`*:focus-visible`) styled with `outline: 2px solid var(--primary-color)`.
- Customized scrollbars (`::-webkit-scrollbar`) styled to blend seamlessly with active themes.

---

## 4. Signal Flow & Port Color Coding System

### Signal Types & Port Specifications
- 🟢 **Audio Signals (`data-port-type="audio"`):** Green (`#10b981`). Sound-generating audio paths (e.g., VCO Out &rarr; VCF In &rarr; VCA In &rarr; Reverb In &rarr; Main Output).
- 🟡 **Gate / Trigger Signals (`data-port-type="gate"`):** Yellow/Orange (`#f59e0b`). On/Off timing pulses generated by Keyboard or Sequencer to trigger Envelope attack phases.
- 🔵 **Control Voltage / Modulation (`data-port-type="cv"` / `"fm"` / `"cutoff"`):** Blue (`#6366f1`). Continuous modulation voltages (e.g., Pitch CV, Envelope CV Out, LFO Out, Webcam CV Out).

### Standard Patching Flow
1. **Pitch / Gate**: Keyboard / Sequencer (`PITCH CV`) &rarr; VCO (`FM IN`) | Keyboard / Sequencer (`GATE`) &rarr; Envelope (`GATE IN`).
2. **Audio Path**: VCO (`AUDIO OUT`) &rarr; VCF (`AUDIO IN`) &rarr; VCA (`AUDIO IN`) &rarr; Output (`AUDIO IN`).
3. **Modulation Path**: Envelope (`CV OUT`) &rarr; VCA (`CV IN`) | LFO (`CV OUT`) &rarr; VCF (`CUTOFF CV`).

---

## 5. Interaction & Viewport Controls

1. **Canvas Panning**: Holding `Cmd` (macOS) or `Ctrl` (Windows) + Left-Click dragging pans the workspace viewport.
2. **Zooming**: Controlled via Toolbar Zoom buttons or mouse wheel modifiers, scaling `#workspace-viewport`.
3. **Presentation / Play Mode**:
   - Toggled via `Play Mode` button in Toolbar (`body.presentation-mode`).
   - Hides ports, wire connections (`#connections-canvas`), delete buttons, and module spawn Sidebar.
   - Disables card dragging and cable creation while keeping sliders, knobs, buttons, and visual meters fully playable for live performance.
4. **Interactive Tooltips**: Toggled globally via `#toggle-tooltips-btn`. Displays descriptions of port types and functionality on hover.

---

## 6. Web Audio Architecture & Audio Engine

- **Dynamic Hardware Sample Rate Detection**: Unconstrained `AudioContext` instantiation dynamically locks onto host interface sample rates (44.1kHz, 48kHz, 96kHz) without hardcoded assumptions, eliminating pitch and playback speed distortion.
- **AudioContext Lifecycle**: Managed with explicit state checks (`suspended`, `running`). Automatically resumes on first user click gesture.
- **Connection Mechanics & Auto-Alignment**: Cables rendered on canvas as dynamic Bezier paths connecting source output ports to target input ports/AudioParams. Automatically updated in real time via `ResizeObserver` whenever module card geometry or internal UI elements undergo layout shifts.
- **Safe Routing Protocol**: Patch cable creation uses `getNodeOrParamForPort()` wrapped in `try/catch` blocks to safely handle audio-to-audio node connections and audio-to-AudioParam CV modulation.

---

## 7. Patch Persistence & Module Protocol (JSON Schema)

### Schema Format (`v1.0`)
```json
{
  "version": "1.0",
  "timestamp": "2026-10-02T10:00:00.000Z",
  "theme": "light",
  "modules": [
    {
      "id": "osc_1",
      "type": "oscillator",
      "x": 100,
      "y": 150,
      "state": { "frequency": 440, "waveform": "sawtooth" }
    }
  ],
  "connections": [
    {
      "fromNode": "osc_1",
      "fromPortInfo": { "type": "audio", "portIndex": 0 },
      "toNode": "out_1",
      "toPortInfo": { "type": "audio", "portIndex": 0 }
    }
  ]
}
```

### Module Type IDs
The `type` field (in patches, presets, and sidebar `data-type` buttons) must use one of the IDs that `app.js` (`addModule`) recognizes. The canonical ID comes first; aliases are also accepted:

| Module | Canonical `type` | Accepted aliases |
|---|---|---|
| Oscillator | `oscillator` | |
| Granular Cloud | `granular` | |
| Mic / Audio In | `audio_in` | `mic`, `audio_input` |
| Keyboard | `keyboard` | `keys` |
| Sequencer | `sequencer` | |
| Webcam Controller | `webcam` | `webcam_controller`, `webcam-controller`, `camera` |
| Filter | `filter` | |
| VCA | `vca` | |
| Mixer | `mixer` | |
| Reverb | `reverb` | |
| Envelope (ADSR) | `envelope` | `adsr` |
| LFO | `lfo` | |
| Output | `output` | |
| Oscilloscope | `oscilloscope` | `scope` |
| Recorder | `recorder` | |

Any other value (e.g. `audioinput`) fails to create the module. Presets live in `helpData.js` (`window.presetData`).

---

## 8. Repository, Deployment & Working Rules

- **Source of truth:** GitHub repository `noambartov/sound-playground`, branch `main`. Older local copies (e.g. the iCloud folder `sound playground v_4`) are not updated automatically.
- **Live site:** GitHub Pages, deployed from `main` / root. URL: https://noambartov.github.io/sound-playground/. Every push to `main` redeploys automatically.
- **No build step:** plain static files; `index.html` is the entry point.
- **Repo housekeeping files:** `README.md` (short description), `.gitignore` (ignores macOS `.DS_Store`), `CLAUDE.md` (working rules for Claude sessions).
- **Documentation rule:** every change to a file or to a foundational setting must be reflected in this `architecture.md` in the same commit, so that this document always holds everything needed to rebuild the site from scratch.

---

## 9. Changelog

- **2026-10-08** - Imported v_4 into GitHub. Fixed the Audio Input demo and External Processing presets in `helpData.js` (module type `audioinput` changed to the canonical `audio_in`). Added `README.md`, `.gitignore`, `CLAUDE.md`. Enabled GitHub Pages. Documented module type IDs and the `PatchManager.js` load status.
