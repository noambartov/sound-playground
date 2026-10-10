# Roadmap - רשימת רעיונות להמשך

רשימה מתמשכת של רעיונות ומשימות עתידיות של הבעלים. **לא לממש בקוד לפני שהבעלים מאשר.**
רעיונות חדשים מכל שיחה נכנסים לכאן. כשרעיון מתחיל להיבנות או נגמר, מעדכנים את הסטטוס שלו.

סטטוסים: `רעיון` · `בתכנון` · `בעבודה` · `הושלם`

---

## 1. מודולציה (LFO לכל כפתור)
- **LFO שמתחבר לכפתורים ספציפיים במודולים שונים** - למשל להזיז את ה-Pitch Noise בגרנולר. `הושלם` (2026-10-08)
  - **הוחלט (2026-10-08):** חיבור בגרירת כבל לכפתור. גוררים כבל מיציאת ה-LFO ומשחררים אותו על כפתור. הכפתור מקבל טבעת דקה שמראה את טווח התנועה, ואפשר לכוון עומק (כמו ב-Vital / Bitwig). בלי אייקונים.
  - טכנית: רוב הכפתורים הם `AudioParam` של Web Audio, ולהם אפשר לחבר את ה-LFO ישירות. ערכים שאינם `AudioParam` (חלק מהגרנולר) יקבלו עדכון תקופתי ב-JS.
  - זו תשתית לכל המודולים העתידיים, לכן כדאי לבנות אותה מוקדם.

## 2. אוסילטור
- **Wavetables מורכבים יותר** - גלים מורכבים ומעבר רציף ביניהם (Morph / Position). `הושלם` (2026-10-10) - מודול Wavetable Osc: חמש טבלאות (Basic, Vocal, Digital, Organ, PWM), Position, Warp, כניסות PITCH, FM ו-POS ותצוגת גלים בערימה.
  - שלב שני: Unison (כמה קולות מעט מכוונים זה מזה) וציור גל משלך בעט. `הושלם` (2026-10-10)
  - השראה: Vital (חינמי), Serum, Mutable Instruments Plaits.
  - טכנית: `PeriodicWave` לגלים מותאמים, ומעבר רציף בעזרת crossfade בין שני גלים או AudioWorklet.
  - אפשרות: מודול נפרד "Wavetable Osc" כדי לא להעמיס על האוסילטור הקיים.

## 3. מודולים חדשים
- **מכונת תופים בסגנון 808** - קיק, סנר, קלאפ, היי-האט פתוח/סגור, טומים, קאובל; לכל קול Tune / Decay / Tone, Accent ו-Swing, וסיקוונסר של 16 צעדים. `הושלם` (2026-10-09) - מודול Drum Machine: ארבע שורות (Kick, Snare, Hi-Hat, Cymbal) עם צלילי 808 / 909 / 606, Clap, Rimshot, Cowbell, Ride ו-Custom (אוסילטור + מעטפת + פילטר), 1 עד 4 תיבות, Accent, Swing, טמפו עם תיבת מספר, יציאה לכל כלי, TRIG לכל כלי ו-MAIN L / R.
  - עדכון (2026-10-09): המודול הוקטן (הסליידרים של כל שורה נפתחים ב-Edit), ולכל שורה נוספה כניסת IN עם צליל Input, כדי לנגן אוסילטור או פילטר כחלק מהתופים.
  - אפשר להמשיך: שורות נוספות (טומים), Choke בין היי-האט פתוח לסגור, סנכרון עם הסיקוונסר.
  - הצלילים נבנים בסינתזה (אוסילטורים ורעש), בלי קבצי דגימות, כמו ב-808 המקורית.
