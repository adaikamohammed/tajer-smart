'use client';

import { useState, useEffect } from 'react';
import { getLocalData, Contact, Product, Transaction } from '@/lib/store';
import {
  PieChart, TrendingUp, Award, DollarSign,
  ArrowUpRight, ArrowDownLeft, CheckCircle2,
  Package, AlertTriangle, Sparkles
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('en-US');

export default function StatsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    setContacts(getLocalData('tajer_smart_contacts_v1', []));
    setProducts(getLocalData('tajer_smart_products_v1', []));
    setTransactions(getLocalData('tajer_smart_transactions_v1', []));
  }, []);

  /* ── الحسابات ── */
  const totalSalesCount = transactions.filter(t => t.tx_type === 'SALE').length;
  const totalPurchasesCount = transactions.filter(t => t.tx_type === 'PURCHASE').length;

  const totalSalesAmount = transactions
    .filter(t => t.tx_type === 'SALE')
    .reduce((acc, t) => acc + t.total_amount, 0);

  const totalNetProfit = transactions
    .filter(t => t.tx_type === 'SALE')
    .reduce((acc, t) =>
      acc + t.items.reduce((sum, i) => sum + (i.unit_price - i.cost_price) * i.quantity, 0), 0
    );

  const totalDebtsOwedToUs = contacts
    .filter(c => c.balance > 0)
    .reduce((acc, c) => acc + c.balance, 0);

  const totalDebtsWeOwe = contacts
    .filter(c => c.balance < 0)
    .reduce((acc, c) => acc + Math.abs(c.balance), 0);

  // المنتج الأكثر مبيعاً
  const productSalesMap: Record<string, { name: string; qty: number; profit: number }> = {};
  transactions
    .filter(t => t.tx_type === 'SALE')
    .forEach(t => {
      t.items.forEach(i => {
        if (!productSalesMap[i.product_id]) {
          productSalesMap[i.product_id] = { name: i.product_name, qty: 0, profit: 0 };
        }
        productSalesMap[i.product_id].qty += i.quantity;
        productSalesMap[i.product_id].profit += (i.unit_price - i.cost_price) * i.quantity;
      });
    });

  const topProduct = Object.values(productSalesMap).sort((a, b) => b.qty - a.qty)[0];

  // نسبة تحصيل الديون
  const totalCollected = transactions
    .filter(t => t.tx_type === 'SALE')
    .reduce((acc, t) => acc + t.paid_amount, 0);
  const collectionRate = totalSalesAmount > 0 ? Math.round((totalCollected / totalSalesAmount) * 100) : 100;

  return (
    <div className="space-y-4">

      {/* ══ العنوان البسيط ══ */}
      <div className="glass-card p-4 rounded-3xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-slate-800 text-base">إحصائيات التجار المبسطة 📊</h2>
            <p className="text-xs text-slate-500 font-semibold">أرقامك ومبيعاتك بصورة بصرية واضحة</p>
          </div>
        </div>
        <span className="badge badge-success">مباشر ⚡</span>
      </div>

      {/* ══ بطاقتان كبيرتان: الأرباح والمبيعات ══ */}
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card emerald">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-emerald-700">💰 صافي الأرباح</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-800 tabnum">
            {fmt(totalNetProfit)} <span className="text-xs font-normal">د.ج</span>
          </p>
          <p className="text-[10px] text-emerald-600 font-bold mt-1">الأرباح الفعلية المحسوبة</p>
        </div>

        <div className="stat-card indigo">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-indigo-700">🛒 إجمالي المبيعات</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-800 tabnum">
            {fmt(totalSalesAmount)} <span className="text-xs font-normal">د.ج</span>
          </p>
          <p className="text-[10px] text-indigo-600 font-bold mt-1">{totalSalesCount} عملية بيع</p>
        </div>
      </div>

      {/* ══ المنتج الأكثر مبيعاً ══ */}
      {topProduct ? (
        <div className="glass-card p-4 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-800 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-600" />
              المنتج الأكثر مبيعاً ونشاطاً 🏆
            </span>
            <span className="badge badge-warning">{topProduct.qty} قطعة مباعة</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <h3 className="font-black text-slate-900 text-base">{topProduct.name}</h3>
            <p className="font-black text-amber-700 text-sm tabnum">
              ربح: +{fmt(topProduct.profit)} د.ج
            </p>
          </div>
        </div>
      ) : (
        <div className="empty-state py-6">
          <Package className="w-8 h-8 opacity-30" />
          <p className="text-xs font-bold text-slate-500">قم بإجراء عمليات بيع ليظهر المنتج الأكثر نجاحاً</p>
        </div>
      )}

      {/* ══ نسبة تحصيل الديون والسيولة ══ */}
      <div className="glass-card p-4 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-700">مؤشر الكاش والتحصيل الفعلي 💵</span>
          <span className="font-black text-emerald-600 text-sm tabnum">{collectionRate}% مدفوع</span>
        </div>

        <div className="progress-bar h-3">
          <div
            className="progress-bar-fill"
            style={{ width: `${collectionRate}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
          <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100">
            <p className="text-rose-600 font-bold text-[11px]">ديون لك بالخارج</p>
            <p className="font-black text-rose-700 text-sm tabnum">{fmt(totalDebtsOwedToUs)} د.ج</p>
          </div>

          <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100">
            <p className="text-blue-600 font-bold text-[11px]">مستحق عليك للموردين</p>
            <p className="font-black text-blue-700 text-sm tabnum">{fmt(totalDebtsWeOwe)} د.ج</p>
          </div>
        </div>
      </div>

    </div>
  );
}
