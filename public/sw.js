// 🌐 Service Worker للتطبيق الذكي — العمل 100% بدون نت (Offline PWA)
const CACHE_NAME = 'tajer-smart-v2';
const STATIC_ASSETS = [
  '/',
  '/inventory',
  '/contacts',
  '/debts',
  '/receipts',
  '/stats',
  '/developer',
  '/manifest.json',
  '/logo.jpg',
  '/favicon.ico',
];

// 🟢 التثبيت وتخزين الصفحات الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.log('SW cache addAll fallback:', err);
      });
    })
  );
  self.skipWaiting();
});

// 🟡 التفعيل وتنظيف التخزين القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 🔵 استراتيجية الجلب (Network First with Offline Cache Fallback)
self.addEventListener('fetch', (event) => {
  // عدم اعتراض طلبات API السحابية حتى تستمر المزامنة أونلاين
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.method === 'GET'
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // عند انقطاع النت: استخراج الصفحة فوراً من التخزين الكامن أوفلاين
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // إذا كان طلب ملاحة لصفحة HTML، إرجاع الرئيسية المخبأة
        if (event.request.mode === 'navigate') {
          const mainHome = await caches.match('/');
          if (mainHome) return mainHome;
        }

        return new Response('Offline Page Available', {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      })
  );
});
