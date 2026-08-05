'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getLocalData, setLocalData } from '@/lib/store';
import { toast } from '@/components/Toast';
import { Download, LogOut, ShieldCheck, X } from 'lucide-react';

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isInstalledOrDismissed, setIsInstalledOrDismissed] = useState<boolean>(false);

  useEffect(() => {
    const loggedUser = getLocalData('tajer_smart_user', null);
    if (loggedUser) setUser(loggedUser);

    // التحقق هل التطبيق مثبت بالفعل كـ PWA أو تم إخفاء الزر
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      const dismissed = getLocalData('pwa_installed_dismissed', false);
      if (isStandalone || dismissed) {
        setIsInstalledOrDismissed(true);
      }
    }
  }, [pathname]);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
          setIsInstalledOrDismissed(true);
          setLocalData('pwa_installed_dismissed', true);
        }
      });
    } else {
      alert('لتثبيت التطبيق على الشاشة الرئيسية للهاتف:\n1. اضغط خيارات المتصفح (⋮ أو 📤).\n2. اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).');
      setIsInstalledOrDismissed(true);
      setLocalData('pwa_installed_dismissed', true);
    }
  };

  const dismissInstallBtn = () => {
    setIsInstalledOrDismissed(true);
    setLocalData('pwa_installed_dismissed', true);
  };

  const handleLogout = () => {
    setLocalData('tajer_smart_logged_in', false);
    setLocalData('tajer_smart_user', null);
    toast('تم تسجيل الخروج بنجاح 👋', 'info');
    router.push('/login');
  };

  if (pathname === '/login') return null;

  return (
    <header className="app-header" role="banner">
      <div className="max-w-md mx-auto flex items-center justify-between">

        {/* الشعار واسم التاجر */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img
              src="/logo.jpg"
              alt="التاجر المتنقل"
              className="w-10 h-10 rounded-xl object-cover shadow-md"
            />
            <span className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-white p-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3" />
            </span>
          </div>

          <div>
            <h1 className="font-black text-base leading-tight tracking-tight text-white flex items-center gap-1.5">
              <span>{user?.name || 'شكيمة فوزي'}</span>
            </h1>
            <p style={{ color: 'hsl(0 0% 100% / 0.75)', fontSize: '0.68rem', fontWeight: 700, marginTop: 1 }}>
              التاجر الذكي المتنقل 🚛
            </p>
          </div>
        </div>

        {/* أزرار التثبيت والخروج */}
        <div className="flex items-center gap-2">
          {!isInstalledOrDismissed && (
            <div className="flex items-center bg-white/20 rounded-xl border border-white/25">
              <button
                onClick={handleInstallPWA}
                className="flex items-center gap-1 text-xs font-black px-2.5 py-1.5 text-white touch-active"
                title="تثبيت التطبيق على الشاشة الرئيسية للهاتف"
              >
                <Download className="w-3.5 h-3.5 animate-bounce" />
                <span>تثبيت 📱</span>
              </button>
              <button onClick={dismissInstallBtn} className="p-1.5 text-white/70 hover:text-white border-r border-white/20">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-white border border-rose-400/30 touch-active"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
