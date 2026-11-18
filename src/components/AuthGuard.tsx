'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAccountFrozen } from '@/lib/access-control';
import { executeRemoteWipe } from '@/lib/remote-wipe';
import { getActiveUser } from '@/lib/store';
import { ShieldAlert, Wifi, RefreshCw } from 'lucide-react';

// أقصى مهلة للعمل في وضع غير متصل بالإنترنت (48 ساعة)
const MAX_OFFLINE_GRACE_MS = 48 * 60 * 60 * 1000;

function isAccountFrozenLocally(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('tajer_account_frozen') === 'true';
}

function isSessionActive(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = localStorage.getItem('tajer_smart_logged_in');
    if (!raw) return false;
    const text = raw.startsWith('ENC_V1:')
      ? (() => {
          try {
            const S = 'TajerSmart_Secured_Key_2026_x89!@#';
            const c = decodeURIComponent(escape(atob(raw.slice(7))));
            let r = '';
            for (let i = 0; i < c.length; i++) r += String.fromCharCode(c.charCodeAt(i) ^ S.charCodeAt(i % S.length));
            return r;
          } catch { return ''; }
        })()
      : raw;
    return JSON.parse(text) === true;
  } catch { return false; }
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const didRedirect = useRef(false);
  const [offlineLock, setOfflineLock] = useState(false);

  // 1. فحص فوري متزامن لحالة التجميد والحساب المستهدف
  const isFrozen = isAccountFrozenLocally();
  const currentUser = typeof window !== 'undefined' ? getActiveUser() : null;
  const isUserTargeted = Boolean(currentUser && isAccountFrozen(currentUser.email));

  if (isUserTargeted && typeof window !== 'undefined') {
    executeRemoteWipe('تم تجميد هذا الحساب بسبب عدم تسوية المستحقات المالية.');
    return null;
  }

  useEffect(() => {
    if (pathname === '/login') return;

    // أ) إذا كان الجهاز مجمداً محلياً
    if (isFrozen) {
      if (!didRedirect.current) {
        didRedirect.current = true;
        router.replace('/login?frozen=true');
      }
      return;
    }

    // ب) إذا لم تكن هناك جلسة دخول
    if (!didRedirect.current && !isSessionActive()) {
      didRedirect.current = true;
      router.replace('/login');
      return;
    }

    // ج) التحقق السحابي الحي مع السيرفر + مهلة الأوفلاين
    if (currentUser?.email) {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        fetch(`/api/account/status?email=${encodeURIComponent(currentUser.email)}`)
          .then(async (res) => {
            if (res.status === 403) {
              const data = await res.json().catch(() => ({}));
              executeRemoteWipe(data.message || data.error);
              return;
            }
            if (res.ok) {
              const data = await res.json().catch(() => ({}));
              if (data.frozen) {
                executeRemoteWipe(data.message);
                return;
              }
              // تحديث طابع آخر تحقق سحابي ناجح
              localStorage.setItem('tajer_last_verified_at', Date.now().toString());
            }
          })
          .catch(() => {
            // خطأ شبكة مؤقت — يتم الاعتماد على مهلة الأوفلاين
          });
      } else {
        // فحص مهلة الأوفلاين لمنع التحايل بقطع الإنترنت
        const lastVerified = Number(localStorage.getItem('tajer_last_verified_at') || '0');
        if (lastVerified > 0 && Date.now() - lastVerified > MAX_OFFLINE_GRACE_MS) {
          setOfflineLock(true);
        }
      }
    }
  }, [pathname, router, isFrozen, currentUser?.email]);

  // غير مسجل أو مجمد: عدم عرض أي بيانات إطلاقاً
  if (pathname !== '/login' && (isFrozen || !isSessionActive())) return null;

  // شاشة قفل انتهاء مهلة الأوفلاين (لحماية البيانات من التهرب بوضع الطيران)
  if (offlineLock && pathname !== '/login') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4" dir="rtl">
        <div className="glass-card max-w-md w-full p-6 text-center space-y-4 bg-slate-800/90 border border-slate-700 rounded-3xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Wifi className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-black text-amber-300">مطلوب الاتصال بالإنترنت</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            انتهت مهلة العمل بدون إنترنت المسموح بها (48 ساعة). يُرجى تفعيل الإنترنت أو شبكة Wi-Fi للتحقق من صلاحية الحساب والمزامنة.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg touch-active"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة المحاولة بعد الاتصال</span>
          </button>
        </div>
      </div>
    );
  }

  // ✅ مصرح ومسجل: عرض فوري
  return <>{children}</>;
}
