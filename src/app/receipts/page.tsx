'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  getLocalData, setLocalData, deleteReceipt, getReceipts,
  printThermalReceipt, generateReceiptNumber,
  Receipt, ReceiptType, MERCHANT_INFO,
} from '@/lib/store';
import { toast } from '@/components/Toast';
import {
  Receipt as ReceiptIcon, Search, Trash2, Printer,
  ShoppingCart, Package, DollarSign, FileText,
  ChevronDown, ChevronRight, Calendar, Phone,
  X, Filter, RefreshCw,
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('en-US');

const RECEIPT_TYPE_LABELS: Record<ReceiptType, { label: string; emoji: string; color: string; bg: string }> = {
  SALE:              { label: 'وصل بيع',          emoji: '🛒', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  PURCHASE:          { label: 'وصل شراء',          emoji: '📦', color: 'text-indigo-700',  bg: 'bg-indigo-50  border-indigo-200'  },
  DEBT_PAYMENT:      { label: 'وصل تسديد دين',     emoji: '💵', color: 'text-amber-700',   bg: 'bg-amber-50   border-amber-200'   },
  ACCOUNT_STATEMENT: { label: 'كشف حساب',          emoji: '📜', color: 'text-slate-700',   bg: 'bg-slate-50   border-slate-200'   },
};

export default function ReceiptsPage() {
  const [receipts,      setReceipts]      = useState<Receipt[]>([]);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [filterType,    setFilterType]    = useState<ReceiptType | 'all'>('all');
  const [expandedId,    setExpandedId]    = useState<string | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  useEffect(() => {
    setReceipts(getReceipts());
  }, []);

  const reloadReceipts = () => {
    setReceipts(getReceipts());
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('هل تريد حذف هذا الوصل نهائياً من الأرشيف؟')) {
      deleteReceipt(id);
      setReceipts(prev => prev.filter(r => r.id !== id));
      toast('تم حذف الوصل من الأرشيف', 'info');
    }
  };

  const handleDeleteAll = () => {
    if (confirm('⚠️ هل تريد حذف جميع الأوصال من الأرشيف؟ هذا الإجراء لا يمكن التراجع عنه!')) {
      setLocalData('tajer_smart_receipts_v1', []);
      setReceipts([]);
      setShowDeleteAll(false);
      toast('تم حذف كافة الأوصال من الأرشيف', 'warning');
    }
  };

  const handleReprint = (receipt: Receipt, e: React.MouseEvent) => {
    e.stopPropagation();
    printThermalReceipt({ ...receipt, id: receipt.id + '-REPRINT' });
    toast('🖨️ جارٍ فتح نافذة الطباعة...', 'success');
  };

  const filtered = useMemo(() => {
    return receipts
      .filter(r => {
        const matchType   = filterType === 'all' || r.receipt_type === filterType;
        const matchSearch = !searchQuery
          || r.id.toLowerCase().includes(searchQuery.toLowerCase())
          || (r.contact_name && r.contact_name.includes(searchQuery))
          || new Date(r.created_at).toLocaleDateString('ar-EG').includes(searchQuery);
        return matchType && matchSearch;
      });
  }, [receipts, filterType, searchQuery]);

  // ─── إحصائيات سريعة ─────────────────────────────────────────────
  const totalSales    = receipts.filter(r => r.receipt_type === 'SALE').reduce((a, r) => a + (r.total_amount ?? 0), 0);
  const countByType   = Object.fromEntries(
    (['SALE','PURCHASE','DEBT_PAYMENT','ACCOUNT_STATEMENT'] as ReceiptType[]).map(t => [
      t, receipts.filter(r => r.receipt_type === t).length
    ])
  );

  return (
    <div className="space-y-4">

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <ReceiptIcon className="w-5 h-5 text-emerald-600" />
            أرشيف الأوصال 🧾
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{receipts.length} وصل محفوظ كدليل معاملات</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reloadReceipts} className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200">
            <RefreshCw size={16} />
          </button>
          {receipts.length > 0 && (
            <button onClick={() => setShowDeleteAll(true)} className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ─── بطاقات الإحصائيات السريعة ─── */}
      <div className="grid grid-cols-2 gap-2">
        <div className="glass-card p-3 text-center">
          <div className="text-xl font-black text-emerald-700 tabnum">{fmt(totalSales)}</div>
          <div className="text-[10px] text-slate-500 font-bold mt-0.5">إجمالي مبيعات الأوصال (د.ج)</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-xl font-black text-indigo-700 tabnum">{receipts.length}</div>
          <div className="text-[10px] text-slate-500 font-bold mt-0.5">إجمالي الأوصال المحفوظة</div>
        </div>
      </div>

      {/* ─── بحث ─── */}
      <div className="relative">
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="ابحث برقم الوصل، اسم الشخص، أو التاريخ..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="form-input pr-9"
        />
      </div>

      {/* ─── فلترة النوع ─── */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${filterType === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          الكل ({receipts.length})
        </button>
        {(Object.keys(RECEIPT_TYPE_LABELS) as ReceiptType[]).map(type => {
          const meta  = RECEIPT_TYPE_LABELS[type];
          const count = countByType[type] ?? 0;
          const isAct = filterType === type;
          return (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${isAct ? `${meta.bg} ${meta.color} border-current` : 'bg-slate-100 text-slate-600 border-transparent'}`}
            >
              {meta.emoji} {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ─── قائمة الأوصال ─── */}
      {filtered.length === 0 ? (
        <div className="empty-state py-16">
          <ReceiptIcon size={44} className="opacity-20" />
          <p className="font-bold text-sm text-slate-400 mt-3">
            {receipts.length === 0
              ? 'لا توجد أوصال بعد — ستُحفظ هنا تلقائياً عند كل طباعة 🖨️'
              : 'لا يوجد وصل مطابق للبحث أو الفلتر'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(receipt => {
            const meta      = RECEIPT_TYPE_LABELS[receipt.receipt_type];
            const isExpanded = expandedId === receipt.id;

            return (
              <div
                key={receipt.id}
                onClick={() => setExpandedId(isExpanded ? null : receipt.id)}
                className={`glass-card p-4 cursor-pointer transition-all border ${meta.bg}`}
              >
                {/* صف العنوان */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0">{meta.emoji}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-black ${meta.color}`}>{meta.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">#{receipt.id}</span>
                      </div>
                      {receipt.contact_name && (
                        <p className="text-xs text-slate-700 font-bold truncate">{receipt.contact_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {receipt.total_amount !== undefined && (
                      <span className="text-sm font-black text-slate-800 tabnum">{fmt(receipt.total_amount)} د.ج</span>
                    )}
                    {receipt.payment_amount !== undefined && receipt.receipt_type === 'DEBT_PAYMENT' && (
                      <span className="text-sm font-black text-amber-700 tabnum">{fmt(receipt.payment_amount)} د.ج</span>
                    )}
                    {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                  </div>
                </div>

                {/* التاريخ */}
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-400">
                  <Calendar size={11} />
                  {new Date(receipt.created_at).toLocaleString('ar-EG')}
                </div>

                {/* التفاصيل الموسعة */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-dashed border-current/30 space-y-2" onClick={e => e.stopPropagation()}>

                    {/* المنتجات */}
                    {receipt.items && receipt.items.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px] border-collapse">
                          <thead>
                            <tr className="bg-slate-800 text-white">
                              <th className="p-1.5 text-right">المنتج</th>
                              <th className="p-1.5 text-center">الكمية</th>
                              <th className="p-1.5 text-center">السعر</th>
                              <th className="p-1.5 text-center">الإجمالي</th>
                            </tr>
                          </thead>
                          <tbody>
                            {receipt.items.map((item, i) => (
                              <tr key={i} className="border-b border-slate-200">
                                <td className="p-1.5 font-bold">{item.product_name}</td>
                                <td className="p-1.5 text-center tabnum">{item.quantity}</td>
                                <td className="p-1.5 text-center tabnum">{fmt(item.unit_price)}</td>
                                <td className="p-1.5 text-center font-bold tabnum">{fmt(item.quantity * item.unit_price)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* ملخص المبالغ */}
                    {receipt.total_amount !== undefined && (
                      <div className="grid grid-cols-3 gap-1 text-[11px]">
                        <div className="bg-white/70 rounded-lg p-2 text-center">
                          <div className="font-black tabnum">{fmt(receipt.total_amount)}</div>
                          <div className="text-slate-500 text-[9px]">الإجمالي</div>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-2 text-center">
                          <div className="font-black tabnum text-emerald-700">{fmt(receipt.paid_amount ?? 0)}</div>
                          <div className="text-slate-500 text-[9px]">المدفوع</div>
                        </div>
                        <div className={`${(receipt.debt_amount ?? 0) > 0 ? 'bg-rose-50' : 'bg-emerald-50'} rounded-lg p-2 text-center`}>
                          <div className={`font-black tabnum ${(receipt.debt_amount ?? 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {fmt(receipt.debt_amount ?? 0)}
                          </div>
                          <div className="text-slate-500 text-[9px]">الدين</div>
                        </div>
                      </div>
                    )}

                    {/* وصل تسديد */}
                    {receipt.receipt_type === 'DEBT_PAYMENT' && receipt.payment_amount && (
                      <div className="bg-amber-50 rounded-xl p-3 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-600">نوع العملية:</span>
                          <span className="font-bold">{receipt.payment_type === 'COLLECTED' ? '💰 تحصيل من الزبون' : '💸 سداد للمورد'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">المبلغ المُسدَّد:</span>
                          <span className="font-black tabnum text-amber-800">{fmt(receipt.payment_amount)} د.ج</span>
                        </div>
                        {receipt.balance_after !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">الرصيد بعد التسديد:</span>
                            <span className="font-black tabnum">{fmt(Math.abs(receipt.balance_after))} د.ج</span>
                          </div>
                        )}
                        {receipt.note && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">ملاحظة:</span>
                            <span className="font-bold">{receipt.note}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* أزرار الإجراءات */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={(e) => handleReprint(receipt, e)}
                        className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5"
                      >
                        <Printer size={14} />
                        إعادة الطباعة 🖨️
                      </button>
                      <button
                        onClick={(e) => handleDelete(receipt.id, e)}
                        className="py-2.5 px-4 bg-rose-50 text-rose-700 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border border-rose-200"
                      >
                        <Trash2 size={14} />
                        حذف
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal تأكيد حذف الكل */}
      {showDeleteAll && (
        <div className="modal-overlay" onClick={() => setShowDeleteAll(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-body space-y-4 text-center py-4">
              <div className="text-4xl">⚠️</div>
              <h3 className="font-black text-slate-900 text-lg">حذف جميع الأوصال</h3>
              <p className="text-sm text-slate-600">سيتم حذف كافة الأوصال المحفوظة ({receipts.length} وصل) نهائياً بلا رجعة!</p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button onClick={() => setShowDeleteAll(false)} className="py-3 bg-slate-100 text-slate-800 rounded-xl font-black text-sm border">
                  إلغاء
                </button>
                <button onClick={handleDeleteAll} className="py-3 bg-rose-600 text-white rounded-xl font-black text-sm">
                  حذف الكل ⚠️
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
