'use client';

import { useState, useEffect } from 'react';
import {
  getLocalData, setLocalData, Contact, DebtPayment,
  createWhatsAppLink, generateAccountStatementText
} from '@/lib/store';
import { toast } from '@/components/Toast';
import {
  Receipt, ArrowUpRight, ArrowDownLeft,
  MessageCircle, CheckCircle2, DollarSign,
  Search, X, Megaphone, TrendingDown
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('en-US');

export default function DebtsPage() {
  const [contacts,   setContacts]   = useState<Contact[]>([]);
  const [payments,   setPayments]   = useState<DebtPayment[]>([]);
  const [activeTab,  setActiveTab]  = useState<'to_us' | 'we_owe'>('to_us');
  const [searchQuery, setSearchQuery] = useState('');

  const [showSettleModal,  setShowSettleModal]  = useState(false);
  const [selectedContact,  setSelectedContact]  = useState<Contact | null>(null);
  const [settleAmount,     setSettleAmount]     = useState(0);
  const [settleNote,       setSettleNote]       = useState('');

  useEffect(() => {
    setContacts(getLocalData('tajer_smart_contacts_v1', []));
    setPayments(getLocalData('tajer_smart_payments_v1', []));
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

  const openSettle = (c: Contact) => {
    setSelectedContact(c);
    setSettleAmount(Math.abs(c.balance));
    setSettleNote('تسديد دين');
    setShowSettleModal(true);
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

  const quickPcts = [25, 50, 100];

  return (
    <div className="space-y-4">

      {/* ── بطاقتا الإجمالي ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            tab: 'to_us' as const,
            label: 'لي على الزبائن',
            total: totalOwedToUs, count: debtorCount, unit: 'مدين',
            colorText: 'hsl(351 83% 42%)', colorBg: 'hsl(351 83% 58% / 0.08)',
            colorBorder: 'hsl(351 83% 58% / 0.25)', Icon: ArrowUpRight,
            activeBorder: 'hsl(351 83% 52%)',
          },
          {
            tab: 'we_owe' as const,
            label: 'عليّ للموردين',
            total: totalWeOwe, count: creditorCount, unit: 'مورد دائن',
            colorText: 'hsl(221 83% 45%)', colorBg: 'hsl(221 83% 58% / 0.08)',
            colorBorder: 'hsl(221 83% 58% / 0.25)', Icon: ArrowDownLeft,
            activeBorder: 'hsl(221 83% 52%)',
          },
        ].map(s => (
          <button
            key={s.tab}
            onClick={() => setActiveTab(s.tab)}
            className="p-4 rounded-2xl text-right transition-all touch-active"
            style={{
              background: s.colorBg,
              border: `2px solid ${activeTab === s.tab ? s.activeBorder : 'transparent'}`,
              boxShadow: activeTab === s.tab ? `0 4px 20px ${s.colorBg}` : 'none',
              opacity: activeTab === s.tab ? 1 : 0.65,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black" style={{ color: s.colorText }}>{s.label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                   style={{ background: `${s.activeBorder}20` }}>
                <s.Icon size={14} style={{ color: s.colorText }} strokeWidth={2.5} />
              </div>
            </div>
            <p className="font-black text-xl tabnum leading-tight" style={{ color: s.colorText }}>
              {fmt(s.total)} <span className="text-xs font-semibold">د.ج</span>
            </p>
            <p className="text-[10px] font-bold mt-1" style={{ color: s.colorText, opacity: 0.7 }}>
              {s.count} {s.unit}
            </p>
          </button>
        ))}
      </div>

      {/* ── شريط البحث + تذكير جماعي ── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.5} />
          <input type="text" placeholder="ابحث بالاسم..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="form-input pr-9" />
        </div>
        {activeTab === 'to_us' && debtorCount > 0 && (
          <button
            onClick={sendBulkReminder}
            className="shrink-0 px-3.5 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 touch-active"
            style={{
              background: 'hsl(38 92% 50% / 0.1)',
              border: '1.5px solid hsl(38 92% 50% / 0.3)',
              color: 'hsl(28 80% 38%)',
            }}
            title="إرسال تذكير جماعي"
          >
            <Megaphone size={16} strokeWidth={2.5} />
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
              {activeTab === 'to_us' ? '🎉 لا يوجد ديون على الزبائن!' : '🎉 لا يوجد ديون للموردين!'}
            </p>
            <p className="text-xs opacity-60 mt-0.5">حساباتك مصفاة — ممتاز!</p>
          </div>
        ) : (
          filtered.map(c => {
            const amount       = Math.abs(c.balance);
            const isCustomer   = c.balance > 0;
            const barPct       = Math.min(100, Math.round((amount / maxBalance) * 100));

            return (
              <div key={c.id} className="glass-card p-4 space-y-3">

                {/* الصف الرئيسي */}
                <div className="flex items-center gap-3">
                  <div
                    className="avatar text-xl font-black text-white"
                    style={{
                      width: 50, height: 50,
                      background: isCustomer
                        ? 'linear-gradient(135deg, #f43f5e, #dc2626)'
                        : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    }}
                  >
                    {c.name.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-900 text-base leading-tight truncate">{c.name}</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">{c.phone || 'بدون هاتف'}</p>
                  </div>

                  <div className="text-left shrink-0">
                    <p className="text-[10px] text-slate-400 font-bold">المستحق</p>
                    <p
                      className="font-black text-2xl tabnum leading-tight"
                      style={{ color: isCustomer ? 'hsl(351 83% 42%)' : 'hsl(221 83% 45%)' }}
                    >
                      {fmt(amount)}
                      <span className="text-xs font-semibold mr-0.5"> د.ج</span>
                    </p>
                  </div>
                </div>

                {/* شريط تقدم الدين */}
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${barPct}%`,
                      background: isCustomer ? 'var(--grad-rose)' : 'var(--grad-indigo)',
                    }}
                  />
                </div>

                {/* أزرار الإجراءات */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openSettle(c)}
                    className="flex-1 py-3 rounded-xl font-black text-xs text-white flex items-center justify-center gap-1.5 touch-active"
                    style={{
                      background: 'var(--grad-emerald)',
                      boxShadow: '0 4px 14px hsl(158 64% 38% / 0.35)',
                    }}
                  >
                    <CheckCircle2 size={16} strokeWidth={2.5} />
                    {isCustomer ? 'تحصيل الدين 💵' : 'سداد الدين 💳'}
                  </button>

                  {c.phone && (
                    <a
                      href={createWhatsAppLink(c.phone, generateAccountStatementText(c.name, c.balance, []))}
                      target="_blank" rel="noreferrer"
                      className="px-4 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-1 touch-active"
                      style={{
                        background: 'hsl(158 64% 38% / 0.08)',
                        border: '1.5px solid hsl(158 64% 38% / 0.2)',
                        color: 'hsl(158 64% 30%)',
                      }}
                    >
                      <MessageCircle size={15} strokeWidth={2.5} />
                      تذكير
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
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                     style={{ background: 'hsl(158 64% 38% / 0.12)' }}>
                  <DollarSign size={18} style={{ color: 'hsl(158 64% 35%)' }} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">تسوية الدين</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">{selectedContact.name}</p>
                </div>
              </div>
              <button onClick={() => setShowSettleModal(false)} className="btn btn-ghost p-2 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body space-y-4">
              {/* معلومات الدين */}
              <div className="p-3.5 rounded-xl"
                   style={{ background: 'hsl(351 83% 58% / 0.06)', border: '1px solid hsl(351 83% 58% / 0.15)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-700">الدين الحالي</span>
                  <span className="font-black text-2xl text-rose-700 tabnum">
                    {fmt(Math.abs(selectedContact.balance))} <span className="text-sm">د.ج</span>
                  </span>
                </div>
              </div>

              {/* أزرار نسبة سريعة */}
              <div>
                <p className="text-xs font-black text-slate-500 mb-2">اختر نسبة سريعة:</p>
                <div className="flex gap-2">
                  {quickPcts.map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setSettleAmount(Math.round(Math.abs(selectedContact.balance) * pct / 100))}
                      className="quick-btn"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={executeSettlement} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">💵 المبلغ المسدد الآن *</label>
                  <input
                    type="number" required min="1" max={Math.abs(selectedContact.balance)}
                    value={settleAmount}
                    onChange={e => setSettleAmount(+e.target.value)}
                    className="form-input font-black text-2xl tabnum text-center"
                    style={{ color: 'hsl(158 64% 35%)' }}
                  />
                </div>

                {/* المتبقي بعد التسوية */}
                {settleAmount > 0 && settleAmount < Math.abs(selectedContact.balance) && (
                  <div className="p-2.5 rounded-xl flex items-center gap-2"
                       style={{ background: 'hsl(221 83% 58% / 0.06)', border: '1px solid hsl(221 83% 58% / 0.15)' }}>
                    <TrendingDown size={14} style={{ color: 'hsl(221 83% 52%)', flexShrink: 0 }} />
                    <p className="text-xs font-bold" style={{ color: 'hsl(221 83% 45%)' }}>
                      المتبقي بعد التسوية:{' '}
                      <span className="font-black tabnum">
                        {fmt(Math.abs(selectedContact.balance) - settleAmount)}
                      </span>{' '}د.ج
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">📝 ملاحظة</label>
                  <input type="text" placeholder="كاش، تحويل بنكي..."
                    value={settleNote} onChange={e => setSettleNote(e.target.value)} className="form-input" />
                </div>

                <button type="submit" className="btn btn-primary w-full py-4 text-base">
                  <CheckCircle2 size={18} strokeWidth={2.5} />
                  تأكيد التسديد وتحديث الحساب ✅
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