- **אמצעי קלט נוסף: סליידר צבעוני** שמנגנים עליו בעכבר או בעט של האייפד (2026-10-08). `הושלם` - מודול Ribbon (2026-10-08), הראשון שנבנה על התבנית המשותפת `ModuleBase.js`.
  - הכיוון: משטח או פס צבעוני שמוציא CV לפי מיקום העט (ואולי גם לחץ העט באייפד), בסגנון Kaoss Pad או Ribbon Controller. אפשר לחבר אותו לשקעים, או לגרור ממנו כבל לכל סליידר כמו מה-LFO.

- **מטרונום** עם יציאת שעון ויציאת סאונד של קליק, סליידר טמפו ותיבת מספר (2026-10-10). `הושלם` (2026-10-10) - מודול Metronome: Play / Stop, Tap, טמפו 20 עד 300 BPM עם תיבת מספר, Beats per Bar עם נורות פעמה, צלילי Click / Wood Block / Beep, Volume, Accent, יציאות CLICK ו-CLOCK (דפיקה בכל שש-עשרית, אותה מוסכמה כמו מכונת התופים והסיקוונסר).

## 4. אפקטים חדשים
- **Degrader** - Bitcrush (הורדת ביטים) ו-Sample-rate reduction, אולי גם "Lossy" (צליל של קובץ דחוס). `הושלם` (2026-10-10) - מודול Degrader עם כפתור אחד (Degrade) שמזיז כמה פרמטרים יחד בארבעה שלבים: נקי, חום של טייפ (סטורציה וגבהים רכים), לו-פיי (פחות ביטים, קצב דגימה נמוך, רעד של קלטת) והרס מלא (3 עד 4 ביטים, רעש ופצפוצים, גבהים סגורים).
  - אפשר להמשיך: מצב "Lossy" (צליל של MP3 דחוס), גרסת סטריאו.
- **Delay מורכב** - זמנים שונים לימין ולשמאל, Ping-Pong, Reverse, Feedback עם פילטר. `הושלם` (2026-10-10) - מודול Stereo Delay: עמודות Left / Both / Right, Reverse, Ping-Pong, Sync לכבל CLOCK (ממכונת התופים או מהסיקוונסר), ומסך הדים שאפשר לגרור.
  - מודול BPM / Clock עצמאי שמוציא CLOCK לכל המודולים: `הושלם` (2026-10-10) - מודול Metronome (ראו סעיף 3).
- **Saturation** - חימום ועיוות במצבים: Tape, Tube, Hard Clip, Fold. `רעיון`
- **Chorus / Flanger** - עם אפשרויות מתקדמות, כולל Reverse (לבדוק עם הבעלים מה הכוונה המדויקת). `רעיון`

## 5. עיצוב
- **להוריד את סימני הפלוס ואייקונים שנשארו** במודולים. `רעיון`
  - נמצא נכון ל-2026-10-08: מודול Keyboard, כפתורי האוקטבה `-` / `+` (להחליף בטקסט כמו `Oct Down` / `Oct Up`). כפתור `+ VCA` בתפריט המודולים תוקן ל-`VCA` (2026-10-08). כפתורי המחיקה `×` (ו-`✕` ב-VCA) הם "X" שה-architecture מתיר, אבל כדאי לאחד אותם לאות אחת אחידה. כפתור הזום `+` בסרגל הכלים נמצא מחוץ למודולים.
- **עיצוב מחודש למודול ה-LFO** כך שייראה אחיד ונקי כמו שאר המודולים. `הושלם` (2026-10-08)

