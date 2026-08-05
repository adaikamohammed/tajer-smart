'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getLocalData, setLocalData } from '@/lib/store';
import { toast } from '@/components/Toast';
import { Download, LogOut, ShieldCheck } from 'lucide-react';

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loggedUser = getLocalData('tajer_smart_user', null);
    if (loggedUser) {
      setUser(loggedUser);
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
        }
      });
    } else {
      alert('لتثبيت التطبيق على الشاشة الرئيسية للهاتف:\n1. اضغط خيارات المتصفح (⋮ أو 📤).\n2. اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).');
    }
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
              className="w-10 h-10 rounded-2xl object-cover border border-white/30 shadow-md"
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

        {/* أزرار التثبيت الخروج */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallPWA}
            className="flex items-center gap-1 text-xs font-black px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/25 touch-active shadow-sm"
            title="تثبيت التطبيق على الشاشة الرئيسية للهاتف"
          >
            <Download className="w-3.5 h-3.5 animate-bounce" />
            <span>تثبيت التطبيق 📱</span>
          </button>

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
