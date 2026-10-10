// helpData.js - the manual's content (window.helpData) and the ready-made patches (window.presetData).
// helpData has one object per language (en, he) with the same shape; help.js builds the six tabs from it.
// Jack explanations are not written here: help.js reads them from portGuide.js (the same source as the
// jack hints on the cards). Only their Hebrew translations live here, in he.ports.
window.helpData = {
  en: {
    title: "Sound Playground Manual",
    searchPlaceholder: "Search modules, jacks, recipes...",
    tabs: {
      start: "Start here",
      modules: "Modules",
      recipes: "Recipes",
      basics: "Signals",
      trouble: "Troubleshooting",
      shortcuts: "Shortcuts"
    },
    ui: {
      inputs: "Inputs",
      outputs: "Outputs",
      controls: "Controls",
      tips: "Tips",
      none: "None",
      from: "Connect from",
      to: "Connect to",
      tryIt: "Load the demo patch",
      loadRecipe: "Load this patch",
      youLearn: "What you learn",
      howToPlay: "How to play it",
      noResults: "Nothing found. Try another word.",
      groups: { sources: "Sound sources", controllers: "Controllers", processors: "Processors and effects", modulation: "Modulation", output: "Output and monitoring" }
    },
    sections: {
      start: `
        <div class="help-card">
          <h4>Your first sound in three steps</h4>
          <ol class="help-list">
            <li>In the <strong>Modules</strong> menu on the left, add an <strong>Oscillator</strong> and an <strong>Output</strong>.</li>
            <li>Drag a cable from the Oscillator's <strong>OUT</strong> jack to the Output's <strong>IN</strong> jack.</li>
            <li>Raise <strong>Master Volume</strong> on the Output. You hear a steady tone; move the Frequency slider to change it.</li>
          </ol>
        </div>
        <div class="help-card">
          <h4>Reading the jacks</h4>
          <ul class="help-list">
            <li>Every jack has a small tag under it. <span class="chip-demo chip-in">IN</span> (white) is an input, <span class="chip-demo chip-out">OUT</span> (blue) is an output. The tag also says the kind of signal and where it usually connects.</li>
            <li>For the full explanation, rest the mouse on a jack, or on iPad press and hold it.</li>
            <li>While you drag a cable, the best destinations pulse, other possible ones get a ring, and the rest fade.</li>
            <li>The <strong>Tooltips</strong> button in the top bar hides and shows the tags and explanations.</li>
          </ul>
        </div>
        <div class="help-card">
          <h4>Cables</h4>
          <ul class="help-list">
            <li>Cables always go from an <strong>OUT</strong> to an <strong>IN</strong>. One output can feed several cables.</li>
            <li>To unplug, drag the cable out of its input and let go on empty space. Or click a cable once to select it and again (or press Delete) to remove it.</li>
            <li>A cable from an <strong>LFO OUT</strong> (or a <strong>Ribbon</strong> output) can also be dropped on any slider of another module; the slider then moves by itself.</li>
            <li><strong>Cables: Front / Back</strong> in the top bar puts the cables over or under the modules.</li>
          </ul>
        </div>
        <div class="help-card">
          <h4>Presets start silent</h4>
          <p>Every patch you load (from <strong>Recipes</strong> or with <strong>Load</strong>) opens with the Output volume at 0, so nothing jumps at you. Raise <strong>Master Volume</strong> on the Output module to hear it.</p>
        </div>
      `,
      basics: `
        <div class="help-card">
          <h4>What is a modular synthesizer?</h4>
          <p>A normal synthesizer is wired inside. Here you do the wiring: each module does one job, and cables decide where the sound and the control signals go.</p>
        </div>
        <div class="help-card">
          <h4>The three kinds of signal</h4>
          <ul class="help-list">
            <li><span class="tag tag-audio">Audio</span> The sound itself, fast vibrations you can hear. Oscillator, Granular and Mic make it; Filter, VCA and Reverb change it; Output plays it.</li>
            <li><span class="tag tag-cv">CV</span> Control voltage: a slow signal that moves a setting, like pitch, volume or brightness. LFO, Envelope, Keyboard FREQ and Webcam make it.</li>
            <li><span class="tag tag-gate">Gate</span> On or off: "a note is playing now". Keyboard and Sequencer make it; it starts an Envelope or opens a VCA.</li>
          </ul>
        </div>
        <div class="help-card">
          <h4>The classic chain</h4>
          <ol class="help-list">
            <li><strong>Notes:</strong> Keyboard FREQ (or Sequencer PITCH CV) to Oscillator PITCH. Keyboard GATE to Envelope GATE IN.</li>
            <li><strong>Sound:</strong> Oscillator OUT to Filter IN, Filter OUT to VCA IN, VCA OUT to Output IN.</li>
            <li><strong>Shape:</strong> Envelope ENV OUT to VCA CV, so each note fades in and out. Add a second cable from ENV OUT to Filter CUT MOD to make each note brighter at its start.</li>
          </ol>
          <p>The <strong>Classic Mono Synth</strong> recipe is exactly this patch.</p>
        </div>
        <div class="help-card">
          <h4>Seeing the signal</h4>
          <p>Plug any OUT into an <strong>Oscilloscope</strong> to see it. The oscilloscope has no output, so to hear the same signal too, run a second cable from that OUT to the Output.</p>
        </div>
      `,
      trouble: `
        <div class="help-card">
          <h4>I hear nothing</h4>
          <ul class="help-list">
            <li>Raise <strong>Master Volume</strong> on the Output. Every loaded patch starts at 0.</li>
            <li>Check that a cable reaches the Output's <strong>IN</strong>.</li>
            <li>If the patch has a VCA, it stays silent until something opens it: press a key on the Keyboard, or press Play on the Sequencer.</li>
            <li>Click once anywhere on the page: browsers keep sound off until you touch the page.</li>
            <li>Mic patches need <strong>Enable Mic</strong>; Webcam patches need <strong>Start Camera</strong>, and the browser must be allowed to use them.</li>
          </ul>
        </div>
        <div class="help-card">
          <h4>The Keyboard does not play</h4>
          <ul class="help-list">
            <li>Keyboard FREQ goes to Oscillator <strong>PITCH</strong>, and Keyboard GATE goes to an Envelope or straight to a VCA CV.</li>
            <li>Computer keys work only when no text box is selected. Keys held with Cmd or Ctrl are ignored on purpose (Cmd+Z is undo).</li>
          </ul>
        </div>
        <div class="help-card">
          <h4>It sounds distorted or too loud</h4>
          <ul class="help-list">
            <li>Lower Master Volume, or the level of the module before it.</li>
            <li>An LFO is strong: into a Filter use a small Depth, or lower the filter's Mod Depth.</li>
          </ul>
        </div>
        <div class="help-card">
          <h4>I made a mess</h4>
          <p>Undo with the arrow buttons at the start of the top bar, or Cmd+Z. <strong>Clear</strong> empties the whole workspace (it can be undone too).</p>
        </div>
      `,
      shortcuts: `
        <div class="help-card">
          <h4>Workspace</h4>
          <ul class="help-list">
            <li><kbd>Space</kbd> + drag, or <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + drag: move around the workspace.</li>
            <li>Mouse wheel or the <kbd>+</kbd> / <kbd>-</kbd> buttons: zoom. <strong>100%</strong> resets the view.</li>
            <li>iPad: pinch with two fingers on empty space to zoom and move.</li>
            <li><kbd>Delete</kbd>: remove the selected module or cable. <kbd>Esc</kbd>: deselect.</li>
            <li><kbd>Cmd</kbd>+<kbd>Z</kbd> undo, <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> redo (<kbd>Ctrl</kbd> on Windows).</li>
            <li><kbd>Shift</kbd> + drag from an output: move the last cable plugged into it.</li>
          </ul>
        </div>
        <div class="help-card">
          <h4>Playing the Keyboard module</h4>
          <ul class="help-list">
            <li>Bottom two rows of letters (<kbd>Z</kbd> to <kbd>M</kbd>): lower octave.</li>
            <li>Top two rows (<kbd>Q</kbd> to <kbd>I</kbd>): upper octave.</li>
            <li>The <strong>-</strong> / <strong>+</strong> buttons on the module move the octave.</li>
          </ul>
        </div>
        <div class="help-card">
          <h4>Top bar</h4>
          <ul class="help-list">
            <li><strong>Move</strong>: drag to move the top bar. Drag the <strong>Modules</strong> title to move the side menu. Double-click either to put it back.</li>
            <li><strong>Theme</strong> light or dark. <strong>Play Mode</strong> hides cables and locks the layout for performing.</li>
            <li><strong>Save</strong> / <strong>Load</strong> a patch file (on iPad, Save opens the share sheet: choose Save to Files).</li>
          </ul>
        </div>
      `
    },
    modules: [
      { type: "oscillator", group: "sources", name: "Oscillator (VCO)", preset: "demo-oscillator",
        summary: "Makes a steady tone. The starting point of most sounds.",
        controls: ["Waveform: Sawtooth (bright), Square / Pulse (hollow), Triangle (soft), Sine (pure).", "Frequency: the pitch, 20 to 4000 Hz. Greyed out while a cable is in PITCH.", "Pulse Width: only for Square; changes the tone from hollow to thin."],
        tips: ["Plug Keyboard FREQ into PITCH to play notes in tune.", "A slow LFO into FM IN gives vibrato."] },
      { type: "wavetable", group: "sources", name: "Wavetable Osc", preset: "demo-wavetable",
        summary: "An oscillator that glides between a row of different waves, so the tone can change and move while it plays.",
        controls: ["The display: the table's 8 waves stacked from front to back; the bright wave is the one playing now, at its place in the stack.", "Table: Basic (sine, triangle, saw, square), Vocal (vowels A E I O U), Digital (a bright band that climbs), Organ (drawbar settings), PWM (a pulse that gets thinner), Draw (your own wave).", "Position: where in the table you are; in between two waves you hear a smooth blend.", "Warp: bends each wave (squeezes its first half), for brighter, more nasal colors.", "Frequency: the pitch, 20 to 2000 Hz; set aside while a cable is in PITCH. Octave and Tune shift the pitch (also a note from PITCH).", "POS Depth: how far a cable in POS moves Position.", "Unison Voices: up to 7 copies of the sound played together. Unison Detune: how far apart they are tuned (in cents); together they give a wide, thick sound.", "Draw: pick Draw in Table and draw one cycle of a wave on the display with the mouse or pencil. Position 0% plays a sine, 100% your wave, and in between a blend."],
        tips: ["Drop an LFO OUT cable on the Position slider: the tone keeps moving through the waves.", "Envelope ENV OUT into POS: every note travels through the table, like a filter sweep but different.", "High notes stay clean: higher notes use waves with fewer harmonics."] },
      { type: "granular", group: "sources", name: "Granular Cloud", preset: "demo-granular",
        summary: "Records the sound coming in (or a loaded file) and replays it as a cloud of tiny overlapping grains.",
        controls: ["Source: Live Input (records IN L / IN R) or Audio File (Load File).", "Position: where in the recording grains are taken from.", "Size: grain length. Density: grains per second.", "Pitch: grain speed (2 = one octave up). Spray: randomness. Reverse: chance a grain plays backwards.", "CV 1 / CV 2 Target: which setting each CV input moves."],
        tips: ["Without anything plugged into IN (in Live mode) it is silent.", "Long grains with high density give smooth pads; short sparse grains give crackle."] },
      { type: "audio_in", group: "sources", name: "Mic / Audio In", preset: "demo-audioinput",
        summary: "Brings in live sound from your microphone or sound card.",
        controls: ["Enable Mic: asks the browser for the microphone.", "Input Level: how loud it comes in.", "Auto-Level & Anti-Clip: keeps the level steady and safe."],
        tips: ["Use headphones, otherwise the speakers feed back into the mic."] },
      { type: "keyboard", group: "controllers", name: "Keyboard", preset: "demo-keyboard",
        summary: "Play notes with the mouse, the computer keyboard or a MIDI keyboard.",
        controls: ["MIDI In: pick a connected MIDI keyboard.", "- / +: move the octave.", "PITCH bend strip on the left: bends the pitch (BEND output)."],
        tips: ["FREQ to Oscillator PITCH, GATE to Envelope GATE IN: a playable synth."] },
      { type: "sequencer", group: "controllers", name: "Sequencer", preset: "demo-sequencer",
        summary: "Plays a repeating row of notes by itself.",
        controls: ["Play / Stop.", "Direction: forward, backward, back-and-forth, random.", "Tempo: speed in BPM. Octave: how wide the step sliders reach.", "+ Step / - Step: more or fewer steps.", "Each step: ON / OFF and a pitch slider. The slider snaps to whole notes (semitones), so every step is in tune."],
        tips: ["PITCH CV to Oscillator PITCH, GATE to an Envelope or a VCA CV."] },
      { type: "webcam", group: "controllers", name: "Webcam Controller", preset: "demo-webcam",
        summary: "Turns movement in front of your camera into control signals.",
        controls: ["Start Camera.", "Sens (Thresh): how much movement counts.", "Smoothing: calmer or faster response.", "CV Depth (Hz): how strong the X / Y outputs are."],
        tips: ["X CV into an Oscillator FM IN: move your hand left and right to change the pitch."] },
      { type: "ribbon", group: "controllers", name: "Ribbon", preset: "demo-ribbon",
        summary: "A rainbow strip you play by sliding a mouse, a finger or the iPad pencil along it.",
        controls: ["Left to right sets the pitch. The Note readout shows the note you are on.", "Base Note: the note at the left end. Range: how many octaves the strip covers.", "Glide: how smoothly the pitch slides between positions.", "Snap: On jumps to whole notes, Off slides freely.", "Hold: On keeps the gate open after you lift your finger.", "Y / Press Range: multiplies the Y and PRESS outputs. x1 suits a VCA CV or a Filter CUT MOD (its Mod Depth sets how far it opens)."],
        tips: ["PITCH to Oscillator PITCH and GATE to Envelope GATE IN: a playable synth you slide on.", "Y and PRESS cables can be dropped on any slider, like the LFO: touch higher or press harder to move it."] },
      { type: "drums", group: "controllers", name: "Drum Machine", preset: "demo-drums",
        summary: "A four-row step drum machine (Kick, Snare, Hi-Hat, Cymbal) with classic 808 and 909 style sounds, all made by synthesis.",
        controls: ["Play / Stop. Tempo: 40 to 240 BPM (type a number in the box, then Enter). Swing: delays every second 16th note for a shuffle feel.", "Add Bar / Remove Bar: 1 to 4 bars of 16 steps.", "Steps: tap once for a hit, again for an accent (louder, full color), again to switch it off.", "Sound: the drum model for the row (808, 909, Rimshot, Clap, Open / Closed hat, Ride, Cowbell...), Custom (build your own) or Input.", "Edit opens the row's sliders: Tune, Decay, Tone, Level and Pan. Clear empties the row.", "Custom: Wave, Pitch, Pitch Env, Noise, Attack, Decay, Cutoff and Resonance of a small synth voice."],
        tips: ["MAIN L and MAIN R carry all four rows mixed; each row's OUT carries that drum alone, for its own effect.", "A row's TRIG into an Envelope GATE IN lets an Oscillator play in time with that drum.", "Plug any sound into a row's IN and every step plays a short burst of it, shaped by Decay and Tone."] },
      { type: "metronome", group: "controllers", name: "Metronome", preset: "demo-metronome",
        summary: "Keeps time: a click on every beat, and a CLOCK output that keeps other modules in step with it.",
        controls: ["Play / Stop. Tap: tap it a few times in time and the tempo follows your taps.", "Tempo: 20 to 300 BPM. Drag the slider, or type a number in the box and press Enter.", "Beats per Bar: how many beats before the count starts again. The lights show the beat, the first one is the accented one.", "Sound: Click, Wood Block or Beep. Volume: how loud the click is.", "Accent: On makes the first beat of every bar louder and higher."],
        tips: ["CLICK into the Output to hear the metronome; it stays silent until a cable is connected.", "CLOCK pulses on every 16th note (four times per beat). Plug it into a module's CLOCK input to follow this tempo, or into an Envelope GATE IN to play a 16th-note pattern.", "An LFO cable dropped on the Tempo slider speeds the metronome up and slows it down by itself."] },
      { type: "filter", group: "processors", name: "Filter (VCF)", preset: "demo-filter",
        summary: "Removes part of the sound: darker, brighter or thinner.",
        controls: ["Type: Lowpass (keeps the lows), Highpass (keeps the highs), Bandpass, Notch.", "Cutoff: where the filter cuts.", "Resonance (Q): a ringing peak at the cutoff.", "Mod Depth: how far CUT MOD moves the cutoff."],
        tips: ["Envelope into CUT MOD makes every note start bright and close darker."] },
      { type: "vca", group: "processors", name: "VCA (Amplifier)", preset: "demo-vca",
        summary: "A volume control that other modules can move.",
        controls: ["Initial Gain: the volume when nothing is in CV. Keep it at 0 so notes stop between key presses."],
        tips: ["Envelope ENV OUT into CV shapes each note.", "A Keyboard or Sequencer GATE straight into CV gives simple on / off notes."] },
      { type: "mixer", group: "processors", name: "Mixer", preset: "demo-mixer",
        summary: "Combines several sounds into one, each with its own level and left-right position.",
        controls: ["Per channel: VOL and PAN.", "MASTER VOL: the total level.", "+ Add Channel: another input."],
        tips: ["DIR OUT sends one channel alone somewhere else, for example into a Reverb."] },
      { type: "reverb", group: "processors", name: "Reverb", preset: "demo-reverb",
        summary: "Puts the sound in a room, from a small space to a huge hall.",
        controls: ["Radius: room size. Decay: how long the tail lasts.", "Damping: darker or brighter tail. Warp: a little movement in the tail.", "Mix: how much reverb against the dry sound."],
        tips: ["Short notes with a long Decay sound much bigger than a steady tone."] },
      { type: "delay", group: "processors", name: "Stereo Delay", preset: "demo-delay",
        summary: "Echoes the sound, with separate left and right sides, reverse repeats, ping-pong and tempo sync.",
        controls: ["The display: every repeat is a triangle (leaning left when reversed); a pulse runs across on each hit and lights the repeats. Drag a dot: left / right sets Time, up / down sets Feedback.", "Columns Left, Both and Right: Both moves the two sides together, Left and Right move one side.", "Time: how long until the echo. Feedback: how many repeats. Tone: darker or brighter repeats. Level: how loud the repeats are. Mix: dry sound against echo.", "Reverse: the repeats play backwards.", "Ping-Pong: the echo bounces between left and right.", "Sync: with a cable in CLOCK, each side's Time follows the tempo; pick a Division (1/8, 1/8 dotted, 1/4...)."],
        tips: ["Drum Machine CLOCK into CLOCK, Sync On, Left 1/8 dotted and Right 1/4: a classic rhythmic echo.", "Reverse with a long Time on short notes gives a swelling, backwards sound."] },
      { type: "degrader", group: "processors", name: "Degrader", preset: "demo-degrader",
        summary: "A one-knob lo-fi effect: turning Degrade ages the sound from clean, through warm tape and lo-fi, to fully wrecked.",
        controls: ["Degrade 0%: clean, the sound passes through untouched.", "Up to 30% (Tape): soft saturation, and the highs soften a little.", "30% to 60% (Lo-Fi): fewer bits (16 down to 8), a lower sample rate (down to 8 kHz) for a rough digital sound, and a slight tape wobble in pitch.", "60% to 100% (Wrecked): only 3 to 4 bits, a very low sample rate that rings metallic, rising hiss and record crackle, and the highs almost closed."],
        tips: ["Drop an LFO OUT cable on the Degrade slider: the sound falls apart and comes back by itself.", "Above 60% you hear hiss and crackle even when nothing plays, like an old record."] },
      { type: "envelope", group: "modulation", name: "Envelope (ADSR)", preset: "demo-envelope",
        summary: "Draws the shape of a note over time each time a gate arrives.",
        controls: ["Attack: fade-in time.", "Decay: time to fall to the Sustain level.", "Sustain: level held while the key is down.", "Release: fade-out after the key is let go."],
        tips: ["One ENV OUT can feed both the VCA CV and the Filter CUT MOD."] },
      { type: "lfo", group: "modulation", name: "LFO", preset: "demo-lfo",
        summary: "A slow wave that moves other settings up and down by itself.",
        controls: ["Waveform: Sine, Triangle, Square, Sawtooth. The preview shows the shape and a dot riding it.", "Rate: speed, 0.1 to 20 Hz.", "Depth: how strong.", "Reset Phase: restarts the wave."],
        tips: ["Drop the OUT cable on any slider of another module to move that slider.", "Into a Filter CUT MOD, use a small Depth."] },
      { type: "output", group: "output", name: "Output", preset: "demo-output",
        summary: "Sends the sound to your speakers or headphones.",
        controls: ["Master Volume: starts at 0 when a patch loads."],
        tips: ["THRU OUT passes a copy on to a Recorder or Oscilloscope."] },
      { type: "oscilloscope", group: "output", name: "Oscilloscope", preset: "demo-oscilloscope",
        summary: "Draws any signal so you can see it.",
        controls: [],
        tips: ["It has no output. To also hear the signal, run a second cable from the same OUT to the Output."] },
      { type: "recorder", group: "output", name: "Recorder", preset: "demo-recorder",
        summary: "Records what comes in and saves it as a WAV file.",
        controls: ["Record / Stop & Export. The level is normalized so recordings come out at an even loudness."],
        tips: ["On iPad, the share sheet opens: choose Save to Files."] }
    ],
    recipes: [
      { preset: "classic-mono", title: "Classic Mono Synth",
        learn: "The basic synth: notes, a filter and a volume shape.",
        steps: ["Raise Master Volume.", "Play the Keyboard (letters Z to M, or click the keys).", "Change Attack and Release on the Envelope, then Cutoff on the Filter."] },
      { preset: "seq-groove", title: "Sequencer Groove",
        learn: "A pattern that plays itself, with the Envelope opening the filter on every step.",
        steps: ["Raise Master Volume (the Sequencer is already running).", "Move the step sliders to change the melody, switch steps ON / OFF.", "Raise Mod Depth or Resonance on the Filter for a sharper sound."] },
      { preset: "ambient-drone", title: "Ambient Drone",
        learn: "Granular texture, a slow filter sweep from an LFO and a big reverb.",
        steps: ["Raise Master Volume.", "Change Pitch and Spray on the Granular Cloud.", "Slow the LFO Rate down even more."] },
      { preset: "ext-processing", title: "Process Your Voice",
        learn: "Live sound from your mic through a filter and a reverb.",
        steps: ["Press Enable Mic and allow the browser.", "Use headphones, then raise Master Volume.", "Sweep the Filter Cutoff while you talk or play."] },
      { preset: "demo-reverb", title: "Plucks in a Hall",
        learn: "Short notes from a Sequencer and Envelope, sent into a long reverb.",
        steps: ["Raise Master Volume.", "Change Decay and Mix on the Reverb."] },
      { preset: "demo-envelope", title: "Shaping a Note",
        learn: "What Attack, Decay, Sustain and Release do; the oscilloscope draws the shape.",
        steps: ["Raise Master Volume and hold a key.", "Watch the oscilloscope while you move the four sliders."] },
      { preset: "demo-lfo", title: "Filter Wobble",
        learn: "An LFO moving a filter by itself.",
        steps: ["Raise Master Volume.", "Change the LFO Rate and Waveform."] },
      { preset: "demo-mixer", title: "Two Oscillators, One Mixer",
        learn: "Combining sounds and placing them left and right.",
        steps: ["Raise Master Volume.", "Move VOL and PAN on each channel."] }
    ]
  }
,
  he: {
    title: "המדריך של Sound Playground",
    searchPlaceholder: "חיפוש מודול, שקע או מתכון...",
    tabs: {
      start: "מתחילים כאן",
      modules: "המודולים",
      recipes: "מתכונים",
      basics: "סוגי אותות",
      trouble: "פתרון תקלות",
      shortcuts: "קיצורים"
    },
    ui: {
      inputs: "כניסות",
      outputs: "יציאות",
      controls: "כפתורים וסליידרים",
      tips: "טיפים",
      none: "אין",
      from: "מחברים מ",
      to: "מחברים אל",
      tryIt: "טען את פאץ' ההדגמה",
      loadRecipe: "טען את הפאץ'",
      youLearn: "מה לומדים",
      howToPlay: "איך מנגנים",
      noResults: "לא נמצא כלום. נסה מילה אחרת.",
      groups: { sources: "מקורות צליל", controllers: "בקרים", processors: "מעבדים ואפקטים", modulation: "אפנון", output: "יציאה וניטור" }
    },
    sections: {
      start: `
        <div class="help-card">
          <h4>הצליל הראשון בשלושה צעדים</h4>
          <ol class="help-list">
            <li>בתפריט <strong>Modules</strong> משמאל, הוסיפו <strong>Oscillator</strong> ו-<strong>Output</strong>.</li>
            <li>גררו כבל מהשקע <strong>OUT</strong> של האוסילטור לשקע <strong>IN</strong> של ה-Output.</li>
            <li>הרימו את <strong>Master Volume</strong> ב-Output. תשמעו צליל קבוע; הזיזו את סליידר ה-Frequency כדי לשנות אותו.</li>
          </ol>
        </div>
        <div class="help-card">
          <h4>איך קוראים את השקעים</h4>
          <ul class="help-list">
            <li>מתחת לכל שקע יש תווית קטנה. <span class="chip-demo chip-in">IN</span> (לבנה) היא כניסה, <span class="chip-demo chip-out">OUT</span> (כחולה) היא יציאה. כתוב בה גם סוג האות ולאן מחברים בדרך כלל.</li>
            <li>להסבר המלא: עוברים עם העכבר על השקע, או באייפד לוחצים עליו ומחזיקים.</li>
            <li>בזמן גרירת כבל, היעדים הכי מתאימים מהבהבים, יעדים אפשריים מקבלים טבעת, וכל השאר מתעמעמים.</li>
            <li>כפתור <strong>Tooltips</strong> בסרגל העליון מסתיר ומחזיר את התוויות וההסברים.</li>
          </ul>
        </div>
        <div class="help-card">
          <h4>כבלים</h4>
          <ul class="help-list">
            <li>כבל תמיד יוצא מ-<strong>OUT</strong> ונכנס ל-<strong>IN</strong>. מיציאה אחת אפשר למשוך כמה כבלים.</li>
            <li>כדי לנתק, גוררים את הכבל החוצה מהכניסה ועוזבים במקום ריק. או לוחצים על כבל פעם אחת כדי לסמן אותו, ושוב (או Delete) כדי למחוק.</li>
            <li>כבל מ-<strong>LFO OUT</strong> (או מיציאה של ה-<strong>Ribbon</strong>) אפשר להפיל גם על כל סליידר של מודול אחר, והסליידר יזוז לבד.</li>
            <li>הכפתור <strong>Cables: Front / Back</strong> בסרגל העליון שם את הכבלים מעל או מתחת למודולים.</li>
          </ul>
        </div>
        <div class="help-card">
          <h4>פריסטים נפתחים בשקט</h4>
          <p>כל פאץ' שנטען (מ<strong>מתכונים</strong> או עם <strong>Load</strong>) נפתח כשהווליום של ה-Output על 0, כדי ששום דבר לא יתנפל עליכם. מרימים את <strong>Master Volume</strong> במודול ה-Output כדי לשמוע.</p>
        </div>
      `,
      basics: `
        <div class="help-card">
          <h4>מה זה סינתסייזר מודולרי?</h4>
          <p>בסינתסייזר רגיל החיווט מוכן מראש. כאן אתם מחווטים: כל מודול עושה דבר אחד, והכבלים קובעים לאן הולכים הצליל ואותות השליטה.</p>
        </div>
        <div class="help-card">
          <h4>שלושה סוגי אותות</h4>
          <ul class="help-list">
            <li><span class="tag tag-audio">Audio</span> הצליל עצמו, רעידות מהירות שאפשר לשמוע. Oscillator, Granular ו-Mic מייצרים אותו; Filter, VCA ו-Reverb משנים אותו; Output משמיע אותו.</li>
            <li><span class="tag tag-cv">CV</span> מתח שליטה: אות איטי שמזיז הגדרה, כמו גובה צליל, עוצמה או בהירות. LFO, Envelope, FREQ של המקלדת ו-Webcam מייצרים אותו.</li>
            <li><span class="tag tag-gate">Gate</span> דולק או כבוי: "עכשיו מנגן תו". המקלדת והסיקוונסר מייצרים אותו; הוא מפעיל Envelope או פותח VCA.</li>
          </ul>
        </div>
        <div class="help-card">
          <h4>השרשרת הקלאסית</h4>
          <ol class="help-list">
            <li><strong>תווים:</strong> FREQ של המקלדת (או PITCH CV של הסיקוונסר) אל PITCH של האוסילטור. GATE של המקלדת אל GATE IN של ה-Envelope.</li>
            <li><strong>צליל:</strong> OUT של האוסילטור אל IN של הפילטר, OUT של הפילטר אל IN של ה-VCA, OUT של ה-VCA אל IN של ה-Output.</li>
            <li><strong>צורה:</strong> ENV OUT אל CV של ה-VCA, כך שכל תו נכנס ויוצא בהדרגה. כבל נוסף מ-ENV OUT אל CUT MOD של הפילטר יעשה כל תו בהיר יותר בתחילתו.</li>
          </ol>
          <p>המתכון <strong>Classic Mono Synth</strong> הוא בדיוק הפאץ' הזה.</p>
        </div>
        <div class="help-card">
          <h4>לראות את האות</h4>
          <p>חברו כל OUT ל-<strong>Oscilloscope</strong> כדי לראות אותו. לאוסצילוסקופ אין יציאה, אז כדי גם לשמוע את אותו אות, משכו כבל שני מאותו OUT אל ה-Output.</p>
        </div>
      `,
      trouble: `
        <div class="help-card">
          <h4>לא שומעים כלום</h4>
          <ul class="help-list">
            <li>הרימו את <strong>Master Volume</strong> ב-Output. כל פאץ' נטען על 0.</li>
            <li>בדקו שיש כבל שמגיע ל-<strong>IN</strong> של ה-Output.</li>
            <li>אם יש בפאץ' VCA, הוא שקט עד שמשהו פותח אותו: לחצו על קליד במקלדת, או Play בסיקוונסר.</li>
            <li>לחצו פעם אחת בכל מקום בדף: הדפדפן משאיר את הצליל כבוי עד שנוגעים בדף.</li>
            <li>פאצ'ים עם מיקרופון צריכים <strong>Enable Mic</strong>; פאצ'ים עם מצלמה צריכים <strong>Start Camera</strong>, והדפדפן צריך לקבל אישור.</li>
          </ul>
        </div>
        <div class="help-card">
          <h4>המקלדת לא מנגנת</h4>
          <ul class="help-list">
            <li>FREQ של המקלדת הולך ל-<strong>PITCH</strong> של האוסילטור, ו-GATE הולך ל-Envelope או ישר ל-CV של VCA.</li>
            <li>מקשי המחשב עובדים רק כשלא מסומנת תיבת טקסט. מקשים עם Cmd או Ctrl לא מנגנים בכוונה (Cmd+Z זה ביטול).</li>
          </ul>
        </div>
        <div class="help-card">
          <h4>הצליל מעוות או חזק מדי</h4>
          <ul class="help-list">
            <li>הנמיכו את Master Volume, או את העוצמה של המודול שלפניו.</li>
            <li>LFO הוא חזק: לפילטר השתמשו ב-Depth קטן, או הנמיכו את Mod Depth של הפילטר.</li>
          </ul>
        </div>
        <div class="help-card">
          <h4>עשיתי בלגן</h4>
          <p>ביטול עם כפתורי החצים בתחילת הסרגל העליון, או Cmd+Z. <strong>Clear</strong> מנקה את כל משטח העבודה (גם את זה אפשר לבטל).</p>
        </div>
      `,
      shortcuts: `
        <div class="help-card">
          <h4>משטח העבודה</h4>
          <ul class="help-list">
            <li><kbd>Space</kbd> + גרירה, או <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + גרירה: תזוזה במשטח.</li>
            <li>גלגלת העכבר או הכפתורים <kbd>+</kbd> / <kbd>-</kbd>: זום. <strong>100%</strong> מאפס את התצוגה.</li>
            <li>אייפד: צביטה בשתי אצבעות על מקום ריק לזום ולתזוזה.</li>
            <li><kbd>Delete</kbd>: מחיקת המודול או הכבל המסומן. <kbd>Esc</kbd>: ביטול סימון.</li>
            <li><kbd>Cmd</kbd>+<kbd>Z</kbd> ביטול, <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> חזרה (<kbd>Ctrl</kbd> בווינדוס).</li>
            <li><kbd>Shift</kbd> + גרירה מיציאה: הזזת הכבל האחרון שחובר אליה.</li>
          </ul>
        </div>
        <div class="help-card">
          <h4>נגינה במקלדת</h4>
          <ul class="help-list">
            <li>שתי שורות האותיות התחתונות (<kbd>Z</kbd> עד <kbd>M</kbd>): האוקטבה הנמוכה.</li>
            <li>שתי השורות העליונות (<kbd>Q</kbd> עד <kbd>I</kbd>): האוקטבה הגבוהה.</li>
            <li>הכפתורים <strong>-</strong> / <strong>+</strong> במודול מזיזים אוקטבה.</li>
          </ul>
        </div>
        <div class="help-card">
          <h4>הסרגל העליון</h4>
          <ul class="help-list">
            <li><strong>Move</strong>: גוררים כדי להזיז את הסרגל. גוררים את הכותרת <strong>Modules</strong> כדי להזיז את התפריט הצדדי. לחיצה כפולה מחזירה למקום.</li>
            <li><strong>Theme</strong> בהיר או כהה. <strong>Play Mode</strong> מסתיר את הכבלים ונועל את המודולים להופעה.</li>
            <li><strong>Save</strong> / <strong>Load</strong> שמירה וטעינה של קובץ פאץ' (באייפד, Save פותח את חלון השיתוף: בוחרים Save to Files).</li>
          </ul>
        </div>
      `
    },
    modules: [
      { type: "oscillator", group: "sources", name: "Oscillator (VCO)", preset: "demo-oscillator",
        summary: "מייצר צליל קבוע. נקודת ההתחלה של רוב הצלילים.",
        controls: ["Waveform: Sawtooth (בהיר), Square / Pulse (חלול), Triangle (רך), Sine (נקי).", "Frequency: גובה הצליל, 20 עד 4000 הרץ. אפור כשיש כבל ב-PITCH.", "Pulse Width: רק ל-Square; משנה את הצליל מחלול לדק."],
        tips: ["FREQ של המקלדת אל PITCH: מנגנים תווים מכוונים.", "LFO איטי אל FM IN נותן ויברטו."] },
      { type: "wavetable", group: "sources", name: "Wavetable Osc", preset: "demo-wavetable",
        summary: "אוסילטור שעובר בהדרגה בין שורה של צורות גל שונות, כך שהצליל יכול להשתנות ולזוז תוך כדי נגינה.",
        controls: ["המסך: 8 הגלים של הטבלה בערימה מקדימה לאחור; הגל הבהיר הוא זה שמתנגן עכשיו, במקום שלו בערימה.", "Table: Basic (סינוס, משולש, מסור, ריבוע), Vocal (תנועות A E I O U), Digital (פס בהיר שמטפס), Organ (הגדרות של עוגב), PWM (פולס שהולך ונעשה דק), Draw (גל שאתם מציירים).", "Position: איפה בטבלה נמצאים; בין שני גלים שומעים מעבר חלק.", "Warp: מעקם כל גל (מכווץ את החצי הראשון שלו), לצבעים בהירים ואפיים יותר.", "Frequency: גובה הצליל, 20 עד 2000 הרץ; לא פעיל כשיש כבל ב-PITCH. Octave ו-Tune מזיזים את הגובה (גם של תו שמגיע מ-PITCH).", "POS Depth: כמה כבל ב-POS מזיז את Position.", "Unison Voices: עד 7 עותקים של הצליל שמתנגנים יחד. Unison Detune: כמה הם מכוונים זה מזה (בסנטים); יחד הם נותנים צליל רחב ושמן.", "Draw: בוחרים Draw ב-Table ומציירים על המסך מחזור אחד של גל, בעכבר או בעט. Position על 0% מנגן סינוס, על 100% את הגל שלכם, ובאמצע שילוב."],
        tips: ["הפילו כבל מ-LFO OUT על הסליידר Position: הצליל נע כל הזמן בין הגלים.", "ENV OUT של Envelope אל POS: כל תו עובר דרך הטבלה, קצת כמו פתיחת פילטר אבל אחרת.", "תווים גבוהים נשארים נקיים: לתווים גבוהים יש גלים עם פחות הרמוניות."] },
      { type: "granular", group: "sources", name: "Granular Cloud", preset: "demo-granular",
        summary: "מקליט את הצליל שנכנס (או קובץ שנטען) ומשמיע אותו כענן של גרגרים קטנטנים.",
        controls: ["Source: Live Input (מקליט מ-IN L / IN R) או Audio File (Load File).", "Position: מאיפה בהקלטה לוקחים גרגרים.", "Size: אורך גרגר. Density: גרגרים בשנייה.", "Pitch: מהירות הגרגר (2 = אוקטבה למעלה). Spray: אקראיות. Reverse: הסיכוי שגרגר יתנגן הפוך.", "CV 1 / CV 2 Target: איזו הגדרה כל כניסת CV מזיזה."],
        tips: ["במצב Live, בלי שום דבר ב-IN הוא שקט.", "גרגרים ארוכים וצפופים נותנים פד רך; קצרים ודלילים נותנים פצפוץ."] },
      { type: "audio_in", group: "sources", name: "Mic / Audio In", preset: "demo-audioinput",
        summary: "מכניס צליל חי מהמיקרופון או מכרטיס הקול.",
        controls: ["Enable Mic: מבקש מהדפדפן גישה למיקרופון.", "Input Level: עוצמת הכניסה.", "Auto-Level & Anti-Clip: שומר על עוצמה יציבה ובטוחה."],
        tips: ["השתמשו באוזניות, אחרת הרמקולים חוזרים למיקרופון ומצפצפים."] },
      { type: "keyboard", group: "controllers", name: "Keyboard", preset: "demo-keyboard",
        summary: "מנגנים תווים בעכבר, במקלדת המחשב או במקלדת MIDI.",
        controls: ["MIDI In: בחירת מקלדת MIDI מחוברת.", "- / +: הזזת אוקטבה.", "פס PITCH משמאל: מכופף את הצליל (יציאת BEND)."],
        tips: ["FREQ אל PITCH של האוסילטור, GATE אל GATE IN של ה-Envelope: סינתסייזר שאפשר לנגן."] },
      { type: "sequencer", group: "controllers", name: "Sequencer", preset: "demo-sequencer",
        summary: "מנגן לבד שורה של תווים שחוזרת על עצמה.",
        controls: ["Play / Stop.", "כיוון: קדימה, אחורה, הלוך-חזור, אקראי.", "Tempo: מהירות ב-BPM. Octave: כמה רחוק מגיעים סליידרי הצעדים.", "+ Step / - Step: יותר או פחות צעדים.", "לכל צעד: ON / OFF וסליידר גובה. הסליידר נצמד לתווים שלמים (חצאי טונים), כך שכל צעד מכוון."],
        tips: ["PITCH CV אל PITCH של האוסילטור, GATE אל Envelope או אל CV של VCA."] },
      { type: "webcam", group: "controllers", name: "Webcam Controller", preset: "demo-webcam",
        summary: "הופך תנועה מול המצלמה לאותות שליטה.",
        controls: ["Start Camera.", "Sens (Thresh): כמה תנועה נחשבת.", "Smoothing: תגובה רגועה או מהירה.", "CV Depth (Hz): כמה חזקות יציאות X / Y."],
        tips: ["X CV אל FM IN של האוסילטור: מזיזים יד ימינה ושמאלה ומשנים את הגובה."] },
      { type: "ribbon", group: "controllers", name: "Ribbon", preset: "demo-ribbon",
        summary: "רצועה בצבעי קשת שמנגנים עליה בהחלקה של עכבר, אצבע או העיפרון של האייפד.",
        controls: ["משמאל לימין קובע את גובה הצליל. התצוגה Note מראה על איזה תו אתם.", "Base Note: התו בקצה השמאלי. Range: כמה אוקטבות הרצועה מכסה.", "Glide: כמה חלק הגובה מחליק בין מקומות.", "Snap: במצב On קופץ לתווים שלמים, במצב Off מחליק חופשי.", "Hold: במצב On ה-Gate נשאר פתוח גם אחרי שמרימים את האצבע.", "Y / Press Range: מכפיל את היציאות Y ו-PRESS. x1 מתאים ל-CV של VCA או ל-CUT MOD של פילטר (ה-Mod Depth שלו קובע כמה הוא נפתח)."],
        tips: ["PITCH אל PITCH של האוסילטור ו-GATE אל GATE IN של ה-Envelope: סינתסייזר שמנגנים עליו בהחלקה.", "את הכבלים מ-Y ומ-PRESS אפשר להפיל על כל סליידר, כמו ה-LFO: נגיעה גבוהה יותר או לחיצה חזקה יותר מזיזה אותו."] },
      { type: "drums", group: "controllers", name: "Drum Machine", preset: "demo-drums",
        summary: "מכונת תופים של ארבע שורות צעדים (Kick, Snare, Hi-Hat, Cymbal) עם צלילים בסגנון 808 ו-909 הקלאסיים, כולם נוצרים בסינתזה.",
        controls: ["Play / Stop. Tempo: מ-40 עד 240 BPM (אפשר להקליד מספר בתיבה ואז Enter). Swing: מאחר כל תו שישית-עשרית שני לתחושה מקפצת.", "Add Bar / Remove Bar: מ-1 עד 4 תיבות של 16 צעדים.", "צעדים: הקשה אחת למכה, עוד הקשה להדגשה (חזק יותר, צבע מלא), עוד הקשה לכיבוי.", "Sound: דגם התוף של השורה (808, 909, Rimshot, Clap, היי-האט פתוח או סגור, Ride, Cowbell...), Custom (בונים לבד) או Input.", "Edit פותח את הסליידרים של השורה: Tune, Decay, Tone, Level ו-Pan. Clear מרוקן את השורה.", "Custom: Wave, Pitch, Pitch Env, Noise, Attack, Decay, Cutoff ו-Resonance של קול סינתיסייזר קטן."],
        tips: ["MAIN L ו-MAIN R מוציאים את ארבע השורות יחד; ה-OUT של כל שורה מוציא את התוף הזה לבד, לאפקט משלו.", "TRIG של שורה אל GATE IN של Envelope נותן לאוסילטור לנגן בתזמון של אותו תוף.", "חברו כל צליל ל-IN של שורה, וכל צעד ינגן ממנו קטע קצר שמעוצב לפי Decay ו-Tone."] },
      { type: "metronome", group: "controllers", name: "Metronome", preset: "demo-metronome",
        summary: "שומר על הקצב: קליק בכל פעמה, ויציאת CLOCK שמשאירה מודולים אחרים באותו קצב.",
        controls: ["Play / Stop. Tap: מקישים עליו כמה פעמים בקצב, והטמפו נקבע לפי ההקשות.", "Tempo: מ-20 עד 300 BPM. גוררים את הסליידר, או מקלידים מספר בתיבה ולוחצים Enter.", "Beats per Bar: כמה פעמות עד שהספירה מתחילה מחדש. הנורות מראות את הפעמה, הראשונה היא המודגשת.", "Sound: Click, Wood Block או Beep. Volume: כמה חזק הקליק.", "Accent: במצב On הפעמה הראשונה בכל תיבה חזקה וגבוהה יותר."],
        tips: ["חברו את CLICK ל-Output כדי לשמוע את המטרונום; בלי כבל הוא שקט.", "CLOCK נותן דפיקה בכל תו שש-עשרית (ארבע בכל פעמה). חברו אותו לכניסת CLOCK של מודול כדי שילך לפי הטמפו הזה, או ל-GATE IN של Envelope כדי לנגן תבנית של שש-עשריות.", "כבל LFO שמופל על סליידר ה-Tempo מאיץ ומאט את המטרונום לבד."] },
      { type: "filter", group: "processors", name: "Filter (VCF)", preset: "demo-filter",
        summary: "מוריד חלק מהצליל: כהה יותר, בהיר יותר או דק יותר.",
        controls: ["Type: Lowpass (משאיר נמוכים), Highpass (משאיר גבוהים), Bandpass, Notch.", "Cutoff: איפה הפילטר חותך.", "Resonance (Q): שיא מצלצל בנקודת החיתוך.", "Mod Depth: כמה CUT MOD מזיז את החיתוך."],
        tips: ["Envelope אל CUT MOD: כל תו מתחיל בהיר ונסגר כהה יותר."] },
      { type: "vca", group: "processors", name: "VCA (Amplifier)", preset: "demo-vca",
        summary: "בקרת עוצמה שמודולים אחרים יכולים להזיז.",
        controls: ["Initial Gain: העוצמה כשאין כלום ב-CV. השאירו על 0 כדי שהתווים ייעצרו בין לחיצות."],
        tips: ["ENV OUT של ה-Envelope אל CV מעצב כל תו.", "GATE של המקלדת או הסיקוונסר ישר אל CV נותן תווים פשוטים של דלוק/כבוי."] },
      { type: "mixer", group: "processors", name: "Mixer", preset: "demo-mixer",
        summary: "מחבר כמה צלילים לאחד, לכל אחד עוצמה ומיקום ימין-שמאל משלו.",
        controls: ["לכל ערוץ: VOL ו-PAN.", "MASTER VOL: העוצמה הכוללת.", "+ Add Channel: עוד כניסה."],
        tips: ["DIR OUT שולח ערוץ אחד לבד למקום אחר, למשל ל-Reverb."] },
      { type: "reverb", group: "processors", name: "Reverb", preset: "demo-reverb",
        summary: "שם את הצליל בתוך חדר, מחלל קטן ועד אולם ענק.",
        controls: ["Radius: גודל החדר. Decay: כמה זמן הזנב נמשך.", "Damping: זנב כהה או בהיר. Warp: קצת תנועה בזנב.", "Mix: כמה ריוורב לעומת הצליל היבש."],
        tips: ["תווים קצרים עם Decay ארוך נשמעים הרבה יותר גדולים מצליל קבוע."] },
      { type: "delay", group: "processors", name: "Stereo Delay", preset: "demo-delay",
        summary: "מהדהד את הצליל, עם צד שמאל וימין נפרדים, חזרות הפוכות, Ping-Pong וסנכרון לקצב.",
        controls: ["המסך: כל חזרה היא משולש (נוטה שמאלה כשהיא הפוכה); בכל מכה עובר פולס על המסך ומדליק את החזרות. גוררים נקודה: ימינה ושמאלה משנה Time, למעלה ולמטה משנה Feedback.", "העמודות Left, Both ו-Right: Both מזיז את שני הצדדים יחד, Left ו-Right מזיזים צד אחד.", "Time: כמה זמן עד ההד. Feedback: כמה חזרות. Tone: חזרות כהות או בהירות. Level: עוצמת החזרות. Mix: הצליל המקורי מול ההד.", "Reverse: החזרות מתנגנות הפוך.", "Ping-Pong: ההד קופץ בין שמאל לימין.", "Sync: כשיש כבל ב-CLOCK, ה-Time של כל צד הולך לפי הקצב; בוחרים Division (1/8, 1/8 מנוקדת, 1/4...)."],
        tips: ["CLOCK של מכונת התופים אל CLOCK, Sync On, שמאל 1/8 מנוקדת וימין 1/4: הד קצבי קלאסי.", "Reverse עם Time ארוך על צלילים קצרים נותן צליל הפוך שמתנפח."] },
      { type: "degrader", group: "processors", name: "Degrader", preset: "demo-degrader",
        summary: "אפקט לו-פיי עם כפתור אחד: סיבוב של Degrade \"מזקין\" את הצליל, מנקי, דרך חום של טייפ ולו-פיי, ועד הרס מלא.",
        controls: ["Degrade על 0%: נקי, הצליל עובר בלי שינוי.", "עד 30% (Tape): עיוות רך (סטורציה), והגבהים מתעמעמים מעט.", "30% עד 60% (Lo-Fi): פחות ביטים (מ-16 ל-8), קצב דגימה נמוך יותר (עד 8 kHz) לצליל דיגיטלי ומחוספס, ורעד קל בגובה הצליל כמו בקלטת.", "60% עד 100% (Wrecked): רק 3 עד 4 ביטים, קצב דגימה נמוך מאוד שמצלצל מתכתי, רעש רקע ופצפוצי תקליט שעולים, והגבהים כמעט סגורים."],
        tips: ["הפילו כבל מ-LFO OUT על הסליידר Degrade: הצליל מתפרק ומתאחה לבד.", "מעל 60% שומעים רעש ופצפוצים גם כשלא מנגן כלום, כמו בתקליט ישן."] },
      { type: "envelope", group: "modulation", name: "Envelope (ADSR)", preset: "demo-envelope",
        summary: "משרטט את הצורה של תו לאורך זמן בכל פעם שמגיע Gate.",
        controls: ["Attack: זמן הכניסה.", "Decay: הזמן לרדת לרמת ה-Sustain.", "Sustain: הרמה שנשארת כל עוד הקליד לחוץ.", "Release: הדעיכה אחרי שעוזבים את הקליד."],
        tips: ["ENV OUT אחד יכול להזין גם את CV של ה-VCA וגם את CUT MOD של הפילטר."] },
      { type: "lfo", group: "modulation", name: "LFO", preset: "demo-lfo",
        summary: "גל איטי שמזיז לבד הגדרות אחרות למעלה ולמטה.",
        controls: ["Waveform: Sine, Triangle, Square, Sawtooth. התצוגה מראה את הצורה ונקודה שרוכבת עליה.", "Rate: מהירות, 0.1 עד 20 הרץ.", "Depth: עוצמה.", "Reset Phase: מתחיל את הגל מחדש."],
        tips: ["הפילו את הכבל מ-OUT על כל סליידר של מודול אחר כדי שהסליידר יזוז.", "ל-CUT MOD של פילטר השתמשו ב-Depth קטן."] },
      { type: "output", group: "output", name: "Output", preset: "demo-output",
        summary: "שולח את הצליל לרמקולים או לאוזניות.",
        controls: ["Master Volume: מתחיל על 0 כשפאץ' נטען."],
        tips: ["THRU OUT מעביר עותק הלאה ל-Recorder או לאוסצילוסקופ."] },
      { type: "oscilloscope", group: "output", name: "Oscilloscope", preset: "demo-oscilloscope",
        summary: "משרטט כל אות כדי שאפשר יהיה לראות אותו.",
        controls: [],
        tips: ["אין לו יציאה. כדי גם לשמוע את האות, משכו כבל שני מאותו OUT אל ה-Output."] },
      { type: "recorder", group: "output", name: "Recorder", preset: "demo-recorder",
        summary: "מקליט את מה שנכנס ושומר כקובץ WAV.",
        controls: ["Record / Stop & Export. העוצמה מנורמלת כך שההקלטות יוצאות בעוצמה אחידה."],
        tips: ["באייפד נפתח חלון השיתוף: בוחרים Save to Files."] }
    ],
    recipes: [
      { preset: "classic-mono", title: "Classic Mono Synth",
        learn: "הסינתסייזר הבסיסי: תווים, פילטר וצורת עוצמה.",
        steps: ["הרימו את Master Volume.", "נגנו במקלדת (האותיות Z עד M, או לחיצה על הקלידים).", "שנו Attack ו-Release ב-Envelope, ואז Cutoff בפילטר."] },
      { preset: "seq-groove", title: "Sequencer Groove",
        learn: "תבנית שמנגנת לבד, וה-Envelope פותח את הפילטר בכל צעד.",
        steps: ["הרימו את Master Volume (הסיקוונסר כבר מנגן).", "הזיזו את סליידרי הצעדים כדי לשנות את המנגינה, הדליקו וכבו צעדים.", "הגבירו Mod Depth או Resonance בפילטר לצליל חד יותר."] },
      { preset: "ambient-drone", title: "Ambient Drone",
        learn: "טקסטורה גרנולרית, פילטר שזז לאט בעזרת LFO, וריוורב גדול.",
        steps: ["הרימו את Master Volume.", "שנו Pitch ו-Spray ב-Granular Cloud.", "האטו עוד יותר את ה-Rate של ה-LFO."] },
      { preset: "ext-processing", title: "Process Your Voice",
        learn: "צליל חי מהמיקרופון דרך פילטר וריוורב.",
        steps: ["לחצו Enable Mic ואשרו בדפדפן.", "שימו אוזניות, ואז הרימו את Master Volume.", "הזיזו את ה-Cutoff של הפילטר בזמן שאתם מדברים או מנגנים."] },
      { preset: "demo-reverb", title: "Plucks in a Hall",
        learn: "תווים קצרים מסיקוונסר ו-Envelope, שנשלחים לריוורב ארוך.",
        steps: ["הרימו את Master Volume.", "שנו Decay ו-Mix בריוורב."] },
      { preset: "demo-envelope", title: "Shaping a Note",
        learn: "מה עושים Attack, Decay, Sustain ו-Release; האוסצילוסקופ משרטט את הצורה.",
        steps: ["הרימו את Master Volume והחזיקו קליד.", "הסתכלו על האוסצילוסקופ בזמן שאתם מזיזים את ארבעת הסליידרים."] },
      { preset: "demo-lfo", title: "Filter Wobble",
        learn: "LFO שמזיז פילטר לבד.",
        steps: ["הרימו את Master Volume.", "שנו את ה-Rate וה-Waveform של ה-LFO."] },
      { preset: "demo-mixer", title: "Two Oscillators, One Mixer",
        learn: "חיבור צלילים ומיקום שלהם ימינה ושמאלה.",
        steps: ["הרימו את Master Volume.", "הזיזו VOL ו-PAN בכל ערוץ."] }
    ],
    // Hebrew text for each jack (keys match portGuide.js GUIDE); missing keys fall back to English
    ports: {
      "oscillator:in:pitch": { text: "מנגן תווים. כשיש כבל, התו הנכנס קובע את הגובה וסליידר ה-Frequency מושבת.", where: "FREQ של המקלדת, PITCH CV של הסיקוונסר" },
      "oscillator:in:fm": { text: "מזיז את הגובה למעלה ולמטה סביב התו. LFO נותן ויברטו; אוסילטור אחר נותן צלילים מתכתיים.", where: "LFO OUT, X / Y של המצלמה, BEND של המקלדת, OUT של אוסילטור אחר" },
      "oscillator:out:default": { text: "הצליל הגולמי של האוסילטור.", where: "IN של Filter, VCA, Mixer, Reverb, Output, Oscilloscope" },
      "granular:in:in_l": { text: "צליל שנחתך לגרגרים (צד שמאל).", where: "OUT של Mic, Oscillator, Mixer" },
      "granular:in:in_r": { text: "צליל שנחתך לגרגרים (צד ימין).", where: "OUT של Mic, Oscillator, Mixer" },
      "granular:in:cv1": { text: "מזיז את ההגדרה שנבחרה בתפריט CV 1 (ברירת מחדל: Position).", where: "LFO, X / Y / MOTION של המצלמה, Envelope" },
      "granular:in:cv2": { text: "מזיז את ההגדרה שנבחרה בתפריט CV 2 (ברירת מחדל: Pitch).", where: "LFO, X / Y / MOTION של המצלמה, Envelope" },
      "granular:out:out_l": { text: "ענן הגרגרים, צד שמאל.", where: "Filter, Reverb, VCA, Output" },
      "granular:out:out_r": { text: "ענן הגרגרים, צד ימין.", where: "Reverb IN R, Mixer, Output" },
      "audio_in:out:audio": { text: "צליל חי מהמיקרופון או מכרטיס הקול.", where: "Filter, Granular, Reverb, VCA, Output" },
      "keyboard:out:freq": { text: "גובה הקליד שמנגנים.", where: "PITCH של האוסילטור" },
      "keyboard:out:gate": { text: "דולק כל עוד קליד לחוץ, כבוי כשעוזבים.", where: "GATE IN של Envelope, או CV של VCA" },
      "keyboard:out:bend": { text: "פס כיפוף הצליל.", where: "FM IN של האוסילטור, CUT MOD של הפילטר" },
      "sequencer:out:pitch": { text: "התו של הצעד הנוכחי.", where: "PITCH של האוסילטור" },
      "sequencer:out:gate": { text: "פולס קצר בכל צעד פעיל.", where: "GATE IN של Envelope, או CV של VCA" },
      "webcam:out:out_x": { text: "איפה התנועה, משמאל לימין.", where: "CUT MOD של פילטר, FM IN של אוסילטור, CV 1 של Granular" },
      "webcam:out:out_y": { text: "איפה התנועה, מלמטה למעלה.", where: "CUT MOD של פילטר, FM IN של אוסילטור, CV 2 של Granular" },
      "webcam:out:out_motion": { text: "כמה תנועה יש.", where: "CV של VCA, CV 1 של Granular, CUT MOD של פילטר" },
      "webcam:out:out_gate": { text: "נדלק כשהתנועה עוברת את הסף.", where: "GATE IN של Envelope" },
      "filter:in:audio": { text: "הצליל שמסננים.", where: "OUT של Oscillator, Granular, Mic, Mixer" },
      "filter:in:cutoff": { text: "מזיז את נקודת החיתוך: צליל בהיר או כהה יותר.", where: "ENV OUT, LFO OUT, X / Y של המצלמה" },
      "filter:out:default": { text: "הצליל אחרי הסינון.", where: "VCA, Reverb, Output, Oscilloscope" },
      "vca:in:audio": { text: "הצליל שה-VCA שולט בעוצמה שלו.", where: "OUT של Oscillator, Filter, Granular" },
      "vca:in:cv": { text: "פותח את העוצמה. מ-Envelope כל תו נכנס ויוצא בהדרגה; מ-LFO מקבלים טרמולו.", where: "ENV OUT, LFO OUT, GATE של המקלדת או הסיקוונסר" },
      "vca:out:audio": { text: "הצליל אחרי בקרת העוצמה.", where: "Reverb, Mixer, Output, Recorder" },
      "mixer:in:ch_in": { text: "ערוץ אחד במיקסר, עם עוצמה ו-PAN משלו.", where: "כל יציאת Audio" },
      "mixer:out:ch_out": { text: "הערוץ הזה לבד, אחרי כפתור העוצמה שלו.", where: "Reverb, Filter, Oscilloscope" },
      "mixer:out:out_l": { text: "כל הערוצים יחד, צד שמאל.", where: "Output, Reverb IN L, Recorder" },
      "mixer:out:out_r": { text: "כל הערוצים יחד, צד ימין.", where: "Reverb IN R, Output" },
      "reverb:in:in_l": { text: "צליל שנשלח לחדר (שמאל).", where: "OUT של VCA, Filter, Mixer, Oscillator" },
      "reverb:in:in_r": { text: "צליל שנשלח לחדר (ימין).", where: "OUT R של Mixer, Granular" },
      "reverb:out:out_l": { text: "הצליל עם הריוורב, צד שמאל.", where: "Output, Recorder, Oscilloscope" },
      "reverb:out:out_r": { text: "הצליל עם הריוורב, צד ימין.", where: "Output, Mixer" },
      "degrader:in:in": { text: "הצליל שרוצים לקלקל.", where: "OUT של VCA, Filter, Oscillator, Mixer, MAIN L של Drum Machine" },
      "degrader:out:out": { text: "הצליל אחרי הקלקול.", where: "Output, IN L של Reverb, Mixer, Oscilloscope" },
      "wavetable:in:pitch": { text: "מנגן תווים (בהרץ). כשיש כבל, התו הנכנס קובע את הגובה וסליידר ה-Frequency מושבת; Octave ו-Tune עדיין פועלים.", where: "FREQ של המקלדת, PITCH CV של הסיקוונסר, PITCH של Ribbon" },
      "wavetable:in:fm": { text: "מזיז את הגובה למעלה ולמטה סביב התו. LFO נותן ויברטו; אוסילטור אחר נותן צלילים מתכתיים.", where: "LFO OUT, OUT של אוסילטור" },
      "wavetable:in:pos": { text: "מזיז את Position: מ-0 עד 1 עוברים על כל הטבלה (לפי POS Depth). Envelope גורם לכל תו לעבור בין הגלים.", where: "ENV OUT של Envelope, Y של Ribbon" },
      "wavetable:out:out": { text: "הצליל של אוסילטור הוויב-טייבל.", where: "Filter, VCA, Mixer, Output, Oscilloscope" },
      "envelope:in:gate": { text: "מתחיל את המעטפת כשתו מתחיל ומשחרר אותה כשהתו נגמר.", where: "GATE של המקלדת, הסיקוונסר או המצלמה" },
      "envelope:out:env": { text: "הצורה של Attack / Decay / Sustain / Release.", where: "CV של VCA (עוצמת התו), CUT MOD של פילטר (בהירות התו)" },
      "lfo:in:rate": { text: "מאיץ ומאט את ה-LFO.", where: "LFO אחר, X / Y של המצלמה, ENV OUT" },
      "lfo:out:default": { text: "גל איטי שחוזר על עצמו. אפשר להפיל אותו גם על כל סליידר.", where: "CUT MOD של פילטר (וואו), CV של VCA (טרמולו), FM IN של אוסילטור (ויברטו)" },
      "output:in:in": { text: "הולך לרמקולים. מרימים את Master Volume כדי לשמוע.", where: "המודול האחרון בשרשרת: VCA, Reverb, Filter, Mixer" },
      "output:out:out": { text: "עותק של מה שמגיע ל-Output, לפני ה-Master Volume.", where: "Recorder, Oscilloscope" },
      "oscilloscope:in:audio": { text: "משרטט את האות. אין לו יציאה: כדי גם לשמוע, חברו את אותו מקור גם ל-Output.", where: "כל OUT" },
      "ribbon:out:pitch": { text: "התו שמתחת לאצבע או לעיפרון; הקצה השמאלי הוא Base Note.", where: "PITCH של אוסילטור, או כל סליידר" },
      "ribbon:out:gate": { text: "דלוק כל עוד נוגעים ברצועה (נשאר דלוק עם Hold).", where: "GATE IN של Envelope, או CV של VCA" },
      "ribbon:out:y": { text: "כמה גבוה נוגעים בתוך הרצועה, 0 בתחתית, כפול Y / Press Range. אפשר להפיל את הכבל גם על כל סליידר.", where: "CV של VCA, CUT MOD של פילטר, או כל סליידר" },
      "ribbon:out:press": { text: "לחץ העיפרון (עכבר ואצבע נותנים לחץ מלא), כפול Y / Press Range. אפשר להפיל את הכבל גם על כל סליידר.", where: "CV של VCA, CUT MOD של פילטר, או כל סליידר" },
      "drums:in:kick_in": { text: "כל צליל שינוגן בתור הבס-דראם (Kick). חיבור כבל מעביר את Sound של השורה ל-Input: כל צעד פותח לרגע את הצליל הנכנס, לפי Decay (אורך) ו-Tone (בהירות).", where: "OUT של Oscillator, Filter, Granular, Mic" },
      "drums:out:kick_out": { text: "הבס-דראם (Kick) לבד, אחרי ה-Level שלו (בלי ה-Pan).", where: "IN של Mixer, Filter, Reverb, כל אפקט" },
      "drums:out:kick_trig": { text: "פולס קצר (חצי צעד) בכל פעם ששורת הבס-דראם (Kick) מנגנת.", where: "GATE IN של Envelope (כדי לבנות צליל משלכם עם Oscillator, Envelope ו-Filter), CV של VCA" },
      "drums:in:snare_in": { text: "כל צליל שינוגן בתור הסנר (Snare). חיבור כבל מעביר את Sound של השורה ל-Input: כל צעד פותח לרגע את הצליל הנכנס, לפי Decay (אורך) ו-Tone (בהירות).", where: "OUT של Oscillator, Filter, Granular, Mic" },
      "drums:out:snare_out": { text: "הסנר (Snare) לבד, אחרי ה-Level שלו (בלי ה-Pan).", where: "IN של Mixer, Filter, Reverb, כל אפקט" },
      "drums:out:snare_trig": { text: "פולס קצר (חצי צעד) בכל פעם ששורת הסנר (Snare) מנגנת.", where: "GATE IN של Envelope (כדי לבנות צליל משלכם עם Oscillator, Envelope ו-Filter), CV של VCA" },
      "drums:in:hat_in": { text: "כל צליל שינוגן בתור ההיי-האט (Hi-Hat). חיבור כבל מעביר את Sound של השורה ל-Input: כל צעד פותח לרגע את הצליל הנכנס, לפי Decay (אורך) ו-Tone (בהירות).", where: "OUT של Oscillator, Filter, Granular, Mic" },
      "drums:out:hat_out": { text: "ההיי-האט (Hi-Hat) לבד, אחרי ה-Level שלו (בלי ה-Pan).", where: "IN של Mixer, Filter, Reverb, כל אפקט" },
      "drums:out:hat_trig": { text: "פולס קצר (חצי צעד) בכל פעם ששורת ההיי-האט (Hi-Hat) מנגנת.", where: "GATE IN של Envelope (כדי לבנות צליל משלכם עם Oscillator, Envelope ו-Filter), CV של VCA" },
      "drums:in:cym_in": { text: "כל צליל שינוגן בתור המצילה (Cymbal). חיבור כבל מעביר את Sound של השורה ל-Input: כל צעד פותח לרגע את הצליל הנכנס, לפי Decay (אורך) ו-Tone (בהירות).", where: "OUT של Oscillator, Filter, Granular, Mic" },
      "drums:out:cym_out": { text: "המצילה (Cymbal) לבד, אחרי ה-Level שלו (בלי ה-Pan).", where: "IN של Mixer, Filter, Reverb, כל אפקט" },
      "drums:out:cym_trig": { text: "פולס קצר (חצי צעד) בכל פעם ששורת המצילה (Cymbal) מנגנת.", where: "GATE IN של Envelope (כדי לבנות צליל משלכם עם Oscillator, Envelope ו-Filter), CV של VCA" },
      "drums:out:main_l": { text: "ארבעת התופים יחד לפי ה-Pan שלהם, צד שמאל.", where: "IN של Output, Mixer, IN L של Reverb, Recorder" },
      "drums:out:main_r": { text: "ארבעת התופים יחד לפי ה-Pan שלהם, צד ימין.", where: "IN של Output, Mixer, IN R של Reverb" },
      "drums:out:clock": { text: "פולס בכל תו שש-עשרית בזמן הנגינה (בלי Swing), כדי שמודולים אחרים ילכו לפי הקצב.", where: "CLOCK של Stereo Delay (עם Sync דלוק)" },
      "sequencer:out:clock": { text: "פולס בכל צעד (שש-עשרית) בזמן הנגינה, פעיל או לא, כדי שמודולים אחרים ילכו לפי הקצב.", where: "CLOCK של Stereo Delay (עם Sync דלוק)" },
      "delay:in:in_l": { text: "הצליל להדהוד, צד שמאל. אם IN R ריק, הוא נכנס לשני הצדדים.", where: "Oscillator, Filter, VCA, MAIN L של מכונת התופים, Mixer" },
      "delay:in:in_r": { text: "הצליל להדהוד, צד ימין (לא חובה).", where: "MAIN R של מכונת התופים, OUT R של Mixer או Granular" },
      "delay:in:clock": { text: "פולס בכל שש-עשרית. כש-Sync דלוק, ה-Time של כל צד הולך לפי הקצב והחלוקה שלו.", where: "CLOCK של המטרונום, של מכונת התופים או של הסיקוונסר" },
      "delay:out:out_l": { text: "צד שמאל: הצליל המקורי ועוד ההדים שלו (לפי Mix).", where: "IN של Output, IN L של Reverb, Mixer, Recorder" },
      "delay:out:out_r": { text: "צד ימין: הצליל המקורי ועוד ההדים שלו (לפי Mix).", where: "IN של Output, IN R של Reverb, Mixer" },
      "metronome:out:click": { text: "צליל הקליק, אחד בכל פעמה, חזק וגבוה יותר בפעמה הראשונה של התיבה (כש-Accent דלוק).", where: "IN של Output, Mixer, Recorder" },
      "metronome:out:clock": { text: "דפיקה קצרה בכל תו שש-עשרית (ארבע בכל פעמה) כל עוד המטרונום מנגן. משאירה מודולים אחרים בקצב שלו, למשל CLOCK של Stereo Delay, או GATE IN של Envelope לתבנית של שש-עשריות.", where: "CLOCK של Stereo Delay, GATE IN של Envelope, CV של VCA" },
      "recorder:in:in": { text: "הצליל שמוקלט לקובץ WAV.", where: "OUT של VCA, Reverb, Mixer, THRU של Output" },
      "recorder:out:out": { text: "מעביר את הצליל הלאה בלי שינוי.", where: "Output" }
    }
  }

};

