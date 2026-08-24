'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  initStorageIfEmpty,
  getLocalData,
  setLocalData,
  Contact,
  Product,
  Transaction,
  createWhatsAppLink,
  printThermalReceipt,
  generateReceiptNumber,
  saveReceipt,
  cancelTransaction,
} from '@/lib/store';
import { SearchableSelect } from '@/components/SearchableSelect';
import { toast } from '@/components/Toast';
import {
  TrendingUp, AlertTriangle, MessageCircle,
  ArrowUpRight, ArrowDownLeft, X,
  ShoppingCart, ShoppingBag, Sparkles,
  ChevronLeft, Clock3, CheckCircle,
  Banknote, Package, Calendar, Filter, Zap, Printer, Pencil
} from 'lucide-react';
import QuickSaleModal from '@/components/QuickSaleModal';
import ReceiptViewModal from '@/components/ReceiptViewModal';
import EditTransactionModal from '@/components/EditTransactionModal';
import { Receipt } from '@/lib/store';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return { emoji: '🌙', msg: 'سهران يا تاجر؟' };
  if (h < 12) return { emoji: '🌅', msg: 'صباح الرزق والبركة!' };
  if (h < 17) return { emoji: '☀️', msg: 'نهار موفق يا تاجر!' };
  if (h < 21) return { emoji: '🌆', msg: 'مساء الخير والرزق!' };
  return              { emoji: '🌙', msg: 'مساء النجاح!' };
}

const fmt = (n: number) => n.toLocaleString('en-US');

