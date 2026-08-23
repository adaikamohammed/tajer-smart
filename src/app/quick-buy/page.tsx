'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getLocalData, setLocalData, Product, Contact, Transaction,
  TransactionItem, saveReceipt, printThermalReceipt, generateReceiptNumber, smartMatchText
} from '@/lib/store';
import { toast } from '@/components/Toast';
import {
  ShoppingBag, Search, Plus, Minus, Trash2, Printer, CheckCircle2,
  AlertTriangle, UserPlus, ArrowRight, UserCheck, Package, DollarSign, X
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
  const [paidCurrentGoods,    setPaidCurrentGoods]    = useState<number>(0);
  const [paidPrevDebt,        setPaidPrevDebt]        = useState<number>(0);
  const [customPrevBalance,   setCustomPrevBalance]   = useState<number>(0);
  const [note,                setNote]                = useState('');
  const [productSearch,       setProductSearch]       = useState('');

  // مودال إضافة مورد جديد فورياً
  const [showAddSupplier,     setShowAddSupplier]     = useState(false);
  const [newSuppName,         setNewSuppName]         = useState('');
  const [newSuppPhone,        setNewSuppPhone]        = useState('');
  const [isSubmitting,        setIsSubmitting]        = useState(false);

  // مودال إضافة منتج جديد للمخزن لحظياً
  const [showAddProduct,     setShowAddProduct]     = useState(false);
  const [newProdName,        setNewProdName]        = useState('');
  const [newProdCategory,    setNewProdCategory]    = useState('مواد غذائية');
  const [newProdUnitType,    setNewProdUnitType]    = useState<'piece' | 'pack'>('piece');
  const [newProdPackQty,     setNewProdPackQty]     = useState<number>(12);
  const [newProdCostPrice,   setNewProdCostPrice]   = useState<number>(0);
  const [newProdRetailPrice, setNewProdRetailPrice] = useState<number>(0);
  const [newProdStockQty,    setNewProdStockQty]    = useState<number>(0);

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

  // إجمالي الفاتورة
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [cart]);

  // تحديث المدفوع كاش للبضاعة تلقائياً عند تغيير السلة
  useEffect(() => {
    setPaidCurrentGoods(totalAmount);
  }, [totalAmount]);

  // الحصيلة الكلية المتبقية للمورد
  const totalRemainingBalance = useMemo(() => {
    const unpaidGoods = Math.max(0, totalAmount - paidCurrentGoods);
    if (customPrevBalance <= 0) {
      // نحن مدينون للمورد (customPrevBalance بالسالب)
      const prevSupplierDebt = Math.abs(customPrevBalance);
      // سداد كاش للمورد (paidPrevDebt) يقلل دينه، وغير المدفوع من البضاعة الحالية يضيف لدينه
      const newSupplierDebt = (prevSupplierDebt - paidPrevDebt) + unpaidGoods;
      return -newSupplierDebt;
    } else {
      // المورد مدين لنا (رصيد لنا عنده، customPrevBalance بالموجب)
      const remainingCreditWithSupplier = (customPrevBalance - paidPrevDebt) - unpaidGoods;
      return remainingCreditWithSupplier;
    }
  }, [totalAmount, paidCurrentGoods, customPrevBalance, paidPrevDebt]);

  // إجمالي المدفوع كاش اليوم للمورد
  const totalCashToday = useMemo(() => {
    return paidCurrentGoods + paidPrevDebt;
  }, [paidCurrentGoods, paidPrevDebt]);

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
      setCart(prev => [
        ...prev,
        {
          product,
          quantity: product.unit_type === 'pack' ? (product.pack_quantity || 1) : 1,
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

  // إضافة منتج جديد للمخزن لحظياً وإضافته للسلة
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      toast('يرجى كتابة اسم المنتج', 'error');
      return;
    }
    const newP: Product = {
      id: 'p_' + Date.now(),
      name: newProdName.trim(),
      category: newProdCategory.trim() || 'عام',
      unit_type: newProdUnitType,
      pack_quantity: newProdUnitType === 'pack' ? (Number(newProdPackQty) || 1) : 1,
      cost_price: Number(newProdCostPrice) || 0,
      retail_price: Number(newProdRetailPrice) || 0,
      stock_quantity: Number(newProdStockQty) || 0,
      min_stock_alert: 5,
      created_at: new Date().toISOString(),
    };

    const allProducts: Product[] = getLocalData('tajer_smart_products_v1', []);
    const updatedAll = [newP, ...allProducts];
    setLocalData('tajer_smart_products_v1', updatedAll);

    setProducts(updatedAll);
    addToCart(newP); // إضافة أوتوماتيكية لسلة الشراء!
    setShowAddProduct(false);

    // إعادة تعيين الحقول
    setNewProdName('');
    setNewProdCostPrice(0);
    setNewProdRetailPrice(0);
    setNewProdStockQty(0);
    toast(`✅ تم إضافة المنتج "${newP.name}" للمخزن وإضافته لسلة الشراء فوراً!`);
  };

  // تنفيذ عملية الشراء
  const handleExecuteBuy = (shouldPrint: boolean) => {
    if (!selectedContact) {
      toast('⚠️ يرجى اختيار المورد أولاً', 'error');
      return;
    }
    const validCart = cart.filter(ci => ci.quantity > 0);
    if (validCart.length === 0) {
      toast('⚠️ السلة فارغة أو تحتوي فقط على منتجات بكمية 0! أضف كميات أولاً', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const validTotalAmount = validCart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const debtAmount = Math.max(0, validTotalAmount - paidCurrentGoods);
      const txItems: TransactionItem[] = validCart.map(ci => ({
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

      const previousBalance = customPrevBalance;
      const finalBalance = totalRemainingBalance;

      // 1. إنشاء المعاملة
      const newTx: Transaction = {
        id: 'tx_' + Date.now(),
        tx_type: 'PURCHASE',
        contact_id: selectedContact.id,
        contact_name: selectedContact.name,
        total_amount: validTotalAmount,
        paid_amount: totalCashToday,
        debt_amount: debtAmount,
        previous_balance: previousBalance,
        final_balance: finalBalance,
        status: debtAmount > 0 ? (totalCashToday > 0 ? 'PARTIAL' : 'DEBT') : 'PAID',
        items: txItems,
        notes: note.trim() || undefined,
        created_at: new Date().toISOString(),
      };

      // 2. زيادة كميات المخزون وتحديث سعر الجملة
      const allProducts: Product[] = getLocalData('tajer_smart_products_v1', []);
      const updatedProducts = allProducts.map(p => {
        const cartMatch = validCart.find(ci => ci.product.id === p.id);
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
        total_amount: validTotalAmount,
        paid_amount: totalCashToday,
        debt_amount: debtAmount,
        previous_balance: previousBalance,
        final_balance: finalBalance,
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
      setPaidCurrentGoods(0);
      setPaidPrevDebt(0);
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
      <div className="glass-card p-4 space-y-3 border border-indigo-200/80 bg-indigo-50/30 relative z-30">
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
          onAddNew={() => setShowAddSupplier(true)}
          addNewText="إضافة مورد جديد ➕"
        />
      </div>

      {/* ── 🔴 بانر الدين/المستحقات السابقة للمورد ── */}
      {selectedContact && Number(selectedContact.balance) !== 0 && (
        <div className={`p-3.5 rounded-2xl border-2 ${
          Number(selectedContact.balance) < 0
            ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
            : 'bg-amber-50 border-amber-300 text-amber-900'
        }`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{Number(selectedContact.balance) < 0 ? '📤' : '📥'}</span>
              <div>
                <p className="font-black text-sm">
                  {Number(selectedContact.balance) < 0
                    ? `علينا لـ ${selectedContact.name}:`
                    : `عليه لنا ${selectedContact.name}:`}
                </p>
                <p className="text-xs font-bold opacity-70">
                  {Number(selectedContact.balance) < 0
                    ? 'سيُضاف للوصل — سيعرف المورد إجمالي ما له علينا'
                    : 'مبلغ سبق للمورد أن دفعه مسبقاً'}
                </p>
              </div>
            </div>
            <span className="font-black text-2xl tabnum">
              {fmt(Math.abs(Number(selectedContact.balance)))} <span className="text-sm">د.ج</span>
            </span>
          </div>
        </div>
      )}

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

      {/* مودال إضافة منتج جديد للمخزن لحظياً */}
      {showAddProduct && (
        <div className="modal-overlay">
          <div className="modal-sheet max-w-md">
            <div className="modal-header">
              <h3 className="font-black text-sm text-slate-800">إضافة منتج جديد للمخزن لحظياً 📦</h3>
              <button onClick={() => setShowAddProduct(false)} className="btn btn-ghost p-1 rounded-xl text-slate-400">✕</button>
            </div>
            <form onSubmit={handleCreateProduct} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">اسم المنتج *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: زيت زيتون 1 لتر"
                  value={newProdName}
                  onChange={e => setNewProdName(e.target.value)}
                  className="form-input text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">الفئة / القسم</label>
                  <input
                    type="text"
                    placeholder="مواد غذائية"
                    value={newProdCategory}
                    onChange={e => setNewProdCategory(e.target.value)}
                    className="form-input text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">وحدة التعبئة والبيع</label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setNewProdUnitType('piece')}
                      className={`py-1.5 rounded-xl text-xs font-black border ${newProdUnitType === 'piece' ? 'bg-indigo-600 text-white border-transparent' : 'bg-slate-100 text-slate-700'}`}
                    >
                      حبة 🥛
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewProdUnitType('pack')}
                      className={`py-1.5 rounded-xl text-xs font-black border ${newProdUnitType === 'pack' ? 'bg-indigo-600 text-white border-transparent' : 'bg-slate-100 text-slate-700'}`}
                    >
                      كرتونة 📦
                    </button>
                  </div>
                </div>
              </div>

              {newProdUnitType === 'pack' && (
                <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200">
                  <label className="block text-xs font-black text-indigo-950 mb-1">سعة الكرتونة الواحدة (عدد الحبات)</label>
                  <input
                    type="number"
                    min="1"
                    value={newProdPackQty}
                    onChange={e => setNewProdPackQty(+e.target.value)}
                    onFocus={e => e.target.select()}
                    className="form-input text-center font-black text-sm text-indigo-950 bg-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">سعر الجملة / الشراء *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newProdCostPrice}
                    onChange={e => setNewProdCostPrice(+e.target.value)}
                    onFocus={e => e.target.select()}
                    className="form-input font-black text-xs text-indigo-700 tabnum"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">سعر التجزئة 1 *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newProdRetailPrice}
                    onChange={e => setNewProdRetailPrice(+e.target.value)}
                    onFocus={e => e.target.select()}
                    className="form-input font-black text-xs text-emerald-700 tabnum"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">الكمية الحالية المتوفرة بالمخزن</label>
                <input
                  type="number"
                  min="0"
                  value={newProdStockQty}
                  onChange={e => setNewProdStockQty(+e.target.value)}
                  onFocus={e => e.target.select()}
                  className="form-input font-black text-xs tabnum"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddProduct(false)} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">إلغاء</button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-black shadow-sm">حفظ وإضافة لسلة الشراء 🛒</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 📦 2. البحث واختيار المنتجات للشراء ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* قسم المنتجات المتاحة (يسار في الحاسوب) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث عن المنتجات بالاسم أو الفئة لإضافتها لشحنة الشراء..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="form-input pr-9 text-xs font-bold bg-white"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAddProduct(true)}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shrink-0 shadow-sm touch-active"
            >
              <Plus size={15} /> منتج جديد ➕
            </button>
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
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {cart.map(ci => {
                  const p = ci.product;
                  const curPacks = ci.packsCount ?? Math.floor(ci.quantity / (p.pack_quantity || 1));
                  const curLoose = ci.looseCount ?? (ci.quantity % (p.pack_quantity || 1));

                  return (
                    <div key={p.id} className="p-3.5 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-3 shadow-sm">
                      {/* 1. ترويسة اسم المنتج وحذفه */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="font-black text-sm text-slate-900 truncate">{p.name}</p>
                          {p.unit_type === 'pack' && (
                            <span className="text-[10px] font-black text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md shrink-0">
                              كرتونة ({p.pack_quantity || 1} حبة)
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setCartQtyDirect(p.id, 0)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-xl hover:bg-rose-50 transition-all shrink-0"
                          title="حذف المنتج من السلة"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* 2. إطار تعديل الحبات والكراتين — يمتد 100% بعرض المنتج كاملاً */}
                      {p.unit_type === 'pack' ? (
                        <div className="w-full bg-white p-2.5 rounded-2xl border border-indigo-200/80 shadow-sm">
                          <div className="grid grid-cols-2 gap-2.5 w-full">
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
                      ) : (
                        /* إطار وحدة الحبة الفردية 100% */
                        <div className="w-full bg-white p-2.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 shadow-sm">
                          <span className="text-xs font-black text-slate-700">🥛 الكمية بالحبة:</span>
                          <div className="flex items-center gap-2 flex-1 max-w-[220px]">
                            <button
                              type="button"
                              onClick={() => setCartQtyDirect(p.id, ci.quantity - 1)}
                              className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-black text-lg flex items-center justify-center hover:bg-rose-100 shrink-0"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={ci.quantity}
                              onChange={e => setCartQtyDirect(p.id, +e.target.value)}
                              onFocus={e => e.target.select()}
                              className="flex-1 min-w-0 text-center form-input py-1 px-1 font-black text-base tabnum"
                            />
                            <button
                              type="button"
                              onClick={() => setCartQtyDirect(p.id, ci.quantity + 1)}
                              className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center hover:bg-indigo-700 shrink-0"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}

                        {/* سعر الجملة والإجمالي */}
                      <div className="flex items-center justify-between pt-1 border-t border-indigo-100/80 text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">بسعر جملة:</span>
                          <input
                            type="number"
                            min="0"
                            value={ci.unitPrice}
                            onChange={e => updateCartPrice(p.id, +e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-24 form-input py-1 px-2 text-xs font-black text-indigo-800 tabnum bg-white text-center rounded-xl border border-indigo-200"
                          />
                        </div>
                        <div className="text-left font-black text-slate-900 tabnum">
                          المجموع: {fmt(ci.unitPrice * (p.unit_type === 'pack' ? (curPacks + (curLoose / (p.pack_quantity || 1))) : ci.quantity))} د.ج
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
            <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-4 shadow-xl">
              {/* قسم الشقين: البضاعة الحالية والدين السابق للمورد */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 📦 1. البضاعة الحالية والمدفوع كاش للمورد */}
                <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-300 text-xs">📦 سعر البضاعة الحالية بالسلة:</span>
                    <span className="font-black text-xl text-indigo-400 tabnum">{fmt(totalAmount)} <span className="text-xs">د.ج</span></span>
                  </div>
                  <div className="pt-2 border-t border-slate-700/80">
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">💵 كم دفعنا للبضاعة كاش الآن:</label>
                    <input
                      type="number"
                      min="0"
                      max={totalAmount}
                      value={paidCurrentGoods}
                      onChange={e => setPaidCurrentGoods(+e.target.value)}
                      className="form-input text-base font-black text-center text-indigo-400 bg-slate-900 border-slate-700 tabnum py-1.5"
                    />
                  </div>
                </div>

                {/* 📋 2. الدين السابق للمورد والتسديد منه */}
                <div className={`p-3.5 rounded-2xl border space-y-2 ${
                  customPrevBalance < 0 ? 'bg-rose-950/40 border-rose-700/80' : 'bg-slate-800/80 border-slate-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs flex items-center gap-1">
                      {customPrevBalance < 0 ? (
                        <span className="text-rose-300">🚚 دين سابق للمورد علينا (له عندنا):</span>
                      ) : customPrevBalance > 0 ? (
                        <span className="text-amber-300">📥 رصيد سابق لنا عند المورد (عليه لنا):</span>
                      ) : (
                        <span className="text-slate-300">📋 الدين السابق للمورد:</span>
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
                          customPrevBalance < 0 ? 'text-rose-300' : 'text-amber-400'
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-400">د.ج</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-700/80">
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      {customPrevBalance < 0
                        ? '💸 سداد كاش للمورد من دينه السابق الآن:'
                        : '💸 تحصيل كاش من المورد من رصيدنا عنده:'}
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

              {/* 📊 3. الحصيلة كدين متبقي إجمالي للمورد */}
              <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <span className="block text-xs font-black text-slate-200">
                    {totalRemainingBalance < 0
                      ? '🔴 الحصيلة: دين متبقي للمورد علينا (له عندنا):'
                      : totalRemainingBalance > 0
                      ? '🔵 الحصيلة: رصيد متبقي لنا عند المورد (عليه لنا):'
                      : '✅ الحصيلة: الحساب مصفى بالكامل:'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                    (مجموع البضاعة - المدفوع منها) + (الدين السابق - المسدد منه)
                  </span>
                </div>
                <div className={`px-5 py-2.5 rounded-xl font-black text-xl tabnum border shadow-md ${
                  totalRemainingBalance < 0
                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                    : totalRemainingBalance > 0
                    ? 'bg-indigo-950 text-indigo-200 border-indigo-700'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                }`}>
                  {fmt(Math.abs(totalRemainingBalance))} د.ج
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
