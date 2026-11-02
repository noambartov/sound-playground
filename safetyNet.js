// safetyNet.js - When something in the site's own code fails, the user sees a short notice
// instead of a control that silently stops reacting. The patch is autosaved at once
// (autosave.js), so a refresh brings it back. Loaded first, so errors during startup count too.
(function () {
  const QUIET_MS = 30000;   // at most one notice per 30 s
  let lastShown = 0;
  const pending = [];

  // Errors that are not ours or are harmless
  function ignore(message, file) {
    const m = String(message || '');
    if (/ResizeObserver loop/i.test(m)) return true;
    if (/^Script error\.?$/i.test(m)) return true; // from another origin, no details
    if (file && !String(file).startsWith(location.origin)) return true; // browser extensions
    return false;
  }

  function notify(detail) {
    console.warn('[safetyNet]', detail);
    const now = Date.now();
    if (now - lastShown < QUIET_MS) return;
    lastShown = now;
    try { if (window.autosave) window.autosave.save(); } catch (e) {}
    const app = window.synthApp;
    if (!app || typeof app.showNotification !== 'function') { pending.push(detail); return; }
    app.showNotification(
      'Something went wrong inside the site. If a module stops responding, refresh the page: your patch is kept.',
      'משהו השתבש באתר. אם מודול מפסיק להגיב, רענן את הדף: הפאץ׳ שלך נשמר.');
  }

  window.addEventListener('error', (e) => {
    // Failed <img>/<script> loads also reach here, without a message; those are not code errors
    if (!e.message) return;
    if (ignore(e.message, e.filename)) return;
    notify(`${e.message} (${e.filename || '?'}:${e.lineno || '?'})`);
  });

  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    const msg = r && r.message ? r.message : String(r);
    // Permission refusals (microphone, camera, MIDI) and stopped plays are expected
    if (r && /NotAllowedError|AbortError|NotFoundError|NotSupportedError/.test(r.name || '')) return;
    if (ignore(msg)) return;
    notify(msg);
  });

  // A failure during startup is shown once the app exists
  window.addEventListener('load', () => {
    if (!pending.length) return;
    pending.length = 0;
    lastShown = 0;
    setTimeout(() => notify('startup error'), 1500);
  });
})();
