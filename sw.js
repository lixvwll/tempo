const CACHE_NAME = 'tempo-v2.9';
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
  '/tempo/modules/calories.js',
  '/tempo/modules/fit-engine.js',
  '/tempo/modules/fit.js',
  '/tempo/modules/fit-player.js',
  '/tempo/modules/support-brain.js',
  '/tempo/modules/support.js',
  '/tempo/fit/exercises.json',
  '/tempo/fit/programs.json',
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
        keys.filter(k => k !== CACHE_NAME && !k.startsWith('tempo-ai')).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Изоляция страницы (COOP/COEP): нужна, чтобы нейросеть поддержки считала
// в несколько потоков (SharedArrayBuffer). Все ресурсы Tempo — свои, так что
// ничего не ломается. Включается со второй загрузки, когда SW уже активен.
// На iPhone/iPad изоляция выключена: Safari там не тянет модель в несколько потоков,
// а в режиме веб-приложения изоляция может давать белый экран
const COI = !/iPhone|iPad|iPod/.test(self.navigator.userAgent);
function withCOI(res) {
  if (!COI || !res || res.status === 0 || res.type === 'opaque') return res;
  const h = new Headers(res.headers);
  h.set('Cross-Origin-Embedder-Policy', 'require-corp');
  h.set('Cross-Origin-Opener-Policy', 'same-origin');
  h.set('Cross-Origin-Resource-Policy', 'same-origin');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

// Fetch — сначала сеть, при ошибке кэш
// Для news.json всегда идём в сеть (свежий контент)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Куски модели (~640 МБ) чат кэширует сам — не дублируем их в кэше SW
  if (url.pathname.includes('/ai/')) return;

  if (url.pathname.endsWith('news.json') || url.pathname.endsWith('tips.json')) {
    e.respondWith(
      fetch(e.request).then(withCOI).catch(() => caches.match(e.request).then(withCOI))
    );
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return withCOI(res);
      })
      .catch(() => caches.match(e.request).then(withCOI))
  );
});

self.addEventListener('message', e => {
  if (e.data === 'CHECK_UPDATE') {
    self.clients.matchAll().then(clients => {
      clients.forEach(c => c.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME }));
    });
  }
});
