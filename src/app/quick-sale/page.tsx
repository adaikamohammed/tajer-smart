'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  getLocalData, setLocalData, Product, Contact, Transaction, TransactionItem,
  printThermalReceipt, generateReceiptNumber, saveReceipt, smartMatchText,
} from '@/lib/store';
import { SearchableSelect } from '@/components/SearchableSelect';
import { toast } from '@/components/Toast';
import {
  ShoppingCart, Search, Plus, Minus, Trash2,
  CheckCircle2, AlertTriangle, Printer, User, X,
  ArrowRight, UserPlus, Zap, PackageCheck, Banknote
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('en-US');

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  packsCount?: number;
  looseCount?: number;
}

function QuickSaleContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCustomerId = searchParams.get('customerId') || '';

  const [contacts,     setContacts]     = useState<Contact[]>([]);
  const [products,     setProducts]     = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // حالة اختيار الزبون
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [showAddCustomer,    setShowAddCustomer]    = useState(false);
  const [newCustName,        setNewCustName]        = useState('');
  const [newCustPhone,       setNewCustPhone]       = useState('');

  // سلة المنتجات والبحث
  const [productSearch,     setProductSearch]     = useState('');
  const [cart,              setCart]              = useState<CartItem[]>([]);
  const [paidCurrentGoods,  setPaidCurrentGoods]  = useState<number>(0);
  const [paidPrevDebt,      setPaidPrevDebt]      = useState<number>(0);
  const [customPrevBalance, setCustomPrevBalance] = useState<number>(0);
  const [note,              setNote]              = useState<string>('');
  const [isSubmitting,      setIsSubmitting]      = useState(false);

  useEffect(() => {
    const rawContacts: Contact[] = getLocalData('tajer_smart_contacts_v1', []);
    const customersOnly = rawContacts.filter(c => c.type !== 'supplier');
    const p: Product[]     = getLocalData('tajer_smart_products_v1', []);
    const t: Transaction[] = getLocalData('tajer_smart_transactions_v1', []);
    setContacts(customersOnly);
    setProducts(p);
    setTransactions(t);

    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    } else if (customersOnly.length > 0) {
      setSelectedCustomerId(customersOnly[0].id);
    }
  }, [initialCustomerId]);

  // الزبون المختار
  const selectedContact = useMemo(() => {
    return contacts.find(c => c.id === selectedCustomerId) || null;
  }, [contacts, selectedCustomerId]);

  useEffect(() => {
    if (selectedContact) {
      setCustomPrevBalance(Number(selectedContact.balance) || 0);
    } else {
      setCustomPrevBalance(0);
    }
  }, [selectedContact]);

  // المنتجات المفلترة بالبحث الذكي (تتجاهل الهمزات، المسافات، والرموز)
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.trim();
    return products.filter(
      p => smartMatchText(p.name, q)
        || (p.category && smartMatchText(p.category, q))
        || (p.barcode && smartMatchText(p.barcode, q))
    );
  }, [products, productSearch]);

  // إجمالي الفاتورة مع مراعاة بيع الكراتين والحبات الفردية
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [cart]);

  // تحديث المدفوع كاش للبضاعة تلقائياً عند تغيير السلة
  useEffect(() => {
    setPaidCurrentGoods(totalAmount);
  }, [totalAmount]);

  // الحصيلة الكلية المتبقية كدين في حساب الزبون
  const totalRemainingBalance = useMemo(() => {
    const unpaidGoods = Math.max(0, totalAmount - paidCurrentGoods);
    if (customPrevBalance >= 0) {
      // الزبون عليه دين سابق
      return unpaidGoods + (customPrevBalance - paidPrevDebt);
    } else {
      // الزبون له رصيد مسبق عندنا (customPrevBalance بالسالب)
      const prevCredit = Math.abs(customPrevBalance);
      // سداد كاش للزبون (paidPrevDebt) يقلل رصيده السابق، وغير المدفوع من البضاعة يقتطع من رصيده
      const remainingCredit = (prevCredit - paidPrevDebt) - unpaidGoods;
      return -remainingCredit;
    }
  }, [totalAmount, paidCurrentGoods, customPrevBalance, paidPrevDebt]);

  // إجمالي المدفوع كاش اليوم
  const totalCashToday = useMemo(() => {
    return paidCurrentGoods + paidPrevDebt;
  }, [paidCurrentGoods, paidPrevDebt]);

  // إضافة منتج للسلة
  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex(ci => ci.product.id === product.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          unitPrice: product.retail_price,
        },
      ]);
    }
  };

  // تعديل كمية كراتين وحبات فردية لوحدة الكرتونة
  const updatePackLooseQty = (productId: string, packs: number, loose: number) => {
    setCart(prev =>
      prev.map(ci => {
        if (ci.product.id === productId) {
          const cap = ci.product.pack_quantity || 1;
          const totalQty = (Math.max(0, packs) * cap) + Math.max(0, loose);
          if (totalQty <= 0) return null as any;
          return { ...ci, quantity: totalQty, packsCount: Math.max(0, packs), looseCount: Math.max(0, loose) };
        }
        return ci;
      }).filter(Boolean)
    );
  };

  // تعديل كمية منتج
  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(ci => {
          if (ci.product.id === productId) {
            const nq = ci.quantity + delta;
            return nq > 0 ? { ...ci, quantity: nq } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const setCartQtyDirect = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(ci => ci.product.id !== productId));
      return;
    }
    setCart(prev =>
      prev.map(ci => (ci.product.id === productId ? { ...ci, quantity: qty } : ci))
    );
  };

  const updateCartPrice = (productId: string, price: number) => {
    setCart(prev =>
      prev.map(ci => (ci.product.id === productId ? { ...ci, unitPrice: price } : ci))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(ci => ci.product.id !== productId));
  };

  // إضافة زبون جديد
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      toast('يرجى كتابة اسم الزبون', 'error');
      return;
    }
    const newC: Contact = {
      id: 'c_' + Date.now(),
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      type: 'customer',
      balance: 0,
      notes: 'تمت إضافته أثناء البيع السريع',
      created_at: new Date().toISOString(),
    };
    const updatedContacts = [newC, ...contacts];
    setContacts(updatedContacts);
    setLocalData('tajer_smart_contacts_v1', updatedContacts);
    setSelectedCustomerId(newC.id);
    setShowAddCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
    toast(`✅ تم إضافة الزبون "${newC.name}" بنجاح!`);
  };

  // تنفيذ عملية البيع وتحديث البيانات
  const handleExecuteSale = (printAfter: boolean = false) => {
    if (!selectedContact) {
      toast('يرجى اختيار الزبون أولاً', 'error');
      return;
    }
    if (cart.length === 0) {
      toast('السلة فارغة، أضف منتجات للبيع', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // تجهيز عناصر الفاتورة مع فحص الكراتين والحبات
      const txItems: TransactionItem[] = cart.map(ci => {
        const cap = ci.product.pack_quantity || 1;
        const packsCount = ci.packsCount !== undefined ? ci.packsCount : Math.floor(ci.quantity / cap);
        const looseCount = ci.looseCount !== undefined ? ci.looseCount : (ci.quantity % cap);

        return {
          product_id: ci.product.id,
          product_name: ci.product.name,
          quantity: ci.quantity,
          packs_count: packsCount,
          loose_count: looseCount,
          pack_quantity: cap,
          unit_type: ci.product.unit_type || 'piece',
          unit_price: ci.unitPrice,
          cost_price: ci.product.cost_price,
        };
      });

      const debtAmount = Math.max(0, totalAmount - paidCurrentGoods);
      const previousBalance = customPrevBalance;
      const finalBalance = totalRemainingBalance;

      // المعاملة
      const newTx: Transaction = {
        id: 'tx_' + Date.now(),
        tx_type: 'SALE',
        contact_id: selectedContact.id,
        contact_name: selectedContact.name,
        total_amount: totalAmount,
        paid_amount: totalCashToday,
        debt_amount: debtAmount,
        previous_balance: previousBalance,
        final_balance: finalBalance,
        status: debtAmount > 0 ? (totalCashToday > 0 ? 'PARTIAL' : 'DEBT') : 'PAID',
        items: txItems,
        notes: note.trim() || undefined,
        created_at: new Date().toISOString(),
      };

      // تحديث المخزون (يسمح بالسالب في حالة البيع الزائد لحين الشراء)
      const updatedProducts = products.map(p => {
        const cartMatch = cart.find(ci => ci.product.id === p.id);
        if (cartMatch) {
          return {
            ...p,
            stock_quantity: p.stock_quantity - cartMatch.quantity,
            last_sold_at: new Date().toISOString(),
          };
        }
        return p;
      });

      // تحديث ديون الزبون برصيد الحصيلة الجديد
      const updatedContacts = contacts.map(c => {
        if (c.id === selectedContact.id) {
          return {
            ...c,
            balance: finalBalance,
          };
        }
        return c;
      });

      const updatedTx = [newTx, ...transactions];

      setLocalData('tajer_smart_products_v1', updatedProducts);
      setLocalData('tajer_smart_contacts_v1', updatedContacts);
      setLocalData('tajer_smart_transactions_v1', updatedTx);

      const receipt = {
        id: generateReceiptNumber(),
        receipt_type: 'SALE' as const,
        contact_id: selectedContact.id,
        contact_name: selectedContact.name,
        contact_phone: selectedContact.phone,
        items: txItems,
        total_amount: totalAmount,
        paid_amount: totalCashToday,
        debt_amount: debtAmount,
        previous_balance: previousBalance,
        final_balance: finalBalance,
        note: note.trim() || undefined,
        created_at: newTx.created_at,
      };

      saveReceipt(receipt);

      if (printAfter) {
        printThermalReceipt(receipt);
      }

      toast(
        debtAmount > 0
          ? `✅ تم تسجيل الطلبية! دين على الزبون: ${fmt(debtAmount)} د.ج`
          : `✅ تم تسديد الطلبية نقداً بالكامل (${fmt(totalAmount)} د.ج)!`
      );

      router.push('/');
    } catch (err) {
      toast('حدث خطأ أثناء حفظ الفاتورة', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* ── 📌 زر العودة والترويسة ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-black shadow-sm touch-active"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للرئيسية
        </button>

        <div className="flex items-center gap-2 bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded-xl border border-emerald-300">
          <Zap className="w-4 h-4 fill-emerald-600 text-emerald-600 animate-pulse" />
          <span className="font-black text-xs">شاشة البيع السريع ⚡</span>
        </div>
      </div>

      {/* ── 👤 1. اختيار الزبون ── */}
      <div className="glass-card p-4 space-y-3 border-2 border-emerald-500/20 bg-white relative z-30">
        <div className="flex items-center justify-between">
          <label className="text-sm font-black text-slate-800 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            الزبون المشتري *
          </label>
          <button
            type="button"
            onClick={() => setShowAddCustomer(!showAddCustomer)}
            className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
          >
            <UserPlus size={14} />
            {showAddCustomer ? 'إلغاء' : 'إضافة زبون جديد +'}
          </button>
        </div>

        {showAddCustomer ? (
          <form onSubmit={handleCreateCustomer} className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 space-y-2">
            <input
              type="text"
              placeholder="اسم الزبون الجديد..."
              value={newCustName}
              onChange={e => setNewCustName(e.target.value)}
              className="form-input text-xs font-bold bg-white"
              autoFocus
            />
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="رقم الهاتف (اختياري)..."
                value={newCustPhone}
                onChange={e => setNewCustPhone(e.target.value)}
                className="form-input text-xs font-bold bg-white flex-1"
              />
              <button type="submit" className="btn btn-primary px-4 text-xs font-black shrink-0">
                حفظ
              </button>
            </div>
          </form>
        ) : (
          <SearchableSelect
            options={contacts.map(c => ({
              id: c.id,
              label: c.name,
              sublabel: c.phone || 'بدون هاتف',
              badge: c.balance > 0 ? `دين: ${fmt(c.balance)} د.ج` : c.balance < 0 ? `مستحقات: ${fmt(Math.abs(c.balance))} د.ج` : 'متوازن',
            }))}
            value={selectedCustomerId}
            onChange={id => setSelectedCustomerId(id)}
            placeholder="🔍 ابحث بالاسم أو الرقم لاختيار الزبون..."
            searchPlaceholder="اكتب اسم الزبون المشتري..."
            icon="user"
            required
            onAddNew={() => setShowAddCustomer(true)}
            addNewText="إضافة زبون جديد + "
          />
        )}
      </div>

      {/* ── 🔴 بانر الدين/المستحقات السابقة للزبون ── */}
      {selectedContact && Number(selectedContact.balance) !== 0 && (
        <div className={`p-3.5 rounded-2xl border-2 ${
          Number(selectedContact.balance) > 0
            ? 'bg-rose-50 border-rose-300 text-rose-900'
            : 'bg-blue-50 border-blue-300 text-blue-900'
        }`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{Number(selectedContact.balance) > 0 ? '⚠️' : '💙'}</span>
              <div>
                <p className="font-black text-sm">
                  {Number(selectedContact.balance) > 0
                    ? `على ${selectedContact.name} دين سابق:`
                    : `لـ ${selectedContact.name} مستحقات علينا:`}
                </p>
                <p className="text-xs font-bold opacity-70">
                  {Number(selectedContact.balance) > 0
                    ? 'سيُضاف للوصل — سيعرف الزبون إجمالي ما عليه'
                    : 'مبلغ ندين به لهذا العميل'}
                </p>
              </div>
            </div>
            <span className="font-black text-2xl tabnum">
              {fmt(Math.abs(Number(selectedContact.balance)))} <span className="text-sm">د.ج</span>
            </span>
          </div>
        </div>
      )}

      {/* ── 🔍 2. البحث عن المنتجات وفحص المخزون ── */}
      <div className="glass-card p-4 space-y-3 bg-white relative z-10">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-sm text-slate-800 flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-600" />
            البحث في المخزن وإضافة للمنتجات
          </h3>
          <span className="text-xs font-bold text-slate-400">إجمالي المنتجات: {products.length}</span>
        </div>

        <div className="relative">
          <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.5} />
          <input
            type="text"
            placeholder="ابحث سريعا بأسماء المنتجات أو الأقسام..."
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            className="form-input pr-10 text-sm font-bold bg-slate-50 border-slate-300"
          />
          {productSearch && (
            <button onClick={() => setProductSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
        </div>

        {/* شبكة نتائج المنتجات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <p className="col-span-2 text-xs font-bold text-slate-400 text-center py-6 bg-slate-50 rounded-xl">
              لا يوجد منتج مطابق للبحث
            </p>
          ) : (
            filteredProducts.map(p => {
              const cartMatch = cart.find(ci => ci.product.id === p.id);
              const currentInCart = cartMatch ? cartMatch.quantity : 0;
              const availStock = p.stock_quantity;
              const isLow = availStock <= p.min_stock_alert;
              const isOut = availStock <= 0;

              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 touch-active ${
                    currentInCart > 0
                      ? 'bg-emerald-50 border-emerald-400 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-xs text-slate-900 truncate leading-snug">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs font-black text-emerald-700 tabnum">{fmt(p.retail_price)} د.ج</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${
                        isOut ? 'bg-rose-100 text-rose-700' : isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isOut ? 'غير متوفر ❌' : `متوفر: ${availStock}`}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-sm transition-all ${
                      currentInCart > 0 ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-emerald-600 hover:text-white'
                    }`}
                  >
                    {currentInCart > 0 ? currentInCart : '+'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 🛒 3. جدول سلة المنتجات المطلوبة ── */}
      <div className="glass-card p-4 space-y-3 bg-white">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-sm text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            طلبية الزبون ({cart.length} منتج)
          </h3>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs font-bold text-rose-600 hover:underline">
              تفريغ السلة
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <ShoppingCart size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-500">سلة البيع فارغة حالياً، أضف منتجات من الأعلى</p>
          </div>
        ) : (
          <div className="space-y-2.5 overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-black text-slate-400">
                  <th className="pb-2">المنتج</th>
                  <th className="pb-2 text-center">السعة</th>
                  <th className="pb-2 text-center">الكمية (كراتين وحبات)</th>
                  <th className="pb-2 text-center">سعر التجزئة</th>
                  <th className="pb-2 text-left">الإجمالي</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.map(ci => {
                  const p = ci.product;
                  const availStock = p.stock_quantity;
                  const isDeficit = ci.quantity > availStock;
                  const deficitQty = ci.quantity - availStock;

                  return (
                    <tr key={p.id} className={isDeficit ? 'bg-rose-50/60' : ''}>
                      <td className="py-2.5 min-w-[120px]">
                        <p className="font-black text-xs text-slate-900">{p.name}</p>
                        {isDeficit && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md mt-1">
                            <AlertTriangle size={12} /> عجز: متوفر {availStock} (نقص {deficitQty})
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 text-center min-w-[65px]">
                        <span className="text-xs font-extrabold text-indigo-950 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-xl inline-block tabnum">
                          {p.pack_quantity || 1}
                        </span>
                      </td>

                      <td className="py-2.5 text-center min-w-[220px]">
                        {p.unit_type === 'pack' ? (() => {
                          const curPacks = ci.packsCount ?? Math.floor(ci.quantity / (p.pack_quantity || 1));
                          const curLoose = ci.looseCount ?? (ci.quantity % (p.pack_quantity || 1));
                          return (
                            <div className="w-full bg-white p-2 rounded-2xl border border-indigo-200 shadow-sm">
                              <div className="grid grid-cols-2 gap-2 w-full">
                                {/* قسم الكرتونة 50% */}
                                <div className="flex flex-col items-center bg-indigo-50/80 p-1.5 rounded-xl border border-indigo-200/60">
                                  <span className="block text-[11px] font-black text-indigo-950 mb-1">📦 عدد الكراتين</span>
                                  <div className="flex items-center justify-between w-full gap-1">
                                    <button
                                      type="button"
                                      onClick={() => updatePackLooseQty(p.id, Math.max(0, curPacks - 1), curLoose)}
                                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white text-indigo-900 border border-indigo-200 font-black text-base flex items-center justify-center shadow-sm touch-active hover:bg-rose-100 hover:text-rose-700 shrink-0"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      value={curPacks}
                                      onChange={e => updatePackLooseQty(p.id, +e.target.value, curLoose)}
                                      onFocus={e => e.target.select()}
                                      className="flex-1 min-w-0 text-center form-input py-0.5 px-0.5 font-black text-xs sm:text-sm text-indigo-950 tabnum bg-white border-indigo-300 shadow-inner"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updatePackLooseQty(p.id, curPacks + 1, curLoose)}
                                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600 text-white font-black text-base flex items-center justify-center shadow-sm touch-active hover:bg-indigo-700 shrink-0"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                {/* قسم الحبة 50% */}
                                <div className="flex flex-col items-center bg-emerald-50/80 p-1.5 rounded-xl border border-emerald-200/60">
                                  <span className="block text-[11px] font-black text-emerald-950 mb-1">🥛 حبات إضافية</span>
                                  <div className="flex items-center justify-between w-full gap-1">
                                    <button
                                      type="button"
                                      onClick={() => updatePackLooseQty(p.id, curPacks, Math.max(0, curLoose - 1))}
                                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white text-emerald-900 border border-emerald-200 font-black text-base flex items-center justify-center shadow-sm touch-active hover:bg-rose-100 hover:text-rose-700 shrink-0"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      value={curLoose}
                                      onChange={e => updatePackLooseQty(p.id, curPacks, +e.target.value)}
                                      onFocus={e => e.target.select()}
                                      className="flex-1 min-w-0 text-center form-input py-0.5 px-0.5 font-black text-xs sm:text-sm text-emerald-950 tabnum bg-white border-emerald-300 shadow-inner"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updatePackLooseQty(p.id, curPacks, curLoose + 1)}
                                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 text-white font-black text-base flex items-center justify-center shadow-sm touch-active hover:bg-emerald-700 shrink-0"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })() : (
                          <div className="inline-flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200">
                            <button
                              onClick={() => updateCartQty(p.id, -1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-black flex items-center justify-center hover:bg-rose-100 hover:text-rose-700"
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={ci.quantity}
                              onChange={e => setCartQtyDirect(p.id, +e.target.value)}
                              onFocus={e => e.target.select()}
                              className="w-12 text-center form-input py-0.5 px-0 text-xs font-black tabnum"
                            />
                            <button
                              onClick={() => updateCartQty(p.id, 1)}
                              className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black flex items-center justify-center hover:bg-emerald-200"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 text-center min-w-[110px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            سعر التجزئة (حبة)
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={ci.unitPrice}
                            onChange={e => updateCartPrice(p.id, +e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-20 form-input py-0.5 px-1 text-xs font-black text-emerald-700 tabnum bg-white border-emerald-300 text-center shadow-inner"
                          />
                        </div>
                      </td>

                      <td className="py-2.5 text-left font-black text-xs text-slate-900 tabnum min-w-[70px]">
                        {fmt(ci.quantity * ci.unitPrice)} د.ج
                      </td>

                      <td className="py-2.5 text-left">
                        <button onClick={() => removeFromCart(p.id)} className="text-slate-400 hover:text-rose-600 p-1">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 💵 4. ملخص الفاتورة والدفع ── */}
      {cart.length > 0 && (
        <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-4 shadow-xl">
          {/* قسم الشقين: البضاعة الحالية والدين السابق */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 📦 1. البضاعة الحالية والمدفوع منها */}
            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-300 text-xs">📦 سعر البضاعة الحالية بالسلة:</span>
                <span className="font-black text-xl text-emerald-400 tabnum">{fmt(totalAmount)} <span className="text-xs">د.ج</span></span>
              </div>
              <div className="pt-2 border-t border-slate-700/80">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">💵 كم دفع للبضاعة كاش الآن:</label>
                <input
                  type="number"
                  min="0"
                  max={totalAmount}
                  value={paidCurrentGoods}
                  onChange={e => setPaidCurrentGoods(+e.target.value)}
                  className="form-input text-base font-black text-center text-emerald-400 bg-slate-900 border-slate-700 tabnum py-1.5"
                />
              </div>
            </div>

            {/* 📋 2. الدين السابق أو الرصيد المسبق والتسديد منه */}
            <div className={`p-3.5 rounded-2xl border space-y-2 ${
              customPrevBalance < 0 ? 'bg-indigo-950/40 border-indigo-700/80' : 'bg-slate-800/80 border-slate-700'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs flex items-center gap-1">
                  {customPrevBalance < 0 ? (
                    <span className="text-indigo-300">💙 رصيد سابق للزبون (له عندنا):</span>
                  ) : customPrevBalance > 0 ? (
                    <span className="text-amber-300">📋 دين سابق على الزبون (نطالبه):</span>
                  ) : (
                    <span className="text-slate-300">📋 دين سابق على الزبون:</span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="any"
                    value={customPrevBalance < 0 ? Math.abs(customPrevBalance) : customPrevBalance}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      setCustomPrevBalance(customPrevBalance < 0 ? -val : val);
                    }}
                    className={`w-28 form-input text-sm font-black text-center bg-slate-900 border-slate-700 tabnum py-1 px-1 ${
                      customPrevBalance < 0 ? 'text-indigo-300' : 'text-amber-400'
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-400">د.ج</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/80">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  {customPrevBalance < 0
                    ? '💸 سداد كاش للزبون من رصيده السابق الآن:'
                    : '💸 تم تحصيل مبلغ كاش من الدين السابق الآن:'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={paidPrevDebt}
                  onChange={e => setPaidPrevDebt(+e.target.value)}
                  placeholder="0 (أو جزء أو كل الدين)"
                  className="form-input text-base font-black text-center text-amber-400 bg-slate-900 border-slate-700 tabnum py-1.5"
                />
              </div>
            </div>
          </div>

          {/* 📊 3. الحصيلة كدين متبقي إجمالي */}
          <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="block text-xs font-black text-slate-200">
                {totalRemainingBalance > 0
                  ? '🔴 الحصيلة: الرصيد المتبقي في ذمته (دين عليه):'
                  : totalRemainingBalance < 0
                  ? '🔵 الحصيلة: الرصيد المتبقي لصالح الزبون (له عندنا):'
                  : '✅ الحصيلة: الحساب مصفى بالكامل:'}
              </span>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                (مجموع البضاعة - المدفوع منها) + (الدين السابق - المسدد منه)
              </span>
            </div>
            <div className={`px-5 py-2.5 rounded-xl font-black text-xl tabnum border shadow-md ${
              totalRemainingBalance > 0
                ? 'bg-rose-950 text-rose-300 border-rose-800'
                : totalRemainingBalance < 0
                ? 'bg-indigo-950 text-indigo-200 border-indigo-700'
                : 'bg-emerald-950 text-emerald-300 border-emerald-800'
            }`}>
              {fmt(Math.abs(totalRemainingBalance))} د.ج
            </div>
          </div>

          <div>
            <input
              type="text"
              placeholder="ملاحظات اختيارية على الطلبية..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="form-input text-xs font-semibold bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
            />
          </div>

          {/* أزرار الحفظ المباشر والطباعة */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleExecuteSale(false)}
              className="py-3.5 px-4 rounded-xl font-black text-xs bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center gap-2 transition-colors border border-slate-700"
            >
              <CheckCircle2 size={16} />
              حفظ الطلبية فقط ✅
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleExecuteSale(true)}
              className="py-3.5 px-4 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-lg transition-colors"
            >
              <Printer size={16} />
              حفظ وطباعة الوصل 🖨️
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuickSalePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-bold text-slate-400">جارٍ تحميل شاشة البيع السريع...</div>}>
      <QuickSaleContent />
    </Suspense>
  );
}
