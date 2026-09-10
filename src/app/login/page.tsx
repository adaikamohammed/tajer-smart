'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setLocalData, clearLocalDataCache, initStorageIfEmpty } from '@/lib/store';
import { toast } from '@/components/Toast';
import { Mail, Lock, ArrowLeft, ShieldCheck, CheckCircle2, UserCheck, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin213@gmail.com');
  const [password, setPassword] = useState('123456');

  const cleanEmail = email.trim().toLowerCase();

  const selectAccount = (selectedEmail: string) => {
    setEmail(selectedEmail);
    setPassword('123456');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (cleanEmail === 'admin213@gmail.com' && password === '123456') {
      const merchantData = {
        name: 'شكيمة فوزي',
        email: 'admin213@gmail.com',
        role: 'تاجر متنقل',
        merchantName: 'التاجر المتنقل',
        phone: '0662555856',
        address: 'تكسبت / الوادي',
        loggedAt: new Date().toISOString(),
      };
      setLocalData('tajer_smart_user', merchantData);
      setLocalData('tajer_smart_logged_in', true);
      clearLocalDataCache();
      initStorageIfEmpty();
      toast('مرحباً بك يا أستاذ شكيمة فوزي! 👋', 'success');
      router.push('/');
    } else if (cleanEmail === 'tajer@gmail.com' && password === '123456') {
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
      toast('مرحباً بك! تم تسجيل الدخول في حساب التاجر التجريبي المنفصل بنجاح 🚀', 'success');
      router.push('/');
    } else {
      toast('البريد أو كلمة المرور غير صحيحة! تأكد من إدخال admin213@gmail.com أو tajer@gmail.com مع كلمة السر 123456', 'error');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-2">
      <div className="w-full max-w-md space-y-6">

        {/* الشعار */}
        <div className="text-center space-y-3">
          <div className="relative inline-block">
            <img
              src="/logo.jpg"
              alt="التاجر الذكي"
              className="w-24 h-24 mx-auto rounded-3xl shadow-xl border-4 border-white object-cover"
            />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">تسجيل الدخول — التاجر الذكي</h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">تطبيق الإدارة التجارية للتاجر المتنقل 🚛</p>
          </div>
        </div>

        {/* نموذج الدخول */}
        <div className="glass-card p-6 space-y-5 rounded-3xl">

          {/* بطاقات الحسابات المتوفرة للاختيار السريع */}
          <div className="space-y-2">
            <p className="text-xs font-black text-slate-700">اختر الحساب للتجربة بنقرة واحدة:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              
              {/* حساب فوزي شكيمة */}
              <button
                type="button"
                onClick={() => selectAccount('admin213@gmail.com')}
                className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between touch-active ${
                  cleanEmail === 'admin213@gmail.com'
                    ? 'bg-emerald-50 border-emerald-400 shadow-sm ring-2 ring-emerald-400/30'
                    : 'bg-white border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-xs text-slate-900 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    فوزي شكيمة
                  </span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">رئيسي</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">admin213@gmail.com</div>
              </button>

              {/* حساب التاجر التجريبي المستقل */}
              <button
                type="button"
                onClick={() => selectAccount('tajer@gmail.com')}
                className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between touch-active ${
                  cleanEmail === 'tajer@gmail.com'
                    ? 'bg-indigo-50 border-indigo-400 shadow-sm ring-2 ring-indigo-400/30'
                    : 'bg-white border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-xs text-slate-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    تاجر تجريبي
                  </span>
                  <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold">منفصل 100%</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">tajer@gmail.com</div>
              </button>

            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-slate-400" />
                البريد الإلكتروني للتاجر
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tajer@gmail.com"
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
                placeholder="123456"
                className="form-input font-black text-slate-800 tracking-widest"
              />
            </div>

            <button
              type="submit"
              className={`btn w-full py-4 text-base shadow-lg touch-active flex items-center justify-center gap-2 ${
                cleanEmail === 'tajer@gmail.com'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'btn-primary'
              }`}
            >
              <span>
                {cleanEmail === 'tajer@gmail.com'
                  ? 'دخول التاجر التجريبي (حساب منفصل) 🚀'
                  : 'دخول التاجر (شكيمة فوزي) 🚛'}
              </span>
              <ArrowLeft className="w-5 h-5" />
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
