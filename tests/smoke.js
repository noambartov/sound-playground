// tests/smoke.js - Quick check that nothing is broken, run before every publish.
// It serves the site locally, opens it in headless Chromium at desktop, iPad and phone sizes,
// adds every module from the Sidebar, loads every preset, opens every help-book module page,
// and checks that the autosave brings a patch back after a reload.
// Any page error or console error fails the run.
// Run: node tests/smoke.js   (needs Node and Playwright with Chromium)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

// Messages that are expected in a headless browser
const EXPECTED = [/MIDI access failed/, /Permission to use Web MIDI/, /slider-vertical/];

const SIZES = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'ipad', viewport: { width: 1024, height: 1366 }, hasTouch: true },
  { name: 'phone', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
];

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required',
    '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const problems = [];

  for (const size of SIZES) {
    const { name, ...opts } = size;
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(`page error: ${e.message}`));
    page.on('console', m => {
      if (m.type() !== 'error') return;
      const t = m.text();
      if (!EXPECTED.some(re => re.test(t))) errs.push(`console error: ${t}`);
    });
    await page.goto(url);
    await page.waitForFunction(() => window.synthApp && window.presetData);
    await page.waitForTimeout(500);

    const r = await page.evaluate(async () => {
      const sleep = ms => new Promise(res => setTimeout(res, ms));
      const app = window.synthApp;
      const out = { fails: [] };
      const types = [...new Set([...document.querySelectorAll('[data-type]')].map(e => e.dataset.type))];
      out.types = types.length;
      for (const t of types) {
        try { if (!app.createModule(t)) out.fails.push(`module ${t} did not appear`); }
        catch (e) { out.fails.push(`module ${t}: ${e.message}`); }
      }
      await sleep(500);
      out.cards = Object.keys(app.modules).length;
      if (out.cards < types.length) out.fails.push(`only ${out.cards} of ${types.length} modules on the canvas`);
      app.clearWorkspace();
      const keys = Object.keys(window.presetData);
      out.presets = keys.length;
      for (const k of keys) {
        try {
          app.loadPatchData(window.presetData[k]);
          await sleep(120);
          const want = (window.presetData[k].modules || []).length;
          const got = Object.keys(app.modules).length;
          if (got !== want) out.fails.push(`preset ${k}: ${got} of ${want} modules`);
        } catch (e) { out.fails.push(`preset ${k}: ${e.message}`); }
      }
      // Help book: both languages list the same modules, each with a demo preset that exists
      for (const lang of ['en', 'he']) {
        const mods = window.helpData[lang].modules || [];
        const list = Array.isArray(mods) ? mods : Object.values(mods);
        for (const m of list) if (m.preset && !window.presetData[m.preset]) out.fails.push(`help ${lang}: ${m.type || m.title} demo "${m.preset}" missing`);
      }
      return out;
    });
    problems.push(...r.fails.map(f => `[${name}] ${f}`));

    // Autosave: the last preset must come back after a reload
    await page.waitForTimeout(3500);
    const before = await page.evaluate(() => Object.keys(window.synthApp.modules).length);
    await page.reload();
    await page.waitForFunction(() => window.synthApp);
    await page.waitForTimeout(1500);
    const after = await page.evaluate(() => Object.keys(window.synthApp.modules).length);
    if (before && after !== before) problems.push(`[${name}] autosave: ${after} of ${before} modules came back`);

    problems.push(...[...new Set(errs)].map(e => `[${name}] ${e}`));
    console.log(`${name}: ${r.types} modules, ${r.presets} presets checked`);
    await ctx.close();
  }

  await browser.close();
  server.close();
  if (problems.length) {
    console.log(`\nFAILED (${problems.length}):\n` + problems.join('\n'));
    process.exit(1);
  }
  console.log('\nAll good.');
})().catch(e => { console.error(e); process.exit(1); });
