'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLocalData, setLocalData } from '@/lib/store';
import { Download, User, LogOut } from 'lucide-react';

export default function AppHeader() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // جلب بيانات التاجر
    const loggedUser = getLocalData('tajer_smart_user', null);
    if (!loggedUser) {
      // إيقاف التاجر الافتراضي شكيمة فوزي
      const defaultMerchant = { name: 'شكيمة فوزي', email: 'chala.fowzi@tajer.dz', role: 'تاجر متنقل' };
      setLocalData('tajer_smart_user', defaultMerchant);
      setUser(defaultMerchant);
    } else {
      setUser(loggedUser);
    }

    // التقاط حدث تثبيت PWA
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
      alert('لتثبيت التطبيق على هاتف الخاص بك:\n1. اضغط خيارات المتصفح (⋮ أو 📤).\n2. اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).');
    }
  };

  if (pathname === '/login') return null;

  return (
    <header className="app-header" role="banner">
      <div className="max-w-md mx-auto flex items-center justify-between">

        {/* الشعار واسم التاجر */}
        <div className="flex items-center gap-2.5">
          <Link href="/login" className="relative group">
            <img
              src="/logo.jpg"
              alt="التاجر الذكي"
              className="w-10 h-10 rounded-2xl object-cover border border-white/30 shadow-md group-hover:scale-105 transition-transform"
            />
          </Link>

          <div>
            <h1 className="font-black text-base leading-tight tracking-tight text-white flex items-center gap-1.5">
              <span>{user?.name || 'شكيمة فوزي'}</span>
            </h1>
            <p style={{ color: 'hsl(0 0% 100% / 0.75)', fontSize: '0.68rem', fontWeight: 700, marginTop: 1 }}>
              التاجر الذكي المتنقل 🚛
            </p>
          </div>
        </div>

        {/* أزرار التثبيت وتغيير التاجر */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallPWA}
            className="flex items-center gap-1.5 text-xs font-black px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/25 touch-active shadow-sm"
            title="تثبيت التطبيق على الشاشة الرئيسية للهاتف"
          >
            <Download className="w-3.5 h-3.5 animate-bounce" />
            <span>تثبيت التطبيق 📱</span>
          </button>
        </div>

      </div>
    </header>
  );
}