## 6. ייצוא סאונד ל-DAW
- **לקחת צליל שבניתי ולנגן אותו כ"סינת של צליל אחד" בתוך DAW** (Logic, GarageBand, AUM וכו'), באייפד ובמק (2026-10-10). `בתכנון`
  - **אפשרויות, מהפשוטה לשאפתנית:**
    1. **כבר עובד היום:** מקליטים תו אחד עם מודול Recorder (WAV) וטוענים אותו לסמפלר של ה-DAW (Quick Sampler ב-Logic, Sampler ב-GarageBand, AudioLayer באייפד). חסרון: תו אחד שנמתח על כל המקלדת, אז רחוק ממנו הוא נשמע מעוות.
    2. **ייצוא כלי מדוגם ("Export Instrument") - הכיוון הנבחר.** כפתור באתר שמנגן את הפאץ' לבד על הרבה תווים (למשל כל 3 חצאי טון, כמה אוקטבות, אולי שתי עוצמות), מקליט כל תו, ושומר קובץ ZIP עם קבצי WAV וקובץ `.sfz` שמגדיר איזה קובץ שייך לאיזה קליד. נטען בסמפלרים קיימים: AudioLayer (AUv3, אייפד ומק), Logic Sampler, sfizz ו-Sforzando (חינמיים, AU/VST במק). עבודה: בינונית-קטנה, כולו בדפדפן, עובד גם באייפד. מגבלה: "צילום" של הסאונד, הכפתורים לא זזים בתוך ה-DAW (אפשר להוסיף כפתורי Attack / Release / Filter של הסמפלר עצמו). יתרון: הסמפלר פוליפוני, אז אפשר לנגן אקורדים.
    3. **פלאגין ייעודי עם WebView (AUv3)** - אפליקציה שעוטפת את הסינת הקיים ומקבלת MIDI מה-DAW. דורש Mac עם Xcode, חשבון Apple Developer (99$ לשנה) ו-App Store / TestFlight. במגבלות של iOS האודיו של WebView רץ בתהליך נפרד, כך שיש סיכון לגמגומים ו-latency. גדול ומסובך.
    4. **פלאגין אמיתי ב-JUCE (C++), AU / VST3 / AUv3** - כתיבה מחדש של כל המודולים בשפה אחרת, ואז טעינת קובצי ה-JSON של הפאץ'ים. הכי טוב בצליל ובשליטה (כפתורים חיים בתוך ה-DAW), אבל עבודה של חודשים ועלויות כמו בסעיף 3. רלוונטי אולי בשלב ה"אפליקציה האמיתית".
  - **הוחלט כהמלצה (2026-10-10):** לבנות קודם את אפשרות 2 (ייצוא SFZ + WAV). את 3 ו-4 לשקול רק אחרי שרשימת המודולים מתייצבת, יחד עם שלב 2 של האפליקציה.
  - טכנית (לאפשרות 2): לנגן את הפאץ' בזמן אמת דרך שער ו-Pitch כמו מודול Keyboard, ולהקליט דרך אותו מסלול של ה-Recorder; לכל תו זמן החזקה + זמן Release שבוחרים; שמות קבצים לפי תו (`C3.wav`); ZIP נבנה ב-JS בלי ספרייה חיצונית (מצב store). LFO וסיקוונסרים שרצים חופשי יוקלטו "קפואים" בתוך הדגימה. לבדוק לפני הבנייה ש-AudioLayer וה-Sampler של Logic באייפד פותחים את ה-ZIP / SFZ מ-Files.

---

## תשתית
- **תבנית משותפת למודולים (`ModuleBase.js`)** - מודול חדש רק מצהיר על הכפתורים והשקעים שלו, והתבנית עושה את השאר. `הושלם` (2026-10-08). כל מודול חדש מהרשימה הזו ייבנה עליה.

## סדר מוצע (לדיון)
1. ניקוי עיצובי (פלוסים, כפתורי מחיקה) - קטן ומהיר.
2. עיצוב מחודש ל-LFO יחד עם חיבור LFO לכפתורים - תשתית לכל השאר. `הושלם`
3. אפקטים: Saturation ו-Degrader (פשוטים), אחר כך Delay מורכב, אחר כך Chorus / Flanger.
4. Wavetable Oscillator. `הושלם` (2026-10-10)
5. מכונת תופים 808. `הושלם` (2026-10-09)

---

## סקירת שוק (2026-10-08)

### סינתים מודולריים דומים
| מוצר | מה מעניין בו |
|---|---|
| VCV Rack (חינמי, מחשב) | הכי קרוב אלינו. אלפי מודולים, כולל גרסאות של Mutable Instruments. |
| Cherry Audio Voltage Modular | מודולרי עם אפקטים מוכנים רבים, ממשק נקי. |
| Bitwig Grid | מודולציה בגרירה לכל כפתור, הרעיון שאנחנו רוצים ל-LFO. |
| Reason Rack | מראה ריאליסטי, כבלים מאחורי המכשירים. |
| Audulus (iPad) | מודולרי שמיועד לאייפד, רלוונטי לגרסת האפליקציה בעתיד. |

### מודולי אפקט מפורסמים מעולם ה-Eurorack
| מודול | אפקט |
|---|---|
| Mutable Instruments Clouds / Beads | גרנולרי עם Freeze, Reverse ו-Reverb מובנה. |
| Make Noise Morphagene | עיבוד קטעי סאונד כמו סרט מגנטי (Reel / Splice). |
| Noise Engineering Imitor Versio | Delay סטריאו עם הבדלים בין ימין ושמאל וריבוי חזרות. |
| Noise Engineering Desmodus Versio | Reverb אפל עם פילטרים ומודולציה. |
| Erica Synths Black Hole DSP | אוסף אפקטים בכרטיס אחד: Delay, Chorus, Flanger, Reverb. |
| Qu-Bit Data Bender | "שבירה" של הצליל כמו נגן תקליטורים מקולקל. |
| Mutable Instruments Rings | רזונטור, הופך כל צליל למיתר או פעמון. |
| Strymon Magneto | Tape Delay עם Saturation ו-Looper. |

### פלאגינים עם אפקטים ששווה לקחת מהם רעיונות
| פלאגין | למה שווה |
|---|---|
| Soundtoys Crystallizer | Reverse Echo גרנולרי, בדיוק "דיליי עם רברס". |
| Soundtoys EchoBoy / Decapitator | דיליי עם עשרות סגנונות; סטורציה אנלוגית עם 5 מצבים. |
| Valhalla Supermassive (חינמי) | Delay/Reverb ענקיים ומרחפים. |
| Kilohearts Snapins | אפקטים קטנים ופשוטים (Chorus, Flanger, Bitcrush, Frequency Shifter) - מודל טוב למודולים שלנו. |
| TAL-Chorus-LX (חינמי) | הקורוס המפורסם של Juno-60, פשוט ויפה. |
| Goodhertz Lossy | דגריידר שמחקה איכות של MP3 וטלפון. |
| Baby Audio Super VHS / Crystalline | Lo-Fi של קלטת; Reverb נקי ומודרני. |
| Sugar Bytes Effectrix / dBlue Glitch | סיקוונסר של אפקטים (Stutter, Reverse, Tape Stop). |
| Polyverse Manipulator | שינוי קול ו-Pitch קיצוני. |
| u-he Colour Copy | Delay בסגנון BBD אנלוגי עם Chorus מובנה. |

### רעיונות שעלו מהסקירה (לא ביקשת, רק להצעה)
- **Tape Stop / Stutter** - אפקט "עצירת סרט" וחזרה מהירה, מגניב בהופעה.
- **Shimmer Reverb** - Reverb עם הרמת אוקטבה, מתאים לגרנולר.
- **Resonator** בסגנון Rings.
- **Frequency Shifter** - אפקט פשוט עם צליל מיוחד.

---

## סקירת מודולים חדשים (2026-10-10)
מה חדש ומעניין ברשת (בעיקר Superbooth 2026 ו-NAMM 2026), רק מה שעוד לא בנוי או מתוכנן אצלנו. הכל `רעיון`.

### מתאים במיוחד לסינת בדפדפן (קל לבנות, בלי דגימות)
| רעיון | השראה | מה זה נותן |
|---|---|---|
| **Random + Quantizer** | Befaco Random8, Xaoc Skopje, Mutable Marbles | מתח אקראי שמיושר לסולם, כך שמתקבלות מלודיות "גנרטיביות" שתמיד נשמעות במקום. כפתור Loop שומר רצף שאהבת. |
| **Euclidean / Pattern Trigger** | Noise Engineering Multi Repetitor, Mutable Grids | מוציא דפיקות לפי חוקים מתמטיים (Euclidean, מקצבים אפריקאיים). מחברים לשורות של מכונת התופים ומקבלים מקצבים חיים בלי לצייר צעדים. |
| **Low Pass Gate + Wavefolder** | Buchla Ziggy, סגנון West Coast | "קיפול" גל שמוסיף הרמוניות מבריקות, ושער שסוגר עוצמה וגבהים יחד, צליל "פלאק" מקושי של מרימבה. |
| **Comb / Spectral Resonator** | Xaoc Budapeszt, Verbos Filter Resonator | כמה פילטרים מסורקים עם Feedback, הופך רעש או תופים לאקורדים מצלצלים. (קרוב לרעיון ה-Resonator בסגנון Rings למעלה, אפשר לאחד.) |
| **Karplus-Strong Strings** | Strymon SuperKar+, firmware "Mini-Elements" ל-Rings | מיתרים ופעמונים במידול פיזיקלי, כמה קולות. משתלב עם הסיקוונסר והמקלדת. |

### אפקטים
| רעיון | השראה | מה זה נותן |
|---|---|---|
| **Texturizer: Reverb שהופך ל-Multi-tap** | Make Noise Plexiphon | כפתור אחד שעובר ברצף מרברב שטוף לדיליי עם הרבה חזרות. |
| **Plate Reverb עם Freeze ו-Shimmer** | 4ms Mesa (Valley Plateau), WMD Cosmic Debris | שדרוג לרברב הקיים: הקפאת הזנב, הרמת אוקטבה, LFO פנימיים. |
| **Performance Looper** | Synthux Spotykach, Koma Haloplane | שני "דקים" של לופ עם חיתוך וסחיפה גרנולרית, מקליטים ומנגנים בזמן אמת. |
| **Reverse Delay עם משטח מגע** | Enjoy Electronics Memento | משטח שגוררים עליו באצבע או בעט, מתאים במיוחד לאייפד. |

### אוסילטורים
- **2D Wavetable** (Ferry Island Undertow) - מעבר בין גלים בשני צירים, כמו משטח. אפשר לשלב ברעיון ה-Wavetable שבסעיף 2.
- **מצבי Supersaw / Hypersine** (Bastl Citadel Alchemist) - מצבים נוספים לאוסילטור.

### המלצה
שלושת הראשונים: **Random + Quantizer**, **Euclidean Trigger** ו-**Low Pass Gate + Wavefolder**. כל אחד קטן לבנייה על `ModuleBase.js`, לא דורש דגימות, ומשתלב מיד עם מה שכבר קיים (סיקוונסר, מכונת תופים, מטרונום).

מקורות: [MusicRadar Superbooth 2026](https://www.musicradar.com/music-tech/from-stochastic-sequences-to-a-render-farm-of-drums-8-of-our-favourite-eurorack-releases-from-superbooth-2026), [Milk Audio Superbooth 2026](https://www.milkaudiostore.com/us/articles/tutorials-and-insights-on-synthesis-and-synthesizers/the-10-best-synths-and-modules-from-superbooth-2026/), [NAMM 2026 roundup](https://blog.imseankim.com/namm-2026-eurorack-modular-synth-new-modules-roundup/), [Synthtopia: SuperKar+](https://www.synthtopia.com/content/2025/10/13/strymon-superkar-packs-32-physical-modeling-voices-into-a-12hp-eurorack-module/).
