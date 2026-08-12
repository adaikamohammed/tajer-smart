'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  getLocalData, setLocalData, Transaction, Contact, Product,
  cancelTransaction, printThermalReceipt, generateReceiptNumber, createWhatsAppLink,
} from '@/lib/store';
import { toast } from '@/components/Toast';
import {
  TrendingUp, DollarSign, Wallet, Users,
  BarChart3, Info, Package, ArrowUpRight, ArrowDownLeft, ShieldCheck,
  PieChart, LayoutGrid, Search, Filter, Printer, X, Clock3, MessageCircle
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('en-US');

export default function StatsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [contacts,     setContacts]     = useState<Contact[]>([]);
  const [products,     setProducts]     = useState<Product[]>([]);
  const [viewMode,     setViewMode]     = useState<'numbers' | 'visual'>('visual');

  // فلاتر سجل العمليات
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txTypeFilter,  setTxTypeFilter]  = useState<'all' | 'SALE' | 'PURCHASE'>('all');

  useEffect(() => {
    const rawTx = getLocalData<Transaction[]>('tajer_smart_transactions_v1', []);
    setTransactions(rawTx.filter(t => t.status !== 'CANCELLED' && !String(t.id).includes('_seed_')));
    setContacts(getLocalData('tajer_smart_contacts_v1', []));
    setProducts(getLocalData('tajer_smart_products_v1', []));
  }, []);

  // 1️⃣ إجمالي قيمة شراء البضاعة الموجودة في المخزن حالياً
  const totalStockCostValue = products.reduce((sum, p) => sum + ((Number(p.cost_price) || 0) * (Number(p.stock_quantity) || 0)), 0);

  // 2️⃣ إجمالي الربح الكلي المتوقع عند بيع كل البضاعة الموجودة في المخزن
  const totalExpectedStockProfit = products.reduce((sum, p) => sum + (((Number(p.retail_price) || 0) - (Number(p.cost_price) || 0)) * (Number(p.stock_quantity) || 0)), 0);

  // 3️⃣ الديون البسيطة المباشرة
  const totalOwedToUs = contacts.filter(c => (Number(c.balance) || 0) > 0).reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
  const totalWeOwe    = contacts.filter(c => (Number(c.balance) || 0) < 0).reduce((sum, c) => sum + Math.abs(Number(c.balance) || 0), 0);

  // 4️⃣ المبيعات والأرباح النقدية الفعلية
  const salesTx = transactions.filter(t => t.tx_type === 'SALE' && t.status !== 'CANCELLED');
  const totalSales = salesTx.reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0);
  const totalPaidCash = salesTx.reduce((sum, t) => sum + (Number(t.paid_amount) || 0), 0);

  const totalGrossProfit = salesTx.reduce((sum, t) => {
    const itemProfit = (t.items || []).reduce((pSum, item) => {
      const margin = (Number(item.unit_price) || 0) - (Number(item.cost_price) || 0);
      return pSum + (margin * (Number(item.quantity) || 0));
    }, 0);
    return sum + itemProfit;
  }, 0);

  const cashProfitRatio = totalSales > 0 ? (totalPaidCash / totalSales) : 1;
  const cashCollectedProfit = Math.round(totalGrossProfit * cashProfitRatio);
  const profitProgressPct = totalGrossProfit > 0 ? Math.min(100, Math.round((cashCollectedProfit / totalGrossProfit) * 100)) : 100;

  // أقصى قيمة للرسم البياني
  const maxBarValue = Math.max(1, totalStockCostValue, totalExpectedStockProfit, totalOwedToUs, totalWeOwe);

  // قائمة المعاملات التاريخية المفلترة
  const filteredLog = useMemo(() => {
    return transactions.filter(t => {
      if (txTypeFilter === 'SALE' && t.tx_type !== 'SALE') return false;
      if (txTypeFilter === 'PURCHASE' && t.tx_type !== 'PURCHASE') return false;

      if (!txSearchQuery.trim()) return true;
      const q = txSearchQuery.toLowerCase().trim();
      const matchContact = t.contact_name?.toLowerCase().includes(q);
      const matchItems = t.items.some(i => i.product_name.toLowerCase().includes(q));
      return matchContact || matchItems;
    });
  }, [transactions, txTypeFilter, txSearchQuery]);

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

        {/* 🔘 أزرار التحويل بين العرض البياني والأرقام */}
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

      {/* ══ 3️⃣ سجل جميع العمليات والطلبيات التاريخية بالكامل ══ */}
      <div className="glass-card p-4 space-y-4 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-sm text-slate-800 flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-emerald-600" />
              سجل جميع العمليات التاريخية بالكامل ({transactions.length})
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5">تصفح، فلترة، طباعة وإلغاء أي معاملة تابعة للمحل</p>
          </div>
        </div>

        {/* 🔍 شريط البحث وفلاتر النوع */}
        <div className="space-y-2">
          <div className="relative">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.5} />
            <input
              type="text"
              placeholder="ابحث باسم الزبون أو اسم المنتج..."
              value={txSearchQuery}
              onChange={e => setTxSearchQuery(e.target.value)}
              className="form-input pr-10 text-xs font-bold bg-slate-50 border-slate-300"
            />
            {txSearchQuery && (
              <button onClick={() => setTxSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            )}
          </div>

          {/* 🏷️ أزرار فلاتر النوع */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <button
              onClick={() => setTxTypeFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                txTypeFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
              }`}
            >
              كل العمليات ({transactions.length})
            </button>
            <button
              onClick={() => setTxTypeFilter('SALE')}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                txTypeFilter === 'SALE' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              🟢 المبيعات ({transactions.filter(t => t.tx_type === 'SALE').length})
            </button>
            <button
              onClick={() => setTxTypeFilter('PURCHASE')}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                txTypeFilter === 'PURCHASE' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-indigo-50 text-indigo-700'
              }`}
            >
              🔵 المشتريات ({transactions.filter(t => t.tx_type === 'PURCHASE').length})
            </button>
          </div>
        </div>

        {/* 📜 قائمة المعاملات المفلترة */}
        {filteredLog.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Clock3 size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-500">لا توجد عمليات تطابق فلتر البحث الحاضر</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredLog.map(tx => {
              const isSale  = tx.tx_type === 'SALE';
              const contact = contacts.find(c => c.id === tx.contact_id);
              const txDate  = new Date(tx.created_at);
              const dateStr = txDate.toLocaleDateString('en-GB') + ' ' + txDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={tx.id} className="p-3.5 rounded-2xl border space-y-2.5 transition-all bg-white border-slate-200 shadow-sm">
                  {/* ترويسة الفاتورة */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isSale ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {isSale ? <ArrowUpRight size={16} strokeWidth={2.5} /> : <ArrowDownLeft size={16} strokeWidth={2.5} />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-xs text-slate-900 truncate">
                          {isSale ? 'طلب/بيع لـ ' : 'شراء من '}: <span className="text-emerald-700">{tx.contact_name}</span>
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 tabnum">{dateStr}</p>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <p className={`font-black text-sm tabnum ${isSale ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {fmt(tx.total_amount)} <span className="text-[10px]">د.ج</span>
                      </p>
                      {tx.debt_amount > 0 ? (
                        <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded-md">دين: {fmt(tx.debt_amount)}</span>
                      ) : (
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md">مدفوع كاش</span>
                      )}
                    </div>
                  </div>

                  {/* جدول منتجات الفاتورة الموحد */}
                  <div className="bg-slate-50 p-2 rounded-xl text-xs space-y-1">
                    {tx.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-slate-700 font-bold text-[11px]">
                        <span className="truncate flex-1">• {item.product_name}</span>
                        <span className="text-slate-500 tabnum px-2">{item.quantity} × {fmt(item.unit_price)}</span>
                        <span className="font-black text-slate-900 tabnum">{fmt(item.quantity * item.unit_price)} د.ج</span>
                      </div>
                    ))}
                  </div>

                  {/* الإجراءات: الطباعة وإلغاء الطلبية وحذفها */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 flex-wrap gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          printThermalReceipt({
                            id: generateReceiptNumber(),
                            receipt_type: tx.tx_type,
                            contact_id: tx.contact_id,
                            contact_name: tx.contact_name,
                            contact_phone: contact?.phone,
                            items: tx.items,
                            total_amount: tx.total_amount,
                            paid_amount: tx.paid_amount,
                            debt_amount: tx.debt_amount,
                            note: tx.notes,
                            created_at: tx.created_at,
                          });
                          toast('🖨️ جارٍ فتح وصل الفاتورة الحراري...', 'success');
                        }}
                        className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-black flex items-center gap-1.5 touch-active"
                      >
                        <Printer size={13} />
                        طباعة الوصل 🖨️
                      </button>

                      <button
                        onClick={() => {
                          if (confirm('⚠️ هل أنت تأكد من إلغاء وحذف هذه الطلبية نهائياً؟ سيتم إعادة الكميات للمخزون، تسوية الدين وحذفها كلياً.')) {
                            const ok = cancelTransaction(tx.id);
                            if (ok) {
                              setProducts(getLocalData('tajer_smart_products_v1', []));
                              setContacts(getLocalData('tajer_smart_contacts_v1', []));
                              setTransactions(getLocalData('tajer_smart_transactions_v1', []));
                              toast('🗑️ تم إلغاء وحذف الطلبية نهائياً وإعادة المخزون بنجاح!', 'warning');
                            }
                          }
                        }}
                        className="py-1.5 px-2.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-[11px] font-black flex items-center gap-1 touch-active"
                      >
                        <X size={13} /> إلغاء وحذف ❌
                      </button>
                    </div>

                    {contact?.phone && (
                      <a
                        href={createWhatsAppLink(contact.phone, `مرحباً ${contact.name}، تفاصيل الطلبية بقيمة ${fmt(tx.total_amount)} د.ج.`)}
                        target="_blank" rel="noreferrer"
                        className="py-1.5 px-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-[11px] font-black flex items-center gap-1"
                      >
                        <MessageCircle size={13} /> واتساب 💬
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* توضيح مبسط ختامي */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-start gap-2.5 text-xs font-semibold text-slate-700">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <span>
          يمكنك التحويل بين <strong>العرض البياني البصري</strong> و <strong>عرض الأرقام</strong> ومراجعة <strong>سجل جميع العمليات التاريخية</strong> وإلغاء أو طباعة أي طلبية في أي وقت!
        </span>
      </div>

    </div>
  );
}
