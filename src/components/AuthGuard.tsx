'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// ── التحقق المبكر الفوري من الجلسة — متزامن 100%، بدون useEffect، بدون سبينر ──
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

  useEffect(() => {
    if (pathname === '/login') return;
    if (!didRedirect.current && !isSessionActive()) {
      didRedirect.current = true;
      router.replace('/login');
    }
  }, [pathname, router]);

  // غير مسجل: لا شيء يُعرض (التوجيه يحدث فوراً في useEffect)
  if (pathname !== '/login' && !isSessionActive()) return null;

  // ✅ مسجل: عرض فوري بدون أي تأخير
  return <>{children}</>;
}
