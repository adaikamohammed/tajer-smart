'use client';

import { createWhatsAppLink } from '@/lib/store';
import { toast } from '@/components/Toast';
import {
  Code, Phone, MessageCircle, Share2, Award,
  Sparkles, ShieldCheck, HeartHandshake, DollarSign,
  GraduationCap, Laptop, CheckCircle
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('en-US');

export default function DeveloperPage() {
  const phone = '0673282819';
  const whatsappPhone = '213673282819';

  const developerMsg = `السلام عليكم أستاذ محمد عدايكة، أتواصل معك من تطبيق التاجر الذكي لطلب (تطوير / صيانة / استفسار)...`;

  const referralMsg = `مرحباً أستاذ محمد عدايكة 👋\nأنا التاجر (شكيمة فوزي)، أود التوصية بتاجر جديد لشراء تطبيق التاجر الذكي بـ 20,000 د.ج للحصول على الخصم والعمولة 🤝`;

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.origin);
      toast('تم نسخ رابط التطبيق بنجاح! 📋', 'success');
    }
  };

  return (
    <div className="space-y-4 pb-4">

      {/* ══ بطاقة المطور ══ */}
      <div className="glass-card p-5 rounded-3xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-600" />

        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white text-3xl font-black shadow-lg border-2 border-emerald-500/30">
              م.ع
            </div>
            <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full text-xs shadow">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              محمد عدايكة
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                المطور الرسمي 💻
              </span>
            </h2>
            <p className="text-xs text-slate-600 font-bold flex items-center gap-1">
              <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
              طالب دكتوراه & مطور تطبيقات ومواقع
            </p>
            <p className="text-[11px] text-slate-500 font-semibold leading-tight">
              متخصص في بناء الحلول البرمجية الذكية وتطبيقات التجار والمؤسسات ⚡
            </p>
          </div>
        </div>

        {/* أزرار التواصل المباشر */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
          <a
            href={`tel:${phone}`}
            className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-black text-xs flex items-center justify-center gap-2 touch-active"
          >
            <Phone className="w-4 h-4 text-slate-600" />
            اتصال هاتفي
          </a>

          <a
            href={createWhatsAppLink(whatsappPhone, developerMsg)}
            target="_blank"
            rel="noreferrer"
            className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 touch-active shadow-md"
          >
            <MessageCircle className="w-4 h-4" />
            واتساب المطور
          </a>
        </div>
      </div>

      {/* ══ نموذج التسعير والعمولات ══ */}
      <div className="glass-card p-5 rounded-3xl space-y-4">
        <div className="flex items-center gap-2.5 border-b pb-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-base">سعر التطبيق ونظام العمولات 🤝</h3>
            <p className="text-xs text-slate-500 font-semibold">اربح معنا عند التوصية بتاجر جديد</p>
          </div>
        </div>

        {/* سعر السلسلة */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white p-4 rounded-2xl space-y-2 shadow-md">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-100">سعر التطبيق للتاجر الجديد</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">مدى الحياة ♾️</span>
          </div>
          <p className="text-2xl font-black tabnum">
            20,000 <span className="text-base font-normal">د.ج (2 مليون سنتيم)</span>
          </p>
          <p className="text-[11px] text-emerald-100 leading-relaxed font-medium">
            تطبيق كامل بدون اشتراك شهري، مع تحديثات مستمرة ودعم فني مخصص.
          </p>
        </div>

        {/* استراتيجية التوصية والعمولة */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <HeartHandshake className="w-4 h-4 text-emerald-600" />
            كيف تربح عمولة عند التوصية بتاجر آخر؟
          </h4>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl space-y-1">
              <p className="font-black text-emerald-800">عمولتك كتاجر مُوصِي</p>
              <p className="text-lg font-black text-emerald-700 tabnum">+3,000 د.ج</p>
              <p className="text-[10px] text-emerald-600 font-semibold">(300 ألف سنتيم كاش)</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl space-y-1">
              <p className="font-black text-blue-800">خصم التاجر الجديد</p>
              <p className="text-lg font-black text-blue-700 tabnum">-2,000 د.ج</p>
              <p className="text-[10px] text-blue-600 font-semibold">(يشتري بـ 18,000 د.ج)</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            💡 <strong>Win-Win:</strong> يحصل التاجر الجديد على خصم مشجع، وتحصل أنت على عمولتك النقدية فوراً من المطور لتقديمك الخدمة لزملائك التجار.
          </p>

          <a
            href={createWhatsAppLink(whatsappPhone, referralMsg)}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md touch-active"
          >
            <Sparkles className="w-4 h-4" />
            توصية بتاجر جديد الآن واكسب 3,000 د.ج 📲
          </a>
        </div>
      </div>

      {/* ══ طلب تطوير مخصص ══ */}
      <div className="glass-card p-4 rounded-3xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-slate-800 text-xs">تريد تطوير موقع أو تطبيق خاص بك؟</h4>
            <p className="text-[11px] text-slate-500 font-semibold">اتصل بالمطور مباشرة لتنفيذ فكرتك ⚡</p>
          </div>
        </div>

        <button
          onClick={handleCopyLink}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl shrink-0 touch-active"
          title="مشاركة رابط التطبيق"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
