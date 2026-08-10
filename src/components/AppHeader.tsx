'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getLocalData, setLocalData } from '@/lib/store';
import { toast } from '@/components/Toast';
import { Download, LogOut, ShieldCheck, X, RefreshCw, CheckCircle2, WifiOff } from 'lucide-react';
import { initAutoSyncEngine, subscribeToSyncStatus, SyncStatus } from '@/lib/cloud-sync';

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isInstalledOrDismissed, setIsInstalledOrDismissed] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');

  useEffect(() => {
    const loggedUser = getLocalData('tajer_smart_user', null);
    if (loggedUser) setUser(loggedUser);

    initAutoSyncEngine();
    const unsub = subscribeToSyncStatus(setSyncStatus);

    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      const dismissed = getLocalData('pwa_installed_dismissed', false);
      if (isStandalone || dismissed) {
        setIsInstalledOrDismissed(true);
      }
    }

    return () => unsub();
  }, []);

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
    <header className="app-header border-b border-emerald-800/40 shadow-sm" role="banner" style={{ padding: '0.45rem 0.75rem' }}>
      <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto flex items-center justify-between gap-1.5 flex-nowrap">

        {/* 🏢 الشعار واسم التاجر ناصع في سطر واحد */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="relative shrink-0">
            <img
              src="/logo.jpg"
              alt="التاجر المتنقل"
              className="w-8 h-8 rounded-lg object-cover shadow-sm border border-emerald-400/30"
            />
            <span className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-white p-0.5 rounded-full">
              <ShieldCheck className="w-2.5 h-2.5" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-black text-xs sm:text-sm text-white truncate leading-snug flex items-center gap-1">
              <span>{user?.name || 'شكيمة فوزي'}</span>
              <span className="text-[10px] text-emerald-300 font-bold shrink-0">🚛</span>
            </h1>
          </div>
        </div>

        {/* 🟢 مؤشر المزامنة المصغر وسريع في سطر واحد */}
        <div className="flex items-center gap-1.5 shrink-0">

          <div className="flex items-center gap-1 px-2 py-0.5 bg-black/25 border border-white/15 rounded-lg text-[10px] font-black text-white shrink-0">
            {syncStatus === 'syncing' && (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-amber-300 shrink-0" />
                <span className="text-amber-200">حفظ...</span>
              </>
            )}
            {syncStatus === 'synced' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span className="text-emerald-200">☁️ مزامن</span>
              </>
            )}
            {(syncStatus === 'offline' || syncStatus === 'error') && (
              <>
                <ShieldCheck className="w-3 h-3 text-emerald-300 shrink-0" />
                <span className="text-emerald-200">🔒 محلي</span>
              </>
            )}
          </div>

          {!isInstalledOrDismissed && (
            <div className="flex items-center bg-white/15 rounded-lg border border-white/20 shrink-0">
              <button
                onClick={handleInstallPWA}
                className="flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 text-white touch-active"
                title="تثبيت التطبيق على الهواتف"
              >
                <Download className="w-3 h-3 text-emerald-300 animate-bounce" />
                <span>تثبيت</span>
              </button>
              <button onClick={dismissInstallBtn} className="p-1 text-white/70 hover:text-white border-r border-white/20">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-white border border-rose-400/30 touch-active shrink-0"
            title="تسجيل الخروج"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </header>
  );
}
