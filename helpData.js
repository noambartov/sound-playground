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
      newModule: "This module is new. Its manual page is coming soon; the jack list below is already up to date.",
      groups: { sources: "Sound sources", controllers: "Controllers", processors: "Processors and effects", modulation: "Modulation", output: "Output and monitoring", other: "New modules" }
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
        controls: ["Play / Stop.", "Direction: forward, backward, back-and-forth, random.", "Tempo: speed in BPM. Octave: how wide the step sliders reach.", "+ Step / - Step: more or fewer steps.", "Each step: ON / OFF and a pitch slider."],
        tips: ["PITCH CV to Oscillator PITCH, GATE to an Envelope or a VCA CV."] },
      { type: "webcam", group: "controllers", name: "Webcam Controller", preset: "demo-webcam",
        summary: "Turns movement in front of your camera into control signals.",
        controls: ["Start Camera.", "Sens (Thresh): how much movement counts.", "Smoothing: calmer or faster response.", "CV Depth (Hz): how strong the X / Y outputs are."],
        tips: ["X CV into an Oscillator FM IN: move your hand left and right to change the pitch."] },
      { type: "ribbon", group: "controllers", name: "Ribbon", preset: "",
        summary: "A rainbow strip you play by sliding a mouse, a finger or the iPad pencil along it.",
        controls: ["Left to right sets the pitch. The Note readout shows the note you are on.", "Base Note: the note at the left end. Range: how many octaves the strip covers.", "Glide: how smoothly the pitch slides between positions.", "Snap: On jumps to whole notes, Off slides freely.", "Hold: On keeps the gate open after you lift your finger.", "Y / Press Range: how strong the Y and PRESS outputs are (x1 for a VCA, around x1000 for a Filter CUT MOD)."],
        tips: ["PITCH to Oscillator PITCH and GATE to Envelope GATE IN: a playable synth you slide on.", "Y and PRESS cables can be dropped on any slider, like the LFO: touch higher or press harder to move it."] },
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
      newModule: "זה מודול חדש. העמוד שלו בספר יגיע בקרוב; רשימת השקעים למטה כבר מעודכנת.",
      groups: { sources: "מקורות צליל", controllers: "בקרים", processors: "מעבדים ואפקטים", modulation: "אפנון", output: "יציאה וניטור", other: "מודולים חדשים" }
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
        controls: ["Play / Stop.", "כיוון: קדימה, אחורה, הלוך-חזור, אקראי.", "Tempo: מהירות ב-BPM. Octave: כמה רחוק מגיעים סליידרי הצעדים.", "+ Step / - Step: יותר או פחות צעדים.", "לכל צעד: ON / OFF וסליידר גובה."],
        tips: ["PITCH CV אל PITCH של האוסילטור, GATE אל Envelope או אל CV של VCA."] },
      { type: "webcam", group: "controllers", name: "Webcam Controller", preset: "demo-webcam",
        summary: "הופך תנועה מול המצלמה לאותות שליטה.",
        controls: ["Start Camera.", "Sens (Thresh): כמה תנועה נחשבת.", "Smoothing: תגובה רגועה או מהירה.", "CV Depth (Hz): כמה חזקות יציאות X / Y."],
        tips: ["X CV אל FM IN של האוסילטור: מזיזים יד ימינה ושמאלה ומשנים את הגובה."] },
      { type: "ribbon", group: "controllers", name: "Ribbon", preset: "",
        summary: "רצועה בצבעי קשת שמנגנים עליה בהחלקה של עכבר, אצבע או העיפרון של האייפד.",
        controls: ["משמאל לימין קובע את גובה הצליל. התצוגה Note מראה על איזה תו אתם.", "Base Note: התו בקצה השמאלי. Range: כמה אוקטבות הרצועה מכסה.", "Glide: כמה חלק הגובה מחליק בין מקומות.", "Snap: במצב On קופץ לתווים שלמים, במצב Off מחליק חופשי.", "Hold: במצב On ה-Gate נשאר פתוח גם אחרי שמרימים את האצבע.", "Y / Press Range: כמה חזקות היציאות Y ו-PRESS (x1 ל-VCA, בערך x1000 ל-CUT MOD של פילטר)."],
        tips: ["PITCH אל PITCH של האוסילטור ו-GATE אל GATE IN של ה-Envelope: סינתסייזר שמנגנים עליו בהחלקה.", "את הכבלים מ-Y ומ-PRESS אפשר להפיל על כל סליידר, כמו ה-LFO: נגיעה גבוהה יותר או לחיצה חזקה יותר מזיזה אותו."] },
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
