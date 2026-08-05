'use client';

import { useState, useEffect } from 'react';
import {
  getLocalData, setLocalData, Contact, DebtPayment, Transaction,
  createWhatsAppLink, generateAccountStatementText
} from '@/lib/store';
import { toast } from '@/components/Toast';
import {
  Receipt, ArrowUpRight, ArrowDownLeft,
  MessageCircle, CheckCircle2, DollarSign,
  Search, X, Megaphone, TrendingDown, Clock, Eye
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('en-US');

export default function DebtsPage() {
  const [contacts,     setContacts]     = useState<Contact[]>([]);
  const [payments,     setPayments]     = useState<DebtPayment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab,    setActiveTab]    = useState<'to_us' | 'we_owe'>('to_us');
  const [searchQuery,  setSearchQuery]  = useState('');

  const [showSettleModal,  setShowSettleModal]  = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedContact,  setSelectedContact]  = useState<Contact | null>(null);
  const [settleAmount,     setSettleAmount]     = useState(0);
  const [settleNote,       setSettleNote]       = useState('');

  useEffect(() => {
    setContacts(getLocalData('tajer_smart_contacts_v1', []));
    setPayments(getLocalData('tajer_smart_payments_v1', []));
    setTransactions(getLocalData('tajer_smart_transactions_v1', []));
  }, []);

  const filtered = contacts
    .filter(c => {
      const match = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.phone && c.phone.includes(searchQuery));
      return activeTab === 'to_us' ? c.balance > 0 && match : c.balance < 0 && match;
    })
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

  const totalOwedToUs = contacts.filter(c => c.balance > 0).reduce((a, c) => a + c.balance, 0);
  const totalWeOwe    = contacts.filter(c => c.balance < 0).reduce((a, c) => a + Math.abs(c.balance), 0);
  const debtorCount   = contacts.filter(c => c.balance > 0).length;
  const creditorCount = contacts.filter(c => c.balance < 0).length;
  const maxBalance    = filtered.reduce((m, c) => Math.max(m, Math.abs(c.balance)), 1);

  const openSettle = (c: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedContact(c);
    setSettleAmount(Math.abs(c.balance));
    setSettleNote('تسديد دين');
    setShowSettleModal(true);
  };

  const openHistory = (c: Contact) => {
    setSelectedContact(c);
    setShowHistoryModal(true);
  };

  const executeSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || settleAmount <= 0) { toast('يرجى إدخال مبلغ صحيح', 'error'); return; }
    const isCollecting = selectedContact.balance > 0;

    const np: DebtPayment = {
      id: 'pay_' + Date.now(),
      contact_id: selectedContact.id,
      contact_name: selectedContact.name,
      amount: settleAmount,
      payment_type: isCollecting ? 'COLLECTED' : 'PAID_OUT',
      note: settleNote.trim() || undefined,
      created_at: new Date().toISOString(),
    };

    const uc = contacts.map(c => {
      if (c.id === selectedContact.id) {
        const nb = isCollecting
          ? Math.max(0, c.balance - settleAmount)
          : Math.min(0, c.balance + settleAmount);
        return { ...c, balance: nb };
      }
      return c;
    });

    const up = [np, ...payments];
    setContacts(uc); setPayments(up);
    setLocalData('tajer_smart_contacts_v1', uc);
    setLocalData('tajer_smart_payments_v1', up);
    setShowSettleModal(false);
    toast(isCollecting
      ? `✅ تم تحصيل ${fmt(settleAmount)} د.ج من ${selectedContact.name}`
      : `✅ تم سداد ${fmt(settleAmount)} د.ج للمورد`, 'success');
  };

  const sendBulkReminder = () => {
    const debtors = contacts.filter(c => c.balance > 0 && c.phone);
    if (!debtors.length) { toast('لا يوجد مدينون برقم هاتف', 'warning'); return; }
    const lines = debtors.map(c => `• ${c.name}: ${fmt(c.balance)} د.ج`).join('\n');
    window.open(createWhatsAppLink(debtors[0].phone!, `📋 كشف الديون:\n${lines}\n\nيُرجى التسديد في أقرب وقت 🙏`), '_blank');
    toast('تم فتح واتساب مع رسالة جماعية', 'info');
  };

  return (
    <div className="space-y-4">

      {/* ── بطاقتا الإجمالي بمصطلحات صريحة ومفهومة للجميع ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            tab: 'to_us' as const,
            label: 'نطالبهم بمبلغ 📥',
            subLabel: 'ديون لي على الزبائن',
            total: totalOwedToUs, count: debtorCount, unit: 'مدين',
            colorText: 'hsl(351 83% 42%)', colorBg: 'hsl(351 83% 58% / 0.08)',
            Icon: ArrowUpRight, activeBorder: 'hsl(351 83% 52%)',
          },
          {
            tab: 'we_owe' as const,
            label: 'يطالبوننا بمبلغ 📤',
            subLabel: 'ديون عليّ للموردين',
            total: totalWeOwe, count: creditorCount, unit: 'مورد دائن',
            colorText: 'hsl(221 83% 45%)', colorBg: 'hsl(221 83% 58% / 0.08)',
            Icon: ArrowDownLeft, activeBorder: 'hsl(221 83% 52%)',
          },
        ].map(s => (
          <button
            key={s.tab}
            onClick={() => setActiveTab(s.tab)}
            className="p-4 rounded-2xl text-right transition-all touch-active"
            style={{
              background: s.colorBg,
              border: `2px solid ${activeTab === s.tab ? s.activeBorder : 'transparent'}`,
              opacity: activeTab === s.tab ? 1 : 0.65,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black" style={{ color: s.colorText }}>{s.label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/40">
                <s.Icon size={14} style={{ color: s.colorText }} strokeWidth={2.5} />
              </div>
            </div>
            <p className="font-black text-xl tabnum leading-tight" style={{ color: s.colorText }}>
              {fmt(s.total)} <span className="text-xs font-semibold">د.ج</span>
            </p>
            <p className="text-[10px] font-bold mt-1" style={{ color: s.colorText, opacity: 0.7 }}>
              {s.count} {s.unit} ({s.subLabel})
            </p>
          </button>
        ))}
      </div>

      {/* ── شريط البحث ── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.5} />
          <input type="text" placeholder="ابحث بالاسم..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="form-input pr-9" />
        </div>
        {activeTab === 'to_us' && debtorCount > 0 && (
          <button onClick={sendBulkReminder} className="shrink-0 px-3.5 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200">
            <Megaphone size={16} />
            <span className="hidden sm:inline">تذكير</span>
          </button>
        )}
      </div>

      {/* ── قائمة الديون ── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Receipt size={40} className="opacity-25" />
            <p className="font-bold text-sm">
              {activeTab === 'to_us' ? '🎉 لا يوجد ديون نطالب بها الناس!' : '🎉 لا يوجد ديون يطالبنا بها الموردون!'}
            </p>
          </div>
        ) : (
          filtered.map(c => {
            const amount       = Math.abs(c.balance);
            const isCustomer   = c.balance > 0;
            const barPct       = Math.min(100, Math.round((amount / maxBalance) * 100));

            return (
              <div
                key={c.id}
                onClick={() => openHistory(c)}
                className="glass-card p-4 space-y-3 cursor-pointer hover:border-emerald-400 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="avatar text-xl font-black text-white" style={{ width: 50, height: 50, background: isCustomer ? 'linear-gradient(135deg, #f43f5e, #dc2626)' : 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                    {c.name.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-900 text-base leading-tight truncate">{c.name}</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">{c.phone || 'بدون هاتف'}</p>
                  </div>

                  <div className="text-left shrink-0">
                    <p className="text-[10px] text-slate-400 font-bold">{isCustomer ? 'نطالبه بمبلغ 📥' : 'يطالبنا بمبلغ 📤'}</p>
                    <p className="font-black text-2xl tabnum leading-tight" style={{ color: isCustomer ? 'hsl(351 83% 42%)' : 'hsl(221 83% 45%)' }}>
                      {fmt(amount)} <span className="text-xs font-semibold">د.ج</span>
                    </p>
                  </div>
                </div>

                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${barPct}%`, background: isCustomer ? 'var(--grad-rose)' : 'var(--grad-indigo)' }} />
                </div>

                <div className="flex gap-2 pt-1 border-t border-slate-100">
                  <button onClick={(e) => openSettle(c, e)} className="flex-1 py-2.5 rounded-xl font-black text-xs text-white flex items-center justify-center gap-1.5 shadow-sm" style={{ background: 'var(--grad-emerald)' }}>
                    <CheckCircle2 size={15} />
                    {isCustomer ? 'تسديد / تحصيل 💵' : 'سداد للمورد 💳'}
                  </button>

                  <button onClick={(e) => { e.stopPropagation(); openHistory(c); }} className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1">
                    <Eye size={14} /> تفاصيل السجل
                  </button>

                  {c.phone && (
                    <a href={createWhatsAppLink(c.phone, generateAccountStatementText(c.name, c.balance, []))} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center gap-1 border border-emerald-200">
                      <MessageCircle size={14} />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ══ Modal تسوية الدين ══ */}
      {showSettleModal && selectedContact && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowSettleModal(false); }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-700">
                  <DollarSign size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">تسوية الدين والتسديد</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">{selectedContact.name}</p>
                </div>
              </div>
              <button onClick={() => setShowSettleModal(false)} className="btn btn-ghost p-2 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={executeSettlement} className="modal-body space-y-4">
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-700">المبلغ الحالي المستحق</span>
                  <span className="font-black text-2xl text-rose-700 tabnum">{fmt(Math.abs(selectedContact.balance))} د.ج</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">💵 المبلغ المسدد الآن (د.ج) *</label>
                <input
                  type="number" required min="1" max={Math.abs(selectedContact.balance)}
                  value={settleAmount || ''} onChange={e => setSettleAmount(+e.target.value)}
                  className="form-input font-black text-2xl tabnum text-center text-emerald-700"
                />
              </div>

              {settleAmount > 0 && settleAmount < Math.abs(selectedContact.balance) && (
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-bold text-blue-800 flex items-center gap-2">
                  <TrendingDown size={14} className="shrink-0 text-blue-600" />
                  <span>المتبقي بعد هذا التسديد: <strong className="tabnum">{fmt(Math.abs(selectedContact.balance) - settleAmount)}</strong> د.ج</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">📝 ملاحظة (اختياري)</label>
                <input type="text" placeholder="مثال: تسديد كاش، تحويل..." value={settleNote} onChange={e => setSettleNote(e.target.value)} className="form-input" />
              </div>

              <button type="submit" className="btn btn-primary w-full py-4 text-base shadow-md">
                تأكيد التسديد وتحديث الحساب ✅
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══ Modal سجل الديون والدفعات التاريخية بالكامل ══ */}
      {showHistoryModal && selectedContact && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowHistoryModal(false); }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-header">
              <div>
                <h3 className="font-black text-slate-800 text-base">{selectedContact.name}</h3>
                <p className="text-xs text-slate-400 font-semibold">تفاصيل سجل الديون والدفعات المسددة بالتاريخ</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="btn btn-ghost p-2 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body space-y-4">
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  دفعات التسديد المستلمة
                </h4>
                {payments.filter(p => p.contact_id === selectedContact.id).length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold p-3 bg-slate-50 rounded-xl text-center">لا توجد دفعات تسديد مدونة بعد</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {payments.filter(p => p.contact_id === selectedContact.id).map(pay => (
                      <div key={pay.id} className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between text-xs font-bold">
                        <div>
                          <p className="text-emerald-900">{pay.note || 'تسديد دين'}</p>
                          <p className="text-[10px] text-emerald-600">{new Date(pay.created_at).toLocaleString('ar-EG')}</p>
                        </div>
                        <span className="tabnum text-emerald-800 font-black text-sm">+{fmt(pay.amount)} د.ج</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-indigo-600" />
                  سجل عمليات المبيعات والشراء
                </h4>
                {transactions.filter(t => t.contact_id === selectedContact.id).length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold p-3 bg-slate-50 rounded-xl text-center">لا توجد عمليات سابقة</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {transactions.filter(t => t.contact_id === selectedContact.id).map(tx => (
                      <div key={tx.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between text-xs font-bold">
                        <div>
                          <p className="text-slate-800">{tx.tx_type === 'SALE' ? 'بيع' : 'شراء'}: {tx.items[0]?.product_name}</p>
                          <p className="text-[10px] text-slate-400">{new Date(tx.created_at).toLocaleString('ar-EG')}</p>
                        </div>
                        <span className="tabnum text-slate-900 font-black">{fmt(tx.total_amount)} د.ج</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
