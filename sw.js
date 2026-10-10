// sw.js - Service worker: offline copy of the site + "new version" detection.
// Nothing here needs editing when the site changes: the file list is read from index.html
// on every check, and every file is fetched from the network first (the cache is only
// used when offline). See architecture.md section 8 "Installable app (PWA)".

const CACHE = 'sound-playground';
const INDEX = new URL('./', self.registration.scope).href;
const NETWORK_TIMEOUT_MS = 4000;

// Files the site needs: index.html, everything it links (src= / href=), and worklets the scripts load.
async function fetchCoreFiles() {
  const indexRes = await fetch(INDEX, { cache: 'no-cache' });
  if (!indexRes.ok) throw new Error('index.html ' + indexRes.status);
  const html = await indexRes.clone().text();
  const files = new Map([[INDEX, indexRes]]);
  const urls = new Set();
  for (const m of html.matchAll(/(?:src|href)="([^"#:]+)"/g)) urls.add(new URL(m[1], INDEX).href);
  await Promise.all([...urls].map(async url => {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) return;
      files.set(url, res);
      if (/\.js(\?|$)/.test(url)) {
        const js = await res.clone().text();
        for (const w of js.matchAll(/addModule\('([^'#:]+)'\)/g)) urls.add(new URL(w[1], INDEX).href);
      }
    } catch (e) {}
  }));
  // Worklets found inside the scripts
  await Promise.all([...urls].filter(u => !files.has(u)).map(async url => {
    try { const res = await fetch(url, { cache: 'no-cache' }); if (res.ok) files.set(url, res); } catch (e) {}
  }));
  return files;
}

// Store a response, dropping older copies of the same file (same path, other ?v=).
async function store(cache, url, res) {
  const path = new URL(url).pathname;
  for (const req of await cache.keys()) {
    const u = new URL(req.url);
    if (u.pathname === path && req.url !== url) await cache.delete(req);
  }
  await cache.put(url, res);
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      const files = await fetchCoreFiles();
      for (const [url, res] of files) await store(cache, url, res);
    } catch (e) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Network first (always the latest version when online), cache when offline or very slow.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.endsWith('/sw.js')) return;
  const isPage = req.mode === 'navigate';
  const key = isPage ? INDEX : req.url;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const network = fetch(isPage ? INDEX : req, { cache: 'no-cache' }).then(async res => {
      if (res.ok && res.type === 'basic') await store(cache, key, res.clone());
      // Safari refuses a page answer that went through a redirect; hand it over as a fresh response
      if (isPage && res.redirected) {
        return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
      }
      return res;
    });
    event.waitUntil(network.catch(() => {}));
    const cached = () => cache.match(key).then(r => r || cache.match(key, { ignoreSearch: true }));
    const timeout = new Promise(resolve => setTimeout(resolve, NETWORK_TIMEOUT_MS));
    try {
      const first = await Promise.race([network, timeout.then(cached)]);
      if (first) return first;
      return await network;
    } catch (e) {
      const fallback = await cached();
      if (fallback) return fallback;
      throw e;
    }
  })());
});

// The page asks "is there a newer version?": compare the live files with the stored copies.
self.addEventListener('message', event => {
  if (!event.data || event.data.type !== 'check-update') return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    let changed = false;
    const files = await fetchCoreFiles();
    for (const [url, res] of files) {
      const old = await cache.match(url);
      const fresh = await res.clone().arrayBuffer();
      if (!old || !sameBytes(fresh, await old.arrayBuffer())) {
        changed = true;
        await store(cache, url, res);
      }
    }
    if (changed && event.source) event.source.postMessage({ type: 'update-available' });
  })().catch(() => {}));
});

function sameBytes(a, b) {
  if (a.byteLength !== b.byteLength) return false;
  const x = new Uint8Array(a), y = new Uint8Array(b);
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  return true;
}
