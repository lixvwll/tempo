const CACHE_NAME = 'tempo-v2.5';
const ASSETS = [
  '/tempo/',
  '/tempo/index.html',
  '/tempo/style.css',
  '/tempo/logic.js',
  '/tempo/modules/ui.js',
  '/tempo/modules/home.js',
  '/tempo/modules/schedule.js',
  '/tempo/modules/journal.js',
  '/tempo/modules/habits.js',
  '/tempo/modules/stats.js',
  '/tempo/modules/challenges.js',
  '/tempo/modules/settings.js',
  '/tempo/modules/onboarding.js',
  '/tempo/modules/stories.js',
  '/tempo/modules/weight.js',
  '/tempo/app.js',
  '/tempo/manifest.json'
];

// Install — кэшируем все файлы
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — удаляем старый кэш
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — сначала сеть, при ошибке кэш
// Для news.json всегда идём в сеть (свежий контент)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (url.pathname.endsWith('news.json')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener('message', e => {
  if (e.data === 'CHECK_UPDATE') {
    self.clients.matchAll().then(clients => {
      clients.forEach(c => c.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME }));
    });
  }
});
