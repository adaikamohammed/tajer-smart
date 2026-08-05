'use client';

import { useState, useEffect } from 'react';
import {
  getLocalData, setLocalData, Contact,
  createWhatsAppLink, generateAccountStatementText
} from '@/lib/store';
import { toast } from '@/components/Toast';
import {
  Users, UserPlus, Phone, MessageCircle,
  Search, X,
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('en-US');

const AVATAR_COLORS = [
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #6366f1, #4f46e5)',
  'linear-gradient(135deg, #f43f5e, #dc2626)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #06b6d4, #0284c7)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  'linear-gradient(135deg, #ec4899, #db2777)',
  'linear-gradient(135deg, #84cc16, #65a30d)',
];
const avatarGrad = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

export default function ContactsPage() {
  const [contacts,    setContacts]    = useState<Contact[]>([]);
  const [filterType,  setFilterType]  = useState<'all' | 'customer' | 'supplier'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [name,           setName]           = useState('');
  const [phone,          setPhone]          = useState('');
  const [photoUrl,       setPhotoUrl]       = useState('');
  const [type,           setType]           = useState<'customer' | 'supplier' | 'both'>('customer');
  const [notes,          setNotes]          = useState('');
  const [initialBalance, setInitialBalance] = useState(0);

  useEffect(() => {
    setContacts(getLocalData('tajer_smart_contacts_v1', []));
  }, []);

  const filtered = contacts
    .filter(c => {
      const matchType =
        filterType === 'all' ? true :
        filterType === 'customer' ? c.type === 'customer' || c.type === 'both' :
        c.type === 'supplier' || c.type === 'both';
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery));
      return matchType && matchSearch;
    })
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

  const countCustomers = contacts.filter(c => c.type !== 'supplier').length;
  const countSuppliers = contacts.filter(c => c.type !== 'customer').length;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast('يرجى إدخال الاسم', 'error'); return; }

    const nc: Contact = {
      id: 'c_' + Date.now(),
      name: name.trim(), phone: phone.trim(),
      photo_url: photoUrl.trim() || undefined, type,
      notes: notes.trim() || undefined,
      balance: +initialBalance,
      created_at: new Date().toISOString(),
    };
    const up = [nc, ...contacts];
    setContacts(up);
    setLocalData('tajer_smart_contacts_v1', up);
    setName(''); setPhone(''); setPhotoUrl(''); setType('customer'); setNotes(''); setInitialBalance(0);
    setShowAddModal(false);
    toast('✅ تمت إضافة جهة الاتصال', 'success');
  };

  const FILTER_TABS = [
    { val: 'all'      as const, label: `الكل (${contacts.length})`,           activeColor: 'hsl(220 20% 20%)', activeBg: 'hsl(220 20% 20%)' },
    { val: 'customer' as const, label: `الزبائن (${countCustomers}) 👥`,      activeColor: 'white',            activeBg: 'hsl(158 64% 38%)' },
    { val: 'supplier' as const, label: `الموردين (${countSuppliers}) 🚚`,     activeColor: 'white',            activeBg: 'hsl(221 83% 52%)' },
  ];

  return (
    <div className="space-y-4">

      {/* ── شريط البحث والإضافة ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.5} />
          <input type="text" placeholder="ابحث بالاسم أو الهاتف..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="form-input pr-9" />
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary shrink-0 gap-1.5 py-2.5 px-4">
          <UserPlus size={18} strokeWidth={2.5} />
          <span className="hidden sm:inline">إضافة</span>
        </button>
      </div>

      {/* ── فلترة ── */}
      <div className="flex gap-2 scrollbar-hide overflow-x-auto pb-0.5">
        {FILTER_TABS.map(t => (
          <button
            key={t.val}
            onClick={() => setFilterType(t.val)}
            className="shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all touch-active"
            style={
              filterType === t.val
                ? { background: t.activeBg, color: 'white', boxShadow: `0 3px 10px ${t.activeBg}50` }
                : { background: 'hsl(220 20% 96%)', color: 'hsl(220 15% 45%)', border: '1px solid hsl(220 15% 89%)' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── قائمة الأشخاص ── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Users size={40} className="opacity-25" />
            <p className="font-bold text-sm">
              {searchQuery ? 'لا يوجد مطابق' : 'لا يوجد أشخاص — أضف أول زبون أو مورد!'}
            </p>
          </div>
        ) : (
          filtered.map(c => {
            const isSupplier  = c.type === 'supplier' || c.type === 'both';
            const hasDebt     = c.balance > 0;
            const hasCredit   = c.balance < 0;
            const isSettled   = c.balance === 0;

            const ringCls = hasDebt ? 'avatar-ring-debt' : hasCredit ? 'avatar-ring-credit' : 'avatar-ring-ok';

            return (
              <div key={c.id} className="glass-card p-4 space-y-3">

                {/* ── الصف الرئيسي ── */}
                <div className="flex items-center gap-3">
                  {/* أفاتار */}
                  <div
                    className={`avatar w-13 h-13 text-xl ${ringCls}`}
                    style={{ width: 52, height: 52, background: avatarGrad(c.name) }}
                  >
                    {c.photo_url
                      ? <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover rounded-full" />
                      : c.name.charAt(0)
                    }
                    <span
                      className="absolute -bottom-0.5 -left-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                      style={{ background: 'white', border: '1.5px solid hsl(220 15% 89%)', fontSize: 11 }}
                    >
                      {isSupplier ? '🚚' : '👥'}
                    </span>
                  </div>

                  {/* الاسم والهاتف */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-900 text-base leading-tight truncate">{c.name}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Phone size={11} className="text-slate-400 shrink-0" />
                      <p className="text-xs text-slate-500 font-semibold truncate">{c.phone || 'بدون هاتف'}</p>
                    </div>
                    {c.notes && <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{c.notes}</p>}
                  </div>

                  {/* الرصيد */}
                  <div className="shrink-0">
                    {hasDebt && (
                      <div className="text-center px-3 py-1.5 rounded-xl"
                           style={{ background: 'hsl(351 83% 58% / 0.08)', border: '1px solid hsl(351 83% 58% / 0.2)' }}>
                        <p className="text-[10px] font-black" style={{ color: 'hsl(351 83% 45%)' }}>عليه</p>
                        <p className="font-black text-sm tabnum" style={{ color: 'hsl(351 83% 40%)' }}>
                          {fmt(c.balance)} <span className="text-[10px]">د.ج</span>
                        </p>
                      </div>
                    )}
                    {hasCredit && (
                      <div className="text-center px-3 py-1.5 rounded-xl"
                           style={{ background: 'hsl(221 83% 58% / 0.08)', border: '1px solid hsl(221 83% 58% / 0.2)' }}>
                        <p className="text-[10px] font-black" style={{ color: 'hsl(221 83% 45%)' }}>له علينا</p>
                        <p className="font-black text-sm tabnum" style={{ color: 'hsl(221 83% 40%)' }}>
                          {fmt(Math.abs(c.balance))} <span className="text-[10px]">د.ج</span>
                        </p>
                      </div>
                    )}
                    {isSettled && <span className="badge badge-success">✅ مصفى</span>}
                  </div>
                </div>

                {/* ── شريط دين بصري (إن وجد) ── */}
                {(hasDebt || hasCredit) && (
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min(100, (Math.abs(c.balance) / 10000) * 100)}%`,
                        background: hasDebt ? 'var(--grad-rose)' : 'var(--grad-sky)',
                      }}
                    />
                  </div>
                )}

                {/* ── أزرار التواصل ── */}
                <div className="divider" />
                <div className="flex gap-2">
                  {c.phone ? (
                    <>
                      <a href={`tel:${c.phone}`}
                        className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs touch-active"
                        style={{ background: 'hsl(220 20% 94%)', color: 'hsl(220 20% 35%)' }}>
                        <Phone size={14} strokeWidth={2.5} /> اتصال
                      </a>
                      <a
                        href={createWhatsAppLink(c.phone, generateAccountStatementText(c.name, c.balance, []))}
                        target="_blank" rel="noreferrer"
                        className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs touch-active text-white"
                        style={{
                          background: 'var(--grad-emerald)',
                          boxShadow: '0 3px 10px hsl(158 64% 38% / 0.3)',
                        }}>
                        <MessageCircle size={14} strokeWidth={2.5} /> واتساب
                      </a>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 text-center w-full py-2 font-semibold">
                      📱 أضف رقم الهاتف للتواصل السريع
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ══ Modal إضافة شخص ══ */}
      {showAddModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                     style={{ background: 'hsl(158 64% 38% / 0.12)' }}>
                  <UserPlus size={18} style={{ color: 'hsl(158 64% 35%)' }} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">إضافة زبون أو مورد</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">جهة اتصال تجارية جديدة</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost p-2 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="modal-body space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">👤 الاسم الكامل *</label>
                <input type="text" required placeholder="مثال: أحمد علي..."
                  value={name} onChange={e => setName(e.target.value)} className="form-input" />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">📱 رقم الهاتف (للواتساب والاتصال)</label>
                <input type="tel" placeholder="مثال: 0550123456"
                  value={phone} onChange={e => setPhone(e.target.value)} className="form-input" />
              </div>

              {/* نوع الجهة — أزرار كبيرة */}
              <div>
                <label className="block text-xs font-black text-slate-600 mb-2">نوع الجهة</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { val: 'customer' as const, label: 'زبون',    emoji: '👥', grad: 'var(--grad-emerald)' },
                    { val: 'supplier' as const, label: 'مورد',    emoji: '🚚', grad: 'var(--grad-sky)' },
                    { val: 'both'     as const, label: 'كلاهما',  emoji: '🔄', grad: 'var(--grad-indigo)' },
                  ]).map(t => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => setType(t.val)}
                      className="py-3.5 rounded-xl font-black text-xs flex flex-col items-center gap-1 transition-all border-2 touch-active"
                      style={
                        type === t.val
                          ? { background: t.grad, color: 'white', borderColor: 'transparent', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }
                          : { background: 'hsl(220 20% 96%)', color: 'hsl(220 20% 45%)', borderColor: 'hsl(220 15% 88%)' }
                      }
                    >
                      <span className="text-xl">{t.emoji}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">
                  💰 الرصيد الابتدائي (اختياري)
                </label>
                <input type="number" placeholder="0"
                  value={initialBalance} onChange={e => setInitialBalance(+e.target.value)}
                  className="form-input tabnum" />
                <p className="text-[11px] text-slate-400 mt-1">موجب = دين عليه | سالب = له علينا | 0 = لا يوجد</p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">🖼️ رابط الصورة الشخصية (اختياري)</label>
                <input type="url" placeholder="https://..."
                  value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} className="form-input" />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">📝 ملاحظات</label>
                <textarea rows={2} placeholder="العنوان، نوع البضائع..."
                  value={notes} onChange={e => setNotes(e.target.value)} className="form-input" />
              </div>

              <button type="submit" className="btn btn-primary w-full py-4 text-base">
                <UserPlus size={18} strokeWidth={2.5} />
                حفظ الجهة الجديدة 💾
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
