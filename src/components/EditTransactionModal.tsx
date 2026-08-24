'use client';

import { useState, useMemo } from 'react';
import {
  Transaction,
  TransactionItem,
  Product,
  updateTransaction,
} from '@/lib/store';
import { SearchableSelect } from './SearchableSelect';
import { toast } from './Toast';
import {
  X, Trash2, Plus, Minus, Save, AlertTriangle,
  ShoppingCart, Package, DollarSign, CheckCircle2,
} from 'lucide-react';

interface Props {
  transaction: Transaction;
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}

interface CartItemState {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  packsCount?: number;
  looseCount?: number;
}

const fmt = (n: number) => (Number(n) || 0).toLocaleString('en-US');

export default function EditTransactionModal({ transaction, products, onClose, onSaved }: Props) {
  const isSale = transaction.tx_type === 'SALE';

  // تهيئة عناصر السلة مع فحص نوع الوحدة (كرتونة / حبة)
  const [items, setItems] = useState<CartItemState[]>(() => {
    return transaction.items.map(item => {
      const prod = products.find(p => p.id === item.product_id);
      let packsCount: number | undefined = undefined;
      let looseCount: number | undefined = undefined;
      if (prod && prod.unit_type === 'pack') {
        const cap = prod.pack_quantity || 1;
        packsCount = Math.floor(item.quantity / cap);
        looseCount = item.quantity % cap;
      }
      return {
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: Number(item.quantity) || 0,
        unit_price: Number(item.unit_price) || 0,
        cost_price: Number(item.cost_price ?? prod?.cost_price) || 0,
        packsCount,
        looseCount,
      };
    });
  });

  const [paidAmount, setPaidAmount] = useState<number>(transaction.paid_amount || 0);
  const [addProductId, setAddProductId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // إجمالي السلة
  const total = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0),
    [items]
  );
  const debt = Math.max(0, total - paidAmount);
  const statusLabel = debt === 0 ? 'مدفوع بالكامل ✅' : paidAmount > 0 ? 'دفع جزئي 🔶' : 'دين كامل 🔴';

  // ── دوال التحكم بالكميات والأسعار بالسلة ──
  const updateQty = (idx: number, delta: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const newQty = Math.max(1, item.quantity + delta);
      const prod = products.find(p => p.id === item.product_id);
      let packsCount = item.packsCount;
      let looseCount = item.looseCount;
      if (prod && prod.unit_type === 'pack') {
        const cap = prod.pack_quantity || 1;
        packsCount = Math.floor(newQty / cap);
        looseCount = newQty % cap;
      }
      return { ...item, quantity: newQty, packsCount, looseCount };
    }));
  };

  const setQtyDirect = (idx: number, qty: number) => {
    const cleanQty = Math.max(0, qty);
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const prod = products.find(p => p.id === item.product_id);
      let packsCount = item.packsCount;
      let looseCount = item.looseCount;
      if (prod && prod.unit_type === 'pack') {
        const cap = prod.pack_quantity || 1;
        packsCount = Math.floor(cleanQty / cap);
        looseCount = cleanQty % cap;
      }
      return { ...item, quantity: cleanQty, packsCount, looseCount };
    }));
  };

  const updatePackLooseQty = (idx: number, packs: number, loose: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const prod = products.find(p => p.id === item.product_id);
      const cap = prod?.pack_quantity || 1;
      const pCount = Math.max(0, packs);
      const lCount = Math.max(0, loose);
      const totalQty = (pCount * cap) + lCount;
      return {
        ...item,
        quantity: totalQty,
        packsCount: pCount,
        looseCount: lCount,
      };
    }));
  };

  const updatePrice = (idx: number, price: number) => {
    setItems(prev => prev.map((item, i) => (i === idx ? { ...item, unit_price: Math.max(0, price) } : item)));
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const addProduct = (prodId?: string) => {
    const targetId = prodId || addProductId;
    if (!targetId) return;
    const prod = products.find(p => p.id === targetId);
    if (!prod) return;

    setItems(prev => {
      const existingIdx = prev.findIndex(i => i.product_id === prod.id);
      if (existingIdx !== -1) {
        const cur = prev[existingIdx];
        const newQty = cur.quantity + 1;
        let pCount = cur.packsCount;
        let lCount = cur.looseCount;
        if (prod.unit_type === 'pack') {
          const cap = prod.pack_quantity || 1;
          pCount = Math.floor(newQty / cap);
          lCount = newQty % cap;
        }
        return prev.map((item, i) => i === existingIdx ? { ...item, quantity: newQty, packsCount: pCount, looseCount: lCount } : item);
      }

      const isPack = prod.unit_type === 'pack';
      return [
        ...prev,
        {
          product_id: prod.id,
          product_name: prod.name,
          quantity: 1,
          unit_price: isSale ? prod.retail_price : prod.cost_price,
          cost_price: Number(prod.cost_price) || 0,
          packsCount: isPack ? 0 : undefined,
          looseCount: isPack ? 1 : undefined,
        },
      ];
    });

    setAddProductId('');
    toast(`✅ تمت إضافة "${prod.name}" إلى السلة`);
  };

  const handleSave = () => {
    const validItems: TransactionItem[] = items
      .filter(i => i.quantity > 0)
      .map(i => ({
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        cost_price: Number(i.cost_price) || 0,
      }));

    if (validItems.length === 0) {
      toast('⚠️ يجب أن يحتوي الوصل على منتج واحد على الأقل بكمية موجبة', 'error');
      return;
    }

    setIsLoading(true);
    const result = updateTransaction(transaction.id, validItems, paidAmount);
    setIsLoading(false);

    if (result.success) {
      toast('✅ تم حفظ التعديل وتصحيح المخزون والديون بنجاح!');
      onSaved();
      onClose();
    } else {
      toast(result.error || '❌ فشل تعديل الوصل', 'error');
    }
  };

  const productOptions = products.map(p => ({
    id: p.id,
    label: p.name,
    sublabel: `المخزون المتوفر: ${p.stock_quantity}`,
    badge: `${fmt(isSale ? p.retail_price : p.cost_price)} د.ج`,
  }));

  const iconBg = isSale ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700';
  const themeBtnCls = isSale
    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md';
  const summaryBg = isSale ? 'hsl(142 71% 42% / 0.05)' : 'hsl(239 84% 67% / 0.05)';
  const summaryBorder = isSale ? 'hsl(142 71% 42% / 0.2)' : 'hsl(239 84% 67% / 0.2)';
  const debtTextCls = debt > 0 ? 'font-black text-base tabnum text-rose-700' : 'font-black text-base tabnum text-emerald-700';

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet">
        <div className="modal-handle" />

        {/* ── رأس النافذة ── */}
        <div className="modal-header">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
              <Save size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">✏️ تعديل الوصل</h3>
              <p className="text-[11px] text-slate-500 font-bold">
                {isSale ? '📤 وصل بيع لـ' : '📥 وصل شراء من'}{' '}
                <span className="font-black text-slate-800">{transaction.contact_name || 'زبون عام'}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2 rounded-xl text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        {/* ── جسم النافذة ── */}
        <div className="modal-body space-y-4">

          {/* ── 🛒 1. سلة المنتجات في الوصل ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <ShoppingCart size={15} className={isSale ? 'text-emerald-600' : 'text-indigo-600'} />
                منتجات الوصل ({items.length} منتج)
              </h4>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  تفريغ السلة
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <ShoppingCart size={32} className="mx-auto text-slate-300 mb-1.5" />
                <p className="text-xs font-bold text-slate-500">سلة الوصل فارغة، أضف منتجات من الأسفل</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {items.map((item, idx) => {
                  const prod = products.find(p => p.id === item.product_id);
                  const isPack = prod && prod.unit_type === 'pack';
                  const curPacks = item.packsCount ?? (isPack ? Math.floor(item.quantity / (prod.pack_quantity || 1)) : 0);
                  const curLoose = item.looseCount ?? (isPack ? (item.quantity % (prod.pack_quantity || 1)) : item.quantity);
                  const itemSubtotal = item.quantity * item.unit_price;

                  return (
                    <div
                      key={`${item.product_id}_${idx}`}
                      className="p-3 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2.5"
                    >
                      {/* اسم المنتج وزر الحذف */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <Package size={15} className="text-slate-400 shrink-0" />
                          <p className="font-black text-xs text-slate-900 truncate">
                            {item.product_name}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                          title="حذف من الوصل"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* التحكم بالكمية (+ و - وإدخال مباشر) */}
                      {isPack ? (
                        <div className="w-full bg-slate-50 p-2 rounded-xl border border-indigo-100 shadow-inner">
                          <div className="grid grid-cols-2 gap-2 w-full">
                            {/* قسم الكراتين */}
                            <div className="flex flex-col items-center bg-white p-1.5 rounded-lg border border-indigo-200/70">
                              <span className="block text-[10px] font-black text-indigo-950 mb-1">📦 كراتين</span>
                              <div className="flex items-center justify-between w-full gap-1">
                                <button
                                  type="button"
                                  onClick={() => updatePackLooseQty(idx, Math.max(0, curPacks - 1), curLoose)}
                                  className="w-7 h-7 rounded-md bg-slate-100 text-indigo-900 border border-indigo-200 font-black text-sm flex items-center justify-center hover:bg-rose-100 hover:text-rose-700 shrink-0 transition-colors"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={curPacks}
                                  onChange={e => updatePackLooseQty(idx, +e.target.value, curLoose)}
                                  onFocus={e => e.target.select()}
                                  className="flex-1 min-w-0 text-center form-input py-0.5 px-0.5 font-black text-xs text-indigo-950 tabnum bg-white border-indigo-200 shadow-inner"
                                />
                                <button
                                  type="button"
                                  onClick={() => updatePackLooseQty(idx, curPacks + 1, curLoose)}
                                  className="w-7 h-7 rounded-md bg-indigo-600 text-white font-black text-sm flex items-center justify-center hover:bg-indigo-700 shrink-0 transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* قسم الحبات الإضافية */}
                            <div className="flex flex-col items-center bg-white p-1.5 rounded-lg border border-emerald-200/70">
                              <span className="block text-[10px] font-black text-emerald-950 mb-1">🥛 حبات إضافية</span>
                              <div className="flex items-center justify-between w-full gap-1">
                                <button
                                  type="button"
                                  onClick={() => updatePackLooseQty(idx, curPacks, Math.max(0, curLoose - 1))}
                                  className="w-7 h-7 rounded-md bg-slate-100 text-emerald-900 border border-emerald-200 font-black text-sm flex items-center justify-center hover:bg-rose-100 hover:text-rose-700 shrink-0 transition-colors"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={curLoose}
                                  onChange={e => updatePackLooseQty(idx, curPacks, +e.target.value)}
                                  onFocus={e => e.target.select()}
                                  className="flex-1 min-w-0 text-center form-input py-0.5 px-0.5 font-black text-xs text-emerald-950 tabnum bg-white border-emerald-200 shadow-inner"
                                />
                                <button
                                  type="button"
                                  onClick={() => updatePackLooseQty(idx, curPacks, curLoose + 1)}
                                  className="w-7 h-7 rounded-md bg-emerald-600 text-white font-black text-sm flex items-center justify-center hover:bg-emerald-700 shrink-0 transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="text-center mt-1">
                            <span className="text-[10px] font-bold text-slate-500">
                              إجمالي الكمية: <span className="font-black text-slate-800 tabnum">{item.quantity}</span> حبة
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-600">الكمية:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateQty(idx, -1)}
                              className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 font-black text-base flex items-center justify-center hover:bg-rose-100 hover:text-rose-700 shadow-sm transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={e => setQtyDirect(idx, Number(e.target.value))}
                              onFocus={e => e.target.select()}
                              className="w-16 text-center form-input py-1 px-1 text-sm font-black tabnum bg-white border-slate-300 shadow-inner"
                            />
                            <button
                              type="button"
                              onClick={() => updateQty(idx, 1)}
                              className={`w-8 h-8 rounded-lg font-black text-base flex items-center justify-center shadow-sm transition-colors ${
                                isSale ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              }`}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* شريط السعر والإجمالي */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        {/* خيارات السعر */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-500">السعر:</span>
                          {isSale && prod && (
                            <>
                              <button
                                type="button"
                                onClick={() => updatePrice(idx, prod.retail_price)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-black border transition-all ${
                                  item.unit_price === prod.retail_price
                                    ? 'bg-emerald-600 text-white border-transparent shadow-xs'
                                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                }`}
                              >
                                تجزئة 1 ({prod.retail_price})
                              </button>
                              {(prod.retail_price_2 || 0) > 0 && (
                                <button
                                  type="button"
                                  onClick={() => updatePrice(idx, prod.retail_price_2 || prod.retail_price)}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black border transition-all ${
                                    item.unit_price === prod.retail_price_2
                                      ? 'bg-sky-600 text-white border-transparent shadow-xs'
                                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                  }`}
                                >
                                  تجزئة 2 ({prod.retail_price_2})
                                </button>
                              )}
                            </>
                          )}
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={item.unit_price}
                              onChange={e => updatePrice(idx, Number(e.target.value))}
                              onFocus={e => e.target.select()}
                              className="w-20 form-input py-0.5 px-1.5 text-xs font-black text-slate-900 tabnum bg-white border-slate-300 text-center"
                            />
                            <span className="text-[10px] font-bold text-slate-500">د.ج</span>
                          </div>
                        </div>

                        {/* إجمالي البند */}
                        <div className="text-left font-black text-xs tabnum">
                          <span className="text-slate-400 text-[10px] font-normal ml-1">المجموع:</span>
                          <span className={isSale ? 'text-emerald-700 font-black text-sm' : 'text-indigo-700 font-black text-sm'}>
                            {fmt(itemSubtotal)} د.ج
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── ➕ 2. إضافة منتج جديد للسلة ── */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="block text-xs font-black text-slate-700">
              ➕ إضافة منتج جديد للسلة
            </label>
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <SearchableSelect
                  options={productOptions}
                  value={addProductId}
                  onChange={id => {
                    setAddProductId(id);
                    if (id) addProduct(id);
                  }}
                  placeholder="🔍 ابحث واختر منتجاً لإضافته..."
                  searchPlaceholder="اكتب اسم المنتج..."
                  icon="package"
                />
              </div>
              <button
                type="button"
                onClick={() => addProduct()}
                disabled={!addProductId}
                className={`h-[46px] px-3.5 rounded-xl font-black flex items-center justify-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${themeBtnCls}`}
                title="إضافة للسلة"
              >
                <Plus size={18} />
                <span className="text-xs hidden sm:inline">إضافة</span>
              </button>
            </div>
          </div>

          {/* ── 💰 3. المبلغ المدفوع ── */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <DollarSign size={14} className="text-emerald-600" />
                المبلغ المدفوع كاش (د.ج)
              </label>
              <button
                type="button"
                onClick={() => setPaidAmount(total)}
                className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <CheckCircle2 size={13} />
                دفع كامل المبلغ
              </button>
            </div>
            <input
              type="number"
              min="0"
              value={paidAmount}
              onChange={e => setPaidAmount(Math.max(0, Number(e.target.value)))}
              onFocus={e => e.target.select()}
              className="form-input text-base font-black tabnum bg-white border-slate-300 focus:border-emerald-500"
            />
          </div>

          {/* ── 📊 4. الملخص المالي الحي ── */}
          <div
            className="rounded-2xl p-3.5 border space-y-2"
            style={{ background: summaryBg, borderColor: summaryBorder }}
          >
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-600">الإجمالي الجديد للوصل:</span>
              <span className="font-black text-base text-slate-900 tabnum">{fmt(total)} د.ج</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-600">المبلغ المدفوع:</span>
              <span className="font-black text-sm text-emerald-700 tabnum">{fmt(paidAmount)} د.ج</span>
            </div>
            <div className="border-t border-slate-200/80 pt-2 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-600">الدين المتبقي:</span>
              <div className="flex items-center gap-2">
                <span className={debtTextCls}>{fmt(debt)} د.ج</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>

          {/* ── ⚠️ تنبيه التصحيح التلقائي ── */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-start gap-2">
            <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-800 font-bold leading-relaxed">
              سيتم تصحيح أرصدة المخزون والديون والإحصائيات وأرشيف الأوصال تلقائياً بمجرد حفظ التعديل.
            </p>
          </div>

        </div>

        {/* ── أسفل النافذة ── */}
        <div className="modal-footer flex items-center gap-2.5 p-3.5 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || items.length === 0}
            className={`btn flex-[2] py-3 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50 ${themeBtnCls}`}
          >
            <Save size={16} />
            {isLoading ? 'جاري الحفظ...' : 'حفظ التعديل ✅'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 border border-slate-200 bg-white"
          >
            إلغاء
          </button>
        </div>

      </div>
    </div>
  );
}
