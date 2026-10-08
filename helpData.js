// helpData.js - מודולים מרווחים + הנחיות חיווט מפורטות לכל פורט
window.helpData = {
  he: {
    title: "Sound Playground - ספר ההפעלה והמדריך המלא",
    searchPlaceholder: "חפש מודול, כבל, כניסה או פריסט...",
    tabs: {
      basics: "1. תפעול הממשק",
      eurorack: "2. יסודות הסינתזה",
      modules: "3. ספר 15 המודולים",
      patches: "4. פריסטים ותקלות"
    },
    sections: {
      basics: `
        <div class="help-section">
          <h3>1. מדריך תפעול הממשק</h3>
          
          <div class="help-card">
            <h4>תנועה במרחב (Navigation)</h4>
            <ul class="help-list">
              <li><strong>הזזת המשטח (Pan):</strong> לחצו ממושך על <kbd>Space</kbd> או <kbd>Ctrl/Cmd</kbd> וגררו את העכבר.</li>
              <li><strong>זום (Zoom):</strong> סובבו את גלגלת העכבר או השתמשו בכפתורי <kbd>+</kbd> ו-<kbd>-</kbd> בסרגל העליון.</li>
              <li><strong>איפוס תצוגה:</strong> לחיצה על כפתור ה-<strong>100%</strong> מחזירה למרכז.</li>
            </ul>
          </div>

          <div class="help-card">
            <h4>ניהול מודולים</h4>
            <ul class="help-list">
              <li><strong>הוספת מודול:</strong> לחצו על המודול בסרגל הצדי ליצירתו במרכז המסך.</li>
              <li><strong>הזזה:</strong> גררו את כותרת המודול לכל מקום בקנבס.</li>
              <li><strong>מחיקה:</strong> לחצו על כפתור <kbd>X</kbd> בכותרת או על מקש <kbd>Delete</kbd>.</li>
            </ul>
          </div>

          <div class="help-card">
            <h4>מנגנון הכבלים</h4>
            <ul class="help-list">
              <li><strong>יצירת חיבור:</strong> גררו כבל מפורט יציאה <span class="tag tag-out">OUT</span> לפורט כניסה <span class="tag tag-in">IN</span>.</li>
              <li><strong>צבעי האותות:</strong>
                <span class="tag tag-audio">Audio</span> | 
                <span class="tag tag-gate">Gate</span> | 
                <span class="tag tag-cv">CV</span>
              </li>
              <li><strong>ניתוק כבל:</strong> לחיצה בודדת על הכבל המתוח תנתק אותו.</li>
            </ul>
          </div>
        </div>
      `,
      eurorack: `
        <div class="help-section">
          <h3>2. יסודות הסינתזה המודולרית (Eurorack 101)</h3>
          
          <div class="help-card">
            <h4>מהי סינתזה מודולרית?</h4>
            <p>בסינתסייזר רגיל המנגנון מחווט מראש. בסינתזה מודולרית אתם אלו שקובעים את מסלול האות מאפס באמצעות חיבור כבלים בין מודולים עצמאיים.</p>
          </div>

          <div class="help-card">
            <h4>שלושת סוגי האותות במערכת</h4>
            <ul class="help-list">
              <li><span class="tag tag-audio">Audio Signal</span> <strong>אות שמע:</strong> תדרים נשמעים הזורמים ממחוללי צליל דרך אפקטים ליציאה.</li>
              <li><span class="tag tag-gate">Gate / Trigger</span> <strong>אות תזמון:</strong> פולסים של הפעלה/כיבוי שמפעילים מעטפות וסיקוונסרים.</li>
              <li><span class="tag tag-cv">Control Voltage (CV)</span> <strong>מתח שליטה:</strong> אותות המשתנים בזמן אמת לאפנון פרמטרים.</li>
            </ul>
          </div>
        </div>
      `,
      modules: `
        <div class="help-section">
          <h3>3. ספר 15 המודולים המלא והנחיות חיווט</h3>
          <div class="modules-grid">
            
            <div class="module-card">
              <div class="mod-header"><span>1. Oscillator (VCO)</span> <span class="mod-badge">Sound Source</span></div>
              <p>מחולל תדרים בסיסי המפיק גלי קול (Sine, Square, Sawtooth, Triangle).</p>
              <div class="io-grid">
                <div><strong>כניסות (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-cv">Pitch CV</span>: מאיפה? מ-Pitch OUT של מקלדת או סיקוונסר.</li>
                    <li><span class="tag tag-cv">FM IN</span>: מאיפה? מיציאת LFO או VCO אחר לאפנון תדר.</li>
                  </ul>
                </div>
                <div><strong>יציאות (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio OUT</span>: לאן? ל-Audio IN של פילטר, VCA, אפקט, או Output.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-oscillator">▶ הרץ פאץ' הדגמה</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>2. Granular Cloud</span> <span class="mod-badge">Sound Source / FX</span></div>
              <p>מנוע גראנולרי המפרק דגימת קול לפרגמנטים זעירים ליצירת ענני סאונד.</p>
              <div class="io-grid">
                <div><strong>כניסות (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio IN</span>: מאיפה? מ-Audio Input, VCO, או Mixer.</li>
                    <li><span class="tag tag-cv">Density CV</span>: מאיפה? מ-CV OUT של LFO או Webcam.</li>
                  </ul>
                </div>
                <div><strong>יציאות (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio OUT</span>: לאן? ל-Filter, Reverb, VCA, או Output.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-granular">▶ הרץ פאץ' הדגמה</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>3. Audio Input</span> <span class="mod-badge">External Input</span></div>
              <p>מדגום שמע חיצוני מהמיקרופון או כרטיס הקול בזמן אמת.</p>
              <div class="io-grid">
                <div><strong>כניסות (IN):</strong> מיקרופון מחשב / כרטיס קול</div>
                <div><strong>יציאות (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio OUT</span>: לאן? ל-Filter, Granular Cloud, Reverb, או Output.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-audioinput">▶ הרץ פאץ' הדגמה</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>4. Filter (VCF)</span> <span class="mod-badge">Processor</span></div>
              <p>מסנן תדרים (Lowpass / Highpass / Bandpass) לעיצוב גוון הסאונד.</p>
              <div class="io-grid">
                <div><strong>כניסות (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio IN</span>: מאיפה? מ-VCO, Granular, Audio Input, או Mixer.</li>
                    <li><span class="tag tag-cv">Cutoff CV</span>: מאיפה? מ-Envelope CV, LFO, או Webcam CV.</li>
                  </ul>
                </div>
                <div><strong>יציאות (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio OUT</span>: לאן? ל-VCA, Reverb, Oscilloscope, או Output.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-filter">▶ הרץ פאץ' הדגמה</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>5. VCA (Amplifier)</span> <span class="mod-badge">Processor</span></div>
              <p>מגבר מבוקר מתח הקובע את עוצמת השמע לפי אות CV שנכנס אליו.</p>
              <div class="io-grid">
                <div><strong>כניסות (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio IN</span>: מאיפה? מ-VCO, Filter, או FX.</li>
                    <li><span class="tag tag-cv">CV Control</span>: מאיפה? מ-Envelope CV OUT, LFO, או Webcam.</li>
                  </ul>
                </div>
                <div><strong>יציאות (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio OUT</span>: לאן? ל-Reverb, Mixer, Recorder, או Output.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-vca">▶ הרץ פאץ' הדגמה</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>6. Reverb</span> <span class="mod-badge">Effect</span></div>
              <p>אפקט מהדהד המדמה חלל אקוסטי, אולם או מערה.</p>
              <div class="io-grid">
                <div><strong>כניסות (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio IN</span>: מאיפה? מ-VCA, Filter, Mixer, או VCO.</li>
                  </ul>
                </div>
                <div><strong>יציאות (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio OUT</span>: לאן? ל-Output, Recorder, או Oscilloscope.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-reverb">▶ הרץ פאץ' הדגמה</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>7. Envelope Generator</span> <span class="mod-badge">Modulator</span></div>
              <p>מחולל מעטפת 4 שלבים (Attack, Decay, Sustain, Release).</p>
              <div class="io-grid">
                <div><strong>כניסות (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-gate">Gate IN</span>: מאיפה? מ-Gate OUT של מקלדת או סיקוונסר.</li>
                  </ul>
                </div>
                <div><strong>יציאות (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-cv">CV OUT</span>: לאן? ל-CV Control ב-VCA או Cutoff CV בפילטר.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-envelope">▶ הרץ פאץ' הדגמה</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>8. LFO</span> <span class="mod-badge">Modulator</span></div>
              <p>מתנד תדר נמוך היוצר תנודות מחזוריות לאפקטי Tremolo ו-Vibrato.</p>
              <div class="io-grid">
                <div><strong>כניסות (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-cv">Rate CV</span>: מאיפה? מ-Webcam CV או LFO אחר.</li>
                  </ul>
                </div>
                <div><strong>יציאות (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-cv">CV OUT</span>: לאן? ל-Cutoff CV, Pitch CV, או VCA CV.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-lfo">▶ הרץ פאץ' הדגמה</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>9. Webcam Controller</span> <span class="mod-badge">Modulator</span></div>
              <p>מתרגם תנועה אל מול המצלמה למתח שליטה (CV) אינטראקטיבי.</p>
              <div class="io-grid">
                <div><strong>כניסות (IN):</strong> וידאו מצלמה</div>
                <div><strong>יציאות (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-cv">CV OUT</span>: לאן? ל-Pitch CV ב-VCO, Cutoff CV בפילטר, או VCA.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-webcam">▶ הרץ פאץ' הדגמה</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>10. Keyboard</span> <span class="mod-badge">Controller</span></div>
              <p>מקלדת נגינה וירטואלית להפקת תווים ואותות שליטה.</p>
              <div class="io-grid">
                <div><strong>כניסות (IN):</strong> מקלדת/עכבר</div>
                <div><strong>יציאות (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-cv">Pitch CV</span>: לאן? ל-Pitch CV ב-VCO.</li>
                    <li><span class="tag tag-gate">Gate OUT</span>: לאן? ל-Gate IN ב-Envelope (מעטפת).</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-keyboard">▶ הרץ פאץ' הדגמה</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>11. Sequencer</span> <span class="mod-badge">Controller</span></div>
              <p>מחולל תבניות מקצב ותווים מחזוריים אוטומטי.</p>
              <div class="io-grid">
                <div><strong>כניסות (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-gate">Clock IN</span>: מאיפה? מ-Gate OUT של סיקוונסר/קבועה.</li>
                  </ul>
                </div>
                <div><strong>יציאות (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-cv">Pitch CV</span>: לאן? ל-Pitch CV ב-VCO.</li>
                    <li><span class="tag tag-gate">Gate OUT</span>: לאן? ל-Gate IN במעטפת.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-sequencer">▶ הרץ פאץ' הדגמה</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>12. Mixer</span> <span class="mod-badge">Utility</span></div>
              <p>ממזג מספר ערוצי שמע או CV לערוץ יציאה יחיד.</p>
              <div class="io-grid">
                <div><strong>כניסות (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">IN 1 - 4</span>: מאיפה? מיציאות VCOs, אפקטים, או דגימות.</li>
                  </ul>
                </div>
                <div><strong>יציאות (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Master OUT</span>: לאן? ל-Filter, VCA, Reverb, או Output.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-mixer">▶ הרץ פאץ' הדגמה</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>13. Oscilloscope</span> <span class="mod-badge">Utility</span></div>
              <p>מסך ניטור ויזואלי המציג את צורת הגל בזמן אמת.</p>
              <div class="io-grid">
                <div><strong>כניסות (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Signal IN</span>: מאיפה? מכל יציאת Audio או CV.</li>
                  </ul>
                </div>
                <div><strong>יציאות (OUT):</strong> 
                  <ul>
                    <li>אין יציאה. כדי גם לשמוע את הצליל, חברו את אותו מקור גם ל-Output (מיציאה אחת אפשר למשוך כמה כבלים).</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-oscilloscope">▶ הרץ פאץ' הדגמה</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>14. Recorder</span> <span class="mod-badge">Utility</span></div>
              <p>מקליט את יציאת הסאונד הראשית ומאפשר הורדת קובץ אודיו.</p>
              <div class="io-grid">
                <div><strong>כניסות (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio IN</span>: מאיפה? מ-VCA, Reverb, Mixer, או Output.</li>
                  </ul>
                </div>
                <div><strong>יציאות (OUT):</strong> הורדת קובץ WAV מוקלט</div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-recorder">▶ הרץ פאץ' הדגמה</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>15. Output Module</span> <span class="mod-badge">Master Output</span></div>
              <p>רכיב היציאה הסופי המקשר בין הסינתסייזר לרמקולים של המחשב.</p>
              <div class="io-grid">
                <div><strong>כניסות (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Master Audio IN</span>: מאיפה? מהיציאה האחרונה בשרשרת (VCA, FX, Mixer).</li>
                  </ul>
                </div>
                <div><strong>יציאות (OUT):</strong> לרמקולים/אוזניות של המחשב</div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-output">▶ הרץ פאץ' הדגמה</button>
            </div>

          </div>
        </div>
      `,
      patches: `
        <div class="help-section">
          <h3>4. פריסטים ראשיים ופתרון תקלות</h3>
          
          <div class="help-card">
            <h4>4 פריסטים מובנים מלאים</h4>
            <div class="preset-grid">
              <button class="tool-btn preset-btn" data-preset="classic-mono">1. Classic Monophonic Synth</button>
              <button class="tool-btn preset-btn" data-preset="ambient-drone">2. Generative Ambient Drone</button>
              <button class="tool-btn preset-btn" data-preset="seq-groove">3. Dynamic Sequencer Groove</button>
              <button class="tool-btn preset-btn" data-preset="ext-processing">4. External Processing</button>
            </div>
          </div>

          <div class="help-card">
            <h4>מדריך פתרון תקלות מהיר</h4>
            <ul class="help-list">
              <li><strong>לא שומעים צליל במקלדת?</strong>
                <ul>
                  <li>בפאץ' שכולל מקלדת, הצליל מופק <strong>רק בעת לחיצה על המקשים במקלדת</strong>.</li>
                  <li>ודאו שמודול ה-<strong>Output</strong> מחובר ושסליידר הווליום הוגבר.</li>
                </ul>
              </li>
              <li><strong>מנוע השמע קפא (AudioContext Suspended):</strong> לחצו לחיצה בודדת בתוך משטח העבודה לשחרור חסימת הדפדפן.</li>
            </ul>
          </div>
        </div>
      `
    }
  },
  en: {
    title: "Sound Playground - Complete Manual & Guide",
    searchPlaceholder: "Search module, cable, input or preset...",
    tabs: {
      basics: "1. Interface Operations",
      eurorack: "2. Modular 101",
      modules: "3. 15 Modules Ref",
      patches: "4. Presets & Debug"
    },
    sections: {
      basics: `
        <div class="help-section">
          <h3>1. Interface Operations Guide</h3>
          
          <div class="help-card">
            <h4>Navigation & Viewport</h4>
            <ul class="help-list">
              <li><strong>Pan Canvas:</strong> Hold <kbd>Space</kbd> or <kbd>Ctrl/Cmd</kbd> and drag with the mouse.</li>
              <li><strong>Zoom:</strong> Scroll the mouse wheel or use <kbd>+</kbd> / <kbd>-</kbd> on top toolbar.</li>
              <li><strong>Reset View:</strong> Click the <strong>100%</strong> button to re-center viewport.</li>
            </ul>
          </div>

          <div class="help-card">
            <h4>Module Management</h4>
            <ul class="help-list">
              <li><strong>Add Module:</strong> Click any module in side panel to spawn it in the center.</li>
              <li><strong>Move:</strong> Drag module header to reposition it anywhere on canvas.</li>
              <li><strong>Delete:</strong> Click <kbd>X</kbd> on header or press <kbd>Delete</kbd> key.</li>
            </ul>
          </div>

          <div class="help-card">
            <h4>Patch Cables</h4>
            <ul class="help-list">
              <li><strong>Create Connection:</strong> Drag a cable from an output port <span class="tag tag-out">OUT</span> to an input port <span class="tag tag-in">IN</span>.</li>
              <li><strong>Signal Types:</strong>
                <span class="tag tag-audio">Audio</span> | 
                <span class="tag tag-gate">Gate</span> | 
                <span class="tag tag-cv">CV</span>
              </li>
              <li><strong>Disconnect:</strong> Click once on any patch cable to remove it.</li>
            </ul>
          </div>
        </div>
      `,
      eurorack: `
        <div class="help-section">
          <h3>2. Modular Synthesis Fundamentals (Eurorack 101)</h3>
          
          <div class="help-card">
            <h4>What is Modular Synthesis?</h4>
            <p>In a standard synthesizer, signal routing is fixed. In modular synthesis, you define the entire audio and control path from scratch by patching cables between independent modules.</p>
          </div>

          <div class="help-card">
            <h4>Three Signal Types</h4>
            <ul class="help-list">
              <li><span class="tag tag-audio">Audio Signal</span> <strong>Audio Signal:</strong> Audible sound frequencies flowing from sources through filters/effects to output.</li>
              <li><span class="tag tag-gate">Gate / Trigger</span> <strong>Timing Signal:</strong> On/Off pulses triggering envelopes and sequencers.</li>
              <li><span class="tag tag-cv">Control Voltage (CV)</span> <strong>Control Voltage:</strong> Real-time modulating voltage altering parameters dynamically.</li>
            </ul>
          </div>
        </div>
      `,
      modules: `
        <div class="help-section">
          <h3>3. Complete 15 Modules Reference & Patching Guide</h3>
          <div class="modules-grid">
            
            <div class="module-card">
              <div class="mod-header"><span>1. Oscillator (VCO)</span> <span class="mod-badge">Sound Source</span></div>
              <p>Primary tone generator producing raw sound waves (Sine, Square, Sawtooth, Triangle).</p>
              <div class="io-grid">
                <div><strong>Inputs (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-cv">Pitch CV</span>: From Pitch OUT of Keyboard or Sequencer.</li>
                    <li><span class="tag tag-cv">FM IN</span>: From LFO or another VCO for frequency modulation.</li>
                  </ul>
                </div>
                <div><strong>Outputs (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio OUT</span>: To Audio IN of Filter, VCA, FX, or Output.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-oscillator">▶ Run Demo Patch</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>2. Granular Cloud</span> <span class="mod-badge">Sound Source / FX</span></div>
              <p>Granular synthesizer slicing audio samples into tiny grains to construct ethereal sound clouds.</p>
              <div class="io-grid">
                <div><strong>Inputs (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio IN</span>: From Audio Input, VCO, or Mixer.</li>
                    <li><span class="tag tag-cv">Density CV</span>: From CV OUT of LFO or Webcam.</li>
                  </ul>
                </div>
                <div><strong>Outputs (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio OUT</span>: To Filter, Reverb, VCA, or Output.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-granular">▶ Run Demo Patch</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>3. Audio Input</span> <span class="mod-badge">External Input</span></div>
              <p>Captures real-time external audio from system microphone or sound interface.</p>
              <div class="io-grid">
                <div><strong>Inputs (IN):</strong> Computer Mic / Sound Card</div>
                <div><strong>Outputs (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio OUT</span>: To Filter, Granular Cloud, Reverb, or Output.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-audioinput">▶ Run Demo Patch</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>4. Filter (VCF)</span> <span class="mod-badge">Processor</span></div>
              <p>Frequency filter (Lowpass / Highpass / Bandpass) for shaping tonal character.</p>
              <div class="io-grid">
                <div><strong>Inputs (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio IN</span>: From VCO, Granular, Audio Input, or Mixer.</li>
                    <li><span class="tag tag-cv">Cutoff CV</span>: From Envelope CV, LFO, or Webcam CV.</li>
                  </ul>
                </div>
                <div><strong>Outputs (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio OUT</span>: To VCA, Reverb, Oscilloscope, or Output.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-filter">▶ Run Demo Patch</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>5. VCA (Amplifier)</span> <span class="mod-badge">Processor</span></div>
              <p>Voltage Controlled Amplifier adjusting audio volume based on incoming CV modulation.</p>
              <div class="io-grid">
                <div><strong>Inputs (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio IN</span>: From VCO, Filter, or FX.</li>
                    <li><span class="tag tag-cv">CV Control</span>: From Envelope CV OUT, LFO, or Webcam.</li>
                  </ul>
                </div>
                <div><strong>Outputs (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio OUT</span>: To Reverb, Mixer, Recorder, or Output.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-vca">▶ Run Demo Patch</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>6. Reverb</span> <span class="mod-badge">Effect</span></div>
              <p>Spatial reverberation effect simulating acoustic rooms, halls, and ambient spaces.</p>
              <div class="io-grid">
                <div><strong>Inputs (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio IN</span>: From VCA, Filter, Mixer, or VCO.</li>
                  </ul>
                </div>
                <div><strong>Outputs (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio OUT</span>: To Output, Recorder, or Oscilloscope.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-reverb">▶ Run Demo Patch</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>7. Envelope Generator</span> <span class="mod-badge">Modulator</span></div>
              <p>4-stage contour generator (Attack, Decay, Sustain, Release) triggered by Gate signals.</p>
              <div class="io-grid">
                <div><strong>Inputs (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-gate">Gate IN</span>: From Gate OUT of Keyboard or Sequencer.</li>
                  </ul>
                </div>
                <div><strong>Outputs (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-cv">CV OUT</span>: To CV Control on VCA or Cutoff CV on Filter.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-envelope">▶ Run Demo Patch</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>8. LFO</span> <span class="mod-badge">Modulator</span></div>
              <p>Low Frequency Oscillator generating cyclic oscillations for Tremolo and Vibrato effects.</p>
              <div class="io-grid">
                <div><strong>Inputs (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-cv">Rate CV</span>: From Webcam CV or another LFO.</li>
                  </ul>
                </div>
                <div><strong>Outputs (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-cv">CV OUT</span>: To Cutoff CV, Pitch CV, or VCA CV.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-lfo">▶ Run Demo Patch</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>9. Webcam Controller</span> <span class="mod-badge">Modulator</span></div>
              <p>Converts optical motion in front of your camera into interactive Control Voltage (CV).</p>
              <div class="io-grid">
                <div><strong>Inputs (IN):</strong> Camera Video Feed</div>
                <div><strong>Outputs (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-cv">CV OUT</span>: To Pitch CV on VCO, Cutoff CV on Filter, or VCA.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-webcam">▶ Run Demo Patch</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>10. Keyboard</span> <span class="mod-badge">Controller</span></div>
              <p>Virtual musical performance keyboard outputting pitch notes and gate triggers.</p>
              <div class="io-grid">
                <div><strong>Inputs (IN):</strong> Computer Keyboard / Mouse</div>
                <div><strong>Outputs (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-cv">Pitch CV</span>: To Pitch CV on VCO.</li>
                    <li><span class="tag tag-gate">Gate OUT</span>: To Gate IN on Envelope.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-keyboard">▶ Run Demo Patch</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>11. Sequencer</span> <span class="mod-badge">Controller</span></div>
              <p>Automated step sequencer for melody patterns and rhythmic trigger sequences.</p>
              <div class="io-grid">
                <div><strong>Inputs (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-gate">Clock IN</span>: From Gate OUT of another sequencer or clock source.</li>
                  </ul>
                </div>
                <div><strong>Outputs (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-cv">Pitch CV</span>: To Pitch CV on VCO.</li>
                    <li><span class="tag tag-gate">Gate OUT</span>: To Gate IN on Envelope.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-sequencer">▶ Run Demo Patch</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>12. Mixer</span> <span class="mod-badge">Utility</span></div>
              <p>Combines up to 4 audio or CV signals into a single summed master output.</p>
              <div class="io-grid">
                <div><strong>Inputs (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">IN 1 - 4</span>: From VCO outputs, effects, or sample generators.</li>
                  </ul>
                </div>
                <div><strong>Outputs (OUT):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Master OUT</span>: To Filter, VCA, Reverb, or Output.</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-mixer">▶ Run Demo Patch</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>13. Oscilloscope</span> <span class="mod-badge">Utility</span></div>
              <p>Real-time visual waveform monitor displaying audio and modulation signals.</p>
              <div class="io-grid">
                <div><strong>Inputs (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Signal IN</span>: From any Audio or CV output node.</li>
                  </ul>
                </div>
                <div><strong>Outputs (OUT):</strong> 
                  <ul>
                    <li>None. To also hear the sound, patch the same source into the Output too (one output can feed several cables).</li>
                  </ul>
                </div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-oscilloscope">▶ Run Demo Patch</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>14. Recorder</span> <span class="mod-badge">Utility</span></div>
              <p>Captures master output audio and allows downloading lossless WAV files.</p>
              <div class="io-grid">
                <div><strong>Inputs (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Audio IN</span>: From VCA, Reverb, Mixer, or Output.</li>
                  </ul>
                </div>
                <div><strong>Outputs (OUT):</strong> WAV audio file download</div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-recorder">▶ Run Demo Patch</button>
            </div>

            <div class="module-card">
              <div class="mod-header"><span>15. Output Module</span> <span class="mod-badge">Master Output</span></div>
              <p>Final master destination node routing synthesized audio directly to system speakers.</p>
              <div class="io-grid">
                <div><strong>Inputs (IN):</strong> 
                  <ul>
                    <li><span class="tag tag-audio">Master Audio IN</span>: From final stage in signal chain (VCA, FX, Mixer).</li>
                  </ul>
                </div>
                <div><strong>Outputs (OUT):</strong> System Speakers / Headphones</div>
              </div>
              <button class="tool-btn preset-btn" data-preset="demo-output">▶ Run Demo Patch</button>
            </div>

          </div>
        </div>
      `,
      patches: `
        <div class="help-section">
          <h3>4. Main Presets & Troubleshooting Guide</h3>
          
          <div class="help-card">
            <h4>4 Built-in Full Presets</h4>
            <div class="preset-grid">
              <button class="tool-btn preset-btn" data-preset="classic-mono">1. Classic Monophonic Synth</button>
              <button class="tool-btn preset-btn" data-preset="ambient-drone">2. Generative Ambient Drone</button>
              <button class="tool-btn preset-btn" data-preset="seq-groove">3. Dynamic Sequencer Groove</button>
              <button class="tool-btn preset-btn" data-preset="ext-processing">4. External Processing</button>
            </div>
          </div>

          <div class="help-card">
            <h4>Quick Troubleshooting Guide</h4>
            <ul class="help-list">
              <li><strong>No sound when pressing keyboard keys?</strong>
                <ul>
                  <li>In patches containing a keyboard, audio is generated <strong>only while pressing keys on the keyboard</strong>.</li>
                  <li>Verify that the <strong>Output</strong> module is connected and its volume slider is turned up.</li>
                </ul>
              </li>
              <li><strong>Audio engine frozen (AudioContext Suspended):</strong> Click once inside the canvas area to unlock browser audio.</li>
            </ul>
          </div>
        </div>
      `
    }
  }
};

// מיקומיי מודולים מרווחים ביותר למניעת חפיפה + רווח מכל הצדדים
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
