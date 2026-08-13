'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getLocalData, setLocalData, Product, Contact, Transaction,
  TransactionItem, saveReceipt, printThermalReceipt, generateReceiptNumber
} from '@/lib/store';
import { toast } from '@/components/Toast';
import {
  ShoppingBag, Search, Plus, Minus, Trash2, Printer, CheckCircle2,
  AlertTriangle, UserPlus, ArrowRight, UserCheck, Package, DollarSign
} from 'lucide-react';
import Link from 'next/link';
import { SearchableSelect } from '@/components/SearchableSelect';

interface CartItem {
  product: Product;
  quantity: number; // إجمالي الحبات
  packsCount?: number;
  looseCount?: number;
  unitPrice: number; // سعر الجملة للحبة/الكرتونة
}

const fmt = (n: number) => n.toLocaleString('en-US');

export default function QuickBuyPage() {
  const searchParams = useSearchParams();
  const initialSupplierId = searchParams.get('supplierId');

  const [contacts,            setContacts]            = useState<Contact[]>([]);
  const [products,            setProducts]            = useState<Product[]>([]);
  const [transactions,        setTransactions]        = useState<Transaction[]>([]);
  const [selectedSupplierId,  setSelectedSupplierId]  = useState<string>('');
  const [cart,                setCart]                = useState<CartItem[]>([]);
  const [paidAmount,          setPaidAmount]          = useState<number>(0);
  const [note,                setNote]                = useState('');
  const [productSearch,       setProductSearch]       = useState('');

  // مودال إضافة مورد جديد فورياً
  const [showAddSupplier,     setShowAddSupplier]     = useState(false);
  const [newSuppName,         setNewSuppName]         = useState('');
  const [newSuppPhone,        setNewSuppPhone]        = useState('');
  const [isSubmitting,        setIsSubmitting]        = useState(false);

  useEffect(() => {
    const rawContacts: Contact[] = getLocalData('tajer_smart_contacts_v1', []);
    const suppliersOnly = rawContacts.filter(c => c.type === 'supplier');
    const p: Product[]     = getLocalData('tajer_smart_products_v1', []);
    const t: Transaction[] = getLocalData('tajer_smart_transactions_v1', []);
    setContacts(suppliersOnly);
    setProducts(p);
    setTransactions(t);

    if (initialSupplierId) {
      setSelectedSupplierId(initialSupplierId);
    } else if (suppliersOnly.length > 0) {
      setSelectedSupplierId(suppliersOnly[0].id);
    }
  }, [initialSupplierId]);

  // المورد المختار
  const selectedContact = useMemo(() => {
    return contacts.find(c => c.id === selectedSupplierId) || null;
  }, [contacts, selectedSupplierId]);

  // المنتجات المفلترة بالبحث
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 12);
    const q = productSearch.toLowerCase().trim();
    return products.filter(
      p => p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  // إجمالي الفاتورة
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => {
      const p = item.product;
      if (p.unit_type === 'pack') {
        const cap = p.pack_quantity || 1;
        const packs = item.packsCount ?? Math.floor(item.quantity / cap);
        const loose = item.looseCount ?? (item.quantity % cap);
        const loosePrice = item.unitPrice / cap;
        return sum + (packs * item.unitPrice) + (loose * loosePrice);
      }
      return sum + (item.quantity * item.unitPrice);
    }, 0);
  }, [cart]);

  // تحديث المدفوع تلقائياً بالكامل
  useEffect(() => {
    setPaidAmount(totalAmount);
  }, [totalAmount]);

  // إضافة منتج للسلة
  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex(ci => ci.product.id === product.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      const current = updated[existingIndex];
      const cap = product.pack_quantity || 1;

      if (product.unit_type === 'pack') {
        const newPacks = (current.packsCount ?? Math.floor(current.quantity / cap)) + 1;
        const curLoose = current.looseCount ?? (current.quantity % cap);
        updated[existingIndex] = {
          ...current,
          quantity: (newPacks * cap) + curLoose,
          packsCount: newPacks,
          looseCount: curLoose,
        };
      } else {
        updated[existingIndex] = {
          ...current,
          quantity: current.quantity + 1,
        };
      }
      setCart(updated);
    } else {
      const initialQty = product.unit_type === 'pack' ? (product.pack_quantity || 1) : 1;
      setCart(prev => [
        ...prev,
        {
          product,
          quantity: initialQty,
          packsCount: product.unit_type === 'pack' ? 1 : undefined,
          looseCount: product.unit_type === 'pack' ? 0 : undefined,
          unitPrice: product.cost_price,
        },
      ]);
    }
  };

  // تعديل كمية كراتين وحبات
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

  // تعديل الكمية المباشرة
  const setCartQtyDirect = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(ci => ci.product.id !== productId));
      return;
    }
    setCart(prev =>
      prev.map(ci => (ci.product.id === productId ? { ...ci, quantity: qty } : ci))
    );
  };

  // تعديل سعر الشراء بالجملة
  const updateCartPrice = (productId: string, price: number) => {
    setCart(prev =>
      prev.map(ci => (ci.product.id === productId ? { ...ci, unitPrice: price } : ci))
    );
  };

  // إضافة مورد جديد سريعاً
  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuppName.trim()) {
      toast('يرجى كتابة اسم المورد', 'error');
      return;
    }
    const newS: Contact = {
      id: 'c_' + Date.now(),
      name: newSuppName.trim(),
      phone: newSuppPhone.trim(),
      type: 'supplier',
      balance: 0,
      notes: 'تمت إضافته أثناء الشراء السريع',
      created_at: new Date().toISOString(),
    };
    const allContacts: Contact[] = getLocalData('tajer_smart_contacts_v1', []);
    const updatedAll = [newS, ...allContacts];
    setLocalData('tajer_smart_contacts_v1', updatedAll);

    const suppliersOnly = updatedAll.filter(c => c.type === 'supplier');
    setContacts(suppliersOnly);
    setSelectedSupplierId(newS.id);
    setShowAddSupplier(false);
    setNewSuppName('');
    setNewSuppPhone('');
    toast(`✅ تم إضافة المورد "${newS.name}" بنجاح!`);
  };

  // تنفيذ عملية الشراء
  const handleExecuteBuy = (shouldPrint: boolean) => {
    if (!selectedContact) {
      toast('⚠️ يرجى اختيار المورد أولاً', 'error');
      return;
    }
    if (cart.length === 0) {
      toast('⚠️ السلة فارغة! أضف منتجات أولاً', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const debtAmount = Math.max(0, totalAmount - paidAmount);
      const txItems: TransactionItem[] = cart.map(ci => ({
        product_id: ci.product.id,
        product_name: ci.product.name,
        quantity: ci.quantity,
        packs_count: ci.packsCount,
        loose_count: ci.looseCount,
        pack_quantity: ci.product.pack_quantity,
        unit_type: ci.product.unit_type,
        unit_price: ci.unitPrice,
        cost_price: ci.unitPrice,
      }));

      // 1. إنشاء المعاملة
      const newTx: Transaction = {
        id: 'tx_' + Date.now(),
        tx_type: 'PURCHASE',
        contact_id: selectedContact.id,
        contact_name: selectedContact.name,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        debt_amount: debtAmount,
        status: debtAmount > 0 ? (paidAmount > 0 ? 'PARTIAL' : 'DEBT') : 'PAID',
        items: txItems,
        notes: note.trim() || undefined,
        created_at: new Date().toISOString(),
      };

      // 2. زيادة كميات المخزون وتحديث سعر الجملة
      const allProducts: Product[] = getLocalData('tajer_smart_products_v1', []);
      const updatedProducts = allProducts.map(p => {
        const cartMatch = cart.find(ci => ci.product.id === p.id);
        if (cartMatch) {
          return {
            ...p,
            stock_quantity: p.stock_quantity + cartMatch.quantity,
            cost_price: cartMatch.unitPrice,
            last_purchased_at: new Date().toISOString(),
          };
        }
        return p;
      });

      // 3. تحديث دين المورد
      const allContacts: Contact[] = getLocalData('tajer_smart_contacts_v1', []);
      const updatedContacts = allContacts.map(c => {
        if (c.id === selectedContact.id && debtAmount > 0) {
          return {
            ...c,
            balance: c.balance - debtAmount, // الدين للمورد سالب
          };
        }
        return c;
      });

      // 4. حفظ المعاملات والوصل
      const updatedTx = [newTx, ...transactions];
      const receipt = {
        id: generateReceiptNumber(),
        receipt_type: 'PURCHASE' as const,
        contact_id: selectedContact.id,
        contact_name: selectedContact.name,
        contact_phone: selectedContact.phone,
        items: txItems,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        debt_amount: debtAmount,
        note: note.trim() || undefined,
        created_at: newTx.created_at,
      };

      saveReceipt(receipt);
      setLocalData('tajer_smart_products_v1', updatedProducts);
      setLocalData('tajer_smart_contacts_v1', updatedContacts);
      setLocalData('tajer_smart_transactions_v1', updatedTx);

      setProducts(updatedProducts);
      setContacts(updatedContacts.filter(c => c.type === 'supplier'));
      setTransactions(updatedTx);
      setCart([]);
      setPaidAmount(0);
      setNote('');

      toast(debtAmount > 0 ? `✅ تم تسجيل الشراء من ${selectedContact.name} — دين للمورد: ${fmt(debtAmount)} د.ج` : `✅ تم تسجيل الشراء وزيادة المخزون بنجاح!`);

      if (shouldPrint) {
        printThermalReceipt(receipt);
      }
    } catch (e: any) {
      toast('حدث خطأ أثناء حفظ الشراء: ' + e.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-4 rounded-2xl text-white shadow-lg">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all">
            <ArrowRight size={20} />
          </Link>
          <div>
            <h1 className="text-lg font-black flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-400" />
              الشراء السريع وتجهيز البضاعة 🛒
            </h1>
            <p className="text-xs text-indigo-200 font-bold">شراء عدة منتجات من الموردين وتحديث المخزون والدين دفعة واحدة</p>
          </div>
        </div>
      </div>

      {/* ── 🚚 1. اختيار المورد (الموردين فقط) ── */}
      <div className="glass-card p-4 space-y-3 border border-indigo-200/80 bg-indigo-50/30">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
            <UserCheck size={16} className="text-indigo-600" />
            اختيار المورد (الموردين المسجلين فقط): <span className="text-rose-600">*</span>
          </label>
          <button
            type="button"
            onClick={() => setShowAddSupplier(true)}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-sm transition-all"
          >
            <UserPlus size={14} /> إضافة مورد جديد
          </button>
        </div>

        <SearchableSelect
          options={contacts.map(c => ({
            id: c.id,
            label: c.name,
            sublabel: c.phone ? `📞 ${c.phone}` : 'بدون هاتف',
            badge: c.balance < 0 ? `له علينا: ${fmt(Math.abs(c.balance))} د.ج` : c.balance > 0 ? `عليه لنا: ${fmt(c.balance)} د.ج` : 'حساب مصفى',
          }))}
          value={selectedSupplierId}
          onChange={setSelectedSupplierId}
          placeholder="ابحث عن اسم المورد برقم الهاتف أو الاسم..."
        />
      </div>

      {/* مودال إضافة مورد جديد */}
      {showAddSupplier && (
        <div className="modal-overlay">
          <div className="modal-sheet max-w-sm">
            <div className="modal-header">
              <h3 className="font-black text-sm text-slate-800">إضافة مورد جديد 🚚</h3>
              <button onClick={() => setShowAddSupplier(false)} className="btn btn-ghost p-1 rounded-xl text-slate-400">✕</button>
            </div>
            <form onSubmit={handleCreateSupplier} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">اسم المورد أو الشركة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة البركة للتوزيع"
                  value={newSuppName}
                  onChange={e => setNewSuppName(e.target.value)}
                  className="form-input text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">رقم الهاتف (اختياري)</label>
                <input
                  type="tel"
                  placeholder="0550000000"
                  value={newSuppPhone}
                  onChange={e => setNewSuppPhone(e.target.value)}
                  className="form-input text-xs font-bold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddSupplier(false)} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">إلغاء</button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-black shadow-sm">حفظ المورد</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 📦 2. البحث واختيار المنتجات للشراء ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* قسم المنتجات المتاحة (يسار في الحاسوب) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث عن المنتجات بالاسم أو الفئة لإضافتها لشحنة الشراء..."
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              className="form-input pr-9 text-xs font-bold bg-white"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredProducts.map(p => (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between space-y-2 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <p className="font-black text-xs text-slate-900 group-hover:text-indigo-700 transition-colors line-clamp-2">{p.name}</p>
                    <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md shrink-0">
                      {p.unit_type === 'pack' ? `📦 كرتونة (${p.pack_quantity || 1})` : '🥛 حبة'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">المتوفر بالمخزن: <span className="tabnum font-black text-slate-700">{p.stock_quantity}</span></p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block">سعر الجملة</span>
                    <span className="font-black text-xs text-indigo-700 tabnum">{fmt(p.cost_price)} <span className="text-[9px]">د.ج</span></span>
                  </div>
                  <div className="w-7 h-7 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white font-black flex items-center justify-center transition-all">
                    <Plus size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 🛒 3. سلة المشتريات والحساب (يمين في الحاسوب) ── */}
        <div className="lg:col-span-5 glass-card p-4 space-y-3 flex flex-col justify-between border-slate-200">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-black text-sm text-slate-800 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                شحنة مشتريات المورد ({cart.length} منتج)
              </h3>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs font-bold text-rose-600 hover:underline">
                  تفريغ السلة
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <ShoppingBag size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-500">سلة الشراء فارغة حالياً، اضغط على المنتجات لإضافتها</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {cart.map(ci => {
                  const p = ci.product;
                  const curPacks = ci.packsCount ?? Math.floor(ci.quantity / (p.pack_quantity || 1));
                  const curLoose = ci.looseCount ?? (ci.quantity % (p.pack_quantity || 1));

                  return (
                    <div key={p.id} className="p-3 rounded-2xl border border-indigo-100 bg-indigo-50/30 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-black text-xs text-slate-900 truncate flex-1">{p.name}</p>
                        <button
                          onClick={() => setCartQtyDirect(p.id, 0)}
                          className="text-rose-600 hover:text-rose-800 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-indigo-100/60 flex-wrap">
                        {/* تعديل الكمية بالكرتونة والحبة */}
                        {p.unit_type === 'pack' ? (
                          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-indigo-200">
                            <div className="text-center">
                              <span className="block text-[9px] font-black text-indigo-900 mb-0.5">📦 كرتونة</span>
                              <div className="inline-flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => updatePackLooseQty(p.id, Math.max(0, curPacks - 1), curLoose)}
                                  className="w-5 h-5 rounded bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center hover:bg-rose-100"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={curPacks}
                                  onChange={e => updatePackLooseQty(p.id, +e.target.value, curLoose)}
                                  onFocus={e => e.target.select()}
                                  className="w-9 text-center form-input py-0.5 px-0.5 font-black text-xs text-indigo-950 tabnum bg-white border-indigo-300"
                                />
                                <button
                                  type="button"
                                  onClick={() => updatePackLooseQty(p.id, curPacks + 1, curLoose)}
                                  className="w-5 h-5 rounded bg-indigo-600 text-white font-black text-xs flex items-center justify-center hover:bg-indigo-700"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <span className="text-xs font-black text-indigo-300 self-end mb-1">+</span>

                            <div className="text-center">
                              <span className="block text-[9px] font-black text-indigo-900 mb-0.5">🥛 حبة</span>
                              <div className="inline-flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => updatePackLooseQty(p.id, curPacks, Math.max(0, curLoose - 1))}
                                  className="w-5 h-5 rounded bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center hover:bg-rose-100"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={curLoose}
                                  onChange={e => updatePackLooseQty(p.id, curPacks, +e.target.value)}
                                  onFocus={e => e.target.select()}
                                  className="w-9 text-center form-input py-0.5 px-0.5 font-black text-xs text-indigo-950 tabnum bg-white border-indigo-300"
                                />
                                <button
                                  type="button"
                                  onClick={() => updatePackLooseQty(p.id, curPacks, curLoose + 1)}
                                  className="w-5 h-5 rounded bg-emerald-600 text-white font-black text-xs flex items-center justify-center hover:bg-emerald-700"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                            <button
                              onClick={() => setCartQtyDirect(p.id, ci.quantity - 1)}
                              className="w-5 h-5 rounded bg-slate-100 text-slate-700 font-black flex items-center justify-center"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={ci.quantity}
                              onChange={e => setCartQtyDirect(p.id, +e.target.value)}
                              onFocus={e => e.target.select()}
                              className="w-10 text-center form-input py-0.5 px-0 text-xs font-black tabnum"
                            />
                            <button
                              onClick={() => setCartQtyDirect(p.id, ci.quantity + 1)}
                              className="w-5 h-5 rounded bg-indigo-600 text-white font-black flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        )}

                        {/* سعر الجملة والإجمالي */}
                        <div className="text-left">
                          <div className="flex items-center gap-1 justify-end">
                            <span className="text-[10px] text-slate-400 font-bold">بسعر جملة:</span>
                            <input
                              type="number"
                              value={ci.unitPrice}
                              onChange={e => updateCartPrice(p.id, +e.target.value)}
                              onFocus={e => e.target.select()}
                              className="w-16 form-input py-0.5 px-1 text-[11px] font-black text-indigo-700 text-center tabnum bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── 💵 4. حساب فاتورة الشراء والدفع ── */}
          {cart.length > 0 && (
            <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-3 shadow-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-300">إجمالي فاتورة الشراء:</span>
                <span className="font-black text-2xl text-indigo-400 tabnum">{fmt(totalAmount)} <span className="text-xs">د.ج</span></span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">💵 المدفوع للمورد كاش:</label>
                  <input
                    type="number"
                    min="0"
                    max={totalAmount}
                    value={paidAmount}
                    onChange={e => setPaidAmount(+e.target.value)}
                    onFocus={e => e.target.select()}
                    className="form-input text-base font-black text-center text-indigo-400 bg-slate-800 border-slate-700 tabnum"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">📋 دين للمورد علينا:</label>
                  <div className={`p-2 rounded-xl text-center font-black text-base tabnum border ${
                    totalAmount - paidAmount > 0 ? 'bg-rose-950/80 text-rose-300 border-rose-800' : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                  }`}>
                    {fmt(Math.max(0, totalAmount - paidAmount))} د.ج
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">📝 ملاحظات الشراء (اختياري):</label>
                <input
                  type="text"
                  placeholder="مثال: رقم شحنة المورد أو رقم الفاتورة الورقية..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="form-input text-xs bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                />
              </div>

              {/* أزرار الحفظ والطباعة */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleExecuteBuy(false)}
                  className="py-3 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md touch-active disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  تأكيد الشراء والمخزون 📦
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleExecuteBuy(true)}
                  className="py-3 px-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 touch-active disabled:opacity-50"
                >
                  <Printer size={16} />
                  تأكيد وطباعة الوصل 🖨️
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
