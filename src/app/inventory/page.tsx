'use client';

import { useState, useEffect, useMemo } from 'react';
import { getLocalData, setLocalData, Product } from '@/lib/store';
import { toast } from '@/components/Toast';
import {
  Package, Plus, Search, X,
  Minus, AlertTriangle, Clock,
  TrendingUp, BadgeCheck,
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('en-US');

/* ──── حالة الصلاحية ──── */
function getExpiryStatus(d?: string) {
  if (!d) return null;
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
  if (days < 0)   return { label: 'منتهي الصلاحية',     cls: 'badge badge-danger',   cardCls: 'expired', barCls: 'danger' };
  if (days <= 30) return { label: `ينتهي خلال ${days}يوم`, cls: 'badge badge-warning', cardCls: 'low',     barCls: 'warning' };
  return              { label: `صالح حتى ${d}`,         cls: 'badge badge-success',  cardCls: 'ok',      barCls: '' };
}

/* ──── Emoji تلقائي للمنتج ──── */
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
  const [searchQuery,  setSearchQuery]  = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [name,          setName]          = useState('');
  const [costPrice,     setCostPrice]     = useState(0);
  const [retailPrice,   setRetailPrice]   = useState(0);
  const [stockQuantity, setStockQuantity] = useState(10);
  const [minStockAlert, setMinStockAlert] = useState(5);
  const [expiryDate,    setExpiryDate]    = useState('');
  const [photoUrl,      setPhotoUrl]      = useState('');

  useEffect(() => {
    setProducts(getLocalData('tajer_smart_products_v1', []));
  }, []);

  const sorted = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products
      .filter(p => p.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const score = (p: Product) => {
          const e = getExpiryStatus(p.expiry_date);
          if (e?.cardCls === 'expired') return 0;
          if (p.stock_quantity <= p.min_stock_alert) return 1;
          if (e?.cardCls === 'low') return 2;
          return 3;
        };
        return score(a) - score(b);
      });
  }, [products, searchQuery]);

  const lowCount     = products.filter(p => p.stock_quantity <= p.min_stock_alert).length;
  const expiredCount = products.filter(p => (getExpiryStatus(p.expiry_date)?.cardCls === 'expired')).length;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast('يرجى كتابة اسم المنتج', 'error'); return; }

    const np: Product = {
      id: 'p_' + Date.now(),
      name: name.trim(),
      cost_price: +costPrice, retail_price: +retailPrice,
      stock_quantity: +stockQuantity, min_stock_alert: +minStockAlert,
      expiry_date: expiryDate || undefined,
      photo_url: photoUrl.trim() || undefined,
      last_purchased_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const up = [np, ...products];
    setProducts(up);
    setLocalData('tajer_smart_products_v1', up);
    setName(''); setCostPrice(0); setRetailPrice(0); setStockQuantity(10);
    setMinStockAlert(5); setExpiryDate(''); setPhotoUrl('');
    setShowAddModal(false);
    toast('✅ تمت إضافة المنتج إلى المخزن');
  };

  const adjust = (id: string, d: number) => {
    const up = products.map(p => p.id === id ? { ...p, stock_quantity: Math.max(0, p.stock_quantity + d) } : p);
    setProducts(up);
    setLocalData('tajer_smart_products_v1', up);
  };

  const profitPct = (c: number, r: number) =>
    c > 0 ? Math.round(((r - c) / c) * 100) : 0;

  return (
    <div className="space-y-4">

      {/* ── لوحة ملخص المخزن ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'منتج',         val: products.length, color: 'hsl(158 64% 38%)', bg: 'hsl(158 64% 38% / 0.08)' },
          { label: 'نقص المخزون',  val: lowCount,        color: 'hsl(28 80% 40%)',  bg: 'hsl(38 92% 50% / 0.08)', warn: lowCount > 0 },
          { label: 'منتهي الصلاح', val: expiredCount,    color: 'hsl(351 83% 52%)', bg: 'hsl(351 83% 58% / 0.08)', warn: expiredCount > 0 },
        ].map(s => (
          <div key={s.label}
            className="rounded-xl p-3 text-center"
            style={{
              background: s.bg,
              border: `1px solid ${s.color}30`,
            }}
          >
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
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary shrink-0 gap-1.5 py-2.5 px-4">
          <Plus size={18} strokeWidth={2.5} />
          <span className="hidden sm:inline">منتج جديد</span>
        </button>
      </div>

      {/* ── قائمة المنتجات ── */}
      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div className="empty-state">
            <Package size={40} className="opacity-25" />
            <p className="font-bold text-sm">{searchQuery ? 'لا يوجد منتج بهذا الاسم' : 'المخزن فارغ — أضف أول منتج!'}</p>
          </div>
        ) : (
          sorted.map((p) => {
            const expiry    = getExpiryStatus(p.expiry_date);
            const isLow     = p.stock_quantity <= p.min_stock_alert;
            const cardState = expiry?.cardCls ?? (isLow ? 'low' : 'ok');
            const pct       = profitPct(p.cost_price, p.retail_price);
            const stockPct  = Math.min(100, Math.round((p.stock_quantity / Math.max(1, p.min_stock_alert * 4)) * 100));

            return (
              <div key={p.id} className={`product-card ${cardState}`}>
                {/* الصف الأول */}
                <div className="flex items-start gap-3">
                  {/* صورة / Emoji */}
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 overflow-hidden"
                    style={{
                      background: cardState === 'expired' ? 'hsl(351 83% 58% / 0.08)'
                                : cardState === 'low'     ? 'hsl(38 92% 50% / 0.08)'
                                : 'hsl(158 64% 38% / 0.06)',
                    }}
                  >
                    {p.photo_url
                      ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                      : autoEmoji(p.name)}
                  </div>

                  {/* المعلومات */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-900 text-base leading-tight truncate">{p.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {expiry && <span className={expiry.cls}>{expiry.label}</span>}
                      {isLow && cardState !== 'expired' && <span className="badge badge-warning">⚠️ مخزون منخفض</span>}
                      {p.last_purchased_at && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                          <Clock size={10} /> {new Date(p.last_purchased_at).toLocaleDateString('en-GB')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* الكمية */}
                  <div
                    className="rounded-xl px-3 py-2 text-center shrink-0"
                    style={{
                      background: cardState === 'expired' ? 'hsl(351 83% 58% / 0.1)'
                                : isLow                  ? 'hsl(38 92% 50% / 0.1)'
                                : 'hsl(158 64% 38% / 0.08)',
                      border: `1px solid ${cardState === 'expired' ? 'hsl(351 83% 58% / 0.2)' : isLow ? 'hsl(38 92% 50% / 0.2)' : 'hsl(158 64% 38% / 0.15)'}`,
                    }}
                  >
                    <p className="text-[10px] font-bold text-slate-500">المخزون</p>
                    <p
                      className="font-black text-xl tabnum leading-tight"
                      style={{
                        color: cardState === 'expired' ? 'hsl(351 83% 52%)' : isLow ? 'hsl(28 80% 38%)' : 'hsl(158 64% 32%)',
                      }}
                    >
                      {p.stock_quantity}
                    </p>
                  </div>
                </div>

                {/* شريط تقدم المخزون */}
                <div className="progress-bar my-2.5">
                  <div
                    className={`progress-bar-fill ${expiry?.barCls ?? (isLow ? 'warning' : '')}`}
                    style={{ width: `${stockPct}%` }}
                  />
                </div>

                {/* الأسعار + أزرار الضبط */}
                <div className="flex items-center gap-3">
                  {/* الأسعار */}
                  <div className="flex-1 grid grid-cols-3 gap-1.5">
                    <div className="rounded-lg p-1.5 text-center" style={{ background: 'hsl(220 20% 96%)' }}>
                      <p className="text-[10px] text-slate-400 font-semibold">جملة</p>
                      <p className="text-xs font-black text-slate-700 tabnum">{fmt(p.cost_price)}</p>
                    </div>
                    <div className="rounded-lg p-1.5 text-center" style={{ background: 'hsl(158 64% 38% / 0.06)' }}>
                      <p className="text-[10px] font-semibold" style={{ color: 'hsl(158 64% 40%)' }}>تجزئة</p>
                      <p className="text-xs font-black tabnum" style={{ color: 'hsl(158 64% 32%)' }}>{fmt(p.retail_price)}</p>
                    </div>
                    <div className="rounded-lg p-1.5 text-center" style={{ background: 'hsl(239 84% 67% / 0.06)' }}>
                      <p className="text-[10px] font-semibold" style={{ color: 'hsl(239 84% 60%)' }}>ربح</p>
                      <p className="text-xs font-black tabnum" style={{ color: 'hsl(239 84% 52%)' }}>+{pct}%</p>
                    </div>
                  </div>

                  {/* أزرار ± */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => adjust(p.id, -1)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center touch-active"
                      style={{ background: 'hsl(220 20% 93%)', color: 'hsl(220 20% 35%)' }}
                    >
                      <Minus size={16} strokeWidth={2.5} />
                    </button>
                    <span className="w-7 text-center font-black text-sm text-slate-800 tabnum">{p.stock_quantity}</span>
                    <button
                      onClick={() => adjust(p.id, 1)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center touch-active text-white"
                      style={{
                        background: 'var(--grad-emerald)',
                        boxShadow: '0 3px 10px hsl(158 64% 38% / 0.3)',
                      }}
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ══ Modal إضافة منتج ══ */}
      {showAddModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                     style={{ background: 'hsl(239 84% 67% / 0.12)' }}>
                  <Package size={18} style={{ color: 'hsl(239 84% 60%)' }} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base leading-tight">إضافة منتج جديد</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">أدخل تفاصيل المنتج</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost p-2 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="modal-body space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">📝 اسم المنتج *</label>
                <input type="text" required placeholder="مثال: زيت زيتون 1 لتر..."
                  value={name} onChange={e => setName(e.target.value)} className="form-input" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">سعر الجملة (د.ج) *</label>
                  <input type="number" required min="0" placeholder="800"
                    value={costPrice} onChange={e => setCostPrice(+e.target.value)} className="form-input tabnum" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">سعر التجزئة (د.ج) *</label>
                  <input type="number" required min="0" placeholder="1,100"
                    value={retailPrice} onChange={e => setRetailPrice(+e.target.value)}
                    className="form-input tabnum" style={{ color: 'hsl(158 64% 35%)' }} />
                </div>
              </div>

              {/* معاينة الربح */}
              {retailPrice > costPrice && (
                <div className="flex items-center justify-between p-3 rounded-xl"
                     style={{ background: 'hsl(158 64% 38% / 0.06)', border: '1px solid hsl(158 64% 38% / 0.15)' }}>
                  <span className="text-xs font-bold text-emerald-700">صافي الربح للحبة:</span>
                  <span className="font-black text-emerald-800 tabnum text-sm">
                    +{fmt(retailPrice - costPrice)} د.ج ({profitPct(costPrice, retailPrice)}%)
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">الكمية الحالية *</label>
                  <input type="number" required min="0"
                    value={stockQuantity} onChange={e => setStockQuantity(+e.target.value)}
                    className="form-input text-center font-black text-lg tabnum" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">حد التنبيه</label>
                  <input type="number" min="1"
                    value={minStockAlert} onChange={e => setMinStockAlert(+e.target.value)}
                    className="form-input text-center tabnum" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">📅 تاريخ انتهاء الصلاحية (اختياري)</label>
                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="form-input" />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">🖼️ رابط صورة المنتج (اختياري)</label>
                <input type="url" placeholder="https://..." value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} className="form-input" />
              </div>

              <button type="submit" className="btn btn-primary w-full py-4 text-base">
                <BadgeCheck size={18} strokeWidth={2.5} />
                حفظ المنتج في المخزن 📦
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
