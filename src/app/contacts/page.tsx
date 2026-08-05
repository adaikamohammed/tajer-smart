'use client';

import { useState, useEffect } from 'react';
import {
  getLocalData, setLocalData, Contact, Transaction, DebtPayment,
  createWhatsAppLink, generateAccountStatementText
} from '@/lib/store';
import { toast } from '@/components/Toast';
import {
  Users, UserPlus, Phone, MessageCircle,
  Search, X, Camera, MapPin, Tag, AlertTriangle,
  Edit2, Trash2, Receipt, Copy, Check
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('en-US');

const AVATAR_COLORS = [
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #6366f1, #4f46e5)',
  'linear-gradient(135deg, #f43f5e, #dc2626)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #06b6d4, #0284c7)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
];
const avatarGrad = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const QUICK_CATEGORIES = ['مواد غذائية', 'مواد تنظيف', 'خضر وفواكه', 'أخرى'];

export default function ContactsPage() {
  const [contacts,     setContacts]     = useState<Contact[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payments,     setPayments]     = useState<DebtPayment[]>([]);

  const [filterType,     setFilterType]     = useState<'all' | 'customer' | 'supplier' | 'both'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery,    setSearchQuery]    = useState('');

  // Modals
  const [showAddModal,       setShowAddModal]       = useState(false);
  const [showProfileModal,   setShowProfileModal]   = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [editingContact,     setEditingContact]     = useState<Contact | null>(null);
  const [viewingContact,     setViewingContact]     = useState<Contact | null>(null);
  const [copiedStatement,    setCopiedStatement]    = useState(false);

  // Form states
  const [name,             setName]             = useState('');
  const [phone,            setPhone]            = useState('');
  const [photoUrl,         setPhotoUrl]         = useState('');
  const [location,         setLocation]         = useState('');
  const [category,         setCategory]         = useState('مواد غذائية');
  const [customCategory,   setCustomCategory]   = useState('');
  const [creditLimit,      setCreditLimit]      = useState(0);
  const [type,             setType]             = useState<'customer' | 'supplier' | 'both'>('customer');
  const [notes,            setNotes]            = useState('');
  const [balanceDirection, setBalanceDirection] = useState<'customer_owes' | 'we_owe_customer'>('customer_owes');
  const [initialBalance,   setInitialBalance]   = useState(0);

  useEffect(() => {
    setContacts(getLocalData('tajer_smart_contacts_v1', []));
    setTransactions(getLocalData('tajer_smart_transactions_v1', []));
    setPayments(getLocalData('tajer_smart_payments_v1', []));
  }, []);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('حجم الصورة كبير جداً', 'warning'); return; }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhotoUrl(event.target.result as string);
        toast('تم رفع ومعاينة الصورة بنجاح! 📷', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const openAddModal = () => {
    setEditingContact(null);
    setName(''); setPhone(''); setPhotoUrl(''); setLocation('');
    setCategory('مواد غذائية'); setCustomCategory(''); setCreditLimit(0);
    setType('customer'); setNotes(''); setInitialBalance(0);
    setBalanceDirection('customer_owes');
    setShowAddModal(true);
  };

  const openEditModal = (c: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingContact(c);
    setName(c.name); setPhone(c.phone || ''); setPhotoUrl(c.photo_url || '');
    setLocation(c.location || ''); setType(c.type); setNotes(c.notes || '');
    setCreditLimit(c.credit_limit || 0);

    if (QUICK_CATEGORIES.includes(c.category || '')) {
      setCategory(c.category || 'مواد غذائية');
      setCustomCategory('');
    } else {
      setCategory('أخرى');
      setCustomCategory(c.category || '');
    }

    if (c.balance >= 0) {
      setBalanceDirection('customer_owes');
      setInitialBalance(c.balance);
    } else {
      setBalanceDirection('we_owe_customer');
      setInitialBalance(Math.abs(c.balance));
    }
    setShowAddModal(true);
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast('يرجى إدخال الاسم', 'error'); return; }

    const finalCategory = category === 'أخرى' ? customCategory.trim() || 'أخرى' : category;
    const calculatedBalance = balanceDirection === 'customer_owes'
      ? Math.abs(+initialBalance)
      : -Math.abs(+initialBalance);

    if (editingContact) {
      const updated = contacts.map(c => c.id === editingContact.id ? {
        ...c,
        name: name.trim(), phone: phone.trim(), photo_url: photoUrl.trim() || undefined,
        location: location.trim() || undefined, category: finalCategory,
        credit_limit: creditLimit > 0 ? creditLimit : undefined,
        type, notes: notes.trim() || undefined, balance: calculatedBalance,
      } : c);
      setContacts(updated);
      setLocalData('tajer_smart_contacts_v1', updated);
      toast('✅ تم تحديث بيانات الشخص بنجاح', 'success');
    } else {
      const nc: Contact = {
        id: 'c_' + Date.now(),
        name: name.trim(), phone: phone.trim(), photo_url: photoUrl.trim() || undefined,
        location: location.trim() || undefined, category: finalCategory,
        credit_limit: creditLimit > 0 ? creditLimit : undefined,
        type, notes: notes.trim() || undefined, balance: calculatedBalance,
        created_at: new Date().toISOString(),
      };
      const updated = [nc, ...contacts];
      setContacts(updated);
      setLocalData('tajer_smart_contacts_v1', updated);
      toast('✅ تمت إضافة الشخص بنجاح', 'success');
    }

    setShowAddModal(false);
  };

  const handleDeleteContact = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('هل أنت تأكد من حذف هذا الشخص من القائمة؟')) {
      const updated = contacts.filter(c => c.id !== id);
      setContacts(updated);
      setLocalData('tajer_smart_contacts_v1', updated);
      toast('تم حذف الشخص من القائمة', 'info');
      if (viewingContact?.id === id) setShowProfileModal(false);
    }
  };

  const openProfile = (c: Contact) => {
    setViewingContact(c);
    setShowProfileModal(true);
  };

  const openStatement = (c: Contact, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setViewingContact(c);
    setCopiedStatement(false);
    setShowStatementModal(true);
  };

  const copyStatementText = () => {
    if (!viewingContact) return;
    const text = generateAccountStatementText(viewingContact.name, viewingContact.balance, []);
    navigator.clipboard.writeText(text);
    setCopiedStatement(true);
    toast('✅ تم نسخ نص كشف الحساب للحافظة', 'success');
    setTimeout(() => setCopiedStatement(false), 3000);
  };

  const availableCategories = Array.from(new Set(contacts.map(c => c.category).filter(Boolean)));

  // 🔄 فلترة شاملة تضم خيار "كلاهما"
  const filtered = contacts
    .filter(c => {
      const matchType =
        filterType === 'all' ? true :
        filterType === 'customer' ? c.type === 'customer' :
        filterType === 'supplier' ? c.type === 'supplier' :
        c.type === 'both';

      const matchCat = filterCategory === 'all' ? true : c.category === filterCategory;

      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery)) ||
        (c.location && c.location.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchType && matchCat && matchSearch;
    })
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

  return (
    <div className="space-y-4">

      {/* ── شريط البحث والإضافة ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.5} />
          <input type="text" placeholder="ابحث بالاسم، الهاتف، المكان..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="form-input pr-9" />
        </div>
        <button onClick={openAddModal} className="btn btn-primary shrink-0 gap-1.5 py-2.5 px-4">
          <UserPlus size={18} strokeWidth={2.5} />
          <span className="hidden sm:inline">إضافة</span>
        </button>
      </div>

      {/* ── 🔄 فلترة نوع الجهة (تضم زبون / مورد / كلاهما) ── */}
      <div className="space-y-2">
        <div className="flex gap-1.5 scrollbar-hide overflow-x-auto pb-0.5">
          <button onClick={() => setFilterType('all')}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${filterType === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>
            الكل ({contacts.length})
          </button>
          <button onClick={() => setFilterType('customer')}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${filterType === 'customer' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>
            الزبائن 👥
          </button>
          <button onClick={() => setFilterType('supplier')}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${filterType === 'supplier' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>
            الموردين 🚚
          </button>
          <button onClick={() => setFilterType('both')}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${filterType === 'both' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>
            كلاهما 🔄
          </button>
        </div>

        {availableCategories.length > 0 && (
          <div className="flex items-center gap-1.5 scrollbar-hide overflow-x-auto pb-0.5">
            <span className="text-[10px] font-bold text-slate-400 shrink-0">النشاط:</span>
            <button onClick={() => setFilterCategory('all')}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold ${filterCategory === 'all' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
              كل الأنشطة
            </button>
            {availableCategories.map(cat => (
              <button key={cat} onClick={() => setFilterCategory(cat!)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold ${filterCategory === cat ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── قائمة الأشخاص ── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Users size={40} className="opacity-25" />
            <p className="font-bold text-sm">
              {searchQuery ? 'لا يوجد شخص مطابق للبحث' : 'لا يوجد أشخاص بعد — أضف أول شخص!'}
            </p>
          </div>
        ) : (
          filtered.map(c => {
            const isSupplier  = c.type === 'supplier' || c.type === 'both';
            const hasDebt     = c.balance > 0;
            const hasCredit   = c.balance < 0;
            const isSettled   = c.balance === 0;
            const isOverLimit = c.credit_limit && c.balance > c.credit_limit;

            return (
              <div
                key={c.id}
                onClick={() => openProfile(c)}
                className="glass-card p-4 space-y-3 cursor-pointer hover:border-emerald-400 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="avatar w-13 h-13 text-xl relative"
                    style={{ width: 52, height: 52, background: avatarGrad(c.name) }}
                  >
                    {c.photo_url
                      ? <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover rounded-full" />
                      : c.name.charAt(0)
                    }
                    <span className="absolute -bottom-0.5 -left-0.5 w-5 h-5 rounded-full bg-white border flex items-center justify-center text-[10px]">
                      {c.type === 'both' ? '🔄' : isSupplier ? '🚚' : '👥'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 text-base leading-tight truncate">{c.name}</h3>
                      {c.category && (
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold shrink-0">
                          {c.category}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                        <Phone size={11} className="text-slate-400 shrink-0" />
                        {c.phone || 'بدون هاتف'}
                      </p>
                      {c.location && (
                        <p className="text-xs text-emerald-700 font-bold flex items-center gap-0.5 truncate bg-emerald-50 px-1.5 py-0.5 rounded">
                          <MapPin size={10} className="shrink-0" />
                          {c.location}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 🟢/🔴 المصطلحات المائة بالمائة مبسطة */}
                  <div className="shrink-0 text-left">
                    {hasDebt && (
                      <div className="px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-center">
                        <p className="text-[10px] font-black text-rose-700">نطالبه بمبلغ 📥</p>
                        <p className="font-black text-sm tabnum text-rose-800">{fmt(c.balance)} <span className="text-[9px]">د.ج</span></p>
                      </div>
                    )}
                    {hasCredit && (
                      <div className="px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-center">
                        <p className="text-[10px] font-black text-blue-700">يطالبنا بمبلغ 📤</p>
                        <p className="font-black text-sm tabnum text-blue-800">{fmt(Math.abs(c.balance))} <span className="text-[9px]">د.ج</span></p>
                      </div>
                    )}
                    {isSettled && <span className="badge badge-success">✅ مصفى</span>}
                  </div>
                </div>

                {isOverLimit && (
                  <div className="bg-amber-50 border border-amber-300 p-2 rounded-xl flex items-center gap-2 text-amber-800 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>تجاوز سقف الدين المحدد ({fmt(c.credit_limit!)} د.ج)!</span>
                  </div>
                )}

                {/* أزرار الإجراءات مع الاتصال والمعاينة */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => openEditModal(c, e)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1">
                      <Edit2 size={13} /> تعديل
                    </button>
                    <button onClick={(e) => handleDeleteContact(c.id, e)} className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1">
                      <Trash2 size={13} /> حذف
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {c.phone && (
                      <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center gap-1" title="اتصال هاتفي مباشر">
                        <Phone size={13} /> اتصال
                      </a>
                    )}
                    <button onClick={(e) => openStatement(c, e)} className="p-2 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1">
                      <MessageCircle size={13} /> كشف حساب 📜
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ══ Modal إضافة / تعديل شخص ══ */}
      {showAddModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-header">
              <h3 className="font-black text-slate-800 text-base">
                {editingContact ? 'تعديل بيانات الشخص' : 'إضافة زبون أو مورد جديد'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost p-2 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="modal-body space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">👤 الاسم الكامل *</label>
                <input type="text" required placeholder="مثال: أحمد علي..."
                  value={name} onChange={e => setName(e.target.value)} className="form-input" />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">📱 رقم الهاتف (مثال: 0550123456)</label>
                <input type="tel" placeholder="0550123456"
                  value={phone} onChange={e => setPhone(e.target.value)} className="form-input" />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">🏷️ نوع التجارة / النشاط</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {QUICK_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`py-2 px-2 rounded-xl text-xs font-black border transition-all ${category === cat ? 'bg-emerald-600 text-white border-transparent' : 'bg-slate-100 text-slate-700 border-slate-200'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {category === 'أخرى' && (
                  <input
                    type="text"
                    required
                    placeholder="اكتب نوع النشاط (مثلاً: خردوات، أواني...)"
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    className="form-input mt-1"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">📍 مكان المحل / العنوان (اختياري)</label>
                <input type="text" placeholder="السوق المركزي، المحل 14..."
                  value={location} onChange={e => setLocation(e.target.value)} className="form-input" />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">⚠️ سقف الدين المسموح به (د.ج)</label>
                <input type="number" min="0" placeholder="مثال: 50,000"
                  value={creditLimit || ''} onChange={e => setCreditLimit(+e.target.value)} className="form-input tabnum" />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">📷 صورة الشخص / المحل</label>
                <div className="flex items-center gap-3">
                  <label htmlFor="contact-photo-upload" className="flex-1 py-3 px-3 border-2 border-dashed border-emerald-300 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-black flex items-center justify-center gap-2 cursor-pointer touch-active">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>التقاط أو اختيار صورة من المعرض</span>
                  </label>
                  <input id="contact-photo-upload" type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                  {photoUrl && <img src={photoUrl} alt="معاينة" className="w-12 h-12 rounded-xl object-cover border shrink-0" />}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-2">نوع الجهة</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'customer' as const, label: 'زبون', emoji: '👥' },
                    { val: 'supplier' as const, label: 'مورد', emoji: '🚚' },
                    { val: 'both'     as const, label: 'كلاهما', emoji: '🔄' },
                  ].map(t => (
                    <button key={t.val} type="button" onClick={() => setType(t.val)}
                      className={`py-2.5 rounded-xl font-black text-xs border ${type === t.val ? 'bg-emerald-600 text-white border-transparent' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <label className="block text-xs font-black text-slate-700">💰 الرصيد الابتدائي (إن وجد)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setBalanceDirection('customer_owes')}
                    className={`py-2 px-2 rounded-xl text-xs font-black border ${balanceDirection === 'customer_owes' ? 'bg-rose-600 text-white border-transparent' : 'bg-white text-slate-600 border-slate-200'}`}>
                    🟢 نطالبه بمبلغ (يدفع لي 📥)
                  </button>
                  <button type="button" onClick={() => setBalanceDirection('we_owe_customer')}
                    className={`py-2 px-2 rounded-xl text-xs font-black border ${balanceDirection === 'we_owe_customer' ? 'bg-blue-600 text-white border-transparent' : 'bg-white text-slate-600 border-slate-200'}`}>
                    🔴 يطالبنا بمبلغ (أسدد له 📤)
                  </button>
                </div>
                <input type="number" min="0" placeholder="المبلغ (د.ج)"
                  value={initialBalance || ''} onChange={e => setInitialBalance(Math.abs(+e.target.value))}
                  className="form-input text-center font-black text-lg tabnum" />
              </div>

              <button type="submit" className="btn btn-primary w-full py-4 text-base shadow-md">
                حفظ بيانات الشخص 💾
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══ Modal معاينة كشف الحساب قبل الإرسال (مع النسخ والواتساب والاتصال) ══ */}
      {showStatementModal && viewingContact && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowStatementModal(false); }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-800 text-base">معاينة كشف الحساب</h3>
              </div>
              <button onClick={() => setShowStatementModal(false)} className="btn btn-ghost p-2 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body space-y-4">
              <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl font-mono text-xs leading-relaxed whitespace-pre-wrap shadow-inner border border-slate-800">
                {generateAccountStatementText(viewingContact.name, viewingContact.balance, [])}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* 📲 إرسال عبر الواتساب المباشر */}
                {viewingContact.phone ? (
                  <a
                    href={createWhatsAppLink(viewingContact.phone, generateAccountStatementText(viewingContact.name, viewingContact.balance, []))}
                    target="_blank" rel="noreferrer"
                    className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 touch-active shadow-md"
                  >
                    <MessageCircle size={16} />
                    إرسال واتساب 📲
                  </a>
                ) : (
                  <p className="col-span-2 text-xs text-rose-600 font-bold text-center p-2 bg-rose-50 rounded-xl">
                    ⚠️ أضف رقم هاتف للشخص لتمكين الإرسال المباشر
                  </p>
                )}

                {/* 📋 نسخ النص */}
                <button
                  onClick={copyStatementText}
                  className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 touch-active border border-slate-200"
                >
                  {copiedStatement ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  {copiedStatement ? 'تم النسخ!' : 'نسخ النص 📋'}
                </button>
              </div>

              {/* 📞 اتصال مباشر */}
              {viewingContact.phone && (
                <a
                  href={`tel:${viewingContact.phone}`}
                  className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-black text-xs flex items-center justify-center gap-2 border border-blue-200 touch-active"
                >
                  <Phone size={16} />
                  اتصال هاتفي مباشر 📞 ({viewingContact.phone})
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal الملف الشخصي الكامل للشخص ══ */}
      {showProfileModal && viewingContact && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowProfileModal(false); }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg" style={{ background: avatarGrad(viewingContact.name) }}>
                  {viewingContact.photo_url ? <img src={viewingContact.photo_url} alt="" className="w-full h-full rounded-full object-cover" /> : viewingContact.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base leading-tight">{viewingContact.name}</h3>
                  <p className="text-xs text-slate-500 font-semibold">{viewingContact.phone || 'بدون هاتف'}</p>
                </div>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="btn btn-ghost p-2 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {viewingContact.category && (
                  <div className="bg-slate-100 p-2.5 rounded-xl font-bold text-slate-700 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <span>النشاط: {viewingContact.category}</span>
                  </div>
                )}
                {viewingContact.location && (
                  <div className="bg-slate-100 p-2.5 rounded-xl font-bold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    <span>العنوان: {viewingContact.location}</span>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-300 font-bold">حالة الرصيد المالية</span>
                  {viewingContact.credit_limit && (
                    <span className="text-[11px] bg-slate-700 px-2 py-0.5 rounded font-bold">
                      سقف الدين: {fmt(viewingContact.credit_limit)} د.ج
                    </span>
                  )}
                </div>
                <p className="text-2xl font-black tabnum">
                  {fmt(Math.abs(viewingContact.balance))} <span className="text-xs">د.ج</span>
                  <span className="text-xs font-semibold mr-2">
                    ({viewingContact.balance > 0 ? 'نطالبه بمبلغ 📥' : viewingContact.balance < 0 ? 'يطالبنا بمبلغ 📤' : 'مصفى ✅'})
                  </span>
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openStatement(viewingContact)}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 touch-active shadow-md"
                >
                  <MessageCircle className="w-4 h-4" />
                  معاينة وإرسال كشف الحساب 📜
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
