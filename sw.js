const CACHE_NAME = 'tempo-v2.14';
const ASSETS = [
  '/tempo/',
  '/tempo/index.html',
  '/tempo/style.css',
  '/tempo/logic.js',
  '/tempo/modules/icons.js',
  '/tempo/modules/shop.js',
  '/tempo/fonts/fonts.css',
  '/tempo/fonts/inter-tight-latin.woff2',
  '/tempo/fonts/inter-tight-cyrillic.woff2',
  '/tempo/favicon.svg',
  '/tempo/icon-192.png',
  '/tempo/icon-512.png',
  '/tempo/apple-touch-icon.png',
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
  '/tempo/modules/tips.js',
  '/tempo/news.json',
  '/tempo/tips.json',
  '/tempo/modules/weight.js',
  '/tempo/modules/calories.js',
  '/tempo/modules/fit-engine.js',
  '/tempo/modules/fit.js',
  '/tempo/modules/fit-player.js',
  '/tempo/fit/exercises.json',
  '/tempo/fit/programs.json',
  '/tempo/app.js',
  '/tempo/manifest.json'
];
// Шрифты остальных дизайнов не кэшируем заранее: они скачаются и закэшируются при первом использовании

// Install — кэшируем все файлы
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — удаляем старый кэш (заодно и кэш модели отложенного чата поддержки)
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
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Новости и советы: всегда свежие из сети, а без сети — последняя сохранённая копия
  // (запросы идут с ?_=время, поэтому кэшируем по адресу без параметров)
  if (url.pathname.endsWith('news.json') || url.pathname.endsWith('tips.json')) {
    const key = url.origin + url.pathname;
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then(cache => cache.put(key, copy)); }
          return res;
        })
        .catch(() => caches.match(key))
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
