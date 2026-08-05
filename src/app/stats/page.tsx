'use client';

import { useState, useEffect } from 'react';
import { getLocalData, Transaction, Contact, Product } from '@/lib/store';
import {
  TrendingUp, DollarSign, Wallet, Users,
  BarChart3, Info, Package, ArrowUpRight, ArrowDownLeft, ShieldCheck,
  PieChart, LayoutGrid
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('en-US');

export default function StatsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [contacts,     setContacts]     = useState<Contact[]>([]);
  const [products,     setProducts]     = useState<Product[]>([]);
  const [viewMode,     setViewMode]     = useState<'numbers' | 'visual'>('visual');

  useEffect(() => {
    setTransactions(getLocalData('tajer_smart_transactions_v1', []));
    setContacts(getLocalData('tajer_smart_contacts_v1', []));
    setProducts(getLocalData('tajer_smart_products_v1', []));
  }, []);

  // 1️⃣ إجمالي قيمة شراء البضاعة الموجودة في المخزن حالياً
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

  // أقصى قيمة للرسم البياني
  const maxBarValue = Math.max(1, totalStockCostValue, totalExpectedStockProfit, totalOwedToUs, totalWeOwe);

  return (
    <div className="space-y-4">

      {/* ── عنوان الصفحة وتغيير وضع العرض (بصري / أرقام) ── */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-950 p-4 rounded-2xl text-white space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              حسابات وإحصائيات المتجر
            </h2>
            <p className="text-xs text-emerald-200 font-semibold">
              اختر وضع العرض المناسب لك (أرقام أو رسم بياني بصري)
            </p>
          </div>
        </div>

        {/* 🔘 أزرار التحويل بين العرض البصري والأرقام */}
        <div className="grid grid-cols-2 gap-2 bg-black/20 p-1.5 rounded-xl">
          <button
            onClick={() => setViewMode('visual')}
            className={`py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${viewMode === 'visual' ? 'bg-white text-emerald-950 shadow-md' : 'text-white/80 hover:text-white'}`}
          >
            <PieChart className="w-4 h-4" />
            📊 العرض البياني البصري
          </button>
          <button
            onClick={() => setViewMode('numbers')}
            className={`py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${viewMode === 'numbers' ? 'bg-white text-emerald-950 shadow-md' : 'text-white/80 hover:text-white'}`}
          >
            <LayoutGrid className="w-4 h-4" />
            🔢 عرض الأرقام والمربعات
          </button>
        </div>
      </div>

      {/* ══ 1️⃣ العرض البياني البصري ══ */}
      {viewMode === 'visual' ? (
        <div className="space-y-4">
          
          {/* 📊 1. رسم بياني للأعمدة الملونة المقارنة */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-black text-sm text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              مخطط الأعمدة البيانية (قيمة البضاعة والأرباح والديون)
            </h3>

            <div className="space-y-3 pt-2">
              {/* بار قيمة شراء المخزون */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700">📦 ثمن شراء البضاعة بالمخزون</span>
                  <span className="tabnum font-black text-slate-900">{fmt(totalStockCostValue)} د.ج</span>
                </div>
                <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                  <div className="bg-slate-700 h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(5, (totalStockCostValue / maxBarValue) * 100)}%` }} />
                </div>
              </div>

              {/* بار الربح المتوقع */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-indigo-700">📈 الربح المتوقع عند البيع الكلي</span>
                  <span className="tabnum font-black text-indigo-900">+{fmt(totalExpectedStockProfit)} د.ج</span>
                </div>
                <div className="w-full bg-indigo-50 h-4 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(5, (totalExpectedStockProfit / maxBarValue) * 100)}%` }} />
                </div>
              </div>

              {/* بار ديون الزبائن */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-rose-700">📥 نطالبهم بمبلغ (ديون لي عند الزبائن)</span>
                  <span className="tabnum font-black text-rose-900">{fmt(totalOwedToUs)} د.ج</span>
                </div>
                <div className="w-full bg-rose-50 h-4 rounded-full overflow-hidden">
                  <div className="bg-rose-600 h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(5, (totalOwedToUs / maxBarValue) * 100)}%` }} />
                </div>
              </div>

              {/* بار ديون الموردين */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-blue-700">📤 يطالبوننا بمبلغ (ديون عليّ للموردين)</span>
                  <span className="tabnum font-black text-blue-900">{fmt(totalWeOwe)} د.ج</span>
                </div>
                <div className="w-full bg-blue-50 h-4 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(5, (totalWeOwe / maxBarValue) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* ⭕ 2. المخطط الدائري التفاعلي لنسبة كاش الجيب */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-900 to-teal-950 text-white shadow-md flex items-center gap-4">
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/10"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400 transition-all duration-1000"
                  strokeDasharray={`${profitProgressPct}, 100`}
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute font-black text-base tabnum">{profitProgressPct}%</span>
            </div>

            <div className="space-y-1 min-w-0">
              <h4 className="font-black text-sm text-emerald-300">نسبة أرباحك الكاش المحصلة 💵</h4>
              <p className="text-xs text-white/90 font-bold tabnum">
                تم تحصيل +{fmt(cashCollectedProfit)} د.ج نقدياً
              </p>
              <p className="text-[10px] text-emerald-200/80 font-semibold">
                من إجمالي مبيعات قدرها {fmt(totalGrossProfit)} د.ج
              </p>
            </div>
          </div>

        </div>
      ) : (
        /* ══ 2️⃣ عرض الأرقام والمربعات الصريحة ══ */
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="flex justify-between items-center text-slate-500">
                <span className="text-xs font-bold text-slate-700">ثمن شراء البضاعة 📦</span>
                <Package className="w-4 h-4 text-slate-600" />
              </div>
              <p className="text-xl font-black tabnum text-slate-900 leading-tight">{fmt(totalStockCostValue)} <span className="text-xs">د.ج</span></p>
              <p className="text-[10px] font-bold text-slate-400">تكلفة البضاعة بالمخزن بالجملة</p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 shadow-sm space-y-1">
              <div className="flex justify-between items-center text-indigo-700">
                <span className="text-xs font-bold">ربحك لو باعتها كلها 📈</span>
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-xl font-black tabnum text-indigo-800 leading-tight">+{fmt(totalExpectedStockProfit)} <span className="text-xs">د.ج</span></p>
              <p className="text-[10px] font-bold text-indigo-600">فارق سعر البيع للجملة والتجزئة</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
              <div className="flex justify-between items-center text-rose-700">
                <span className="text-xs font-bold">نطالبه بمبلغ (يدفع لي) 📥</span>
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl font-black tabnum text-rose-800">{fmt(totalOwedToUs)} <span className="text-xs">د.ج</span></p>
              <p className="text-[10px] font-bold text-rose-600">ديون لي عند الزبائن</p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-1">
              <div className="flex justify-between items-center text-blue-700">
                <span className="text-xs font-bold">يطالبنا بمبلغ (أسدد له) 📤</span>
                <ArrowDownLeft className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black tabnum text-blue-800">{fmt(totalWeOwe)} <span className="text-xs">د.ج</span></p>
              <p className="text-[10px] font-bold text-blue-600">ديون عليّ للموردين</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-700" />
                <h3 className="font-black text-sm text-emerald-900">صافي الربح النقدي في جيبك (كاش) 💵</h3>
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-black tabnum text-emerald-800">
                +{fmt(cashCollectedProfit)} <span className="text-sm">د.ج</span>
              </p>
              <p className="text-xs font-bold text-emerald-700">
                من أصل <strong className="tabnum">{fmt(totalGrossProfit)}</strong> د.ج ربح مبيعات
              </p>
            </div>
          </div>
        </div>
      )}

      {/* توضيح مبسط ختامي */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-start gap-2.5 text-xs font-semibold text-slate-700">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <span>
          يمكنك التحويل بين <strong>العرض البياني البصري</strong> و <strong>عرض الأرقام</strong> في أي وقت من الأزرار العلوية!
        </span>
      </div>

    </div>
  );
}
