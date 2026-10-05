// 🌐 Service Worker للتطبيق الذكي — العمل 100% بدون نت (Offline PWA) ومزامنة التحديثات الفورية
const CACHE_NAME = 'tajer-smart-v8';
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

// 🟢 التثبيت الفوري
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.log('[SW] cache addAll fallback:', err);
      });
    })
  );
  self.skipWaiting();
});

// ⚡ الاستماع لأمر التحديث المباشر من واجهة المستخدم
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'skipWaiting')) {
    self.skipWaiting();
  }
});

// 🟡 التفعيل الفوري وحذف جميع النسخ السابقة لتفادي تجمّد الشاشات
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 🔵 استراتيجية الجلب (Network First للوثائق والتنقل لضمان وصول التحديثات فوراً)
self.addEventListener('fetch', (event) => {
  // عدم اعتراض طلبات الـ API والتحليلات وقاعدة البيانات
  if (event.request.url.includes('/api/')) {
    return;
  }

  // لطلبات صفحات التنقل (HTML): دائماً جلب من السيرفر أولاً (Network First)
  // لضمان استلام أحدث كود وتحديثات فور توفر النت، مع الرجوع للكاش عند انقطاع النت فقط
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const home = await caches.match('/');
          if (home) return home;
          return new Response('الصفحة غير متوفرة أوفلاين', {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        })
    );
    return;
  }

  // للأصول الثابتة (Static Assets & Chunks)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.method === 'GET' &&
          !event.request.url.startsWith('chrome-extension')
        ) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      });
    }).catch(async () => {
      if (event.request.destination === 'image') {
        return new Response('', { status: 404 });
      }
      return new Response('Network error occurred', { status: 408 });
    })
  );
});
