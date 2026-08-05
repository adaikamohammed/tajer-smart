'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setLocalData } from '@/lib/store';
import { toast } from '@/components/Toast';
import { Store, Lock, Mail, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('chala.fowzi@tajer.dz');
  const [password, setPassword] = useState('123456');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (email.trim().toLowerCase() === 'chala.fowzi@tajer.dz' && password === '123456') {
      const merchantData = {
        name: 'شكيمة فوزي',
        email: 'chala.fowzi@tajer.dz',
        role: 'تاجر متنقل',
        loggedAt: new Date().toISOString(),
      };
      setLocalData('tajer_smart_user', merchantData);
      setLocalData('tajer_smart_logged_in', true);
      toast('مرحباً بك يا أستاذ شكيمة فوزي! 👋', 'success');
      router.push('/');
    } else {
      toast('البريد أو كلمة المرور غير صحيحة! (جرب: chala.fowzi@tajer.dz / 123456)', 'error');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-2">
      <div className="w-full max-w-md space-y-6">

        {/* الشعار والأنيميشن */}
        <div className="text-center space-y-3">
          <div className="relative inline-block">
            <img
              src="/logo.jpg"
              alt="التاجر الذكي"
              className="w-24 h-24 mx-auto rounded-3xl shadow-xl border-4 border-white object-cover animate-bounce-in"
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

        {/* كارت النموذج */}
        <div className="glass-card p-6 space-y-5 rounded-3xl">

          {/* تنبيه بالبيانات الافتراضية للتاجر */}
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-800">
              <p className="font-black">حساب التاجر المعتمد جاهز:</p>
              <p className="font-semibold mt-0.5">البريد: <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-900">chala.fowzi@tajer.dz</code></p>
              <p className="font-semibold">كلمة المرور: <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-900">123456</code></p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-slate-400" />
                البريد الإلكتروني للتاجر (English)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="chala.fowzi@tajer.dz"
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
              className="btn btn-primary w-full py-4 text-base shadow-lg touch-active flex items-center justify-center gap-2"
            >
              <span>دخول التاجر (شكيمة فوزي)</span>
              <ArrowLeft className="w-5 h-5" />
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
