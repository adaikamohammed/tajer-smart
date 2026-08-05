'use client';

import { createWhatsAppLink } from '@/lib/store';
import { toast } from '@/components/Toast';
import {
  Phone, MessageCircle, Share2, Award,
  Sparkles, HeartHandshake,
  GraduationCap, Laptop, CheckCircle, Gift, DollarSign
} from 'lucide-react';

export default function DeveloperPage() {
  const phone = '0673282819';
  const whatsappPhone = '213673282819';

  const developerMsg = `السلام عليكم أستاذ محمد عدايكة، أتواصل معك من تطبيق التاجر الذكي...`;
  const recommendationMsg = `السلام عليكم أستاذ محمد عدايكة 👋\nأنا التاجر (شكيمة فوزي)، أود التوصية بتاجر جديد للتطبيق 🤝`;

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
              متخصص في بناء الحلول البرمجية وتطبيقات التجار والمؤسسات ⚡
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

      {/* ══ الحلول الترويجية وم مكافآت التاجر القديم ══ */}
      <div className="glass-card p-5 rounded-3xl space-y-4">
        <div className="flex items-center gap-2.5 border-b pb-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-base">مكافآت التاجر عند التوصية 🤝</h3>
            <p className="text-xs text-slate-500 font-semibold">استراتيجيات ترويجية عادلة ومربحة للتاجر القديم</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* خيارات المكافأة */}
          <div className="space-y-2.5">
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-emerald-900">1. استرجاع نقدي (Cash-Back)</p>
                <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                  كل تاجر يشتري التطبيق عن طريقك، تحول لك عمولة نقدية مباشرة كاش أو عبر CCP!
                </p>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-2xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-indigo-900">2. رصيد تطوير وتعديلات مجانية</p>
                <p className="text-[11px] text-indigo-700 font-semibold mt-0.5">
                  رصيد خاص يتيح لك طلب تعديلات برمجة وميزات مخصصة لمتجرك مجاناً لدى المطور.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-start gap-3">
              <Award className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-amber-900">3. ترقية لمرتبة "التاجر السفير VIP"</p>
                <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                  دعم فني وتحديثات مستمرة أولوية 24/7.
                </p>
              </div>
            </div>
          </div>

          <a
            href={createWhatsAppLink(whatsappPhone, recommendationMsg)}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md touch-active"
          >
            <HeartHandshake className="w-4 h-4" />
            التوصية بتاجر جديد للمطور 📲
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
            <h4 className="font-black text-slate-800 text-xs">تريد تطوير موقع أو تطبيق جديد؟</h4>
            <p className="text-[11px] text-slate-500 font-semibold">تواصل مع المطور محمد عدايكة ⚡</p>
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
