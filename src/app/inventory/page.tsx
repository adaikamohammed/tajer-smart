'use client';

import { useState, useEffect, useMemo } from 'react';
import { getLocalData, setLocalData, Product, Transaction } from '@/lib/store';
import { toast } from '@/components/Toast';
import {
  Package, Plus, Search, X,
  Minus, Camera, Clock, BadgeCheck,
  Edit2, Trash2, Calendar, AlertTriangle,
  Receipt, ShoppingBag, Eye, History, ArrowDownRight, ArrowUpLeft
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('en-US');

function getExpiryStatus(d?: string, alertDays: number = 30) {
  if (!d) return null;
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
  if (days < 0)          return { label: 'منتهي الصلاحية',     cls: 'badge badge-danger',   cardCls: 'expired', barCls: 'danger' };
  if (days <= alertDays) return { label: `ينتهي خلال ${days} يوم`, cls: 'badge badge-warning', cardCls: 'low',     barCls: 'warning' };
  return                     { label: `صالح حتى ${d}`,         cls: 'badge badge-success',  cardCls: 'ok',      barCls: '' };
}

function autoEmoji(name: string) {
  const n = name.toLowerCase();
  if (n.includes('زيت'))      return '🫒';
  if (n.includes('سكر'))      return '🧂';
  if (n.includes('قهوة') || n.includes('شاي')) return '☕';
  if (n.includes('عصير'))     return '🧃';
  if (n.includes('ماء'))      return '💧';
  if (n.includes('خبز'))      return '🍞';
  if (n.includes('جبن') || n.includes('جبنة')) return '🧀';
  if (n.includes('دجاج'))     return '🍗';
  if (n.includes('لحم'))      return '🥩';
  if (n.includes('سمك'))      return '🐟';
  if (n.includes('بيض'))      return '🥚';
  if (n.includes('حليب'))     return '🥛';
  if (n.includes('فاكهة') || n.includes('تفاح') || n.includes('موز')) return '🍎';
  if (n.includes('خضار') || n.includes('طماطم')) return '🥦';
  if (n.includes('مكيف') || n.includes('ثلاجة') || n.includes('جهاز')) return '📱';
  if (n.includes('دواء') || n.includes('صيدل')) return '💊';
  return '📦';
}

export default function InventoryPage() {
  const [products,     setProducts]     = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery,  setSearchQuery]  = useState('');

  // Modals
  const [showAddModal,      setShowAddModal]      = useState(false);
  const [showAdjustModal,   setShowAdjustModal]   = useState(false);
  const [showHistoryModal,  setShowHistoryModal]  = useState(false);
  const [editingProduct,    setEditingProduct]    = useState<Product | null>(null);
  const [adjustingProduct,  setAdjustingProduct]  = useState<Product | null>(null);
  const [viewingProduct,    setViewingProduct]    = useState<Product | null>(null);

  // Form states
  const [name,             setName]             = useState('');
  const [costPrice,        setCostPrice]        = useState(0);
  const [retailPrice,      setRetailPrice]      = useState(0);
  const [stockQuantity,    setStockQuantity]    = useState(10);
  const [minStockAlert,    setMinStockAlert]    = useState(5);
  const [expiryDate,       setExpiryDate]       = useState('');
  const [expiryAlertDays,  setExpiryAlertDays]  = useState(30);
  const [photoUrl,         setPhotoUrl]         = useState('');

  // Adjust stock states
  const [adjustQty,  setAdjustQty]  = useState(10);
  const [adjustType, setAdjustType] = useState<'add' | 'reduce'>('add');

  useEffect(() => {
    setProducts(getLocalData('tajer_smart_products_v1', []));
    setTransactions(getLocalData('tajer_smart_transactions_v1', []));
  }, []);

  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('حجم الصورة كبير جداً', 'warning'); return; }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhotoUrl(event.target.result as string);
        toast('تم رفع صورة المنتج بنجاح! 📷', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setName(''); setCostPrice(0); setRetailPrice(0); setStockQuantity(10);
    setMinStockAlert(5); setExpiryDate(''); setExpiryAlertDays(30); setPhotoUrl('');
    setShowAddModal(true);
  };

  const openEditModal = (p: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProduct(p);
    setName(p.name); setCostPrice(p.cost_price); setRetailPrice(p.retail_price);
    setStockQuantity(p.stock_quantity); setMinStockAlert(p.min_stock_alert);
    setExpiryDate(p.expiry_date || ''); setExpiryAlertDays(p.expiry_alert_days || 30);
    setPhotoUrl(p.photo_url || '');
    setShowAddModal(true);
  };

  const openProductHistory = (p: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setViewingProduct(p);
    setShowHistoryModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast('يرجى كتابة اسم المنتج', 'error'); return; }

    if (editingProduct) {
      const up = products.map(p => p.id === editingProduct.id ? {
        ...p,
        name: name.trim(), cost_price: +costPrice, retail_price: +retailPrice,
        stock_quantity: +stockQuantity, min_stock_alert: +minStockAlert,
        expiry_date: expiryDate || undefined, expiry_alert_days: +expiryAlertDays,
        photo_url: photoUrl.trim() || undefined,
      } : p);
      setProducts(up);
      setLocalData('tajer_smart_products_v1', up);
      toast('✅ تم تحديث المنتج بنجاح');
    } else {
      const np: Product = {
        id: 'p_' + Date.now(),
        name: name.trim(), cost_price: +costPrice, retail_price: +retailPrice,
        stock_quantity: +stockQuantity, min_stock_alert: +minStockAlert,
        expiry_date: expiryDate || undefined, expiry_alert_days: +expiryAlertDays,
        photo_url: photoUrl.trim() || undefined,
        last_purchased_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      const up = [np, ...products];
      setProducts(up);
      setLocalData('tajer_smart_products_v1', up);
      toast('✅ تمت إضافة المنتج إلى المخزن');
    }
    setShowAddModal(false);
  };

  const handleDeleteProduct = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('هل أنت تأكد من حذف هذا المنتج من المخزن؟')) {
      const up = products.filter(p => p.id !== id);
      setProducts(up);
      setLocalData('tajer_smart_products_v1', up);
      toast('تم حذف المنتج من المخزن', 'info');
      if (viewingProduct?.id === id) setShowHistoryModal(false);
    }
  };

  const openAdjustModal = (p: Product, type: 'add' | 'reduce', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAdjustingProduct(p);
    setAdjustType(type);
    setAdjustQty(10);
    setShowAdjustModal(true);
  };

  const executeAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct || adjustQty <= 0) return;

    const delta = adjustType === 'add' ? adjustQty : -adjustQty;
    const up = products.map(p => p.id === adjustingProduct.id ? {
      ...p,
      stock_quantity: Math.max(0, p.stock_quantity + delta),
      last_purchased_at: adjustType === 'add' ? new Date().toISOString() : p.last_purchased_at,
    } : p);

    setProducts(up);
    setLocalData('tajer_smart_products_v1', up);
    setShowAdjustModal(false);
    toast(adjustType === 'add' ? `✅ تم إضافة +${adjustQty} إلى كمية المخزون` : `✅ تم خصم -${adjustQty} من كمية المخزون`);
  };

  // 📅 ترتيب المنتجات تلقائياً حسب تاريخ الصلاحية الأقرب
  const sorted = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products
      .filter(p => p.name.toLowerCase().includes(q))
      .sort((a, b) => {
        if (a.expiry_date && b.expiry_date) {
          return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
        }
        if (a.expiry_date) return -1;
        if (b.expiry_date) return 1;
        return a.stock_quantity - b.stock_quantity;
      });
  }, [products, searchQuery]);

  const lowCount     = products.filter(p => p.stock_quantity <= p.min_stock_alert).length;
  const expiredCount = products.filter(p => (getExpiryStatus(p.expiry_date, p.expiry_alert_days)?.cardCls === 'expired')).length;

  const profitPct = (c: number, r: number) => c > 0 ? Math.round(((r - c) / c) * 100) : 0;

  // إحصائيات حركة المنتج المختار
  const productSales = viewingProduct
    ? transactions.filter(t => t.tx_type === 'SALE' && t.items.some(i => i.product_id === viewingProduct.id))
    : [];
  const productPurchases = viewingProduct
    ? transactions.filter(t => t.tx_type === 'PURCHASE' && t.items.some(i => i.product_id === viewingProduct.id))
    : [];

  return (
    <div className="space-y-4">

      {/* ── ملخص المخزن ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'منتج بالترتيب', val: products.length, color: 'hsl(158 64% 38%)', bg: 'hsl(158 64% 38% / 0.08)' },
          { label: 'نقص المخزون',   val: lowCount,        color: 'hsl(28 80% 40%)',  bg: 'hsl(38 92% 50% / 0.08)' },
          { label: 'منتهي الصلاح',  val: expiredCount,    color: 'hsl(351 83% 52%)', bg: 'hsl(351 83% 58% / 0.08)' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: s.bg, border: `1px solid ${s.color}30` }}>
            <p className="font-black text-2xl tabnum leading-none" style={{ color: s.color }}>{s.val}</p>
            <p className="text-[10px] font-bold mt-1" style={{ color: s.color, opacity: 0.75 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── شريط البحث والإضافة ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.5} />
          <input type="text" placeholder="ابحث عن منتج..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} className="form-input pr-9" />
        </div>
        <button onClick={openAddModal} className="btn btn-primary shrink-0 gap-1.5 py-2.5 px-4">
          <Plus size={18} strokeWidth={2.5} />
          <span className="hidden sm:inline">منتج جديد</span>
        </button>
      </div>

      {/* ── قائمة المنتجات مرتبة ── */}
      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div className="empty-state">
            <Package size={40} className="opacity-25" />
            <p className="font-bold text-sm">{searchQuery ? 'لا يوجد منتج بهذا الاسم' : 'المخزن فارغ — أضف أول منتج!'}</p>
          </div>
        ) : (
          sorted.map((p) => {
            const expiry    = getExpiryStatus(p.expiry_date, p.expiry_alert_days);
            const isLow     = p.stock_quantity <= p.min_stock_alert;
            const cardState = expiry?.cardCls ?? (isLow ? 'low' : 'ok');
            const pct       = profitPct(p.cost_price, p.retail_price);
            const stockPct  = Math.min(100, Math.round((p.stock_quantity / Math.max(1, p.min_stock_alert * 4)) * 100));

            return (
              <div
                key={p.id}
                onClick={(e) => openProductHistory(p, e)}
                className={`product-card ${cardState} cursor-pointer hover:border-emerald-500 transition-all`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 overflow-hidden bg-slate-100">
                    {p.photo_url
                      ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                      : autoEmoji(p.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-900 text-base leading-tight truncate">{p.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {expiry && <span className={expiry.cls}>{expiry.label}</span>}
                      {isLow && cardState !== 'expired' && <span className="badge badge-warning">⚠️ مخزون منخفض</span>}
                    </div>
                  </div>

                  <div className="rounded-xl px-3 py-2 text-center shrink-0 bg-emerald-50 border border-emerald-200">
                    <p className="text-[10px] font-bold text-slate-500">المخزون</p>
                    <p className="font-black text-xl tabnum text-emerald-800 leading-tight">
                      {p.stock_quantity}
                    </p>
                  </div>
                </div>

                <div className="progress-bar my-2.5">
                  <div className={`progress-bar-fill ${expiry?.barCls ?? (isLow ? 'warning' : '')}`} style={{ width: `${stockPct}%` }} />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 grid grid-cols-3 gap-1.5">
                    <div className="rounded-lg p-1.5 text-center bg-slate-100">
                      <p className="text-[10px] text-slate-400 font-semibold">جملة</p>
                      <p className="text-xs font-black text-slate-700 tabnum">{fmt(p.cost_price)}</p>
                    </div>
                    <div className="rounded-lg p-1.5 text-center bg-emerald-50">
                      <p className="text-[10px] font-semibold text-emerald-600">تجزئة</p>
                      <p className="text-xs font-black tabnum text-emerald-800">{fmt(p.retail_price)}</p>
                    </div>
                    <div className="rounded-lg p-1.5 text-center bg-indigo-50">
                      <p className="text-[10px] font-semibold text-indigo-600">ربح</p>
                      <p className="text-xs font-black tabnum text-indigo-800">+{pct}%</p>
                    </div>
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={(e) => openAdjustModal(p, 'reduce', e)} className="w-8 h-8 rounded-xl flex items-center justify-center touch-active bg-slate-200 text-slate-700 font-black">
                      <Minus size={14} />
                    </button>
                    <button onClick={(e) => openAdjustModal(p, 'add', e)} className="w-8 h-8 rounded-xl flex items-center justify-center touch-active text-white font-black shadow-sm" style={{ background: 'var(--grad-emerald)' }}>
                      <Plus size={14} />
                    </button>
                    <button onClick={(e) => openEditModal(p, e)} className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={(e) => handleDeleteProduct(p.id, e)} className="p-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-emerald-700">
                  <span className="flex items-center gap-1"><History size={12} /> اضغط لاستعراض سجل حركة بيع وشراء المنتج بالكامل</span>
                  <span>👈</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ══ Modal سجل تفاصيل حركة المنتج بالكامل ══ */}
      {showHistoryModal && viewingProduct && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowHistoryModal(false); }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">
                  {viewingProduct.photo_url ? <img src={viewingProduct.photo_url} alt="" className="w-full h-full object-cover rounded-xl" /> : autoEmoji(viewingProduct.name)}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base leading-tight">{viewingProduct.name}</h3>
                  <p className="text-xs text-slate-500 font-bold">حركة ومبيعات هذا المنتج</p>
                </div>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="btn btn-ghost p-2 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body space-y-4">
              {/* ملخص المنتج الرقمي */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <p className="text-[10px] text-emerald-700 font-bold">المخزون الحالي</p>
                  <p className="text-lg font-black text-emerald-800 tabnum">{viewingProduct.stock_quantity} حبة</p>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200">
                  <p className="text-[10px] text-indigo-700 font-bold">سعر الشراء بالجملة</p>
                  <p className="text-lg font-black text-indigo-800 tabnum">{fmt(viewingProduct.cost_price)} د.ج</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200">
                  <p className="text-[10px] text-slate-600 font-bold">سعر البيع التجزيئي</p>
                  <p className="text-lg font-black text-slate-900 tabnum">{fmt(viewingProduct.retail_price)} د.ج</p>
                </div>
              </div>

              {/* 📋 سجل مبيعات المنتج بالترتيب */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <ArrowUpLeft className="w-4 h-4 text-emerald-600" />
                  من اشترى هذا المنتج (سجل المبيعات)
                </h4>
                {productSales.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold p-3 bg-slate-50 rounded-xl text-center">لا توجد عمليات بيع مدونة لهذا المنتج بعد</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {productSales.map(tx => {
                      const item = tx.items.find(i => i.product_id === viewingProduct.id);
                      return (
                        <div key={tx.id} className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center text-xs font-bold">
                          <div>
                            <p className="text-emerald-900 font-black">الزبون: {tx.contact_name || 'زبون كاش'}</p>
                            <p className="text-[10px] text-emerald-600">{new Date(tx.created_at).toLocaleString('ar-EG')}</p>
                          </div>
                          <div className="text-left">
                            <span className="badge badge-success text-[10px]">الكمية: {item?.quantity || 1}</span>
                            <p className="tabnum font-black text-emerald-800 text-xs mt-0.5">{fmt((item?.unit_price || 0) * (item?.quantity || 1))} د.ج</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 🚚 سجل شراء المنتج من الموردين */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <ArrowDownRight className="w-4 h-4 text-indigo-600" />
                  من أين تم توريد هذا المنتج (سجل الشراء)
                </h4>
                {productPurchases.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold p-3 bg-slate-50 rounded-xl text-center">لا توجد عمليات توريد مدونة</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {productPurchases.map(tx => {
                      const item = tx.items.find(i => i.product_id === viewingProduct.id);
                      return (
                        <div key={tx.id} className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 flex justify-between items-center text-xs font-bold">
                          <div>
                            <p className="text-indigo-900 font-black">المورد: {tx.contact_name || 'مورد نقدي'}</p>
                            <p className="text-[10px] text-indigo-600">{new Date(tx.created_at).toLocaleString('ar-EG')}</p>
                          </div>
                          <div className="text-left">
                            <span className="badge badge-indigo text-[10px]">الكمية: {item?.quantity || 1}</span>
                            <p className="tabnum font-black text-indigo-800 text-xs mt-0.5">{fmt(tx.total_amount)} د.ج</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ══ Modal إضافة / تعديل منتج ══ */}
      {showAddModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-header">
              <h3 className="font-black text-slate-800 text-base">
                {editingProduct ? 'تعديل منتج في المخزن' : 'إضافة منتج جديد'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost p-2 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="modal-body space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">📝 اسم المنتج *</label>
                <input type="text" required placeholder="مثال: زيت زيتون 1 لتر..."
                  value={name} onChange={e => setName(e.target.value)} className="form-input" />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">📷 صورة المنتج</label>
                <div className="flex items-center gap-3">
                  <label htmlFor="product-photo-upload" className="flex-1 py-3 px-3 border-2 border-dashed border-indigo-300 rounded-2xl bg-indigo-50 text-indigo-800 text-xs font-black flex items-center justify-center gap-2 cursor-pointer touch-active">
                    <Camera className="w-4 h-4 text-indigo-600" />
                    <span>التقاط أو اختيار صورة من المعرض</span>
                  </label>
                  <input id="product-photo-upload" type="file" accept="image/*" onChange={handleProductImageChange} className="hidden" />
                  {photoUrl && <img src={photoUrl} alt="معاينة" className="w-12 h-12 rounded-xl object-cover border shrink-0" />}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">سعر الجملة (د.ج) *</label>
                  <input type="number" required min="0" placeholder="800"
                    value={costPrice || ''} onChange={e => setCostPrice(+e.target.value)} className="form-input tabnum" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">سعر التجزئة (د.ج) *</label>
                  <input type="number" required min="0" placeholder="1,100"
                    value={retailPrice || ''} onChange={e => setRetailPrice(+e.target.value)}
                    className="form-input tabnum text-emerald-700" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">الكمية الحالية *</label>
                  <input type="number" required min="0"
                    value={stockQuantity} onChange={e => setStockQuantity(+e.target.value)}
                    className="form-input text-center font-black text-lg tabnum" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">حد تنبيه النقص (قطع)</label>
                  <input type="number" min="1"
                    value={minStockAlert} onChange={e => setMinStockAlert(+e.target.value)}
                    className="form-input text-center tabnum" />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border rounded-2xl space-y-2">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">📅 تاريخ انتهاء الصلاحية (اختياري)</label>
                  <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="form-input" />
                </div>

                {expiryDate && (
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">⏰ حد التنبيه بالصلاحية (التنبيه قبل كم يوم؟)</label>
                    <select value={expiryAlertDays} onChange={e => setExpiryAlertDays(+e.target.value)} className="form-input">
                      <option value={15}>15 يوم قبل الانتهاء</option>
                      <option value={30}>30 يوم قبل الانتهاء</option>
                      <option value={60}>60 يوم قبل الانتهاء</option>
                      <option value={90}>90 يوم قبل الانتهاء</option>
                    </select>
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary w-full py-4 text-base shadow-md">
                <BadgeCheck size={18} strokeWidth={2.5} />
                حفظ المنتج 📦
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══ Modal تعديل الكمية (+ / -) ══ */}
      {showAdjustModal && adjustingProduct && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAdjustModal(false); }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-header">
              <h3 className="font-black text-slate-800 text-base">
                {adjustType === 'add' ? 'إضافة كمية للمخزون 📦' : 'خصم كمية من المخزون 🔻'}
              </h3>
              <button onClick={() => setShowAdjustModal(false)} className="btn btn-ghost p-2 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={executeAdjustStock} className="modal-body space-y-4">
              <div className="p-3 bg-slate-100 rounded-xl text-xs font-bold text-slate-800 flex justify-between">
                <span>المنتج: {adjustingProduct.name}</span>
                <span>الموجود حالياً: {adjustingProduct.stock_quantity} حبة</span>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {adjustType === 'add' ? 'أدخل الكمية المضافة ➕' : 'أدخل الكمية المخصومة ➖'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={adjustQty}
                  onChange={e => setAdjustQty(+e.target.value)}
                  className="form-input text-center font-black text-2xl tabnum text-emerald-700"
                />
              </div>

              <button type="submit" className="btn btn-primary w-full py-4 text-base shadow-md">
                تأكيد ضبط الكمية ✅
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
