'use client';

import { useState, useEffect } from 'react';
import { getLocalData, Transaction, Contact, Product } from '@/lib/store';
import {
  TrendingUp, DollarSign, Wallet, Users,
  BarChart3, Info, Package, ArrowUpRight, ArrowDownLeft, ShieldCheck
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('en-US');

export default function StatsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [contacts,     setContacts]     = useState<Contact[]>([]);
  const [products,     setProducts]     = useState<Product[]>([]);

  useEffect(() => {
    setTransactions(getLocalData('tajer_smart_transactions_v1', []));
    setContacts(getLocalData('tajer_smart_contacts_v1', []));
    setProducts(getLocalData('tajer_smart_products_v1', []));
  }, []);

  // 1️⃣ إجمالي سعر شراء البضاعة الموجودة في المخزن حالياً (تكلفة المخزون)
  const totalStockCostValue = products.reduce((sum, p) => sum + (p.cost_price * p.stock_quantity), 0);

  // 2️⃣ إجمالي الربح الكلي المتوقع عند بيع كل البضاعة الموجودة في المخزن
  const totalExpectedStockProfit = products.reduce((sum, p) => sum + ((p.retail_price - p.cost_price) * p.stock_quantity), 0);

  // 3️⃣ الديون البسيطة المباشرة
  const totalOwedToUs = contacts.filter(c => c.balance > 0).reduce((sum, c) => sum + c.balance, 0);
  const totalWeOwe    = contacts.filter(c => c.balance < 0).reduce((sum, c) => sum + Math.abs(c.balance), 0);

  // 4️⃣ المبيعات والأرباح النقدية الفعلية
  const salesTx = transactions.filter(t => t.tx_type === 'SALE');
  const totalSales = salesTx.reduce((sum, t) => sum + t.total_amount, 0);
  const totalPaidCash = salesTx.reduce((sum, t) => sum + t.paid_amount, 0);

  const totalGrossProfit = salesTx.reduce((sum, t) => {
    const itemProfit = t.items.reduce((pSum, item) => {
      const margin = item.unit_price - (item.cost_price || 0);
      return pSum + (margin * item.quantity);
    }, 0);
    return sum + itemProfit;
  }, 0);

  const cashProfitRatio = totalSales > 0 ? (totalPaidCash / totalSales) : 1;
  const cashCollectedProfit = Math.round(totalGrossProfit * cashProfitRatio);

  const profitProgressPct = totalGrossProfit > 0 ? Math.min(100, Math.round((cashCollectedProfit / totalGrossProfit) * 100)) : 100;

  return (
    <div className="space-y-4">

      {/* ── عنوان الصفحة البسيط ── */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-950 p-4 rounded-2xl text-white space-y-1 shadow-md">
        <h2 className="font-black text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          حسابات المتجر والأرباح البسيطة
        </h2>
        <p className="text-xs text-emerald-200 font-semibold">
          ملخص مالي مبسط ومفهوم يوضح لك بضاعتك وأرباحك وديونك
        </p>
      </div>

      {/* ── 📦 قيمة المخزون والربح المتوقع ببطاقتين بارزتين ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* ثمن شراء كل البضاعة */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-bold text-slate-700">قيمة شراء البضاعة 📦</span>
            <Package className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-xl font-black tabnum text-slate-900 leading-tight">{fmt(totalStockCostValue)} <span className="text-xs">د.ج</span></p>
          <p className="text-[10px] font-bold text-slate-400">تكلفة البضاعة بالمخزن بالجملة</p>
        </div>

        {/* الربح المتوقع عند بيع البضاعة كاملة */}
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-indigo-700">
            <span className="text-xs font-bold">ربحك لو باعتها كلها 📈</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-black tabnum text-indigo-800 leading-tight">+{fmt(totalExpectedStockProfit)} <span className="text-xs">د.ج</span></p>
          <p className="text-[10px] font-bold text-indigo-600">فارق سعر البيع للجملة والتجزئة</p>
        </div>
      </div>

      {/* ── 🟢/🔴 الديون بمصطلحات صريحة ومفهومة ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* نطالبهم بمبلغ */}
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
          <div className="flex justify-between items-center text-rose-700">
            <span className="text-xs font-bold">نطالبهم بمبلغ (يدفعون لي) 📥</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black tabnum text-rose-800">{fmt(totalOwedToUs)} <span className="text-xs">د.ج</span></p>
          <p className="text-[10px] font-bold text-rose-600">ديون لي عند الزبائن</p>
        </div>

        {/* يطالبوننا بمبلغ */}
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-1">
          <div className="flex justify-between items-center text-blue-700">
            <span className="text-xs font-bold">يطالبوننا بمبلغ (أسدد لهم) 📤</span>
            <ArrowDownLeft className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black tabnum text-blue-800">{fmt(totalWeOwe)} <span className="text-xs">د.ج</span></p>
          <p className="text-[10px] font-bold text-blue-600">ديون عليّ للموردين</p>
        </div>
      </div>

      {/* ── 💵 بطاقة الأرباح المحصلة كاش في جيبك ── */}
      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-700" />
            <h3 className="font-black text-sm text-emerald-900">صافي الربح النقدي في جيبك (كاش) 💵</h3>
          </div>
          <span className="badge badge-success text-[10px] font-black">{profitProgressPct}% محصل</span>
        </div>

        <div className="flex items-baseline justify-between">
          <p className="text-3xl font-black tabnum text-emerald-800">
            +{fmt(cashCollectedProfit)} <span className="text-sm">د.ج</span>
          </p>
          <p className="text-xs font-bold text-emerald-700">
            من أصل <strong className="tabnum">{fmt(totalGrossProfit)}</strong> د.ج ربح مبيعات
          </p>
        </div>

        {/* شريط التقدم البصري */}
        <div className="w-full bg-emerald-200/60 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-emerald-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${profitProgressPct}%` }}
          />
        </div>
      </div>

      {/* توضيح مبسط ختامي */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-start gap-2.5 text-xs font-semibold text-slate-700">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <span>
          <strong>ملاحظة بسيطة:</strong> عند قيام أي زبون بتسديد ما عليه في صفحة الديون، يُضاف ربحه فوراً إلى <strong>"ربح الكاش في جيبك"</strong> تلقائياً!
        </span>
      </div>

    </div>
  );
}
