# Modular Synthesizer Sandbox - Architecture & Specification (v_5)

## 1. Overview
A browser-based, interactive modular synthesizer sandbox built with pure HTML5, CSS3, ES6 JavaScript, and the Web Audio API. Designed with a modular Eurorack-inspired workflow, clean visual aesthetic, responsive canvas routing, and support for audio processing, control voltage (CV) routing, and experimental modulation sources (such as Granular synthesis and Webcam tracking).

---

## 2. File Hierarchy & Roles

### Core Application & UI Logic
- **`index.html`**: Main entry point. Houses the DOM skeleton including the categorized floating Sidebar, Toolbar (a `Move` drag handle, Undo `#undo-btn` (&#8630;) and Redo `#redo-btn` (&#8631;) arrow buttons, Help, Theme toggle, Presentation Mode, `Cables: Front/Back` toggle `#cable-layer-btn`, Zoom, Save/Load, Clear, Tooltips), Canvas Viewport overlay (`#connections-canvas`), Help & Presets Modal (`#help-modal`), and scripts loading order.
- **`styles.css`**: Complete application design system using CSS Custom Properties (`:root` / `.dark-theme`). Defines Clean White & Dark theme colors, module card layouts, wide granular card layouts, VU meter animations, cable canvas positioning (`#connections-canvas` `z-index: 30`, above `#workspace-viewport` `z-index: 1`; `body.cables-behind` drops the canvas to `z-index: 0` so cables go behind the modules), draggable panel handles (`.panel-drag-handle`, `.panel-dragging`), custom scrollbars, and modal layouts. Toolbar buttons that are `:disabled` (e.g. Undo with nothing to undo) are faded to 35% opacity. `index.html` loads it as `styles.css?v=2.4` and `app.js?v=7` (bump the `?v=` number on each change to defeat browser caching).
- **`app.js` (`SoundSandboxApp`)**: Main controller class managing:
  - Global application state, module registry, and viewport Zoom/Pan (`Cmd`/`Ctrl` + Left-Click drag).
  - Web Audio Context initialization and user interaction audio unlock.
  - **Dynamic Cable Redrawing & `ResizeObserver` Integration:** Automated observation of DOM element size changes inside module cards (e.g., dynamically showing/hiding sliders like Pulse Width). Triggers immediate cable repositioning and canvas redraws (`drawConnections()`), alongside manual control via `updateCables()`.
  - **Robust Instantiation & Webcam Fallback:** Enhanced type alias mapping (supporting `webcam`, `webcam_controller`, `webcam-controller`, `camera`) and graceful fallbacks/alerts if required module scripts are unmapped or missing.
  - Interactive cable connection drawing (dynamic Bezier curves color-coded by port type) on `#connections-canvas`.
  - **Port lookup (`getPortElement(card, isOutput, info)`)**: searches only the ports of the requested direction (`.port-out`/`.output-port` or `.port-in`/`.input-port`), matching `info.channel` (`data-channel`) first, then `info.id || info.name || info.type` against `data-port-id`, then `data-port-name`, then `data-port-type`; falls back to the first port of that direction. When a port is pressed, the cable already plugged into it is found by comparing `getPortElement(...)` with the pressed element itself, never by port type alone (otherwise a free port of the same type, e.g. Keyboard `bend`, would pull out the `freq` cable).
  - **Multiple cables from one output (fan-out)**: dragging from an output port always starts a new cable, so one output can feed several inputs (e.g. both stereo inputs). `Shift`+drag from an output pulls out the most recently connected cable at that output (its input end stays put) so the source end can be moved. Dragging from an input port pulls out the cable plugged into it (inputs hold one cable each from the user's point of view). Dropping a cable that already exists (same output port to same input port) adds nothing.
  - **Port colors**: `updatePortConnectedClasses()` adds `.connected` to both ends of every cable and sets the CSS variable `--cable-color` on the port to that cable's color (`getConnectionColor()`); CSS paints the port and a ring in that color, so it is visible where each cable plugs in even with `Cables: Back`. Cable color is `getCableColor(portType, connId)` where `connId` combines both modules and both ports (`channel || id || name || type`), so two cables between the same two modules get different shades.
  - **Cable selection & deletion**: `drawConnections()` stores each drawn cable's Bezier points in `cableHitPaths`. A left click on the empty workspace runs `findCableAt(x, y)` (40-sample Bezier hit test, 8 px tolerance, topmost cable wins). First click selects (`selectedConnection`, drawn 6 px wide with a halo), a second click on the selected cable or `Delete`/`Backspace` deletes it (`deleteConnection()`), `Escape` or a click elsewhere deselects. Clicks inside a module card never reach cables, so moving a slider can never touch a cable.
  - **Cable layer toggle (`toggleCableLayer()`)**: `Cables: Front` (default, cables over modules) or `Cables: Back` (button highlighted, `body.cables-behind`). Remembered in `localStorage` key `sp_cables_behind`.
  - **Draggable panels (`initDraggablePanels()`)**: the Sidebar is dragged by its `Modules` title (`.sidebar h3`), the Toolbar by its `Move` label (`.toolbar .panel-drag-handle`). Positions are clamped to the window, saved in `localStorage` (`sp_panel_sidebar`, `sp_panel_toolbar`), and reset by double-clicking the handle. All `localStorage` access is wrapped in `try/catch`.
  - **Undo / Redo history (`initHistory()`)**: every history entry is a snapshot string from `takeSnapshot()` (modules sorted by id with `id`, `type`, `x`, `y`, `getState()`, plus all cables). `scheduleHistoryCapture()` runs 250 ms after any `pointerup`/`pointercancel`, `change` event, `keyup`, `deleteNode()`, `deleteConnection()` or a finished `loadPatchData()`; `captureHistory()` skips identical snapshots and waits while a pointer is still down or a cable is being dragged. Up to 100 steps (`undoStack`, `redoStack`; any new action clears redo). `restoreSnapshot()` changes only what differs: deletes extra modules, moves cards, calls `setState()` on modules whose state changed (rebuilding a module if `setState` cannot reach the old state, e.g. a removed mixer channel), creates missing modules with their original ids, then removes/adds cables so `this.connections` matches the snapshot (`connectionKey()` = both modules + `channel ?? id ?? name ?? type` of both ports). Shortcuts: `Cmd/Ctrl+Z` undo, `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y` redo (ignored while typing in a text/number field). Theme, zoom/pan and selection are not part of the history. Because snapshots are compared as text, `getState()` must return the intended values the module stored itself, never a live `AudioParam.value` (which lags behind ramps); Output (`this.volume`), VCA (`this.gainValue`) and Filter (`this.resonance`) follow this.
  - Module lifecycle (spawning, dragging, selecting, deletion with `unobserve`, clear canvas).
  - Presentation / Play Mode toggling (`isPresentationMode`).
  - Global tooltips state management (`toggleTooltips()`).
- **`audioEngine.js`**: Centralized Web Audio engine wrapper. Standardizes `AudioContext` management, master input/output node routing, global volume control, and dynamic hardware sample rate detection.
- **`PatchManager.js`**: Handles JSON serialization and deserialization of synthesizer patches (saving canvas layouts, module parameters, active settings, and cable wire connections). **Note:** this file is currently *not* loaded by `index.html`; the live save/load logic is `exportPatch()` / `loadPatchData()` inside `app.js`.
- **`help.js`**: Manual & Preset Booklet Controller. Manages modal visibility, Escape key and backdrop click listeners, bilingual language toggling with RTL/LTR layout handling (English is the default, `currentLang = 'en'`; the toggle button reads "Hebrew" / "English"), tab navigation built from the 4 tabs in `helpData.js` (Interface Operations, Modular 101, 15 Modules Ref, Presets & Debug), live search across sections, and loading presets from `window.presetData` into the canvas via `window.synthApp.loadPatchData()`, then auto-fitting the view and closing the modal. It does not show its own notices; the "patch loaded" notice comes from `app.js`.

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

### 5. Language Rule
- The whole site UI is English only: toolbar, sidebar, modules, notifications, `alert`/`confirm` dialogs, and `<html lang="en">`.
- Hebrew exists only inside the Help manual (`helpData.js` `he`), as an optional second language the user switches to with the Hebrew button. Code comments may stay in Hebrew.

### 6. Notifications
- `app.js` `showNotification(message)` is the single notice mechanism: a `div#synth-toast-notification.app-toast` (styled in `styles.css`) at the bottom center, theme-aware panel colors with a primary-color left border, plain text, no icon, fades in via the `.visible` class and hides after 6 s.
- After any patch load (preset or file), `loadPatchData` sets every Output module to volume 0 (slider and `%` readout) and shows: "Patch loaded. Volume starts at 0: raise Master Volume on the Output module to hear it."

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
4. **Cables**: drag from a port to a port to connect (an output can feed several cables; `Shift`+drag from an output moves its last cable); connected ports take their cable's color; drag a plugged cable end into empty space to unplug. Click a cable on the empty workspace to select it, click it again (or press `Delete`) to delete it. The `Cables: Front/Back` toolbar button moves all cables in front of or behind the modules.
5. **Moving the menus**: drag the Sidebar by its `Modules` title and the Toolbar by its `Move` label; double-click to return it to its default corner.
6. **Undo / Redo**: the arrow buttons at the start of the Toolbar, or `Cmd+Z` / `Cmd+Shift+Z` (`Ctrl` on Windows, `Ctrl+Y` also redoes). Covers adding, moving and deleting modules, cables, every knob/slider/menu value inside modules, loading a preset or file, and Clear. The Keyboard module ignores key presses held with `Cmd`/`Ctrl`/`Alt`, so `Cmd+Z` does not play a note.
7. **Interactive Tooltips**: Toggled globally via `#toggle-tooltips-btn`. Displays descriptions of port types and functionality on hover.

---

## 6. Web Audio Architecture & Audio Engine

- **Dynamic Hardware Sample Rate Detection**: Unconstrained `AudioContext` instantiation dynamically locks onto host interface sample rates (44.1kHz, 48kHz, 96kHz) without hardcoded assumptions, eliminating pitch and playback speed distortion.
- **AudioContext Lifecycle**: Managed with explicit state checks (`suspended`, `running`). Automatically resumes on first user click gesture.
- **Connection Mechanics & Auto-Alignment**: Cables rendered on canvas as dynamic Bezier paths connecting source output ports to target input ports/AudioParams. Automatically updated in real time via `ResizeObserver` whenever module card geometry or internal UI elements undergo layout shifts.
- **Safe Routing Protocol**: Patch cable creation uses `getNodeOrParamForPort()` wrapped in `try/catch` blocks to safely handle audio-to-audio node connections and audio-to-AudioParam CV modulation.

---

## 7. Patch Persistence & Module Protocol (JSON Schema)

### Saving and loading files
- **Save** (`exportPatch()` in `app.js`) builds the patch object below and turns it into a `Blob` (`application/json`) named `synth_patch_<timestamp>.json`. Patches are not stored inside the site; they are always a file.
- **On iPad / iPhone** (user agent `iPad|iPhone|iPod`, or `MacIntel` with `maxTouchPoints > 1` for iPadOS) and when `navigator.canShare({ files })` is true, Save opens the system share sheet (`navigator.share`) so the user picks **Save to Files** (or AirDrop, Mail, etc.). Cancelling the sheet does nothing; any other share error falls back to the download below.
- **Everywhere else** `downloadBlob()` downloads the file through a temporary object URL (revoked after 10 s) and shows the toast `Patch saved as <name> (in your Downloads folder).`
- **Load** opens the hidden `#import-patch-input` (`accept=".json,application/json"`), reads the file with `FileReader`, and passes it to `loadPatchData()`.

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
- **Publish rule:** every finished change is merged into `main` right away, without waiting for the owner to ask, because the live site is the owner's only way to see changes. Test in a headless browser first. After merging, wait until the `pages build and deployment` GitHub Actions run whose `head_sha` matches the merge commit reports `completed` / `success` (e.g. `https://api.github.com/repos/noambartov/sound-playground/actions/runs?per_page=1`), and only then tell the owner the site is ready (usually 1-2 minutes). After a deploy, a hard refresh (Cmd+Shift+R) may be needed; the `?v=` numbers on `styles.css` / `app.js` in `index.html` must be bumped on every change to those files so browsers fetch the new version.
- **Documentation rule:** every change to a file or to a foundational setting must be reflected in this `architecture.md` in the same commit, so that this document always holds everything needed to rebuild the site from scratch.

---

## 9. Changelog

- **2026-10-08** - Imported v_4 into GitHub. Fixed the Audio Input demo and External Processing presets in `helpData.js` (module type `audioinput` changed to the canonical `audio_in`). Added `README.md`, `.gitignore`, `CLAUDE.md`. Enabled GitHub Pages. Documented module type IDs and the `PatchManager.js` load status.
- **2026-10-08** - Cables and menus: fixed pressing a free port pulling out a cable from another port of the same type (exact element match; `getPortElement` now searches only the correct direction, which also fixes the VCA output cable being drawn from its input). Added click-to-select / click-again-or-Delete to remove a cable, the `Cables: Front/Back` toolbar button, and draggable Sidebar/Toolbar with remembered positions. Bumped `styles.css?v=2.1`, `app.js?v=3`.
- **2026-10-08** - Added the publish rule (section 8 and `CLAUDE.md`): every finished change goes live on `main` immediately.
- **2026-10-08** - Connected ports are painted in their cable's color (`--cable-color`). Outputs can feed several cables (drag from an output always adds a cable, `Shift`+drag moves the last one); duplicate cables are ignored. Cable shades now differ per port pair. Bumped `styles.css?v=2.2`, `app.js?v=4`.
- **2026-10-08** - Undo / Redo: snapshot history in `app.js` (100 steps), `Cmd/Ctrl+Z` and `Cmd/Ctrl+Shift+Z` shortcuts, two arrow buttons at the start of the Toolbar. Output, VCA and Filter `getState()` now return their stored intended values instead of the lagging `AudioParam.value`. Keyboard module ignores keys pressed with `Cmd`/`Ctrl`/`Alt`. Bumped `styles.css?v=2.3`, `app.js?v=5`.
- **2026-10-08** - English-only site: translated every Hebrew notice and dialog in `app.js`, `WebcamModule.js`, `PatchManager.js`, `index.html` to English; Help opens in English with Hebrew as an optional toggle (section 3.5). Replaced the help.js toast-suppression hack and its separate banner with one clean `.app-toast` notification from `app.js` (section 3.6); the Output volume readout now also shows 0% after a load. Fixed the Oscilloscope demo preset (the oscillator now feeds both the scope and the Output; the scope has no output jack) and its manual text in both languages. Bumped `styles.css?v=2.4`, `helpData.js?v=2`, `help.js?v=3`, `app.js?v=6`.
- **2026-10-08** - Saving on iPad: Save no longer uses a `data:` link (which iPad Safari does not save to Downloads). It now builds a `Blob`; on iPad / iPhone it opens the share sheet (Save to Files), elsewhere it downloads the file and shows a toast with the file name. Load accepts `application/json` too. Documented in section 7. Bumped `app.js?v=7`.
