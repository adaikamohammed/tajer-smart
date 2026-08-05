'use client';

import { useState, useEffect } from 'react';
import { getLocalData, Transaction, Contact } from '@/lib/store';
import {
  TrendingUp, DollarSign, Wallet, Users,
  BarChart3, Info, AlertCircle
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('en-US');

export default function StatsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [contacts,     setContacts]     = useState<Contact[]>([]);

  useEffect(() => {
    setTransactions(getLocalData('tajer_smart_transactions_v1', []));
    setContacts(getLocalData('tajer_smart_contacts_v1', []));
  }, []);

  // المبيعات والديون
  const salesTx = transactions.filter(t => t.tx_type === 'SALE');
  const totalSales = salesTx.reduce((sum, t) => sum + t.total_amount, 0);
  const totalPaidCash = salesTx.reduce((sum, t) => sum + t.paid_amount, 0);

  // إجمالي الأرباح النظري
  const totalGrossProfit = salesTx.reduce((sum, t) => {
    const itemProfit = t.items.reduce((pSum, item) => {
      const margin = item.unit_price - (item.cost_price || 0);
      return pSum + (margin * item.quantity);
    }, 0);
    return sum + itemProfit;
  }, 0);

  // الأرباح المحصلة نقداً كاش (نسبة الربح من المبالغ المدفوعة نقدياً)
  const cashProfitRatio = totalSales > 0 ? (totalPaidCash / totalSales) : 1;
  const cashCollectedProfit = Math.round(totalGrossProfit * cashProfitRatio);

  // الديون المتبقية بالخارج والديون للموردين
  const totalDebtsOwedToUs = contacts.filter(c => c.balance > 0).reduce((s, c) => s + c.balance, 0);
  const totalDebtsWeOwe    = contacts.filter(c => c.balance < 0).reduce((s, c) => s + Math.abs(c.balance), 0);

  return (
    <div className="space-y-4">

      {/* ── العنوان والشرح ── */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-950 p-4 rounded-2xl text-white space-y-1 shadow-md">
        <h2 className="font-black text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          مؤشرات الأرباح والحسابات الدقيقة
        </h2>
        <p className="text-xs text-emerald-200 font-semibold">
          حسابات شفافة توضح لك الدخل النقدي الفعلي والديون المتبقية
        </p>
      </div>

      {/* ── مربعات الحسابات الدقيقة ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* المبيعات الكلية */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-bold">إجمالي المبيعات</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black tabnum text-slate-900">{fmt(totalSales)} <span className="text-xs">د.ج</span></p>
          <p className="text-[10px] font-bold text-slate-400">شاملة النقدي والدين</p>
        </div>

        {/* الكاش المحصل فعلياً */}
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-emerald-700">
            <span className="text-xs font-bold">المحصل كاش 💵</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black tabnum text-emerald-800">{fmt(totalPaidCash)} <span className="text-xs">د.ج</span></p>
          <p className="text-[10px] font-bold text-emerald-600">المبالغ المستلمة يداً بيد</p>
        </div>
      </div>

      {/* ── الأرباح الدقيقة ── */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
        <h3 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          تفاصيل صافي الأرباح
        </h3>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
            <p className="font-bold text-[11px] text-emerald-700">الربح المحصل كاش 💵</p>
            <p className="text-lg font-black tabnum mt-1">+{fmt(cashCollectedProfit)} د.ج</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">الربح الفعلي من المبيعات المسددة</p>
          </div>

          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-900">
            <p className="font-bold text-[11px] text-indigo-700">إجمالي الأرباح المتوقعة 📊</p>
            <p className="text-lg font-black tabnum mt-1">+{fmt(totalGrossProfit)} د.ج</p>
            <p className="text-[10px] text-indigo-600 mt-0.5">الربح الكامل بعد تحصيل كافة الديون</p>
          </div>
        </div>
      </div>

      {/* ── الديون بالخارج والديون للموردين ── */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
          <p className="font-bold text-rose-700">ديون لي على الزبائن</p>
          <p className="text-lg font-black tabnum text-rose-800">{fmt(totalDebtsOwedToUs)} د.ج</p>
          <p className="text-[10px] text-rose-600">مبالغ غير محصلة بعد</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 space-y-1">
          <p className="font-bold text-blue-700">ديون عليّ للموردين</p>
          <p className="text-lg font-black tabnum text-blue-800">{fmt(totalDebtsWeOwe)} د.ج</p>
          <p className="text-[10px] text-blue-600">مستحقات واجبة السداد</p>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex items-start gap-2 text-xs font-semibold text-slate-600">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <span>
          عندما يقوم الزبون بتسديد دينه في صفحة الديون، يتم تحويل أرباح ذلك الدين تلقائياً لخانة <strong>"الربح المحصل كاش"</strong>!
        </span>
      </div>

    </div>
  );
}
