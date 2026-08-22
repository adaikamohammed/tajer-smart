'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  getLocalData, setLocalData, Product, Contact, Transaction, TransactionItem,
  printThermalReceipt, generateReceiptNumber, saveReceipt,
} from '@/lib/store';
import { SearchableSelect } from '@/components/SearchableSelect';
import { toast } from '@/components/Toast';
import {
  ShoppingCart, Search, Plus, Minus, Trash2,
  CheckCircle2, AlertTriangle, Printer, User, X,
  ArrowRight, DollarSign, PackageCheck, PackageX, UserPlus
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('en-US');

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  packsCount?: number;
  looseCount?: number;
}

interface QuickSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerId?: string;
  onSuccess?: () => void;
}

export default function QuickSaleModal({
  isOpen,
  onClose,
  initialCustomerId,
  onSuccess,
}: QuickSaleModalProps) {
  const [contacts,  setContacts]  = useState<Contact[]>([]);
  const [products,  setProducts]  = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // حالة اختيار الزبون
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [showAddCustomer,    setShowAddCustomer]    = useState(false);
  const [newCustName,        setNewCustName]        = useState('');
  const [newCustPhone,       setNewCustPhone]       = useState('');

  // سلة المنتجات والتفتيش
  const [productSearch, setProductSearch] = useState('');
  const [cart,          setCart]          = useState<CartItem[]>([]);
  const [paidAmount,    setPaidAmount]    = useState<number>(0);
  const [note,          setNote]          = useState<string>('');
  const [isSubmitting,  setIsSubmitting]  = useState(false);

  useEffect(() => {
    if (isOpen) {
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
      setCart([]);
      setPaidAmount(0);
      setNote('');
      setProductSearch('');
    }
  }, [isOpen, initialCustomerId]);

  // تصفية الزبائن
  const selectedContact = useMemo(() => {
    return contacts.find(c => c.id === selectedCustomerId) || null;
  }, [contacts, selectedCustomerId]);

  // تصفية المنتجات بالبحث
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase().trim();
    return products.filter(
      p => p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  // حساب الإجمالي مع مراعاة بيع الكراتين والحبات الفردية
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [cart]);

  // إعداد المبلغ المدفوع تلقائياً عند تغيير السلة
  useEffect(() => {
    setPaidAmount(totalAmount);
  }, [totalAmount]);

  if (!isOpen) return null;

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

  // تعديل كمية منتج في السلة
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

  // تعديل الكمية مباشرة بإدخال رقم
  const setCartQtyDirect = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(ci => ci.product.id !== productId));
      return;
    }
    setCart(prev =>
      prev.map(ci => (ci.product.id === productId ? { ...ci, quantity: qty } : ci))
    );
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

  // تعديل سعر التجزئة في السلة
  const updateCartPrice = (productId: string, price: number) => {
    setCart(prev =>
      prev.map(ci => (ci.product.id === productId ? { ...ci, unitPrice: price } : ci))
    );
  };

  // إزالة منتج من السلة
  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(ci => ci.product.id !== productId));
  };

  // إضافة زبون جديد سريعاً
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

  // تنفيذ عملية البيع بالكامل
  const handleExecuteSale = (shouldPrint: boolean) => {
    if (!selectedContact) {
      toast('يرجى اختيار الزبون أولاً', 'error');
      return;
    }
    if (cart.length === 0) {
      toast('السلة فارغة! اضف منتجات أولاً', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const debtAmount = Math.max(0, totalAmount - paidAmount);
      const txItems: TransactionItem[] = cart.map(ci => {
        const cap = ci.product.pack_quantity || 1;
        const isPack = ci.product.unit_type === 'pack';
        const packsCount = ci.packsCount !== undefined ? ci.packsCount : (isPack ? Math.floor(ci.quantity / cap) : 0);
        const looseCount = ci.looseCount !== undefined ? ci.looseCount : (isPack ? ci.quantity % cap : ci.quantity);

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

      const previousBalance = Number(selectedContact.balance) || 0;
      const finalBalance = previousBalance + debtAmount;

      // 1. إنشاء المعاملة
      const newTx: Transaction = {
        id: 'tx_' + Date.now(),
        tx_type: 'SALE',
        contact_id: selectedContact.id,
        contact_name: selectedContact.name,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        debt_amount: debtAmount,
        previous_balance: previousBalance,
        final_balance: finalBalance,
        status: debtAmount > 0 ? (paidAmount > 0 ? 'PARTIAL' : 'DEBT') : 'PAID',
        items: txItems,
        notes: note.trim() || undefined,
        created_at: new Date().toISOString(),
      };

      // 2. تحديث المخزون
      const updatedProducts = products.map(p => {
        const cartMatch = cart.find(ci => ci.product.id === p.id);
        if (cartMatch) {
          return {
            ...p,
            stock_quantity: Math.max(0, p.stock_quantity - cartMatch.quantity),
            last_sold_at: new Date().toISOString(),
          };
        }
        return p;
      });

      // 3. تحديث حساب الزبون إن وجد دين
      const updatedContacts = contacts.map(c => {
        if (c.id === selectedContact.id) {
          return {
            ...c,
            balance: c.balance + debtAmount,
          };
        }
        return c;
      });

      const updatedTx = [newTx, ...transactions];

      // حفظ البيانات محلياً
      setLocalData('tajer_smart_products_v1', updatedProducts);
      setLocalData('tajer_smart_contacts_v1', updatedContacts);
      setLocalData('tajer_smart_transactions_v1', updatedTx);

      const receiptId = generateReceiptNumber();
      const receiptObj = {
        id: receiptId,
        receipt_type: 'SALE' as const,
        contact_id: selectedContact.id,
        contact_name: selectedContact.name,
        contact_phone: selectedContact.phone,
        items: txItems,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        debt_amount: debtAmount,
        previous_balance: previousBalance,
        final_balance: finalBalance,
        note: note.trim() || undefined,
        created_at: new Date().toISOString(),
      };

      // 4. حفظ الوصل دائماً في أرشيف الأوصال حتى يظهر في صفحة الأوصال وسجل حساب الشخص
      saveReceipt(receiptObj);

      // طباعة حرارية إذا طلب التاجر
      if (shouldPrint) {
        printThermalReceipt(receiptObj);
      }

      toast(
        debtAmount > 0
          ? `✅ تم البيع! وحفظ الوصل — دين: ${fmt(debtAmount)} د.ج على ${selectedContact.name}`
          : `✅ تم البيع وحفظ الوصل كاش بالكامل (${fmt(totalAmount)} د.ج)!`
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast('حدث خطأ أثناء تسجيل العملية', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet max-h-[92vh] flex flex-col max-w-lg mx-auto">
        <div className="modal-handle shrink-0" />

        {/* ── ⚡ ترويسة البيع السريع ── */}
        <div className="modal-header shrink-0 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
              <ShoppingCart size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg leading-none">بيع سريع لزبون ⚡</h3>
              <p className="text-xs text-slate-400 font-bold mt-1">اختر الزبون، فحص المخزون والطباعة فوراً</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2 rounded-xl text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body overflow-y-auto space-y-4 flex-1 py-4">

          {/* ── 👤 1. اختيار الزبون ── */}
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 relative z-30">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <User size={15} className="text-emerald-600" />
                الزبون المستلم *
              </label>
              <button
                type="button"
                onClick={() => setShowAddCustomer(!showAddCustomer)}
                className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <UserPlus size={13} />
                {showAddCustomer ? 'إلغاء' : 'زبون جديد +'}
              </button>
            </div>

            {showAddCustomer ? (
              <form onSubmit={handleCreateCustomer} className="p-3 bg-white rounded-xl border border-emerald-300 space-y-2 animate-fade-in">
                <input
                  type="text"
                  placeholder="اسم الزبون الجديد..."
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  className="form-input text-xs font-bold"
                  autoFocus
                />
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="رقم الهاتف (اختياري)..."
                    value={newCustPhone}
                    onChange={e => setNewCustPhone(e.target.value)}
                    className="form-input text-xs font-bold flex-1"
                  />
                  <button type="submit" className="btn btn-primary px-3 text-xs font-black shrink-0">
                    حفظ الزبون
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

          {/* ── 🔍 2. البحث السريع عن منتج وفحص المخزون ── */}
          <div className="space-y-2 relative z-10">
            <div className="relative">
              <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.5} />
              <input
                type="text"
                placeholder="ابحث سريعا بالاسم أو القسم (مثال: زيت)..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="form-input pr-10 text-sm font-bold bg-white border-slate-300 focus:border-emerald-500"
              />
              {productSearch && (
                <button onClick={() => setProductSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={15} />
                </button>
              )}
            </div>

            {/* قائمة نتائج البحث السريعة المباشرة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <p className="col-span-2 text-xs font-bold text-slate-400 text-center py-4 bg-slate-50 rounded-xl">
                  لا يوجد منتج بهذا الاسم في المخزن
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
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 touch-active ${
                        currentInCart > 0
                          ? 'bg-emerald-50 border-emerald-400 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-xs text-slate-900 truncate leading-snug">{p.name}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-xs font-black text-emerald-700 tabnum">{fmt(p.retail_price)} د.ج</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${
                            isOut ? 'bg-rose-100 text-rose-700' : isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isOut ? 'غير متوفر ❌' : `متوفر: ${availStock}`}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-sm transition-all ${
                          currentInCart > 0 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-emerald-500 hover:text-white'
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

          {/* ── 🛒 3. سلة المبيعات والتأكد من الكمية والنقص ── */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <ShoppingCart size={15} className="text-indigo-600" />
                سلة طلب الزبون ({cart.length} منتجات)
              </h4>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-[10px] font-bold text-rose-600 hover:underline">
                  تفريغ السلة
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <ShoppingCart size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-500">اختر من المنتجات أعلاه لإضافتها لفاتورة البيع</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {cart.map(ci => {
                  const p = ci.product;
                  const availStock = p.stock_quantity;
                  const isDeficit = ci.quantity > availStock;
                  const deficitQty = ci.quantity - availStock;

                  return (
                    <div key={p.id} className={`p-3 rounded-2xl border space-y-2.5 ${isDeficit ? 'bg-rose-50/70 border-rose-300' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-black text-xs text-slate-900 truncate flex-1">{p.name}</p>
                        <button
                          onClick={() => removeFromCart(p.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* التحكم بالكمية المطلوبة (100% بعرض بطاقة المنتج) */}
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
                        <div className="w-full bg-white p-2 rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-slate-700">🥛 الكمية بالحبة:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => updateCartQty(p.id, ci.quantity - 1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-black flex items-center justify-center hover:bg-rose-100"
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={ci.quantity}
                              onChange={e => updateCartQty(p.id, +e.target.value)}
                              onFocus={e => e.target.select()}
                              className="w-12 text-center form-input py-0.5 px-0 text-xs font-black tabnum"
                            />
                            <button
                              onClick={() => updateCartQty(p.id, ci.quantity + 1)}
                              className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black flex items-center justify-center hover:bg-emerald-200"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-1.5 text-xs pt-1 border-t border-slate-100 flex-wrap">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-500">السعر:</span>
                          <button
                            type="button"
                            onClick={() => updateCartPrice(p.id, p.retail_price)}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-black border transition-all ${
                              ci.unitPrice === p.retail_price ? 'bg-emerald-600 text-white border-transparent' : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            تجزئة 1 ({p.retail_price})
                          </button>
                          {(p.retail_price_2 || 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => updateCartPrice(p.id, p.retail_price_2 || p.retail_price)}
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-black border transition-all ${
                                ci.unitPrice === p.retail_price_2 ? 'bg-sky-600 text-white border-transparent' : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              تجزئة 2 ({p.retail_price_2})
                            </button>
                          )}
                          <input
                            type="number"
                            min="0"
                            value={ci.unitPrice}
                            onChange={e => updateCartPrice(p.id, +e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-16 form-input py-0.5 px-1 text-[11px] font-black text-emerald-700 tabnum bg-white border-slate-300"
                          />
                        </div>
                      </div>

                      {/* ⚠️ تنبيه النقص في المخزن إن وجد */}
                      {isDeficit && (
                        <div className="p-2 rounded-xl bg-rose-100 text-rose-900 text-[11px] font-bold flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                            <span>عجز بالمخزن: متوفر {availStock} حبة فقط (نقص {deficitQty} حبة لتجهيز الطلب)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── 💵 4. حساب الفاتورة والدفع ── */}
          {cart.length > 0 && (
            <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-3 shadow-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-300">إجمالي الفاتورة:</span>
                <span className="font-black text-2xl text-emerald-400 tabnum">{fmt(totalAmount)} <span className="text-xs">د.ج</span></span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">💵 المدفوع كاش الآن (د.ج):</label>
                  <input
                    type="number"
                    min="0"
                    max={totalAmount}
                    value={paidAmount}
                    onChange={e => setPaidAmount(+e.target.value)}
                    onFocus={e => e.target.select()}
                    className="form-input text-base font-black text-center text-emerald-400 bg-slate-800 border-slate-700 tabnum"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">📋 المتبقي كدين:</label>
                  <div className={`p-2 rounded-xl text-center font-black text-base tabnum border ${
                    totalAmount - paidAmount > 0 ? 'bg-rose-950/80 text-rose-300 border-rose-800' : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                  }`}>
                    {fmt(Math.max(0, totalAmount - paidAmount))} د.ج
                  </div>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="ملاحظة على الفاتورة (اختياري)..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="form-input text-xs font-semibold bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── 🚀 أزرار الحفظ والطباعة ── */}
        <div className="modal-footer shrink-0 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={cart.length === 0 || isSubmitting}
            onClick={() => handleExecuteSale(false)}
            className="py-3 px-3 rounded-xl font-black text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            حفظ البيع فقط ✅
          </button>

          <button
            type="button"
            disabled={cart.length === 0 || isSubmitting}
            onClick={() => handleExecuteSale(true)}
            className="py-3 px-3 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-md transition-colors disabled:opacity-50"
          >
            <Printer size={16} />
            حفظ وطباعة الوصل 🖨️
          </button>
        </div>
      </div>
    </div>
  );
}
