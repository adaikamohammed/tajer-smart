'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getLocalData, setLocalData } from '@/lib/store';
import { toast } from '@/components/Toast';
import { Download, LogOut, ShieldCheck, X, RefreshCw, AlertCircle } from 'lucide-react';
import { syncStoreWithVercelCloud } from '@/lib/cloud-sync';

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isInstalledOrDismissed, setIsInstalledOrDismissed] = useState<boolean>(false);
  const [isSyncing,               setIsSyncing]               = useState<boolean>(false);
  const [syncErrorModal,          setSyncErrorModal]          = useState<string | null>(null);

  useEffect(() => {
    const loggedUser = getLocalData('tajer_smart_user', null);
    if (loggedUser) setUser(loggedUser);

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
    toast('🔄 جارٍ اختبار ومزامنة الأشخاص والمنتجات والطلبيات مع السحابة...', 'info');
    try {
      const res = await syncStoreWithVercelCloud();
      if (res.success) {
        toast(`✅ تم المزامنة بنجاح! تم تحديث (${res.contactsCount}) شخص، (${res.productsCount}) منتج، و (${res.transactionsCount}) عملية!`, 'success');
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        setSyncErrorModal(res.errorDetails || 'تعذر الاتصال بقاعدة البيانات السحابية');
      }
    } catch (e: any) {
      setSyncErrorModal(e?.message || 'خطأ أثناء الاتصال بقاعدة البيانات');
    } finally {
      setIsSyncing(false);
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

        {/* أزرار التثبيت والمزامنة السحابية والخروج */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 bg-emerald-700/60 hover:bg-emerald-600/80 text-white rounded-xl border border-emerald-400/40 shadow-sm touch-active transition-all"
            title="مزامنة فورية لجميع الأشخاص والمنتجات والعمليات مع السحابة لتوحيد الأجهزة"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-300' : 'text-emerald-200'}`} />
            <span>مزامنة السحابة ☁️</span>
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

      {/* ── 🔍 نافذة منبثقة لطباعة وتشخيص سبب مشكلة المزامنة ── */}
      {syncErrorModal && (
        <div className="modal-overlay" onClick={() => setSyncErrorModal(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2 text-rose-600 font-black text-sm">
                <AlertCircle className="w-5 h-5" />
                تشخيص مشكلة المزامنة السحابية 🔍
              </div>
              <button onClick={() => setSyncErrorModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body space-y-3">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs font-mono text-rose-900 break-words dir-ltr text-left">
                {syncErrorModal}
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1.5 text-xs text-amber-900 font-bold">
                <p>💡 <strong>خطوة تفعيل المزامنة السحابية عبر Vercel:</strong></p>
                <p>1️⃣ بما أن قاعدة بيانات Vercel متصلة الآن، اذهب لتبويب <strong>Deployments</strong> في Vercel ثم اضغط <strong>Redeploy</strong> (إعادة النشر) ليتم قراءة متغيرات قاعدة البيانات الجديدة.</p>
                <p>2️⃣ جرب النقر على زر المزامنة السحابية ☁️ مجدداً، وسوف تكتمل المزامنة بنجاح 100%.</p>
              </div>

              <button
                onClick={() => setSyncErrorModal(null)}
                className="w-full py-2.5 bg-slate-900 text-white font-black text-xs rounded-xl"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
