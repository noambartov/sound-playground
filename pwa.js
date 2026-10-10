// pwa.js - Installable app support: registers sw.js and shows the "new version" notice.
// A refresh from the notice keeps the current patch (stored for one reload in sessionStorage).
(function () {
  const CARRY_KEY = 'sp_carry_patch';
  const REASON_KEY = 'sp_carry_reason';
  const CHECK_EVERY_MS = 10 * 60 * 1000;
  let updateShown = false;
  let lastCheck = 0;

  // Restore the patch that was on the canvas before an update refresh
  window.addEventListener('load', () => {
    let saved = null, reason = null;
    try {
      saved = sessionStorage.getItem(CARRY_KEY); sessionStorage.removeItem(CARRY_KEY);
      reason = sessionStorage.getItem(REASON_KEY); sessionStorage.removeItem(REASON_KEY);
    } catch (e) {}
    if (!saved || !window.synthApp) return;
    try {
      window.synthApp.loadPatchData(JSON.parse(saved));
      const first = reason === 'sound' ? 'Sound restarted.' : 'Updated to the new version.';
      setTimeout(() => window.synthApp.showNotification(
        `${first} Your patch was kept; raise Master Volume on the Output module to hear it.`), 50);
    } catch (e) {}
  });

  function refreshKeepingPatch(reason) {
    try {
      const app = window.synthApp;
      if (app && app.modules && Object.keys(app.modules).length && typeof app.getPatchObject === 'function') {
        sessionStorage.setItem(CARRY_KEY, JSON.stringify(app.getPatchObject()));
        if (typeof reason === 'string') sessionStorage.setItem(REASON_KEY, reason);
      }
    } catch (e) {}
    location.reload();
  }

  // A bar like the update notice: text plus a primary button and Later.
  function showNoticeBar(id, message, buttonLabel, onPress) {
    if (document.getElementById(id)) return;
    const bar = document.createElement('div');
    bar.id = id;
    bar.className = 'update-notice';
    bar.setAttribute('role', 'status');
    const text = document.createElement('span');
    text.textContent = message;
    const main = document.createElement('button');
    main.className = 'tool-btn update-notice-refresh';
    main.textContent = buttonLabel;
    main.addEventListener('click', onPress);
    const later = document.createElement('button');
    later.className = 'tool-btn';
    later.textContent = 'Later';
    later.addEventListener('click', () => bar.remove());
    bar.append(text, main, later);
    document.body.appendChild(bar);
  }

  // Called by audioEngine.js when the sound output changed under it (e.g. headphones on iPad)
  window.showSoundRestartNotice = () => showNoticeBar('sound-restart-notice',
    'The sound output changed. If notes sound late, restart the sound.', 'Restart sound',
    () => refreshKeepingPatch('sound'));

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

  function showUpdateNotice() {
    if (updateShown) return;
    updateShown = true;
    showNoticeBar('update-notice', 'A new version is available.', 'Refresh', () => refreshKeepingPatch('update'));
  }

  window.showUpdateNotice = showUpdateNotice;
})();
