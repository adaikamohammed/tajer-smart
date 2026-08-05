'use client';

import { useState, useEffect } from 'react';
import {
  initStorageIfEmpty,
  getLocalData,
  setLocalData,
  Contact,
  Product,
  Transaction,
  createWhatsAppLink,
} from '@/lib/store';
import { toast } from '@/components/Toast';
import {
  TrendingUp, AlertTriangle, MessageCircle,
  ArrowUpRight, ArrowDownLeft, X,
  ShoppingCart, ShoppingBag, Sparkles,
  ChevronLeft, Clock3, CheckCircle,
  Banknote, Package,
} from 'lucide-react';

/* ────────────────── وقت الترحيب ────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return { emoji: '🌙', msg: 'سهران يا تاجر؟' };
  if (h < 12) return { emoji: '🌅', msg: 'صباح الرزق والبركة!' };
  if (h < 17) return { emoji: '☀️', msg: 'نهار موفق يا تاجر!' };
  if (h < 21) return { emoji: '🌇', msg: 'مساء الخير والرزق!' };
  return              { emoji: '🌙', msg: 'مساء النجاح!' };
}

/* ────────────────── تنسيق الأرقام لاتيني ────────────────── */
const fmt = (n: number) => n.toLocaleString('en-US');

export default function HomePage() {
  const [contacts,     setContacts]     = useState<Contact[]>([]);
  const [products,     setProducts]     = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [mounted,      setMounted]      = useState(false);

  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showBuyModal,  setShowBuyModal]  = useState(false);

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

  useEffect(() => {
    initStorageIfEmpty();
    setContacts(getLocalData('tajer_smart_contacts_v1', []));
    setProducts(getLocalData('tajer_smart_products_v1', []));
    setTransactions(getLocalData('tajer_smart_transactions_v1', []));
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-28 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-24 rounded-2xl" />
          <div className="skeleton h-24 rounded-2xl" />
        </div>
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    );
  }

  /* ── حسابات ── */
  const customersDebt = contacts
    .filter(c => c.type !== 'supplier' && c.balance > 0)
    .reduce((a, c) => a + c.balance, 0);
  const suppliersDebt = contacts
    .filter(c => c.balance < 0)
    .reduce((a, c) => a + Math.abs(c.balance), 0);
  const debtorCount   = contacts.filter(c => c.balance > 0).length;
  const creditorCount = contacts.filter(c => c.balance < 0).length;
  const lowStockCount = products.filter(p => p.stock_quantity <= p.min_stock_alert).length;

  const today = new Date().toDateString();
  const todayTx = transactions.filter(tx => new Date(tx.created_at).toDateString() === today);
  const todaySales  = todayTx.filter(tx => tx.tx_type === 'SALE').length;
  const todayProfit = todayTx
    .filter(tx => tx.tx_type === 'SALE')
    .reduce((acc, tx) =>
      acc + tx.items.reduce((s, item) => s + (item.unit_price - item.cost_price) * item.quantity, 0), 0
    );

  const greeting = getGreeting();

  /* ── البيع ── */
  const handleProductSaleChange = (id: string) => {
    setSelectedProductId(id);
    const p = products.find(x => x.id === id);
    if (p) { setSaleUnitPrice(p.retail_price); setSalePaid(p.retail_price * saleQty); }
  };

  const executeSale = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.id === selectedProductId);
    const cust = contacts.find(c => c.id === selectedCustomerId);
    if (!prod) { toast('يرجى اختيار المنتج', 'error'); return; }
    if (prod.stock_quantity < saleQty) { toast('الكمية أكبر من المخزون المتاح!', 'warning'); return; }

    const total = saleUnitPrice * saleQty;
    const debt  = Math.max(0, total - salePaid);
    const status = debt === 0 ? 'PAID' : salePaid > 0 ? 'PARTIAL' : 'DEBT';

    const newTx: Transaction = {
      id: 'tx_' + Date.now(), tx_type: 'SALE',
      contact_id: cust?.id, contact_name: cust?.name ?? 'زبون كاش',
      total_amount: total, paid_amount: salePaid, debt_amount: debt, status,
      items: [{ product_id: prod.id, product_name: prod.name, quantity: saleQty, unit_price: saleUnitPrice, cost_price: prod.cost_price }],
      created_at: new Date().toISOString(),
    };

    const upProds = products.map(p => p.id === prod.id
      ? { ...p, stock_quantity: Math.max(0, p.stock_quantity - saleQty), last_sold_at: new Date().toISOString() } : p);
    const upConts = contacts.map(c => cust && c.id === cust.id && debt > 0
      ? { ...c, balance: c.balance + debt } : c);
    const upTx = [newTx, ...transactions];

    setProducts(upProds); setContacts(upConts); setTransactions(upTx);
    setLocalData('tajer_smart_products_v1', upProds);
    setLocalData('tajer_smart_contacts_v1', upConts);
    setLocalData('tajer_smart_transactions_v1', upTx);
    setShowSaleModal(false);
    setSelectedProductId(''); setSelectedCustomerId(''); setSaleQty(1); setSaleUnitPrice(0); setSalePaid(0);
    toast(debt > 0 ? `✅ تم البيع — دين: ${fmt(debt)} د.ج` : '✅ تم البيع نقداً بنجاح!');
  };

  /* ── الشراء ── */
  const handleProductBuyChange = (id: string) => {
    setBuyProductId(id);
    const p = products.find(x => x.id === id);
    if (p) { setBuyCostPrice(p.cost_price); setBuyPaid(p.cost_price * buyQty); }
  };

  const executeBuy = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.id === buyProductId);
    const supp = contacts.find(c => c.id === selectedSupplierId);
    if (!prod) { toast('يرجى اختيار المنتج', 'error'); return; }

    const total = buyCostPrice * buyQty;
    const debt  = Math.max(0, total - buyPaid);
    const status = debt === 0 ? 'PAID' : buyPaid > 0 ? 'PARTIAL' : 'DEBT';

    const newTx: Transaction = {
      id: 'tx_' + Date.now(), tx_type: 'PURCHASE',
      contact_id: supp?.id, contact_name: supp?.name ?? 'مورد نقدي',
      total_amount: total, paid_amount: buyPaid, debt_amount: debt, status,
      items: [{ product_id: prod.id, product_name: prod.name, quantity: buyQty, unit_price: buyCostPrice, cost_price: buyCostPrice }],
      created_at: new Date().toISOString(),
    };

    const upProds = products.map(p => p.id === prod.id
      ? { ...p, stock_quantity: p.stock_quantity + Number(buyQty), cost_price: buyCostPrice, expiry_date: buyExpiry || p.expiry_date, last_purchased_at: new Date().toISOString() } : p);
    const upConts = contacts.map(c => supp && c.id === supp.id && debt > 0
      ? { ...c, balance: c.balance - debt } : c);
    const upTx = [newTx, ...transactions];

    setProducts(upProds); setContacts(upConts); setTransactions(upTx);
    setLocalData('tajer_smart_products_v1', upProds);
    setLocalData('tajer_smart_contacts_v1', upConts);
    setLocalData('tajer_smart_transactions_v1', upTx);
    setShowBuyModal(false);
    setBuyProductId(''); setSelectedSupplierId(''); setBuyQty(10); setBuyCostPrice(0); setBuyPaid(0); setBuyExpiry('');
    toast(debt > 0 ? `📦 تم الشراء — دين للمورد: ${fmt(debt)} د.ج` : '📦 تم الشراء نقداً!');
  };

  /* ── Helpers ── */
  const closeOnBg = (setter: (v: boolean) => void) =>
    (e: React.MouseEvent) => { if (e.target === e.currentTarget) setter(false); };

  const saleTotal = saleUnitPrice * saleQty;
  const buyTotal  = buyCostPrice  * buyQty;

  return (
    <div className="space-y-3.5">

      {/* ══ بطاقة الترحيب والملخص اليومي ══ */}
      <div
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(158 64% 38% / 0.08) 0%, hsl(221 83% 58% / 0.05) 100%)',
          border: '1px solid hsl(158 64% 38% / 0.15)',
        }}
      >
        {/* نجمة زخرفية */}
        <div className="absolute top-3 left-3 opacity-10">
          <Sparkles size={48} className="text-emerald-500" />
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-2xl leading-none mb-1">{greeting.emoji}</p>
            <h2 className="font-black text-slate-800 text-sm leading-snug">{greeting.msg}</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-semibold">
              {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>

          {/* إجمالي اليوم */}
          <div className="text-left shrink-0">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">ربح اليوم</p>
            <p className={`font-black text-xl tabnum leading-tight ${todayProfit > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
              {todayProfit > 0 ? '+' : ''}{fmt(todayProfit)}
              <span className="text-xs font-semibold"> د.ج</span>
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{todaySales} بيعة اليوم</p>
          </div>
        </div>
      </div>

      {/* ══ زرا البيع والشراء ══ */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setShowSaleModal(true)} className="action-btn sale">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-1"
            style={{ background: 'hsl(0 0% 100% / 0.18)', backdropFilter: 'blur(4px)' }}
          >
            <ShoppingCart size={24} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-black text-base text-white">بيع جديد</span>
          <span className="text-[11px] text-white/75 font-semibold">خصم من المخزون</span>
        </button>

        <button onClick={() => setShowBuyModal(true)} className="action-btn purchase">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-1"
            style={{ background: 'hsl(0 0% 100% / 0.18)', backdropFilter: 'blur(4px)' }}
          >
            <ShoppingBag size={24} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-black text-base text-white">شراء جديد</span>
          <span className="text-[11px] text-white/75 font-semibold">زيادة المخزون</span>
        </button>
      </div>

      {/* ══ بطاقات الإجماليات المالية ══ */}
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card emerald">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'hsl(158 64% 38% / 0.15)' }}>
              <ArrowUpRight size={16} style={{ color: 'hsl(158 64% 35%)' }} strokeWidth={2.5} />
            </div>
            <ChevronLeft size={14} className="text-emerald-400" />
          </div>
          <p className="text-[11px] font-bold text-emerald-700 mb-1">لي على الزبائن</p>
          <p className="font-black text-xl text-emerald-800 tabnum leading-tight animate-number">
            {fmt(customersDebt)}
            <span className="text-xs font-semibold"> د.ج</span>
          </p>
          <p className="text-[10px] text-emerald-600 font-semibold mt-1">{debtorCount} زبون مدين</p>
        </div>

        <div className="stat-card rose">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'hsl(351 83% 58% / 0.12)' }}>
              <ArrowDownLeft size={16} style={{ color: 'hsl(351 83% 52%)' }} strokeWidth={2.5} />
            </div>
            <ChevronLeft size={14} className="text-rose-400" />
          </div>
          <p className="text-[11px] font-bold text-rose-700 mb-1">عليّ للموردين</p>
          <p className="font-black text-xl text-rose-800 tabnum leading-tight animate-number">
            {fmt(suppliersDebt)}
            <span className="text-xs font-semibold"> د.ج</span>
          </p>
          <p className="text-[10px] text-rose-600 font-semibold mt-1">{creditorCount} مورد دائن</p>
        </div>
      </div>

      {/* ══ تنبيه نقص المخزون ══ */}
      {lowStockCount > 0 && (
        <div
          className="rounded-2xl p-3.5 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, hsl(38 92% 50% / 0.08), hsl(28 80% 48% / 0.06))',
            border: '1px solid hsl(38 92% 50% / 0.25)',
          }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: 'hsl(38 92% 50% / 0.15)' }}>
            <AlertTriangle size={18} style={{ color: 'hsl(28 80% 40%)' }} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-black text-amber-800">⚠️ تنبيه المخزون</p>
            <p className="text-xs text-amber-700 font-semibold mt-0.5">
              {lowStockCount} منتج يحتاج تجديد المخزون
            </p>
          </div>
        </div>
      )}

      {/* ══ آخر العمليات ══ */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-slate-800 text-sm flex items-center gap-2">
            <Clock3 size={16} style={{ color: 'hsl(158 64% 38%)' }} strokeWidth={2.5} />
            آخر العمليات
          </h2>
          <span className="badge badge-muted">{transactions.length}</span>
        </div>

        {transactions.length === 0 ? (
          <div className="empty-state py-10">
            <TrendingUp size={36} className="opacity-25 mb-1" />
            <p className="font-bold text-sm">لا توجد عمليات بعد</p>
            <p className="text-xs opacity-70">اضغط بيع أو شراء للبدء!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 6).map((tx) => {
              const isSale  = tx.tx_type === 'SALE';
              const item    = tx.items[0];
              const contact = contacts.find(c => c.id === tx.contact_id);
              const time    = new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                  style={{ background: 'hsl(220 20% 97%)', border: '1px solid hsl(220 15% 92%)' }}
                >
                  {/* أيقونة نوع العملية */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: isSale
                        ? 'hsl(158 64% 38% / 0.12)'
                        : 'hsl(239 84% 67% / 0.12)',
                    }}
                  >
                    {isSale
                      ? <ArrowUpRight size={16} style={{ color: 'hsl(158 64% 35%)' }} strokeWidth={2.5} />
                      : <ArrowDownLeft size={16} style={{ color: 'hsl(239 84% 60%)' }} strokeWidth={2.5} />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800 truncate">{item?.product_name ?? 'عملية'}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {isSale ? 'بيع لـ ' : 'شراء من '}
                      <span className="font-semibold text-slate-600">{tx.contact_name}</span>
                      <span className="text-slate-400 mr-1">· {time}</span>
                    </p>
                  </div>

                  <div className="text-left shrink-0 flex items-center gap-1.5">
                    <div>
                      <p className={`font-black text-sm tabnum ${isSale ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {fmt(tx.total_amount)} <span className="text-[10px] font-semibold">د.ج</span>
                      </p>
                      {tx.debt_amount > 0
                        ? <span className="badge badge-danger">{fmt(tx.debt_amount)} دين</span>
                        : <span className="badge badge-success"><CheckCircle size={9} /> مدفوع</span>
                      }
                    </div>
                    {contact?.phone && (
                      <a
                        href={createWhatsAppLink(contact.phone, `مرحباً ${contact.name}، قيمة العملية ${fmt(tx.total_amount)} د.ج.`)}
                        target="_blank" rel="noreferrer"
                        className="w-8 h-8 rounded-xl flex items-center justify-center touch-active shrink-0"
                        style={{ background: 'hsl(142 71% 42% / 0.12)', color: 'hsl(142 65% 32%)' }}
                      >
                        <MessageCircle size={14} strokeWidth={2.5} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          🟢 Modal البيع
      ════════════════════════════════════════ */}
      {showSaleModal && (
        <div className="modal-overlay" onClick={closeOnBg(setShowSaleModal)}>
          <div className="modal-sheet">
            {/* Drag Handle */}
            <div className="modal-handle" />

            {/* Header */}
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                     style={{ background: 'hsl(158 64% 38% / 0.12)' }}>
                  <ShoppingCart size={18} style={{ color: 'hsl(158 64% 35%)' }} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base leading-tight">تسجيل بيع جديد</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">خصم من المخزون + تسجيل الدين</p>
                </div>
              </div>
              <button onClick={() => setShowSaleModal(false)} className="btn btn-ghost p-2 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={executeSale} className="modal-body space-y-4">

              {/* الزبون */}
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">
                  👤 اختر الزبون
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="form-input"
                >
                  <option value="">— زبون كاش (بدون اسم) —</option>
                  {contacts.filter(c => c.type !== 'supplier').map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone || 'بدون هاتف'})</option>
                  ))}
                </select>
              </div>

              {/* المنتج */}
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">
                  📦 اختر المنتج
                </label>
                <select
                  value={selectedProductId}
                  onChange={e => handleProductSaleChange(e.target.value)}
                  required
                  className="form-input"
                >
                  <option value="">— اختر المنتج —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — متوفر: {p.stock_quantity} — {fmt(p.retail_price)} د.ج
                    </option>
                  ))}
                </select>
              </div>

              {/* الكمية والسعر */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">الكمية</label>
                  <input type="number" min="1" value={saleQty}
                    onChange={e => { const q = +e.target.value; setSaleQty(q); setSalePaid(saleUnitPrice * q); }}
                    className="form-input text-center font-black text-lg" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">سعر التجزئة (د.ج)</label>
                  <input type="number" value={saleUnitPrice}
                    onChange={e => { const p = +e.target.value; setSaleUnitPrice(p); setSalePaid(p * saleQty); }}
                    className="form-input font-black tabnum" style={{ color: 'hsl(158 64% 35%)' }} />
                </div>
              </div>

              {/* ملخص */}
              <div className="rounded-xl p-3.5" style={{
                background: 'linear-gradient(135deg, hsl(158 64% 38% / 0.06), hsl(162 60% 28% / 0.04))',
                border: '1px solid hsl(158 64% 38% / 0.15)',
              }}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">الإجمالي</span>
                  <span className="font-black text-xl text-slate-900 tabnum">{fmt(saleTotal)} د.ج</span>
                </div>
              </div>

              {/* المدفوع */}
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">
                  💵 المبلغ المدفوع الآن (د.ج)
                </label>
                <input type="number" value={salePaid}
                  onChange={e => setSalePaid(+e.target.value)}
                  className="form-input font-black text-lg tabnum" />
                {saleTotal - salePaid > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 p-2 rounded-lg"
                       style={{ background: 'hsl(351 83% 58% / 0.08)', border: '1px solid hsl(351 83% 58% / 0.2)' }}>
                    <Banknote size={14} style={{ color: 'hsl(351 83% 52%)', flexShrink: 0 }} />
                    <p className="text-xs font-black" style={{ color: 'hsl(351 83% 45%)' }}>
                      دين على الزبون: <span className="tabnum">{fmt(Math.max(0, saleTotal - salePaid))}</span> د.ج
                    </p>
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary w-full py-4 text-base">
                <ShoppingCart size={18} strokeWidth={2.5} />
                تأكيد البيع وتسجيل الدين 🚀
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          🟣 Modal الشراء
      ════════════════════════════════════════ */}
      {showBuyModal && (
        <div className="modal-overlay" onClick={closeOnBg(setShowBuyModal)}>
          <div className="modal-sheet">
            <div className="modal-handle" />

            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                     style={{ background: 'hsl(239 84% 67% / 0.12)' }}>
                  <ShoppingBag size={18} style={{ color: 'hsl(239 84% 60%)' }} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base leading-tight">تسجيل شراء</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">من مورد + زيادة المخزون</p>
                </div>
              </div>
              <button onClick={() => setShowBuyModal(false)} className="btn btn-ghost p-2 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={executeBuy} className="modal-body space-y-4">

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">🏭 المورد</label>
                <select value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)} className="form-input">
                  <option value="">— مورد نقدي (بدون اسم) —</option>
                  {contacts.filter(c => c.type !== 'customer').map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone || 'بدون هاتف'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">📦 المنتج</label>
                <select value={buyProductId} onChange={e => handleProductBuyChange(e.target.value)} required className="form-input">
                  <option value="">— اختر المنتج —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — موجود: {p.stock_quantity} — {fmt(p.cost_price)} د.ج
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">الكمية</label>
                  <input type="number" min="1" value={buyQty}
                    onChange={e => { const q = +e.target.value; setBuyQty(q); setBuyPaid(buyCostPrice * q); }}
                    className="form-input text-center font-black text-lg" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">سعر الجملة (د.ج)</label>
                  <input type="number" value={buyCostPrice}
                    onChange={e => { const p = +e.target.value; setBuyCostPrice(p); setBuyPaid(p * buyQty); }}
                    className="form-input font-black tabnum" style={{ color: 'hsl(239 84% 60%)' }} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">📅 تاريخ الصلاحية (اختياري)</label>
                <input type="date" value={buyExpiry} onChange={e => setBuyExpiry(e.target.value)} className="form-input" />
              </div>

              <div className="rounded-xl p-3.5" style={{
                background: 'linear-gradient(135deg, hsl(239 84% 67% / 0.06), hsl(262 83% 58% / 0.04))',
                border: '1px solid hsl(239 84% 67% / 0.15)',
              }}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">إجمالي الشراء</span>
                  <span className="font-black text-xl text-slate-900 tabnum">{fmt(buyTotal)} د.ج</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">💵 المدفوع للمورد الآن</label>
                <input type="number" value={buyPaid} onChange={e => setBuyPaid(+e.target.value)} className="form-input font-black text-lg tabnum" />
                {buyTotal - buyPaid > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 p-2 rounded-lg"
                       style={{ background: 'hsl(351 83% 58% / 0.08)', border: '1px solid hsl(351 83% 58% / 0.2)' }}>
                    <Banknote size={14} style={{ color: 'hsl(351 83% 52%)', flexShrink: 0 }} />
                    <p className="text-xs font-black" style={{ color: 'hsl(351 83% 45%)' }}>
                      دين للمورد علينا: <span className="tabnum">{fmt(Math.max(0, buyTotal - buyPaid))}</span> د.ج
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn w-full py-4 text-base text-white"
                style={{ background: 'var(--grad-indigo)', boxShadow: '0 4px 16px hsl(239 84% 67% / 0.35)' }}
              >
                <Package size={18} strokeWidth={2.5} />
                تأكيد الشراء وزيادة المخزون 📦
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
