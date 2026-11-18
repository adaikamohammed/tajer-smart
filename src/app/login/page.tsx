'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setLocalData, clearLocalDataCache, initStorageIfEmpty } from '@/lib/store';
import { isAccountFrozen, DEFAULT_SUSPENSION_INFO } from '@/lib/access-control';
import { executeRemoteWipe } from '@/lib/remote-wipe';
import { toast } from '@/components/Toast';
import {
  Mail, Lock, ArrowLeft, ShieldAlert,
  Phone, MessageCircle, AlertTriangle
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isFrozenState, setIsFrozenState] = useState(false);
  const [frozenReason, setFrozenReason] = useState(DEFAULT_SUSPENSION_INFO.reason);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const isParamFrozen = searchParams.get('frozen') === 'true';
      const isLocalFrozen = localStorage.getItem('tajer_account_frozen') === 'true';
      const savedReason = localStorage.getItem('tajer_frozen_reason');

      if (isParamFrozen || isLocalFrozen) {
        setIsFrozenState(true);
        if (savedReason) setFrozenReason(savedReason);
      }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    // ─── 1. الحساب المجمد: منع قاطع وتنفيذ أمر المسح والتجميد الفوري ───
    if (isAccountFrozen(cleanEmail)) {
      executeRemoteWipe('تم تجميد هذا الحساب بسبب عدم سداد المستحقات المالية.');
      setIsFrozenState(true);
      toast('⛔ هذا الحساب مجمّد رسمياً لعدم سداد المستحقات المالية! يُرجى التواصل مع الإدارة.', 'error');
      return;
    }

    // ─── 2. الحساب التجريبي المسموح ───
    if (cleanEmail === 'tajer@gmail.com' && password === '123456') {
      // إزالة أي علامة تجميد تخص الحساب السابق
      localStorage.removeItem('tajer_account_frozen');
      localStorage.removeItem('tajer_frozen_reason');

      const merchantData = {
        name: 'التاجر التجريبي',
        email: 'tajer@gmail.com',
        role: 'تاجر تجريبي',
        merchantName: 'متجر التاجر',
        phone: '0550000000',
        address: 'الجزائر',
        loggedAt: new Date().toISOString(),
      };
      setLocalData('tajer_smart_user', merchantData);
      setLocalData('tajer_smart_logged_in', true);
      clearLocalDataCache();
      initStorageIfEmpty();
      toast('مرحباً بك في حسابك! 👋', 'success');
      router.push('/');
    }
    // ─── 3. حساب إدارة المنصة والمطور ───
    else if ((cleanEmail === 'admin@tajersmart.com' || cleanEmail === 'dev@tajersmart.com') && password === 'admin2026') {
      localStorage.removeItem('tajer_account_frozen');
      localStorage.removeItem('tajer_frozen_reason');

      const devData = {
        name: 'م. محمد عدايكة',
        email: cleanEmail,
        role: 'إدارة المنصة',
        merchantName: 'إدارة التاجر الذكي',
        phone: '0673282819',
        address: 'الجزائر',
        loggedAt: new Date().toISOString(),
      };
      setLocalData('tajer_smart_user', devData);
      setLocalData('tajer_smart_logged_in', true);
      clearLocalDataCache();
      initStorageIfEmpty();
      toast('مرحباً بك يا أستاذ محمد عدايكة (إدارة المنصة) 👋', 'success');
      router.push('/');
    } else {
      toast('البريد الإلكتروني أو كلمة المرور غير صحيحة!', 'error');
    }
  };

  const whatsappLink = `https://wa.me/${DEFAULT_SUSPENSION_INFO.supportWhatsApp}?text=${encodeURIComponent(
    'السلام عليكم أستاذ محمد عدايكة، أتواصل معك بخصوص تجميد حسابي في تطبيق التاجر الذكي لتسوية المستحقات المالية.'
  )}`;

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-2" dir="rtl">
      <div className="w-full max-w-md space-y-6">

        {/* الشعار */}
        <div className="text-center space-y-3">
          <div className="relative inline-block">
            <img
              src="/logo.jpg"
              alt="التاجر الذكي"
              className="w-24 h-24 mx-auto rounded-3xl shadow-xl border-4 border-white object-cover"
            />
            <div className={`absolute -bottom-1 -right-1 p-1.5 rounded-full shadow-md ${isFrozenState ? 'bg-rose-600 text-white' : 'bg-emerald-500 text-white'}`}>
              {isFrozenState ? <ShieldAlert className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              {isFrozenState ? 'تطبيق التاجر الذكي — معلق' : 'تسجيل الدخول — التاجر الذكي'}
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">تطبيق الإدارة التجارية للتاجر المتنقل 🚛</p>
          </div>
        </div>

        {/* بطاقة الحظر والتجميد الفوري إذا كان الحساب مجمداً */}
        {isFrozenState && (
          <div className="p-5 rounded-3xl bg-rose-50 border-2 border-rose-300 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-900 leading-tight">
                  {DEFAULT_SUSPENSION_INFO.title}
                </h3>
                <span className="text-[11px] font-bold text-rose-700">
                  {DEFAULT_SUSPENSION_INFO.badge}
                </span>
              </div>
            </div>

            <p className="text-xs font-bold text-rose-800 leading-relaxed bg-white/70 p-3 rounded-2xl border border-rose-200">
              {DEFAULT_SUSPENSION_INFO.message}
            </p>

            <div className="pt-2 border-t border-rose-200 space-y-2">
              <p className="text-[11px] font-black text-rose-900">لإعادة تفعيل الحساب وتسوية الوضعية:</p>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`tel:${DEFAULT_SUSPENSION_INFO.supportPhone}`}
                  className="py-3 bg-white hover:bg-slate-50 text-rose-800 border border-rose-300 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-sm touch-active"
                >
                  <Phone className="w-4 h-4 text-rose-600" />
                  <span>اتصال هاتفي</span>
                </a>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md touch-active"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>واتساب الإدارة</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* نموذج الدخول */}
        <div className="glass-card p-6 space-y-5 rounded-3xl">

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-slate-400" />
                البريد الإلكتروني
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="form-input text-left dir-ltr font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-slate-400" />
                كلمة المرور
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="form-input font-black text-slate-800 tracking-widest"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full py-4 text-base shadow-lg touch-active flex items-center justify-center gap-2"
            >
              <span>دخول التاجر</span>
              <ArrowLeft className="w-5 h-5" />
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
