'use client';

import { DEFAULT_SUSPENSION_INFO } from './access-control';
import { clearLocalDataCache } from './store';

/**
 * تنفيذ أمر المسح الذاتي الشامل عن بُعد والتدمير المحلي للبيانات (Remote Wipe)
 * يحذف كافة جهات الاتصال، المنتجات، المبيعات، الأوصال، والديون المحفوظة في هاتف التاجر،
 * ويقفل التطبيق نهائياً مع إظهار شاشة الحظر.
 */
export function executeRemoteWipe(customReason?: string): void {
  if (typeof window === 'undefined') return;

  try {
    console.warn('⛔ ALERT: Executing Remote Wipe for frozen account...');

    const reason = customReason || DEFAULT_SUSPENSION_INFO.reason;

    // 1. مسح الكاش من الذاكرة الحية فوراً
    try {
      clearLocalDataCache();
    } catch (_) {}

    // 2. تجميع ومسح كافة مفاتيح التخزين المحلي بدون استثناء
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keysToRemove.push(key);
    }

    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (_) {}
    });

    // 3. مسح التخزين المؤقت للجلسة
    try {
      sessionStorage.clear();
    } catch (_) {}

    // 4. وضع أقفال التجميد الدائمة لمنع استخدام التطبيق بدون إنترنت (أوفلاين)
    localStorage.setItem('tajer_account_frozen', 'true');
    localStorage.setItem('tajer_frozen_reason', reason);
    localStorage.setItem('tajer_frozen_at', new Date().toISOString());

    // 5. تفريغ كاش الـ Service Worker / CacheStorage
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          try { caches.delete(name); } catch (_) {}
        });
      }).catch(() => {});
    }

    // 6. التحويل الإجباري الفوري لشاشة القفل مع منع العودة للخلف (replace)
    if (window.location.pathname !== '/login') {
      window.location.replace('/login?frozen=true');
    }
  } catch (err) {
    console.error('Failed to cleanly execute remote wipe:', err);
    try {
      window.location.replace('/login?frozen=true');
    } catch (_) {}
  }
}
