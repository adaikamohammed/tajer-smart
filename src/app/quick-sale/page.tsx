'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  getLocalData, setLocalData, Product, Contact, Transaction, TransactionItem,
  printThermalReceipt, generateReceiptNumber,
} from '@/lib/store';
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
  const [productSearch, setProductSearch] = useState('');
  const [cart,          setCart]          = useState<CartItem[]>([]);
  const [paidAmount,    setPaidAmount]    = useState<number>(0);
  const [note,          setNote]          = useState<string>('');
  const [isSubmitting,  setIsSubmitting]  = useState(false);

  useEffect(() => {
    const c: Contact[]     = getLocalData('tajer_smart_contacts_v1', []);
    const p: Product[]     = getLocalData('tajer_smart_products_v1', []);
    const t: Transaction[] = getLocalData('tajer_smart_transactions_v1', []);
    setContacts(c);
    setProducts(p);
    setTransactions(t);

    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    } else if (c.length > 0) {
      setSelectedCustomerId(c[0].id);
    }
  }, [initialCustomerId]);

  // الزبون المختار
  const selectedContact = useMemo(() => {
    return contacts.find(c => c.id === selectedCustomerId) || null;
  }, [contacts, selectedCustomerId]);

  // المنتجات المفلترة بالبحث
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 10);
    const q = productSearch.toLowerCase().trim();
    return products.filter(
      p => p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  // إجمالي الفاتورة
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
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

  // تنفيذ عملية البيع
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
      const txItems: TransactionItem[] = cart.map(ci => ({
        product_id: ci.product.id,
        product_name: ci.product.name,
        quantity: ci.quantity,
        unit_price: ci.unitPrice,
        cost_price: ci.product.cost_price,
      }));

      // المعاملة
      const newTx: Transaction = {
        id: 'tx_' + Date.now(),
        tx_type: 'SALE',
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

      // تحديث ديون الزبون
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

      setLocalData('tajer_smart_products_v1', updatedProducts);
      setLocalData('tajer_smart_contacts_v1', updatedContacts);
      setLocalData('tajer_smart_transactions_v1', updatedTx);

      const receiptId = generateReceiptNumber();

      if (shouldPrint) {
        printThermalReceipt({
          id: receiptId,
          receipt_type: 'SALE',
          contact_id: selectedContact.id,
          contact_name: selectedContact.name,
          contact_phone: selectedContact.phone,
          items: txItems,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          debt_amount: debtAmount,
          note: note.trim() || undefined,
          created_at: new Date().toISOString(),
        });
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
      <div className="glass-card p-4 space-y-3 border-2 border-emerald-500/20 bg-white">
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
          <select
            value={selectedCustomerId}
            onChange={e => setSelectedCustomerId(e.target.value)}
            className="form-input font-black text-sm text-slate-900 bg-slate-50 border-slate-300"
          >
            {contacts.length === 0 && <option value="">لا يوجد زبائن، أضف زبوناً</option>}
            {contacts.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.balance > 0 ? `(عقبه دين: ${fmt(c.balance)} د.ج)` : c.balance < 0 ? `(له مستحقات: ${fmt(Math.abs(c.balance))} د.ج)` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── 🔍 2. البحث عن المنتجات وفحص المخزون ── */}
      <div className="glass-card p-4 space-y-3 bg-white">
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
                  <th className="pb-2 text-center">الكمية</th>
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

                      <td className="py-2.5 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => updateCartQty(p.id, -1)}
                            className="w-6 h-6 rounded bg-slate-100 text-slate-700 font-black flex items-center justify-center hover:bg-rose-100 hover:text-rose-700"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={ci.quantity}
                            onChange={e => setCartQtyDirect(p.id, +e.target.value)}
                            className="w-10 text-center form-input py-0.5 px-0 text-xs font-black tabnum"
                          />
                          <button
                            onClick={() => updateCartQty(p.id, 1)}
                            className="w-6 h-6 rounded bg-emerald-100 text-emerald-800 font-black flex items-center justify-center hover:bg-emerald-200"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>

                      <td className="py-2.5 text-center min-w-[80px]">
                        <input
                          type="number"
                          min="0"
                          value={ci.unitPrice}
                          onChange={e => updateCartPrice(p.id, +e.target.value)}
                          className="w-20 form-input py-0.5 px-1 text-xs font-black text-emerald-700 tabnum bg-emerald-50/60 text-center"
                        />
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
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="font-bold text-slate-300 text-sm">إجمالي الفاتورة الكلي:</span>
            <span className="font-black text-3xl text-emerald-400 tabnum">{fmt(totalAmount)} <span className="text-sm">د.ج</span></span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">💵 المدفوع كاش الآن (د.ج):</label>
              <input
                type="number"
                min="0"
                max={totalAmount}
                value={paidAmount}
                onChange={e => setPaidAmount(+e.target.value)}
                className="form-input text-lg font-black text-center text-emerald-400 bg-slate-800 border-slate-700 tabnum py-2"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">📋 المتبقي كدين:</label>
              <div className={`p-2 rounded-xl text-center font-black text-lg tabnum border ${
                totalAmount - paidAmount > 0 ? 'bg-rose-950 text-rose-300 border-rose-800' : 'bg-emerald-950 text-emerald-300 border-emerald-800'
              }`}>
                {fmt(Math.max(0, totalAmount - paidAmount))} د.ج
              </div>
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