export default function HomePage() {
  // ✅ نقرأ البيانات مباشرة — لا انتظار، لا skeleton
  // البيانات المحلية فورية لأنها من localStorage + in-memory cache
  const [contacts,     setContacts]     = useState<Contact[]>(() =>
    typeof window !== 'undefined' ? getLocalData('tajer_smart_contacts_v1', []) : []
  );
  const [products,     setProducts]     = useState<Product[]>(() =>
    typeof window !== 'undefined' ? getLocalData('tajer_smart_products_v1', []) : []
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    typeof window !== 'undefined' ? getLocalData('tajer_smart_transactions_v1', []) : []
  );
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  // mounted الآن للمزامنة السحابية فقط — البيانات موجودة دائماً من البداية
  const [mounted, setMounted] = useState(false);

  // فلترة بالتقويم والتاريخ
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'all' | 'custom'>('today');

  const [showSaleModal,      setShowSaleModal]      = useState(false);
  const [showBuyModal,       setShowBuyModal]       = useState(false);
  const [showQuickSaleModal, setShowQuickSaleModal] = useState(false);

  // نموذج البيع
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedProductId,  setSelectedProductId]  = useState('');
  const [saleQty,            setSaleQty]            = useState(1);
  const [saleUnitPrice,      setSaleUnitPrice]       = useState(0);
  const [salePaid,           setSalePaid]            = useState(0);

  // نموذج الشراء
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [buyProductId,       setBuyProductId]       = useState('');
  const [buyQty,             setBuyQty]             = useState(10);
  const [buyCostPrice,       setBuyCostPrice]       = useState(0);
  const [buyExpiry,          setBuyExpiry]          = useState('');
  const [buyPaid,            setBuyPaid]            = useState(0);

  // خيارات التجزئة 1 و 2 والكراتين
  const [salePriceType, setSalePriceType] = useState<'retail1' | 'retail2'>('retail1');
  const [salePacks,     setSalePacks]     = useState(1);
  const [saleLoose,     setSaleLoose]     = useState(0);

  const [buyPacks,      setBuyPacks]      = useState(1);
  const [buyLoose,      setBuyLoose]      = useState(0);

  useEffect(() => {
    initStorageIfEmpty();
    // نعيد القراءة للتأكد من أن البيانات محدثة بعد init
    setContacts(getLocalData('tajer_smart_contacts_v1', []));
    setProducts(getLocalData('tajer_smart_products_v1', []));
    setTransactions(getLocalData('tajer_smart_transactions_v1', []));
    setMounted(true);
  }, []);

  /* ── حسابات الديون والملخص ── */
  const customersDebt = contacts
    .filter(c => (Number(c.balance) || 0) > 0)
    .reduce((a, c) => a + (Number(c.balance) || 0), 0);
  const suppliersDebt = contacts
    .filter(c => (Number(c.balance) || 0) < 0)
    .reduce((a, c) => a + Math.abs(Number(c.balance) || 0), 0);
  const debtorCount   = contacts.filter(c => (Number(c.balance) || 0) > 0).length;
  const creditorCount = contacts.filter(c => (Number(c.balance) || 0) < 0).length;
  const lowStockCount = products.filter(p => (Number(p.stock_quantity) || 0) <= (Number(p.min_stock_alert) || 5)).length;

  /* ── فلترة حسب التقويم المختار ── */
  const filteredTx = transactions.filter(tx => {
    if (dateFilterMode === 'all') return true;
    const txDate = new Date(tx.created_at).toISOString().split('T')[0];
    return txDate === selectedDate;
  });

  // قائمة آخر 5 عمليات المعروضة دائماً في الرئيسية
  const recentTxList = (dateFilterMode === 'custom' ? filteredTx : (filteredTx.length > 0 ? filteredTx : transactions)).slice(0, 5);

  const activeSales = filteredTx.filter(tx => tx.tx_type === 'SALE' && tx.status !== 'CANCELLED');
  const periodSales  = activeSales.length;
  const periodProfit = activeSales
    .reduce((acc, tx) =>
      acc + (tx.items || []).reduce((s, item) => s + ((Number(item.unit_price) || 0) - (Number(item.cost_price) || 0)) * (Number(item.quantity) || 0), 0), 0
    );

  const greeting = getGreeting();

  /* ── البيع ── */
  const handleProductSaleChange = (id: string) => {
    setSelectedProductId(id);
    const p = products.find(x => x.id === id);
    if (p) {
      const price = (salePriceType === 'retail2' && (p.retail_price_2 || 0) > 0) ? p.retail_price_2! : p.retail_price;
      setSaleUnitPrice(price);
      const cap = p.pack_quantity || 1;
      const totalPieces = p.unit_type === 'pack' ? (salePacks * cap) + saleLoose : saleQty;
      const calcTotal = p.unit_type === 'pack' ? (salePacks * price) + (saleLoose * (price / cap)) : totalPieces * price;
      setSalePaid(calcTotal);
    }
  };

  const executeSale = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = contacts.find(c => c.id === selectedCustomerId);
    if (!selectedCustomerId || !cust) {
      toast('⚠️ يرجى اختيار الزبون أولاً لاستكمال عملية البيع!', 'error');
      return;
    }

    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) { toast('⚠️ يرجى اختيار المنتج أولاً!', 'error'); return; }

    const cap = prod.pack_quantity || 1;
    const totalPieces = prod.unit_type === 'pack' ? ((Number(salePacks) || 0) * cap) + (Number(saleLoose) || 0) : Number(saleQty) || 1;

    if (totalPieces > prod.stock_quantity) {
      toast(`⚠️ الكمية المطلوبة (${totalPieces} حبة) غير متوفرة بالمخزن! المتوفر حالياً: ${prod.stock_quantity} حبة فقط.`, 'warning');
      return;
    }

    const price = (salePriceType === 'retail2' && (prod.retail_price_2 || 0) > 0) ? prod.retail_price_2! : (saleUnitPrice || prod.retail_price);
    const total = prod.unit_type === 'pack' ? ((Number(salePacks) || 0) * price) + ((Number(saleLoose) || 0) * (price / cap)) : totalPieces * price;
    const debt  = Math.max(0, total - salePaid);
    const status = debt === 0 ? 'PAID' : salePaid > 0 ? 'PARTIAL' : 'DEBT';

    const newTx: Transaction = {
      id: 'tx_' + Date.now(), tx_type: 'SALE',
      contact_id: cust.id, contact_name: cust.name,
      total_amount: total, paid_amount: salePaid, debt_amount: debt, status,
      items: [{ product_id: prod.id, product_name: prod.name, quantity: totalPieces, unit_price: price, cost_price: prod.cost_price }],
      created_at: new Date().toISOString(),
    };

    saveReceipt({
      id: generateReceiptNumber(),
      receipt_type: 'SALE',
      contact_id: cust.id,
      contact_name: cust.name,
      items: newTx.items,
      total_amount: total,
      paid_amount: salePaid,
      debt_amount: debt,
      created_at: newTx.created_at,
    });

    const upProds = products.map(p => p.id === prod.id
      ? { ...p, stock_quantity: Math.max(0, p.stock_quantity - totalPieces), last_sold_at: new Date().toISOString() } : p);
    const upConts = contacts.map(c => c.id === cust.id && debt > 0
      ? { ...c, balance: c.balance + debt } : c);
    const upTx = [newTx, ...transactions];

    setProducts(upProds); setContacts(upConts); setTransactions(upTx);
    setLocalData('tajer_smart_products_v1', upProds);
    setLocalData('tajer_smart_contacts_v1', upConts);
    setLocalData('tajer_smart_transactions_v1', upTx);
    setShowSaleModal(false);
    setSelectedProductId(''); setSelectedCustomerId(''); setSaleQty(1); setSalePacks(1); setSaleLoose(0); setSaleUnitPrice(0); setSalePaid(0);
    toast(debt > 0 ? `✅ تم البيع لـ ${cust.name} — دين: ${fmt(debt)} د.ج` : `✅ تم البيع لـ ${cust.name} نقداً بنجاح!`);
  };

  /* ── الشراء ── */
  const handleProductBuyChange = (id: string) => {
    setBuyProductId(id);
    const p = products.find(x => x.id === id);
    if (p) { setBuyCostPrice(p.cost_price); setBuyPaid(p.cost_price * buyQty); }
  };

  const executeBuy = (e: React.FormEvent) => {
    e.preventDefault();
    const supp = contacts.find(c => c.id === selectedSupplierId);
    if (!selectedSupplierId || !supp) {
      toast('⚠️ يرجى اختيار المورد أولاً لاستكمال عملية الشراء!', 'error');
      return;
    }

    const prod = products.find(p => p.id === buyProductId);
    if (!prod) { toast('⚠️ يرجى اختيار المنتج أولاً!', 'error'); return; }

    const cap = prod.pack_quantity || 1;
    const totalPieces = prod.unit_type === 'pack' ? ((Number(buyPacks) || 0) * cap) + (Number(buyLoose) || 0) : Number(buyQty) || 1;

    const total = buyCostPrice * (prod.unit_type === 'pack' ? (totalPieces / cap) : totalPieces);
    const debt  = Math.max(0, total - buyPaid);
    const status = debt === 0 ? 'PAID' : buyPaid > 0 ? 'PARTIAL' : 'DEBT';

    const newTx: Transaction = {
      id: 'tx_' + Date.now(), tx_type: 'PURCHASE',
      contact_id: supp?.id, contact_name: supp?.name ?? 'مورد نقدي',
      total_amount: total, paid_amount: buyPaid, debt_amount: debt, status,
      items: [{ product_id: prod.id, product_name: prod.name, quantity: totalPieces, unit_price: buyCostPrice, cost_price: buyCostPrice }],
      created_at: new Date().toISOString(),
    };

    saveReceipt({
      id: generateReceiptNumber(),
      receipt_type: 'PURCHASE',
      contact_id: supp?.id,
      contact_name: supp?.name ?? 'مورد نقدي',
      items: newTx.items,
      total_amount: total, paid_amount: buyPaid, debt_amount: debt,
      created_at: newTx.created_at,
    });

    const upProds = products.map(p => p.id === prod.id
      ? { ...p, stock_quantity: p.stock_quantity + totalPieces, cost_price: buyCostPrice, expiry_date: buyExpiry || p.expiry_date, last_purchased_at: new Date().toISOString() } : p);
    const upConts = contacts.map(c => supp && c.id === supp.id && debt > 0
      ? { ...c, balance: c.balance - debt } : c);
    const upTx = [newTx, ...transactions];

    setProducts(upProds); setContacts(upConts); setTransactions(upTx);
    setLocalData('tajer_smart_products_v1', upProds);
    setLocalData('tajer_smart_contacts_v1', upConts);
    setLocalData('tajer_smart_transactions_v1', upTx);
    setShowBuyModal(false);
    setBuyPacks(1); setBuyLoose(0);
    toast('✅ تم تسجيل الشراء وحفظ الوصل وزيادة المخزون بنجاح!');
  };

  const closeOnBg = (setter: (v: boolean) => void) =>
    (e: React.MouseEvent) => { if (e.target === e.currentTarget) setter(false); };

  const saleTotal = saleUnitPrice * saleQty;
  const buyTotal  = buyCostPrice  * buyQty;

  return (
    <div className="space-y-3.5">

      {/* ══ بطاقة الترحيب + فلتر التقويم التفاعلي ══ */}
      <div
        className="rounded-3xl p-4 relative overflow-hidden space-y-3"
        style={{
          background: 'linear-gradient(135deg, hsl(158 64% 38% / 0.09) 0%, hsl(221 83% 58% / 0.05) 100%)',
          border: '1px solid hsl(158 64% 38% / 0.15)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-2xl leading-none mb-1">{greeting.emoji}</p>
            <h2 className="font-black text-slate-800 text-sm leading-snug">{greeting.msg}</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-bold">
              {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>

          <div className="text-left shrink-0">
            <p className="text-[10px] text-slate-500 font-bold uppercase">الربح المحسوب</p>
            <p className={`font-black text-xl tabnum leading-tight ${periodProfit > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
              {periodProfit > 0 ? '+' : ''}{fmt(periodProfit)}
              <span className="text-xs font-semibold"> د.ج</span>
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{periodSales} بيعة في الفترة</p>
          </div>
        </div>

        {/* 📅 التقويم وفلترة التواريخ */}
        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setDateFilterMode('today'); setSelectedDate(new Date().toISOString().split('T')[0]); }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all ${dateFilterMode === 'today' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white/80 text-slate-600'}`}
            >
              اليوم 📅
            </button>
            <button
              onClick={() => setDateFilterMode('all')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all ${dateFilterMode === 'all' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white/80 text-slate-600'}`}
            >
              الكل ♾️
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-white/90 px-2 py-1 rounded-xl border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setDateFilterMode('custom'); }}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none"
            />
          </div>
        </div>
      </div>

      {/* ══ زرا البيع السريع والشراء السريع ══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/quick-sale"
          className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-lg shadow-emerald-600/20 border border-emerald-400/30 touch-active hover:brightness-105 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Zap size={24} className="fill-amber-300 text-amber-300 animate-pulse" />
            </div>
            <div>
              <span className="font-black text-base text-white block">⚡ بيع سريع (للزبائن)</span>
              <span className="text-xs text-emerald-100 font-bold block">سلة مبيعات متعددة + طباعة</span>
            </div>
          </div>
          <ChevronLeft size={20} className="text-emerald-200 group-hover:-translate-x-1 transition-transform" />
        </Link>

        <Link
          href="/quick-buy"
          className="p-4 rounded-2xl bg-gradient-to-r from-indigo-700 via-slate-800 to-indigo-900 text-white shadow-lg shadow-indigo-900/20 border border-indigo-400/30 touch-active hover:brightness-105 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <ShoppingBag size={24} className="text-indigo-200" strokeWidth={2.5} />
            </div>
            <div>
              <span className="font-black text-base text-white block">🛒 شراء سريع (للموردين)</span>
              <span className="text-xs text-indigo-200 font-bold block">شحنات متعددة + زيادة المخزون</span>
            </div>
          </div>
          <ChevronLeft size={20} className="text-indigo-200 group-hover:-translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* ══ بطاقات الإجماليات المالية — مربوطة مباشرة بالصفحات (متجاوبة مع التابلات) ══ */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/debts?tab=to_us" className="stat-card emerald block">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/15">
              <ArrowUpRight size={16} className="text-emerald-700" strokeWidth={2.5} />
            </div>
            <ChevronLeft size={14} className="text-emerald-400" />
          </div>
          <p className="text-[11px] font-bold text-emerald-700 mb-1">لي على الزبائن</p>
          <p className="font-black text-xl text-emerald-800 tabnum leading-tight">
            {fmt(customersDebt)}
            <span className="text-xs font-semibold"> د.ج</span>
          </p>
          <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center justify-between">
            <span>{debtorCount} زبون مدين</span>
            <span className="underline">متابعة ←</span>
          </p>
        </Link>

        <Link href="/debts?tab=we_owe" className="stat-card rose block">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-500/12">
              <ArrowDownLeft size={16} className="text-rose-700" strokeWidth={2.5} />
            </div>
            <ChevronLeft size={14} className="text-rose-400" />
          </div>
          <p className="text-[11px] font-bold text-rose-700 mb-1">عليّ للموردين</p>
          <p className="font-black text-xl text-rose-800 tabnum leading-tight">
            {fmt(suppliersDebt)}
            <span className="text-xs font-semibold"> د.ج</span>
          </p>
          <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center justify-between">
            <span>{creditorCount} مورد دائن</span>
            <span className="underline">سداد ←</span>
          </p>
        </Link>
      </div>

      {/* ══ تنبيه نقص المخزون — مربوط بصفحة المخزن ══ */}
      {lowStockCount > 0 && (
        <Link href="/inventory" className="block">
          <div
            className="rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:scale-[0.99] transition-transform"
            style={{
              background: 'linear-gradient(135deg, hsl(38 92% 50% / 0.08), hsl(28 80% 48% / 0.06))',
              border: '1px solid hsl(38 92% 50% / 0.25)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/15">
                <AlertTriangle size={18} className="text-amber-700" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-black text-amber-800">⚠️ تنبيه نقص المخزون</p>
                <p className="text-xs text-amber-700 font-semibold mt-0.5">
                  {lowStockCount} منتج يحتاج تجديد المخزون الآن
                </p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-amber-600" />
          </div>
        </Link>
      )}

      {/* ══ آخر العمليات منظم كطلبيات وفواتير موحدة (دائماً يُظهر آخر 5 عمليات) ══ */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-800 text-sm flex items-center gap-2">
            <Clock3 size={16} className="text-emerald-600" strokeWidth={2.5} />
            آخر العمليات والطلبيات ({recentTxList.length})
          </h2>
          <Link href="/stats" className="text-xs font-bold text-emerald-600 hover:underline">
            عرض الإحصائيات الكاملة ←
          </Link>
        </div>

        {recentTxList.length === 0 ? (
          <div className="empty-state py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <TrendingUp size={36} className="mx-auto text-slate-300 mb-1" />
            <p className="font-bold text-sm text-slate-600">لا توجد عمليات مسجلة حالياً</p>
            <p className="text-xs text-slate-400">اضغط بيع سريع أو شراء للبدء!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTxList.map((tx) => {
              const isSale  = tx.tx_type === 'SALE';
              const contact = contacts.find(c => c.id === tx.contact_id);
              const txDate  = new Date(tx.created_at);
              const dateStr = txDate.toLocaleDateString('en-GB') + ' ' + txDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={tx.id}
                  className="rounded-2xl p-3.5 border bg-white space-y-2.5 shadow-sm border-slate-200"
                >
                  {/* ترويسة الطلبية/العملية */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isSale ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {isSale ? <ArrowUpRight size={16} strokeWidth={2.5} /> : <ArrowDownLeft size={16} strokeWidth={2.5} />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-xs text-slate-900 truncate">
                          {isSale ? 'طلب/بيع لـ ' : 'شراء من '}: <span className="text-emerald-700">{tx.contact_name || 'عميل عام'}</span>
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 tabnum">{dateStr}</p>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <p className={`font-black text-sm tabnum ${isSale ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {fmt(tx.total_amount)} <span className="text-[10px]">د.ج</span>
                      </p>
                      {tx.debt_amount > 0
                        ? <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded-md">دين: {fmt(tx.debt_amount)}</span>
                        : <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md">مدفوع كاش</span>
                      }
                    </div>
                  </div>

                  {/* جدول المنتجات داخل الطلبية الوحيدة */}
                  <div className="bg-slate-50 p-2 rounded-xl text-xs space-y-1">
                    {tx.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-slate-700 font-bold text-[11px]">
                        <span className="truncate flex-1">• {item.product_name}</span>
                        <span className="text-slate-500 tabnum px-2">{item.quantity} × {fmt(item.unit_price)}</span>
                        <span className="font-black text-slate-900 tabnum">{fmt(item.quantity * item.unit_price)} د.ج</span>
                      </div>
                    ))}
                  </div>

                  {/* أزرار الإجراءات للطلبية */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 flex-wrap gap-1.5">
                    {tx.status === 'CANCELLED' ? (
                      <span className="text-[11px] font-black text-rose-700 bg-rose-100 px-2.5 py-1 rounded-xl">
                        طـلـبـيـة مـلـغـاة ❌ (تم إرجاع المخزون)
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            printThermalReceipt({
                              id: tx.id,
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
                          }}
                          className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-black flex items-center gap-1.5 touch-active"
                        >
                          <Printer size={13} />
                          طباعة 🖨️
                        </button>

                        <button
                          onClick={() => setEditingTx(tx)}
                          className="py-1.5 px-2.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl text-[11px] font-black flex items-center gap-1 touch-active"
                        >
                          <Pencil size={13} /> تعديل ✏️
                        </button>

                        <button
                          onClick={() => {
                            if (confirm('هل أنت تأكد من إلغاء هذه الطلبية؟ سيتم إرجاع كميات المخزون وتصفية الدين فوراً.')) {
                              const ok = cancelTransaction(tx.id);
                              if (ok) {
                                setProducts(getLocalData('tajer_smart_products_v1', []));
                                setContacts(getLocalData('tajer_smart_contacts_v1', []));
                                setTransactions(getLocalData('tajer_smart_transactions_v1', []));
                                toast('🔄 تم إلغاء الطلبية وإعادة الكميات للمخزون بنجاح!', 'warning');
                              }
                            }
                          }}
                          className="py-1.5 px-2.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-[11px] font-black flex items-center gap-1 touch-active"
                        >
                          <X size={13} /> إلغاء ❌
                        </button>
                      </div>
                    )}

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

      {/* ══ Modal البيع ══ */}
      {showSaleModal && (
        <div className="modal-overlay" onClick={closeOnBg(setShowSaleModal)}>
          <div className="modal-sheet">
            <div className="modal-handle" />

            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-700">
                  <ShoppingCart size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">تسجيل بيع جديد</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">خصم من المخزون + تسجيل الدين</p>
                </div>
              </div>
              <button onClick={() => setShowSaleModal(false)} className="btn btn-ghost p-2 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={executeSale} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">👤 اختر الزبون * (إجباري)</label>
                  <SearchableSelect
                    options={contacts.filter(c => c.type !== 'supplier').map(c => ({
                      id: c.id,
                      label: c.name,
                      sublabel: c.phone || 'بدون هاتف',
                      badge: (Number(c.balance) || 0) > 0 ? `دين: ${fmt(c.balance)} د.ج` : 'حساب متوازن',
                    }))}
                    value={selectedCustomerId}
                    onChange={id => setSelectedCustomerId(id)}
                    placeholder="🔍 ابحث بالاسم أو الرقم لاختيار الزبون..."
                    searchPlaceholder="اكتب اسم الزبون..."
                    icon="user"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">📦 اختر المنتج * (إجباري)</label>
                  <SearchableSelect
                    options={products.map(p => ({
                      id: p.id,
                      label: p.name,
                      sublabel: `متوفر: ${p.stock_quantity} حبة — ${p.category || 'عام'}`,
                      badge: `${fmt(p.retail_price)} د.ج`,
                    }))}
                    value={selectedProductId}
                    onChange={id => handleProductSaleChange(id)}
                    placeholder="🔍 ابحث باسم المنتج أو القسم..."
                    searchPlaceholder="اكتب اسم المنتج..."
                    icon="package"
                    required
                  />
                </div>

                {/* اختيار سعر التجزئة 1 أو تجزئة 2 */}
                {selectedProductId && (() => {
                  const prod = products.find(p => p.id === selectedProductId);
                  if (!prod) return null;
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-emerald-50/70 p-2 rounded-xl border border-emerald-200">
                        <span className="text-xs font-black text-emerald-950">المتوفر حالياً بالمخزن:</span>
                        <span className="text-xs font-black text-emerald-800 tabnum">{prod.stock_quantity} حبة</span>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-1">🏷️ اعتمـد سعر البيع</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSalePriceType('retail1');
                              setSaleUnitPrice(prod.retail_price);
                              const cap = prod.pack_quantity || 1;
                              const tot = prod.unit_type === 'pack' ? (salePacks * prod.retail_price) + (saleLoose * (prod.retail_price / cap)) : saleQty * prod.retail_price;
                              setSalePaid(tot);
                            }}
                            className={`py-2 px-2 rounded-xl text-xs font-black border transition-all ${salePriceType === 'retail1' ? 'bg-emerald-600 text-white border-transparent shadow-sm' : 'bg-slate-100 text-slate-700 border-slate-200'}`}
                          >
                            تجزئة 1 ({prod.retail_price} د.ج)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const p2 = (prod.retail_price_2 || 0) > 0 ? prod.retail_price_2! : prod.retail_price;
                              setSalePriceType('retail2');
                              setSaleUnitPrice(p2);
                              const cap = prod.pack_quantity || 1;
                              const tot = prod.unit_type === 'pack' ? (salePacks * p2) + (saleLoose * (p2 / cap)) : saleQty * p2;
                              setSalePaid(tot);
                            }}
                            className={`py-2 px-2 rounded-xl text-xs font-black border transition-all ${salePriceType === 'retail2' ? 'bg-sky-600 text-white border-transparent shadow-sm' : 'bg-slate-100 text-slate-700 border-slate-200'}`}
                          >
                            تجزئة 2 ({(prod.retail_price_2 || 0) > 0 ? `${prod.retail_price_2} د.ج` : 'غير محدد'})
                          </button>
                        </div>
                      </div>

                      {prod.unit_type === 'pack' ? (
                        <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                          <p className="text-xs font-black text-indigo-950">📦 سعة الكرتونة = {prod.pack_quantity || 1} حبة</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-black text-indigo-950 mb-1">📦 عدد الكراتين</label>
                              <input
                                type="number"
                                min="0"
                                value={salePacks}
                                onChange={e => {
                                  const pk = +e.target.value;
                                  setSalePacks(pk);
                                  const price = saleUnitPrice || prod.retail_price;
                                  const cap = prod.pack_quantity || 1;
                                  const tot = (pk * price) + (saleLoose * (price / cap));
                                  setSalePaid(tot);
                                }}
                                onFocus={e => e.target.select()}
                                className="form-input text-center font-black text-base tabnum"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-black text-indigo-950 mb-1">🥛 حبات إضافية</label>
                              <input
                                type="number"
                                min="0"
                                value={saleLoose}
                                onChange={e => {
                                  const ls = +e.target.value;
                                  setSaleLoose(ls);
                                  const price = saleUnitPrice || prod.retail_price;
                                  const cap = prod.pack_quantity || 1;
                                  const tot = (salePacks * price) + (ls * (price / cap));
                                  setSalePaid(tot);
                                }}
                                onFocus={e => e.target.select()}
                                className="form-input text-center font-black text-base tabnum"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-black text-slate-600 mb-1.5">الكمية (بالحبة)</label>
                            <input type="number" min="1" value={saleQty}
                              onChange={e => { const q = +e.target.value; setSaleQty(q); setSalePaid(saleUnitPrice * q); }}
                              onFocus={e => e.target.select()}
                              className="form-input text-center font-black text-lg" />
                          </div>
                          <div>
                            <label className="block text-xs font-black text-slate-600 mb-1.5">سعر التجزئة (د.ج)</label>
                            <input type="number" value={saleUnitPrice}
                              onChange={e => { const p = +e.target.value; setSaleUnitPrice(p); setSalePaid(p * saleQty); }}
                              onFocus={e => e.target.select()}
                              className="form-input font-black tabnum text-emerald-700" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="rounded-2xl p-3.5 bg-emerald-50 border border-emerald-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600">الإجمالي</span>
                    <span className="font-black text-xl text-slate-900 tabnum">{fmt(saleTotal)} د.ج</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">💵 المبلغ المدفوع الآن (د.ج)</label>
                  <input type="number" value={salePaid} onChange={e => setSalePaid(+e.target.value)} onFocus={e => e.target.select()} className="form-input font-black text-lg tabnum" />
                  {saleTotal - salePaid > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                      <Banknote size={14} className="shrink-0" />
                      <p className="text-xs font-black">
                        دين على الزبون: <span className="tabnum">{fmt(Math.max(0, saleTotal - salePaid))}</span> د.ج
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn btn-primary w-full py-3.5 text-base shadow-md">
                  <ShoppingCart size={18} strokeWidth={2.5} />
                  تأكيد البيع وتسجيل الدين 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Modal الشراء ══ */}
      {showBuyModal && (
        <div className="modal-overlay" onClick={closeOnBg(setShowBuyModal)}>
          <div className="modal-sheet">
            <div className="modal-handle" />

            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-100 text-indigo-700">
                  <ShoppingBag size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">تسجيل شراء</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">من مورد + زيادة المخزون</p>
                </div>
              </div>
              <button onClick={() => setShowBuyModal(false)} className="btn btn-ghost p-2 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={executeBuy} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">🏭 اختر المورد * (إجباري)</label>
                  <SearchableSelect
                    options={contacts.filter(c => c.type !== 'supplier').map(c => ({
                      id: c.id,
                      label: c.name,
                      sublabel: c.phone || 'بدون هاتف',
                      badge: (Number(c.balance) || 0) < 0 ? `له علينا: ${fmt(Math.abs(c.balance))} د.ج` : 'حساب متوازن',
                    }))}
                    value={selectedSupplierId}
                    onChange={id => setSelectedSupplierId(id)}
                    placeholder="🔍 ابحث بالاسم أو الرقم لاختيار المورد..."
                    searchPlaceholder="اكتب اسم المورد..."
                    icon="user"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-slate-600">📦 اختر المنتج * (إجباري)</label>
                    <Link href="/inventory" onClick={() => setShowBuyModal(false)} className="text-[11px] font-black text-indigo-700 hover:underline">
                      + إضافة منتج جديد للمخزن ➕
                    </Link>
                  </div>
                  <SearchableSelect
                    options={products.map(p => ({
                      id: p.id,
                      label: p.name,
                      sublabel: `موجود بالمخزن: ${p.stock_quantity} حبة — ${p.category || 'عام'}`,
                      badge: `${fmt(p.cost_price)} د.ج`,
                    }))}
                    value={buyProductId}
                    onChange={id => handleProductBuyChange(id)}
                    placeholder="🔍 ابحث باسم المنتج أو القسم..."
                    searchPlaceholder="اكتب اسم المنتج..."
                    icon="package"
                    required
                    onAddNew={() => {
                      setShowBuyModal(false);
                      window.location.href = '/inventory?action=new';
                    }}
                    addNewText="تسجيل منتج جديد بالمخزن ➕"
                  />
                </div>

                {buyProductId && (() => {
                  const prod = products.find(p => p.id === buyProductId);
                  if (!prod) return null;

                  if (prod.unit_type === 'pack') {
                    return (
                      <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                        <p className="text-xs font-black text-indigo-950">📦 سعة الكرتونة = {prod.pack_quantity || 1} حبة</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-black text-indigo-950 mb-1">📦 عدد الكراتين</label>
                            <input
                              type="number"
                              min="0"
                              value={buyPacks}
                              onChange={e => {
                                const pk = +e.target.value;
                                setBuyPacks(pk);
                                const price = buyCostPrice || prod.cost_price;
                                const cap = prod.pack_quantity || 1;
                                const tot = (pk * price) + (buyLoose * (price / cap));
                                setBuyPaid(tot);
                              }}
                              className="form-input text-center font-black text-base tabnum"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black text-indigo-950 mb-1">🥛 حبات إضافية</label>
                            <input
                              type="number"
                              min="0"
                              value={buyLoose}
                              onChange={e => {
                                const ls = +e.target.value;
                                setBuyLoose(ls);
                                const price = buyCostPrice || prod.cost_price;
                                const cap = prod.pack_quantity || 1;
                                const tot = (buyPacks * price) + (ls * (price / cap));
                                setBuyPaid(tot);
                              }}
                              className="form-input text-center font-black text-base tabnum"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-1.5">الكمية (بالحبة)</label>
                    <input type="number" min="1" value={buyQty}
                      onChange={e => { const q = +e.target.value; setBuyQty(q); setBuyPaid(buyCostPrice * q); }}
                      className="form-input text-center font-black text-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-1.5">سعر الجملة (د.ج)</label>
                    <input type="number" value={buyCostPrice}
                      onChange={e => { const p = +e.target.value; setBuyCostPrice(p); setBuyPaid(p * buyQty); }}
                      className="form-input font-black tabnum text-indigo-700" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">📅 تاريخ الصلاحية (اختياري)</label>
                  <input type="date" value={buyExpiry} onChange={e => setBuyExpiry(e.target.value)} className="form-input" />
                </div>

                <div className="rounded-2xl p-3.5 bg-indigo-50 border border-indigo-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600">إجمالي الشراء</span>
                    <span className="font-black text-xl text-slate-900 tabnum">{fmt(buyTotal)} د.ج</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">💵 المدفوع للمورد الآن</label>
                  <input type="number" value={buyPaid} onChange={e => setBuyPaid(+e.target.value)} className="form-input font-black text-lg tabnum" />
                  {buyTotal - buyPaid > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                      <Banknote size={14} className="shrink-0" />
                      <p className="text-xs font-black">
                        دين للمورد علينا: <span className="tabnum">{fmt(Math.max(0, buyTotal - buyPaid))}</span> د.ج
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="submit"
                  className="btn w-full py-3.5 text-base text-white shadow-md"
                  style={{ background: 'var(--grad-indigo)' }}
                >
                  <Package size={18} strokeWidth={2.5} />
                  تأكيد الشراء وزيادة المخزون 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ══ مودال البيع السريع لزبون محدد ══ */}
      <QuickSaleModal
        isOpen={showQuickSaleModal}
        onClose={() => setShowQuickSaleModal(false)}
        onSuccess={() => {
          setContacts(getLocalData('tajer_smart_contacts_v1', []));
          setProducts(getLocalData('tajer_smart_products_v1', []));
          setTransactions(getLocalData('tajer_smart_transactions_v1', []));
        }}
      />

      {/* ══ مودال تعديل الوصل ══ */}
      {editingTx && (
        <EditTransactionModal
          transaction={editingTx}
          products={products}
          onClose={() => setEditingTx(null)}
          onSaved={() => {
            setProducts(getLocalData('tajer_smart_products_v1', []));
            setContacts(getLocalData('tajer_smart_contacts_v1', []));
            setTransactions(getLocalData('tajer_smart_transactions_v1', []));
          }}
        />
      )}
    </div>
  );
}
