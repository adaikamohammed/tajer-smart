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
import { X, Trash2, Plus, Save, AlertTriangle } from 'lucide-react';

interface Props {
  transaction: Transaction;
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}

const fmt = (n: number) => (Number(n) || 0).toLocaleString('en-US');

export default function EditTransactionModal({ transaction, products, onClose, onSaved }: Props) {
  const isSale = transaction.tx_type === 'SALE';

  const [items, setItems] = useState<TransactionItem[]>(
    transaction.items.map(i => ({ ...i }))
  );
  const [paidAmount, setPaidAmount] = useState(transaction.paid_amount);
  const [addProductId, setAddProductId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0),
    [items]
  );
  const debt = Math.max(0, total - paidAmount);
  const statusLabel = debt === 0 ? 'مدفوع ✅' : paidAmount > 0 ? 'جزئي 🔶' : 'دين 🔴';

  const iconBg = isSale ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700';
  const saveBtnCls = isSale
    ? 'btn flex-[2] py-3 font-black text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50'
    : 'btn flex-[2] py-3 font-black text-white bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50';
  const addBtnCls = isSale
    ? 'h-[46px] px-4 rounded-xl font-black text-white flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-700'
    : 'h-[46px] px-4 rounded-xl font-black text-white flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-700 hover:bg-indigo-800';
  const summaryBg = isSale ? 'hsl(142 71% 42% / 0.05)' : 'hsl(239 84% 67% / 0.05)';
  const summaryBorder = isSale ? 'hsl(142 71% 42% / 0.2)' : 'hsl(239 84% 67% / 0.2)';
  const debtCls = debt > 0 ? 'font-black text-base tabnum text-rose-700' : 'font-black text-base tabnum text-emerald-700';

  const updateQty = (idx: number, qty: number) =>
    setItems(prev => prev.map((item, i) => (i === idx ? { ...item, quantity: Math.max(0, qty) } : item)));

  const updatePrice = (idx: number, price: number) =>
    setItems(prev => prev.map((item, i) => (i === idx ? { ...item, unit_price: Math.max(0, price) } : item)));

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const addProduct = () => {
    if (!addProductId) return;
    const prod = products.find(p => p.id === addProductId);
    if (!prod) return;
    setItems(prev => {
      const existing = prev.findIndex(i => i.product_id === prod.id);
      if (existing !== -1) {
        return prev.map((item, i) => i === existing ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        product_id: prod.id,
        product_name: prod.name,
        quantity: 1,
        unit_price: isSale ? prod.retail_price : prod.cost_price,
        cost_price: prod.cost_price,
      }];
    });
    setAddProductId('');
  };

  const handleSave = () => {
    const validItems = items.filter(i => i.quantity > 0);
    if (validItems.length === 0) {
      toast('⚠️ يجب أن يكون في الوصل منتج واحد على الأقل بكمية موجبة', 'error');
      return;
    }
    setIsLoading(true);
    const result = updateTransaction(transaction.id, validItems, paidAmount);
    setIsLoading(false);
    if (result.success) {
      toast('✅ تم تعديل الوصل وتصحيح المخزون والديون والإحصائيات بنجاح!');
      onSaved();
      onClose();
    } else {
      toast(result.error || '❌ فشل تعديل الوصل', 'error');
    }
  };

  const productOptions = products.map(p => ({
    id: p.id,
    label: p.name,
    sublabel: `مخزون: ${p.stock_quantity}`,
    badge: `${fmt(isSale ? p.retail_price : p.cost_price)} د.ج`,
  }));

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet">
        <div className="modal-handle" />

        {/* رأس النافذة */}
        <div className="modal-header">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
              <Save size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">✏️ تعديل الوصل</h3>
              <p className="text-[11px] text-slate-400 font-semibold">
                {isSale ? '📤 بيع لـ' : '📥 شراء من'}{' '}
                <span className="font-black text-slate-700">{transaction.contact_name || '—'}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2 rounded-xl">
            <X size={18} />
          </button>
        </div>

        {/* جسم النافذة */}
        <div className="modal-body space-y-4">

          {/* قائمة المنتجات */}
          <div>
            <p className="text-xs font-black text-slate-600 mb-2">📦 المنتجات</p>
            {items.length === 0 ? (
              <div className="text-center py-4 text-slate-400 text-sm font-bold bg-slate-50 rounded-xl border border-dashed border-slate-300">
                لا توجد منتجات — أضف منتجاً أدناه
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-800 flex-1 truncate">
                        {item.product_name}
                      </span>
                      <button
                        onClick={() => removeItem(idx)}
                        className="mr-2 text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-0.5">الكمية</label>
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={e => updateQty(idx, Number(e.target.value))}
                          onFocus={e => e.target.select()}
                          className="form-input text-sm font-black text-center py-1.5"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-0.5">السعر (د.ج)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={item.unit_price}
                          onChange={e => updatePrice(idx, Number(e.target.value))}
                          onFocus={e => e.target.select()}
                          className="form-input text-sm font-black text-center py-1.5"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 font-bold mt-1.5 text-left tabnum">
                      = <span className="text-slate-900 font-black">{fmt(item.quantity * item.unit_price)} د.ج</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* إضافة منتج */}
          <div>
            <p className="text-xs font-black text-slate-600 mb-1.5">➕ إضافة منتج</p>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <SearchableSelect
                  options={productOptions}
                  value={addProductId}
                  onChange={id => setAddProductId(id)}
                  placeholder="ابحث واختر منتجاً للإضافة..."
                  searchPlaceholder="اكتب اسم المنتج..."
                  icon="package"
                />
              </div>
              <button onClick={addProduct} disabled={!addProductId} className={addBtnCls}>
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* المبلغ المدفوع */}
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5">💰 المبلغ المدفوع (د.ج)</label>
            <input
              type="number"
              min="0"
              value={paidAmount}
              onChange={e => setPaidAmount(Number(e.target.value))}
              onFocus={e => e.target.select()}
              className="form-input text-base font-black tabnum"
            />
          </div>

          {/* ملخص حي */}
          <div className="rounded-2xl p-3.5 border space-y-2" style={{ background: summaryBg, borderColor: summaryBorder }}>
            <div className="flex justify-between text-sm">
              <span className="font-bold text-slate-600">الإجمالي الجديد:</span>
              <span className="font-black text-slate-900 tabnum">{fmt(total)} د.ج</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-bold text-slate-600">المدفوع:</span>
              <span className="font-black text-emerald-700 tabnum">{fmt(paidAmount)} د.ج</span>
            </div>
            <div className="border-t border-slate-200/60 pt-2 flex justify-between text-sm">
              <span className="font-bold text-slate-600">الدين الجديد:</span>
              <div className="flex items-center gap-2">
                <span className={debtCls}>{fmt(debt)} د.ج</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700">
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>

          {/* تحذير */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-800 font-bold leading-relaxed">
              سيتم تصحيح المخزون وديون الشخص والإحصائيات وأرشيف الأوصال تلقائياً بعد الحفظ.
            </p>
          </div>

        </div>

        {/* أزرار الإجراءات */}
        <div className="modal-footer flex gap-2">
          <button onClick={onClose} className="btn btn-ghost flex-1 py-3">إلغاء</button>
          <button
            onClick={handleSave}
            disabled={isLoading || items.filter(i => i.quantity > 0).length === 0}
            className={saveBtnCls}
          >
            {isLoading ? '⏳ جاري الحفظ...' : '✅ حفظ التعديل'}
          </button>
        </div>
      </div>
    </div>
  );
}