// Ready-made patches, loaded from the Recipes and Modules tabs of the manual
window.presetData = {
  // Every preset loads with the Output volume at 0 (app.js). Scopes show what each patch does.
  "demo-oscillator": {
    modules: [
      { id: "osc1", type: "oscillator", x: 100, y: 120, state: { waveform: "sawtooth", frequency: 220 } },
      { id: "scope1", type: "oscilloscope", x: 480, y: 360, state: {} },
      { id: "out1", type: "output", x: 480, y: 120, state: {} }
    ],
    connections: [
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "scope1", toPortInfo: { type: "audio" } }
    ]
  },
  "demo-granular": {
    modules: [
      { id: "osc1", type: "oscillator", x: 60, y: 120, state: { waveform: "triangle", frequency: 220 } },
      { id: "lfo1", type: "lfo", x: 60, y: 420, state: { rate: 0.3, depth: 20 } },
      { id: "gran1", type: "granular", x: 420, y: 120, state: { density: 25, grainSize: 0.12, spray: 0.4, pitch: 1.5 } },
      { id: "scope1", type: "oscilloscope", x: 980, y: 380, state: {} },
      { id: "out1", type: "output", x: 980, y: 120, state: {} }
    ],
    connections: [
      { fromNode: "lfo1", fromPortInfo: { id: "output" }, toNode: "osc1", toPortInfo: { type: "fm" } },
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "gran1", toPortInfo: { type: "in_l" } },
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "gran1", toPortInfo: { type: "in_r" } },
      { fromNode: "gran1", fromPortInfo: { type: "out_l" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "gran1", fromPortInfo: { type: "out_l" }, toNode: "scope1", toPortInfo: { type: "audio" } }
    ]
  },
  "demo-audioinput": {
    modules: [
      { id: "aud1", type: "audio_in", x: 100, y: 120, state: {} },
      { id: "scope1", type: "oscilloscope", x: 480, y: 360, state: {} },
      { id: "out1", type: "output", x: 480, y: 120, state: {} }
    ],
    connections: [
      { fromNode: "aud1", fromPortInfo: { id: "output" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "aud1", fromPortInfo: { id: "output" }, toNode: "scope1", toPortInfo: { type: "audio" } }
    ]
  },
  "demo-filter": {
    modules: [
      { id: "osc1", type: "oscillator", x: 60, y: 120, state: { waveform: "sawtooth", frequency: 110 } },
      { id: "filt1", type: "filter", x: 420, y: 120, state: { frequency: 600, resonance: 8 } },
      { id: "scope1", type: "oscilloscope", x: 800, y: 380, state: {} },
      { id: "out1", type: "output", x: 800, y: 120, state: {} }
    ],
    connections: [
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "filt1", toPortInfo: { type: "audio" } },
      { fromNode: "filt1", fromPortInfo: { id: "output" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "filt1", fromPortInfo: { id: "output" }, toNode: "scope1", toPortInfo: { type: "audio" } }
    ]
  },
  "demo-vca": {
    modules: [
      { id: "osc1", type: "oscillator", x: 60, y: 100, state: { waveform: "sine", frequency: 330 } },
      { id: "lfo1", type: "lfo", x: 60, y: 420, state: { rate: 4, depth: 1 } },
      { id: "vca1", type: "vca", x: 420, y: 220, state: { gain: 0.5 } },
      { id: "scope1", type: "oscilloscope", x: 780, y: 420, state: {} },
      { id: "out1", type: "output", x: 780, y: 160, state: {} }
    ],
    connections: [
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "vca1", toPortInfo: { type: "audio" } },
      { fromNode: "lfo1", fromPortInfo: { id: "output" }, toNode: "vca1", toPortInfo: { type: "cv" } },
      { fromNode: "vca1", fromPortInfo: { type: "audio" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "vca1", fromPortInfo: { type: "audio" }, toNode: "scope1", toPortInfo: { type: "audio" } }
    ]
  },
  "demo-reverb": {
    modules: [
      { id: "seq1", type: "sequencer", x: 40, y: 80, state: { bpm: 90, octaveRange: 1, steps: [
        { active: true, pitch: 0 }, { active: false, pitch: 0 }, { active: true, pitch: 0.5833 }, { active: false, pitch: 0 },
        { active: true, pitch: 0.4167 }, { active: false, pitch: 0 }, { active: true, pitch: 1 }, { active: false, pitch: 0 }
      ] } },
      { id: "osc1", type: "oscillator", x: 40, y: 420, state: { waveform: "triangle" } },
      { id: "env1", type: "envelope", x: 380, y: 420, state: { attack: 0.005, decay: 0.25, sustain: 0, release: 0.2 } },
      { id: "vca1", type: "vca", x: 760, y: 420, state: { gain: 0 } },
      { id: "rev1", type: "reverb", x: 1080, y: 380, state: { mix: 0.5, decay: 4 } },
      { id: "out1", type: "output", x: 1480, y: 380, state: {} },
      { id: "scope1", type: "oscilloscope", x: 1480, y: 620, state: {} }
    ],
    connections: [
      { fromNode: "seq1", fromPortInfo: { type: "pitch" }, toNode: "osc1", toPortInfo: { type: "pitch" } },
      { fromNode: "seq1", fromPortInfo: { type: "gate" }, toNode: "env1", toPortInfo: { type: "gate" } },
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "vca1", toPortInfo: { type: "audio" } },
      { fromNode: "env1", fromPortInfo: { type: "env" }, toNode: "vca1", toPortInfo: { type: "cv" } },
      { fromNode: "vca1", fromPortInfo: { type: "audio" }, toNode: "rev1", toPortInfo: { type: "in_l" } },
      { fromNode: "rev1", fromPortInfo: { type: "out_l" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "rev1", fromPortInfo: { type: "out_l" }, toNode: "scope1", toPortInfo: { type: "audio" } }
    ]
  },
  "demo-wavetable": {
    modules: [
      { id: "seq1", type: "sequencer", x: 40, y: 80, state: { bpm: 100, octaveRange: 1, steps: [
        { active: true, pitch: 0 }, { active: true, pitch: 0.25 }, { active: true, pitch: 0.5833 }, { active: true, pitch: 0.4167 },
        { active: true, pitch: 0 }, { active: true, pitch: 0.5833 }, { active: true, pitch: 1 }, { active: true, pitch: 0.25 }
      ] } },
      { id: "wt1", type: "wavetable", x: 40, y: 420, state: { table: "vocal", position: 50, warp: 15, octave: 1 } },
      { id: "lfo1", type: "lfo", x: 420, y: 80, state: { rate: 0.15, depth: 0.5 } },
      { id: "env1", type: "envelope", x: 420, y: 520, state: { attack: 0.01, decay: 0.35, sustain: 0.4, release: 0.3 } },
      { id: "vca1", type: "vca", x: 800, y: 420, state: { gain: 0 } },
      { id: "rev1", type: "reverb", x: 1120, y: 300, state: {} },
      { id: "out1", type: "output", x: 1460, y: 300, state: {} },
      { id: "scope1", type: "oscilloscope", x: 1460, y: 560, state: {} }
    ],
    connections: [
      { fromNode: "seq1", fromPortInfo: { type: "pitch" }, toNode: "wt1", toPortInfo: { id: "pitch" } },
      { fromNode: "seq1", fromPortInfo: { type: "gate" }, toNode: "env1", toPortInfo: { type: "gate" } },
      { fromNode: "lfo1", fromPortInfo: { id: "output" }, toNode: "wt1", toPortInfo: { id: "knob:#wavetable_p_position_wt1", knob: "#wavetable_p_position_wt1" } },
      { fromNode: "wt1", fromPortInfo: { id: "out" }, toNode: "vca1", toPortInfo: { type: "audio" } },
      { fromNode: "env1", fromPortInfo: { type: "env" }, toNode: "vca1", toPortInfo: { type: "cv" } },
      { fromNode: "vca1", fromPortInfo: { type: "audio" }, toNode: "rev1", toPortInfo: { type: "in_l" } },
      { fromNode: "rev1", fromPortInfo: { type: "out_l" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "wt1", fromPortInfo: { id: "out" }, toNode: "scope1", toPortInfo: { type: "audio" } }
    ]
  },
  "demo-degrader": {
    modules: [
      { id: "seq1", type: "sequencer", x: 40, y: 80, state: { bpm: 110, octaveRange: 1, steps: [
        { active: true, pitch: 0 }, { active: true, pitch: 0.25 }, { active: true, pitch: 0.5833 }, { active: true, pitch: 0.25 },
        { active: true, pitch: 1 }, { active: true, pitch: 0.5833 }, { active: true, pitch: 0.4167 }, { active: false, pitch: 0 }
      ] } },
      { id: "osc1", type: "oscillator", x: 40, y: 420, state: { waveform: "sawtooth" } },
      { id: "env1", type: "envelope", x: 380, y: 420, state: { attack: 0.005, decay: 0.3, sustain: 0.3, release: 0.2 } },
      { id: "vca1", type: "vca", x: 760, y: 420, state: { gain: 0 } },
      { id: "deg1", type: "degrader", x: 1080, y: 420, state: { amount: 55 } },
      { id: "lfo1", type: "lfo", x: 1080, y: 80, state: { rate: 0.1, depth: 0.45 } },
      { id: "out1", type: "output", x: 1400, y: 380, state: {} },
      { id: "scope1", type: "oscilloscope", x: 1400, y: 620, state: {} }
    ],
    connections: [
      { fromNode: "seq1", fromPortInfo: { type: "pitch" }, toNode: "osc1", toPortInfo: { type: "pitch" } },
      { fromNode: "seq1", fromPortInfo: { type: "gate" }, toNode: "env1", toPortInfo: { type: "gate" } },
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "vca1", toPortInfo: { type: "audio" } },
      { fromNode: "env1", fromPortInfo: { type: "env" }, toNode: "vca1", toPortInfo: { type: "cv" } },
      { fromNode: "vca1", fromPortInfo: { type: "audio" }, toNode: "deg1", toPortInfo: { id: "in" } },
      { fromNode: "lfo1", fromPortInfo: { id: "output" }, toNode: "deg1", toPortInfo: { id: "knob:#degrader_p_amount_deg1", knob: "#degrader_p_amount_deg1" } },
      { fromNode: "deg1", fromPortInfo: { id: "out" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "deg1", fromPortInfo: { id: "out" }, toNode: "scope1", toPortInfo: { type: "audio" } }
    ]
  },
  "demo-envelope": {
    modules: [
      { id: "kb1", type: "keyboard", x: 40, y: 100, state: {} },
      { id: "osc1", type: "oscillator", x: 680, y: 40, state: { waveform: "sawtooth" } },
      { id: "env1", type: "envelope", x: 680, y: 380, state: { attack: 0.3, decay: 0.4, sustain: 0.5, release: 0.8 } },
      { id: "vca1", type: "vca", x: 1040, y: 160, state: { gain: 0 } },
      { id: "scope1", type: "oscilloscope", x: 1040, y: 440, state: {} },
      { id: "out1", type: "output", x: 1380, y: 160, state: {} }
    ],
    connections: [
      { fromNode: "kb1", fromPortInfo: { name: "freq" }, toNode: "osc1", toPortInfo: { type: "pitch" } },
      { fromNode: "kb1", fromPortInfo: { name: "gate" }, toNode: "env1", toPortInfo: { type: "gate" } },
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "vca1", toPortInfo: { type: "audio" } },
      { fromNode: "env1", fromPortInfo: { type: "env" }, toNode: "vca1", toPortInfo: { type: "cv" } },
      { fromNode: "env1", fromPortInfo: { type: "env" }, toNode: "scope1", toPortInfo: { type: "audio" } },
      { fromNode: "vca1", fromPortInfo: { type: "audio" }, toNode: "out1", toPortInfo: { type: "in" } }
    ]
  },
  "demo-lfo": {
    modules: [
      { id: "osc1", type: "oscillator", x: 60, y: 80, state: { waveform: "sawtooth", frequency: 110 } },
      { id: "lfo1", type: "lfo", x: 60, y: 400, state: { rate: 1, depth: 1 } },
      { id: "filt1", type: "filter", x: 420, y: 160, state: { frequency: 800, resonance: 6, modDepth: 300 } },
      { id: "scope1", type: "oscilloscope", x: 420, y: 520, state: {} },
      { id: "out1", type: "output", x: 800, y: 160, state: {} }
    ],
    connections: [
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "filt1", toPortInfo: { type: "audio" } },
      { fromNode: "lfo1", fromPortInfo: { id: "output" }, toNode: "filt1", toPortInfo: { type: "cutoff" } },
      { fromNode: "lfo1", fromPortInfo: { id: "output" }, toNode: "scope1", toPortInfo: { type: "audio" } },
      { fromNode: "filt1", fromPortInfo: { id: "output" }, toNode: "out1", toPortInfo: { type: "in" } }
    ]
  },
  "demo-webcam": {
    modules: [
      { id: "cam1", type: "webcam", x: 60, y: 100, state: {} },
      { id: "osc1", type: "oscillator", x: 460, y: 100, state: { waveform: "triangle", frequency: 220 } },
      { id: "scope1", type: "oscilloscope", x: 820, y: 360, state: {} },
      { id: "out1", type: "output", x: 820, y: 100, state: {} }
    ],
    connections: [
      { fromNode: "cam1", fromPortInfo: { id: "out_x" }, toNode: "osc1", toPortInfo: { type: "fm" } },
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "scope1", toPortInfo: { type: "audio" } }
    ]
  },
  "demo-keyboard": {
    modules: [
      { id: "kb1", type: "keyboard", x: 40, y: 100, state: {} },
      { id: "osc1", type: "oscillator", x: 680, y: 60, state: { waveform: "square" } },
      { id: "vca1", type: "vca", x: 1040, y: 100, state: { gain: 0 } },
      { id: "scope1", type: "oscilloscope", x: 1040, y: 380, state: {} },
      { id: "out1", type: "output", x: 1380, y: 100, state: {} }
    ],
    connections: [
      { fromNode: "kb1", fromPortInfo: { name: "freq" }, toNode: "osc1", toPortInfo: { type: "pitch" } },
      { fromNode: "kb1", fromPortInfo: { name: "gate" }, toNode: "vca1", toPortInfo: { type: "cv" } },
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "vca1", toPortInfo: { type: "audio" } },
      { fromNode: "vca1", fromPortInfo: { type: "audio" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "vca1", fromPortInfo: { type: "audio" }, toNode: "scope1", toPortInfo: { type: "audio" } }
    ]
  },
  "demo-sequencer": {
    modules: [
      { id: "seq1", type: "sequencer", x: 40, y: 80, state: { bpm: 110, octaveRange: 1, steps: [
        { active: true, pitch: 0 }, { active: true, pitch: 0.25 }, { active: true, pitch: 0.4167 }, { active: true, pitch: 0.5833 }
      ] } },
      { id: "osc1", type: "oscillator", x: 40, y: 420, state: { waveform: "square" } },
      { id: "vca1", type: "vca", x: 420, y: 420, state: { gain: 0 } },
      { id: "scope1", type: "oscilloscope", x: 780, y: 620, state: {} },
      { id: "out1", type: "output", x: 780, y: 420, state: {} }
    ],
    connections: [
      { fromNode: "seq1", fromPortInfo: { type: "pitch" }, toNode: "osc1", toPortInfo: { type: "pitch" } },
      { fromNode: "seq1", fromPortInfo: { type: "gate" }, toNode: "vca1", toPortInfo: { type: "cv" } },
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "vca1", toPortInfo: { type: "audio" } },
      { fromNode: "vca1", fromPortInfo: { type: "audio" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "vca1", fromPortInfo: { type: "audio" }, toNode: "scope1", toPortInfo: { type: "audio" } }
    ]
  },
  "demo-mixer": {
    modules: [
      { id: "osc1", type: "oscillator", x: 60, y: 60, state: { waveform: "sawtooth", frequency: 220 } },
      { id: "osc2", type: "oscillator", x: 60, y: 360, state: { waveform: "sine", frequency: 330 } },
      { id: "mix1", type: "mixer", x: 420, y: 160, state: { channels: { "1": { volumeValue: 0.6, panValue: -0.5 }, "2": { volumeValue: 0.8, panValue: 0.5 } } } },
      { id: "scope1", type: "oscilloscope", x: 900, y: 400, state: {} },
      { id: "out1", type: "output", x: 900, y: 160, state: {} }
    ],
    connections: [
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "mix1", toPortInfo: { channel: "1", type: "ch_in_1" } },
      { fromNode: "osc2", fromPortInfo: { id: "output" }, toNode: "mix1", toPortInfo: { channel: "2", type: "ch_in_2" } },
      { fromNode: "mix1", fromPortInfo: { type: "out_l" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "mix1", fromPortInfo: { type: "out_l" }, toNode: "scope1", toPortInfo: { type: "audio" } }
    ]
  },
  "demo-oscilloscope": {
    modules: [
      { id: "osc1", type: "oscillator", x: 100, y: 150, state: { waveform: "sawtooth" } },
      { id: "scope1", type: "oscilloscope", x: 480, y: 150, state: {} },
      { id: "out1", type: "output", x: 880, y: 150, state: {} }
    ],
    connections: [
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "scope1", toPortInfo: { type: "audio" } },
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "out1", toPortInfo: { type: "in" } }
    ]
  },
  "demo-ribbon": {
    modules: [
      { id: "rib1", type: "ribbon", x: 40, y: 80, state: { base: 48, range: 2, glide: 40, cvRange: 1, snap: false, hold: false } },
      { id: "osc1", type: "oscillator", x: 40, y: 600, state: { waveform: "sawtooth" } },
      { id: "env1", type: "envelope", x: 420, y: 80, state: { attack: 0.01, decay: 0.2, sustain: 0.8, release: 0.4 } },
      { id: "flt1", type: "filter", x: 420, y: 420, state: { type: "lowpass", frequency: 600, resonance: 6, modDepth: 2400 } },
      { id: "vca1", type: "vca", x: 780, y: 80, state: { gain: 0 } },
      { id: "scope1", type: "oscilloscope", x: 1120, y: 380, state: {} },
      { id: "out1", type: "output", x: 1120, y: 80, state: {} }
    ],
    connections: [
      { fromNode: "rib1", fromPortInfo: { id: "pitch" }, toNode: "osc1", toPortInfo: { type: "pitch" } },
      { fromNode: "rib1", fromPortInfo: { id: "gate" }, toNode: "env1", toPortInfo: { type: "gate" } },
      { fromNode: "rib1", fromPortInfo: { id: "y" }, toNode: "flt1", toPortInfo: { type: "cutoff" } },
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "flt1", toPortInfo: { type: "audio" } },
      { fromNode: "flt1", fromPortInfo: { type: "output" }, toNode: "vca1", toPortInfo: { type: "audio" } },
      { fromNode: "env1", fromPortInfo: { type: "env" }, toNode: "vca1", toPortInfo: { type: "cv" } },
      { fromNode: "vca1", fromPortInfo: { type: "audio" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "vca1", fromPortInfo: { type: "audio" }, toNode: "scope1", toPortInfo: { type: "audio" } }
    ]
  },
  "demo-delay": {
    modules: [
      { id: "dm1", type: "drums", x: 40, y: 80, state: { tempo: 96, bars: 1, rows: [
        { sound: "kick808", steps: "2000000000200000" },
        { sound: "rim", steps: "0000100000001000" },
        { sound: "hat808c", steps: "0000000000000000" },
        { sound: "cowbell", steps: "0000000100000000" }
      ] } },
      { id: "dl1", type: "delay", x: 860, y: 80, state: { L: { fb: 45, tone: 55, level: 100, mix: 45, rev: false, div: "3" }, R: { fb: 45, tone: 55, level: 100, mix: 45, rev: false, div: "4" }, pingpong: false, sync: true } },
      { id: "out1", type: "output", x: 1380, y: 80, state: {} }
    ],
    connections: [
      { fromNode: "dm1", fromPortInfo: { id: "main_l" }, toNode: "dl1", toPortInfo: { id: "in_l" } },
      { fromNode: "dm1", fromPortInfo: { id: "clock" }, toNode: "dl1", toPortInfo: { id: "clock" } },
      { fromNode: "dl1", fromPortInfo: { id: "out_l" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "dl1", fromPortInfo: { id: "out_r" }, toNode: "out1", toPortInfo: { type: "in" } }
    ]
  },
  "demo-drums": {
    modules: [
      { id: "dm1", type: "drums", x: 40, y: 80, state: { tempo: 100, swing: 20, bars: 1, rows: [
        { sound: "kick808", steps: "2000001000200000" },
        { sound: "clap", steps: "0000200000002001" },
        { sound: "hat808c", steps: "1010101210101012" },
        { sound: "cowbell", steps: "0000000000000100" }
      ] } },
      { id: "rev1", type: "reverb", x: 860, y: 80, state: { mix: 0.15 } },
      { id: "scope1", type: "oscilloscope", x: 1200, y: 380, state: {} },
      { id: "out1", type: "output", x: 1200, y: 80, state: {} }
    ],
    connections: [
      { fromNode: "dm1", fromPortInfo: { id: "main_l" }, toNode: "rev1", toPortInfo: { type: "in_l" } },
      { fromNode: "rev1", fromPortInfo: { type: "out_l" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "dm1", fromPortInfo: { id: "main_l" }, toNode: "scope1", toPortInfo: { type: "audio" } }
    ]
  },
  "demo-metronome": {
    modules: [
      { id: "met1", type: "metronome", x: 40, y: 80, state: { tempo: 96, beats: 4, sound: "wood", volume: 70, accent: true } },
      { id: "osc1", type: "oscillator", x: 40, y: 520, state: { waveform: "triangle", frequency: 330 } },
      { id: "env1", type: "envelope", x: 380, y: 80, state: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.05 } },
      { id: "vca1", type: "vca", x: 380, y: 460, state: { gain: 0 } },
      { id: "scope1", type: "oscilloscope", x: 720, y: 380, state: {} },
      { id: "out1", type: "output", x: 720, y: 80, state: {} }
    ],
    connections: [
      { fromNode: "met1", fromPortInfo: { id: "click" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "met1", fromPortInfo: { id: "clock" }, toNode: "env1", toPortInfo: { type: "gate" } },
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "vca1", toPortInfo: { type: "audio" } },
      { fromNode: "env1", fromPortInfo: { type: "env" }, toNode: "vca1", toPortInfo: { type: "cv" } },
      { fromNode: "vca1", fromPortInfo: { type: "audio" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "met1", fromPortInfo: { id: "clock" }, toNode: "scope1", toPortInfo: { type: "audio" } }
    ]
  },
  "demo-recorder": {
    modules: [
      { id: "osc1", type: "oscillator", x: 100, y: 150, state: { waveform: "triangle", frequency: 440 } },
      { id: "rec1", type: "recorder", x: 480, y: 150, state: {} },
      { id: "out1", type: "output", x: 860, y: 150, state: {} }
    ],
    connections: [
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "rec1", toPortInfo: { id: "in" } },
      { fromNode: "rec1", fromPortInfo: { id: "out" }, toNode: "out1", toPortInfo: { type: "in" } }
    ]
  },
  "demo-output": {
    modules: [
      { id: "osc1", type: "oscillator", x: 100, y: 150, state: { waveform: "sine", frequency: 261.63 } },
      { id: "out1", type: "output", x: 500, y: 150, state: {} }
    ],
    connections: [{ fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "out1", toPortInfo: { type: "in" } }]
  },

  "classic-mono": {
    modules: [
      { id: "kb1", type: "keyboard", x: 40, y: 100, state: {} },
      { id: "osc1", type: "oscillator", x: 680, y: 40, state: { waveform: "sawtooth" } },
      { id: "env1", type: "envelope", x: 680, y: 380, state: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.4 } },
      { id: "filt1", type: "filter", x: 1040, y: 40, state: { frequency: 900, resonance: 4 } },
      { id: "vca1", type: "vca", x: 1040, y: 400, state: { gain: 0 } },
      { id: "scope1", type: "oscilloscope", x: 1400, y: 400, state: {} },
      { id: "out1", type: "output", x: 1400, y: 120, state: {} }
    ],
    connections: [
      { fromNode: "kb1", fromPortInfo: { name: "freq" }, toNode: "osc1", toPortInfo: { type: "pitch" } },
      { fromNode: "kb1", fromPortInfo: { name: "gate" }, toNode: "env1", toPortInfo: { type: "gate" } },
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "filt1", toPortInfo: { type: "audio" } },
      { fromNode: "filt1", fromPortInfo: { id: "output" }, toNode: "vca1", toPortInfo: { type: "audio" } },
      { fromNode: "env1", fromPortInfo: { type: "env" }, toNode: "vca1", toPortInfo: { type: "cv" } },
      { fromNode: "vca1", fromPortInfo: { type: "audio" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "vca1", fromPortInfo: { type: "audio" }, toNode: "scope1", toPortInfo: { type: "audio" } }
    ]
  },
  "ambient-drone": {
    modules: [
      { id: "osc1", type: "oscillator", x: 40, y: 60, state: { waveform: "triangle", frequency: 110 } },
      { id: "gran1", type: "granular", x: 380, y: 60, state: { density: 30, grainSize: 0.25, spray: 0.6, pitch: 2 } },
      { id: "lfo1", type: "lfo", x: 40, y: 400, state: { rate: 0.2, depth: 1 } },
      { id: "filt1", type: "filter", x: 940, y: 60, state: { frequency: 1200, resonance: 3, modDepth: 400 } },
      { id: "rev1", type: "reverb", x: 940, y: 400, state: { mix: 0.6, decay: 6 } },
      { id: "scope1", type: "oscilloscope", x: 1340, y: 420, state: {} },
      { id: "out1", type: "output", x: 1340, y: 160, state: {} }
    ],
    connections: [
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "gran1", toPortInfo: { type: "in_l" } },
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "gran1", toPortInfo: { type: "in_r" } },
      { fromNode: "gran1", fromPortInfo: { type: "out_l" }, toNode: "filt1", toPortInfo: { type: "audio" } },
      { fromNode: "lfo1", fromPortInfo: { id: "output" }, toNode: "filt1", toPortInfo: { type: "cutoff" } },
      { fromNode: "filt1", fromPortInfo: { id: "output" }, toNode: "rev1", toPortInfo: { type: "in_l" } },
      { fromNode: "rev1", fromPortInfo: { type: "out_l" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "rev1", fromPortInfo: { type: "out_l" }, toNode: "scope1", toPortInfo: { type: "audio" } }
    ]
  },
  "seq-groove": {
    modules: [
      { id: "seq1", type: "sequencer", x: 40, y: 60, state: { bpm: 120, octaveRange: 1, steps: [
        { active: true, pitch: 0 }, { active: true, pitch: 0 }, { active: true, pitch: 1 }, { active: true, pitch: 0.5833 },
        { active: true, pitch: 0.8333 }, { active: false, pitch: 0 }, { active: true, pitch: 0.25 }, { active: true, pitch: 0.4167 }
      ] } },
      { id: "osc1", type: "oscillator", x: 40, y: 420, state: { waveform: "square" } },
      { id: "env1", type: "envelope", x: 380, y: 420, state: { attack: 0.005, decay: 0.15, sustain: 0.2, release: 0.1 } },
      { id: "filt1", type: "filter", x: 760, y: 380, state: { frequency: 400, resonance: 7, modDepth: 2500 } },
      { id: "vca1", type: "vca", x: 1120, y: 380, state: { gain: 0 } },
      { id: "scope1", type: "oscilloscope", x: 1460, y: 620, state: {} },
      { id: "out1", type: "output", x: 1460, y: 380, state: {} }
    ],
    connections: [
      { fromNode: "seq1", fromPortInfo: { type: "pitch" }, toNode: "osc1", toPortInfo: { type: "pitch" } },
      { fromNode: "seq1", fromPortInfo: { type: "gate" }, toNode: "env1", toPortInfo: { type: "gate" } },
      { fromNode: "osc1", fromPortInfo: { id: "output" }, toNode: "filt1", toPortInfo: { type: "audio" } },
      { fromNode: "env1", fromPortInfo: { type: "env" }, toNode: "filt1", toPortInfo: { type: "cutoff" } },
      { fromNode: "env1", fromPortInfo: { type: "env" }, toNode: "vca1", toPortInfo: { type: "cv" } },
      { fromNode: "filt1", fromPortInfo: { id: "output" }, toNode: "vca1", toPortInfo: { type: "audio" } },
      { fromNode: "vca1", fromPortInfo: { type: "audio" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "vca1", fromPortInfo: { type: "audio" }, toNode: "scope1", toPortInfo: { type: "audio" } }
    ]
  },
  "ext-processing": {
    modules: [
      { id: "audin1", type: "audio_in", x: 60, y: 120, state: {} },
      { id: "filt1", type: "filter", x: 420, y: 120, state: { frequency: 1200, resonance: 2 } },
      { id: "rev1", type: "reverb", x: 780, y: 120, state: { mix: 0.4, decay: 2 } },
      { id: "scope1", type: "oscilloscope", x: 1180, y: 380, state: {} },
      { id: "out1", type: "output", x: 1180, y: 120, state: {} }
    ],
    connections: [
      { fromNode: "audin1", fromPortInfo: { id: "output" }, toNode: "filt1", toPortInfo: { type: "audio" } },
      { fromNode: "filt1", fromPortInfo: { id: "output" }, toNode: "rev1", toPortInfo: { type: "in_l" } },
      { fromNode: "rev1", fromPortInfo: { type: "out_l" }, toNode: "out1", toPortInfo: { type: "in" } },
      { fromNode: "rev1", fromPortInfo: { type: "out_l" }, toNode: "scope1", toPortInfo: { type: "audio" } }
    ]
  }
};
