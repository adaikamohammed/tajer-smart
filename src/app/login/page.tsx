'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setLocalData, clearLocalDataCache, initStorageIfEmpty } from '@/lib/store';
import { toast } from '@/components/Toast';
import { Mail, Lock, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

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
      toast('مرحباً بك في حسابك! 👋', 'success');
      router.push('/');
    } else {
      toast('البريد الإلكتروني أو كلمة المرور غير صحيحة!', 'error');
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
