const CACHE_NAME = 'cyberquran-offline-v1';
const assets = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/modules/surahs.js',
  './fonts/AL-Mohanad-Extra-Bold.ttf'
];

// أضفنا وظيفة لجلب كل ملفات البيانات تلقائياً
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // تخزين الملفات الأساسية
      cache.addAll(assets);
      // تخزين كافة ملفات السور
      for (let i = 1; i <= 114; i++) {
        let s = i.toString().padStart(3, '0');
        cache.add(`./data/surah_${s}.json`);
      }
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
