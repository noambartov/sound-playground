// pwa.js - Installable app support: registers sw.js and shows the "new version" notice.
// A refresh from the notice keeps the current patch (stored for one reload in sessionStorage).
(function () {
  const CARRY_KEY = 'sp_carry_patch';
  const CHECK_EVERY_MS = 10 * 60 * 1000;
  let updateShown = false;
  let lastCheck = 0;

  // Restore the patch that was on the canvas before an update refresh
  window.addEventListener('load', () => {
    let saved = null;
    try { saved = sessionStorage.getItem(CARRY_KEY); sessionStorage.removeItem(CARRY_KEY); } catch (e) {}
    if (!saved || !window.synthApp) return;
    try {
      window.synthApp.loadPatchData(JSON.parse(saved));
      setTimeout(() => window.synthApp.showNotification(
        'Updated to the new version. Your patch was kept; raise Master Volume on the Output module to hear it.'), 50);
    } catch (e) {}
  });

  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;

  navigator.serviceWorker.register('sw.js').catch(() => {});

  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'update-available') showUpdateNotice();
  });

  function checkForUpdate() {
    const sw = navigator.serviceWorker.controller;
    if (!sw || updateShown || Date.now() - lastCheck < 60 * 1000) return;
    lastCheck = Date.now();
    sw.postMessage({ type: 'check-update' });
  }

  setTimeout(checkForUpdate, 15 * 1000);
  setInterval(checkForUpdate, CHECK_EVERY_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });

  function refreshKeepingPatch() {
    try {
      const app = window.synthApp;
      if (app && app.modules && Object.keys(app.modules).length && typeof app.getPatchObject === 'function') {
        sessionStorage.setItem(CARRY_KEY, JSON.stringify(app.getPatchObject()));
      }
    } catch (e) {}
    location.reload();
  }

  function showUpdateNotice() {
    if (updateShown) return;
    updateShown = true;
    const bar = document.createElement('div');
    bar.id = 'update-notice';
    bar.className = 'update-notice';
    bar.setAttribute('role', 'status');
    const text = document.createElement('span');
    text.textContent = 'A new version is available.';
    const refresh = document.createElement('button');
    refresh.className = 'tool-btn update-notice-refresh';
    refresh.textContent = 'Refresh';
    refresh.addEventListener('click', refreshKeepingPatch);
    const later = document.createElement('button');
    later.className = 'tool-btn';
    later.textContent = 'Later';
    later.addEventListener('click', () => bar.remove());
    bar.append(text, refresh, later);
    document.body.appendChild(bar);
  }

  window.showUpdateNotice = showUpdateNotice;
})();
