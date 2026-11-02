// autosave.js - Keeps the canvas between visits. The current patch is written to localStorage
// a few seconds after it changes (and when the page is hidden or closed), and loaded again
// when the site opens. A refresh from the "new version" notice is left to pwa.js (it carries
// the patch itself). Sampler audio is not part of patches, so a Sampler comes back empty.
(function () {
  const KEY = 'sp_autosave_patch';
  const CARRY_KEY = 'sp_carry_patch'; // pwa.js
  const EVERY_MS = 3000;
  let lastSaved = null;
  let ready = false; // nothing is written until the restore below has finished

  function app() { return window.synthApp; }

  function save() {
    const a = app();
    if (!ready || !a || typeof a.getPatchObject !== 'function') return;
    // Never store a half-finished drag or a cable still in the hand
    if (a.isPointerDown || a.activeCable) return;
    let snap;
    try { snap = a.takeSnapshot(); } catch (e) { return; }
    if (snap === lastSaved) return;
    try {
      const patch = a.getPatchObject();
      if (!patch.modules.length) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, JSON.stringify(patch));
      lastSaved = snap;
    } catch (e) {}
  }

  function restore() {
    const a = app();
    if (!a) { setTimeout(restore, 50); return; }
    let carried = false, saved = null;
    try {
      carried = !!sessionStorage.getItem(CARRY_KEY);
      saved = localStorage.getItem(KEY);
    } catch (e) {}
    if (carried || !saved || Object.keys(a.modules).length) { start(); return; }
    let patch = null;
    try { patch = JSON.parse(saved); } catch (e) {}
    if (!patch || !Array.isArray(patch.modules) || !patch.modules.length) { start(); return; }
    try {
      a.loadPatchData(patch);
    } catch (e) {
      console.warn('[autosave] could not restore the last patch', e);
      start();
      return;
    }
    setTimeout(() => {
      // Undo starts from the restored patch, not from an empty canvas
      try {
        a.historyCurrent = a.takeSnapshot();
        a.undoStack = [];
        a.redoStack = [];
        a.updateHistoryButtons();
      } catch (e) {}
      a.showNotification(
        'Your last patch is back. Volume starts at 0: raise Master Volume on the Output module to hear it.',
        'הפאץ׳ האחרון שלך חזר. העוצמה מתחילה ב-0: הרם את Master Volume במודול Output כדי לשמוע.');
      start();
    }, 600);
  }

  function start() {
    if (ready) return;
    ready = true;
    try { lastSaved = app().takeSnapshot(); } catch (e) {}
    setInterval(save, EVERY_MS);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
    window.addEventListener('pagehide', save);
  }

  window.autosave = { save, key: KEY };
  // Runs before pwa.js's 'load' handler (this script is listed first), so the carried patch is still visible
  window.addEventListener('load', restore);
})();
