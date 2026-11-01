// touchLog.js - A diagnostic panel for touch problems on the iPad, off unless the address ends in ?touchlog.
// It lists the newest touch / pointer / slider events (type, finger id, what was touched, how many fingers
// are down, whether a slider's value changed), so the owner can send a screenshot when a gesture fails.
(function () {
  if (!/[?&]touchlog\b/.test(location.search)) return;
  const lines = [];
  const panel = document.createElement('div');
  panel.id = 'touch-log';
  panel.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;width:min(460px,90vw);max-height:45vh;overflow:hidden;' +
    'background:rgba(15,23,42,.88);color:#e2e8f0;font:11px/1.35 ui-monospace,Menlo,monospace;padding:6px 8px;border-radius:8px;pointer-events:none;white-space:pre';
  const add = () => document.body.appendChild(panel);
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);

  const name = (el) => {
    if (!el || !el.tagName) return '?';
    const cls = (typeof el.className === 'string' ? el.className : '').trim().split(/\s+/).slice(0, 2).join('.');
    return el.tagName.toLowerCase() + (el.type ? `[${el.type}]` : '') + (cls ? '.' + cls : '');
  };
  const t0 = performance.now();
  const log = (s) => {
    lines.push(`${((performance.now() - t0) / 1000).toFixed(2)} ${s}`);
    if (lines.length > 22) lines.shift();
    panel.textContent = lines.join('\n');
  };
  let lastMove = {};
  const throttled = (key, s) => {
    const now = performance.now();
    if (now - (lastMove[key] || 0) < 250) return;
    lastMove[key] = now;
    log(s);
  };

  ['touchstart', 'touchend', 'touchcancel'].forEach(type => document.addEventListener(type, (e) => {
    const ids = Array.from(e.changedTouches).map(t => `#${t.identifier} ${name(t.target)}`).join(', ');
    log(`${type} ${ids} | down ${e.touches.length}`);
  }, { capture: true, passive: true }));
  document.addEventListener('touchmove', (e) => {
    const ids = Array.from(e.changedTouches).map(t => '#' + t.identifier).join(',');
    throttled('tm' + ids, `touchmove ${ids} | down ${e.touches.length}`);
  }, { capture: true, passive: true });
  ['pointerdown', 'pointerup', 'pointercancel'].forEach(type => window.addEventListener(type, (e) => {
    log(`${type} p${e.pointerId} ${e.pointerType} ${name(e.target)}`);
  }, true));
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') throttled('pm' + e.pointerId, `pointermove p${e.pointerId}`);
  }, true);
  document.addEventListener('input', (e) => {
    if (e.target && e.target.type === 'range') throttled('in' + e.target.id, `slider input ${e.target.id || name(e.target)} = ${e.target.value}`);
  }, true);
  ['gesturestart', 'gestureend'].forEach(type => document.addEventListener(type, () => log(type), true));
  log('touch log on (' + (navigator.maxTouchPoints || 0) + ' touch points)');
})();
