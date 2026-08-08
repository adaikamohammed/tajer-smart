'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getLocalData, setLocalData } from '@/lib/store';
import { toast } from '@/components/Toast';
import { Download, LogOut, ShieldCheck, X, RefreshCw, Upload, FileJson } from 'lucide-react';
import { syncFullStoreWithCloud, exportStoreBackupJSON, importStoreBackupJSON } from '@/lib/supabase';

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isInstalledOrDismissed, setIsInstalledOrDismissed] = useState<boolean>(false);
  const [isSyncing,               setIsSyncing]               = useState<boolean>(false);

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

  const handleManualSync = async () => {
    setIsSyncing(true);
    toast('🔄 جارٍ مزامنة الأشخاص والمنتجات والطلبيات مع السحابة...', 'info');
    try {
      const res = await syncFullStoreWithCloud();
      if (res.success) {
        toast(`✅ تم المزامنة بنجاح! تم تحديث (${res.contactsCount}) شخص، (${res.productsCount}) منتج، و (${res.transactionsCount}) عملية!`, 'success');
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        toast('⚠️ تعذر المزامنة السحابية حالياً، يرجى الاتصال بالإنترنت', 'warning');
      }
    } catch (e) {
      toast('⚠️ حدث خطأ أثناء المزامنة', 'error');
    } finally {
      setIsSyncing(false);
    }
  };
  const handleExportBackup = () => {
    try {
      const json = exportStoreBackupJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `نسخة_احتياطية_التاجر_المتنقل_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      toast('📦 تم تصدير نسخة احتياطية كاملة لبياناتك بنجاح!', 'success');
    } catch (e) {
      toast('❌ تعذر تصدير النسخة الاحتياطية', 'error');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const ok = importStoreBackupJSON(content);
      if (ok) {
        toast('✅ تم استعادة بيانات المحل بنجاح! جارٍ تحديث الصفحة...', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast('❌ الملف المرفق غير صالح كنسخة احتياطية', 'error');
      }
    };
    reader.readAsText(file);
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
      <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto flex items-center justify-between">

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

        {/* أزرار التثبيت والمزامنة السحابية وتصدير/استعادة البيانات والخروج */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handleExportBackup}
            className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 touch-active text-xs font-bold flex items-center gap-1"
            title="تصدير نسخة احتياطية لبيانات الأشخاص والمنتجات والعمليات لحفظها أو نقلها لهاتف آخر"
          >
            <FileJson className="w-4 h-4 text-amber-300" />
            <span className="hidden md:inline">تصدير بيانات 📦</span>
          </button>

          <label
            className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 touch-active text-xs font-bold flex items-center gap-1 cursor-pointer"
            title="استعادة بيانات المحل من ملف نسخة احتياطية سابق"
          >
            <Upload className="w-4 h-4 text-emerald-300" />
            <span className="hidden md:inline">استعادة 📥</span>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 text-xs font-black px-2.5 py-1.5 bg-emerald-700/60 hover:bg-emerald-600/80 text-white rounded-xl border border-emerald-400/40 shadow-sm touch-active transition-all"
            title="مزامنة فورية لجميع الأشخاص والمنتجات والعمليات مع السحابة لتوحيد الأجهزة"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-300' : 'text-emerald-200'}`} />
            <span className="hidden sm:inline">مزامنة السحابة</span> ☁️
          </button>

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
