'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  getLocalData, setLocalData, Product, Contact, Transaction, TransactionItem,
  getProductCategories, saveProductCategory,
  printThermalReceipt, generateReceiptNumber,
} from '@/lib/store';
import { queueDeletedProduct, subscribeToCloudChanges, syncStoreWithVercelCloud, clearAllStoreDataAndCloud } from '@/lib/cloud-sync';
import { toast } from '@/components/Toast';
import {
  Package, Plus, Search, X,
  Minus, Camera, Clock, BadgeCheck,
  Edit2, Trash2, Calendar, AlertTriangle,
  Receipt, ShoppingBag, Eye, History, ArrowDownRight, ArrowUpLeft,
  ArrowRight, Tag, Layers
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('en-US');

function getExpiryStatus(d?: string, alertDays: number = 30) {
  if (!d) return null;
  const cleanDate = d.includes('T') ? d.split('T')[0] : d;
  const days = Math.ceil((new Date(cleanDate).getTime() - Date.now()) / 86_400_000);
  if (days < 0)          return { label: 'منتهي الصلاحية',     cls: 'badge badge-danger',   cardCls: 'expired', barCls: 'danger' };
  if (days <= alertDays) return { label: `ينتهي خلال ${days} يوم`, cls: 'badge badge-warning', cardCls: 'low',     barCls: 'warning' };
  return                     { label: `صالح حتى ${cleanDate}`, cls: 'badge badge-success',  cardCls: 'ok',      barCls: '' };
}

function autoEmoji(name: string) {
  const n = name.toLowerCase();
  if (n.includes('زيت'))      return '🫒';
  if (n.includes('سكر'))      return '🧂';
  if (n.includes('قهوة') || n.includes('شاي')) return '☕';
  if (n.includes('عصير'))     return '🧃';
  if (n.includes('ماء'))      return '💧';
  if (n.includes('خبز'))      return '🍞';
  if (n.includes('جبن') || n.includes('جبنة')) return '🧀';
  if (n.includes('بيض'))      return '🥚';
  if (n.includes('دجاج') || n.includes('لحم')) return '🍗';
  if (n.includes('دواء') || n.includes('صيدل')) return '💊';
  return '📦';
}

export default function InventoryPage() {
  const [products,     setProducts]     = useState<Product[]>([]);
  const [contacts,     setContacts]     = useState<Contact[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories,   setCategories]   = useState<string[]>([]);

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery,    setSearchQuery]    = useState('');

  // Modals & Dedicated Subpage
  const [showAddModal,      setShowAddModal]      = useState(false);
  const [showAdjustModal,   setShowAdjustModal]   = useState(false);
  const [editingProduct,    setEditingProduct]    = useState<Product | null>(null);
  const [adjustingProduct,  setAdjustingProduct]  = useState<Product | null>(null);
  const [viewingProduct,    setViewingProduct]    = useState<Product | null>(null);
  // بانر وصل البيع بعد الخصم
  const [lastSale, setLastSale] = useState<{
    product: Product; qty: number; person: Contact | null; total: number;
  } | null>(null);

  // Form states
  const [name,             setName]             = useState('');
  const [category,         setCategory]         = useState('مواد غذائية');
  const [customCategory,   setCustomCategory]   = useState('');
  const [unitType,         setUnitType]         = useState<'pack' | 'piece' | 'kg' | 'liter'>('piece');
  const [packQuantity,     setPackQuantity]     = useState(1);
  const [costPrice,        setCostPrice]        = useState(0);
  const [retailPrice,      setRetailPrice]      = useState(0);
  const [stockQuantity,    setStockQuantity]    = useState(10);
  const [minStockAlert,    setMinStockAlert]    = useState(5);
  const [expiryDate,       setExpiryDate]       = useState('');
  const [expiryAlertDays,  setExpiryAlertDays]  = useState(30);
  const [photoUrl,         setPhotoUrl]         = useState('');

  // Adjust stock states (ربط بالمورد والزبون وحساب الكرتونة)
  const [adjustQty,       setAdjustQty]       = useState(1);
  const [adjustUnitChoice,setAdjustUnitChoice] = useState<'pack' | 'half_pack' | 'piece'>('piece');
  const [adjustType,      setAdjustType]      = useState<'add' | 'reduce'>('add');
  const [selectedPersonId,setSelectedPersonId]= useState('');

  useEffect(() => {
    const refreshData = () => {
      setProducts(getLocalData('tajer_smart_products_v1', []));
      setContacts(getLocalData('tajer_smart_contacts_v1', []));
      setTransactions(getLocalData('tajer_smart_transactions_v1', []));
      setCategories(getProductCategories());
    };
    refreshData();
    const unsubscribe = subscribeToCloudChanges(refreshData);
    return () => unsubscribe();
  }, []);

  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('حجم الصورة كبير جداً', 'warning'); return; }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhotoUrl(event.target.result as string);
        toast('تم رفع صورة المنتج بنجاح! 📷', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setName(''); setCategory('مواد غذائية'); setCustomCategory('');
    setUnitType('piece'); setPackQuantity(1);
    setCostPrice(0); setRetailPrice(0); setStockQuantity(10);
    setMinStockAlert(5); setExpiryDate(''); setExpiryAlertDays(30); setPhotoUrl('');
    setShowAddModal(true);
  };

  const openEditModal = (p: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProduct(p);
    setName(p.name); setCategory(p.category || 'مواد غذائية');
    setUnitType(p.unit_type || 'piece'); setPackQuantity(p.pack_quantity || 1);
    setCostPrice(p.cost_price); setRetailPrice(p.retail_price);
    setStockQuantity(p.stock_quantity); setMinStockAlert(p.min_stock_alert);
    setExpiryDate(p.expiry_date || ''); setExpiryAlertDays(p.expiry_alert_days || 30);
    setPhotoUrl(p.photo_url || '');
    setShowAddModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast('يرجى كتابة اسم المنتج', 'error'); return; }

    let finalCategory = category;
    if (category === 'أخرى') {
      finalCategory = customCategory.trim() || 'عام';
      const updatedCats = saveProductCategory(finalCategory);
      setCategories(updatedCats);
    }

    if (editingProduct) {
      const up = products.map(p => p.id === editingProduct.id ? {
        ...p,
        name: name.trim(), category: finalCategory,
        unit_type: unitType, pack_quantity: packQuantity > 0 ? packQuantity : 1,
        cost_price: +costPrice, retail_price: +retailPrice,
        stock_quantity: +stockQuantity, min_stock_alert: +minStockAlert,
        expiry_date: expiryDate || undefined, expiry_alert_days: +expiryAlertDays,
        photo_url: photoUrl.trim() || undefined,
      } : p);
      setProducts(up);
      setLocalData('tajer_smart_products_v1', up);
      toast('✅ تم تحديث المنتج بنجاح');
      if (viewingProduct?.id === editingProduct.id) {
        setViewingProduct(up.find(x => x.id === editingProduct.id) || null);
      }
    } else {
      const np: Product = {
        id: 'p_' + Date.now(),
        name: name.trim(), category: finalCategory,
        unit_type: unitType, pack_quantity: packQuantity > 0 ? packQuantity : 1,
        cost_price: +costPrice, retail_price: +retailPrice,
        stock_quantity: +stockQuantity, min_stock_alert: +minStockAlert,
        expiry_date: expiryDate || undefined, expiry_alert_days: +expiryAlertDays,
        photo_url: photoUrl.trim() || undefined,
        last_purchased_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      const up = [np, ...products];
      setProducts(up);
      setLocalData('tajer_smart_products_v1', up);
      toast('✅ تمت إضافة المنتج إلى المخزن');
    }
    setShowAddModal(false);
  };

  const handleDeleteProduct = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('هل أنت تأكد من حذف هذا المنتج من المخزن؟')) {
      queueDeletedProduct(id);
      const up = products.filter(p => p.id !== id);
      setProducts(up);
      setLocalData('tajer_smart_products_v1', up);
      syncStoreWithVercelCloud();
      toast('تم حذف المنتج من المخزن ومن السحابة بنجاح', 'info');
      if (viewingProduct?.id === id) setViewingProduct(null);
    }
  };

  const openAdjustModal = (p: Product, type: 'add' | 'reduce', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAdjustingProduct(p);
    setAdjustType(type);
    setAdjustQty(1);
    setAdjustUnitChoice(p.unit_type === 'pack' ? 'pack' : 'piece');
    setSelectedPersonId('');
    setShowAdjustModal(true);
  };

  const executeAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    const numQty = Number(adjustQty) || 0;
    if (!adjustingProduct || numQty <= 0) return;

    let actualPieces = numQty;
    const packQty = Number(adjustingProduct.pack_quantity) || 1;
    if (adjustingProduct.unit_type === 'pack' && packQty > 1) {
      if (adjustUnitChoice === 'pack') {
        actualPieces = numQty * packQty;
      } else if (adjustUnitChoice === 'half_pack') {
        actualPieces = numQty * Math.round(packQty / 2);
      }
    }

    const currentStock = Number(adjustingProduct.stock_quantity) || 0;
    const delta = adjustType === 'add' ? actualPieces : -actualPieces;
    const newStock = Math.max(0, currentStock + delta);
    const person = contacts.find(c => c.id === selectedPersonId);

    // إنشاء معاملة رسمية تربط الحركة بالمورد أو الزبون
    if (person) {
      const isSale = adjustType === 'reduce';
      const itemPrice = Number(isSale ? adjustingProduct.retail_price : adjustingProduct.cost_price) || 0;
      const totalAmt = itemPrice * actualPieces;

      const newTx: Transaction = {
        id: 'tx_' + Date.now(),
        tx_type: isSale ? 'SALE' : 'PURCHASE',
        contact_id: person.id,
        contact_name: person.name,
        total_amount: totalAmt,
        paid_amount: totalAmt,
        debt_amount: 0,
        status: 'PAID',
        items: [{
          product_id: adjustingProduct.id,
          product_name: adjustingProduct.name,
          quantity: actualPieces,
          unit_price: itemPrice,
          cost_price: Number(adjustingProduct.cost_price) || 0,
        }],
        created_at: new Date().toISOString(),
      };

      const upTx = [newTx, ...transactions];
      setTransactions(upTx);
      setLocalData('tajer_smart_transactions_v1', upTx);
    }

    const up = products.map(p => p.id === adjustingProduct.id ? {
      ...p,
      stock_quantity: newStock,
      last_purchased_at: adjustType === 'add' ? new Date().toISOString() : p.last_purchased_at,
      last_sold_at: adjustType === 'reduce' ? new Date().toISOString() : p.last_sold_at,
    } : p);

    setProducts(up);
    setLocalData('tajer_smart_products_v1', up);
    setShowAdjustModal(false);

    if (adjustType === 'reduce') {
      const total = actualPieces * adjustingProduct.retail_price;
      setLastSale({ product: adjustingProduct, qty: actualPieces, person: person || null, total });
      toast(`✅ تم خصم -${actualPieces} من المخزون${person ? ` (بيع لـ ${person.name})` : ''}`);
    } else {
      setLastSale(null);
      toast(`✅ تم إضافة +${actualPieces} للمخزون${person ? ` من ${person.name}` : ''}`);
    }
  };

  const sorted = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products
      .filter(p => {
        const matchCat = filterCategory === 'all' ? true : p.category === filterCategory;
        const matchSearch = p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q));
        return matchCat && matchSearch;
      })
      .sort((a, b) => {
        if (a.expiry_date && b.expiry_date) {
          return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
        }
        if (a.expiry_date) return -1;
        if (b.expiry_date) return 1;
        return a.stock_quantity - b.stock_quantity;
      });
  }, [products, searchQuery, filterCategory]);

  const lowCount     = products.filter(p => p.stock_quantity <= p.min_stock_alert).length;
  const expiredCount = products.filter(p => (getExpiryStatus(p.expiry_date, p.expiry_alert_days)?.cardCls === 'expired')).length;
  const profitPct    = (c: number, r: number) => c > 0 ? Math.round(((r - c) / c) * 100) : 0;

  /* ══ 🏛️ الصفحة الفرعية الكملة للمنتج (DEDICATED PRODUCT SUBPAGE) ══ */
  if (viewingProduct) {
    const productSales = transactions.filter(t => t.tx_type === 'SALE' && t.items.some(i => i.product_id === viewingProduct.id));
    const productPurchases = transactions.filter(t => t.tx_type === 'PURCHASE' && t.items.some(i => i.product_id === viewingProduct.id));

    return (
      <div className="space-y-4">
        <button
          onClick={() => setViewingProduct(null)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-black shadow-sm touch-active"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للمخزن 📦
        </button>

        <div className="glass-card p-5 space-y-4 border-2 border-indigo-500/30">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl shrink-0 overflow-hidden shadow-md">
              {viewingProduct.photo_url ? <img src={viewingProduct.photo_url} alt="" className="w-full h-full object-cover rounded-2xl" /> : autoEmoji(viewingProduct.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-xl text-slate-900 leading-tight truncate">{viewingProduct.name}</h2>
              {viewingProduct.category && (
                <span className="text-xs bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-md font-bold inline-block mt-1">
                  قسم: {viewingProduct.category}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <p className="text-[10px] text-emerald-700 font-bold">المخزون المتوفر</p>
              <p className="text-xl text-emerald-900 tabnum mt-0.5">{viewingProduct.stock_quantity} حبة</p>
            </div>
            <div className="p-3 bg-slate-100 border rounded-2xl">
              <p className="text-[10px] text-slate-500 font-bold">سعر الشراء (جملة)</p>
              <p className="text-base text-slate-800 tabnum mt-0.5">{fmt(viewingProduct.cost_price)} د.ج</p>
            </div>
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl">
              <p className="text-[10px] text-indigo-700 font-bold">سعر البيع (تجزئة)</p>
              <p className="text-base text-indigo-900 tabnum mt-0.5">{fmt(viewingProduct.retail_price)} د.ج</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={(e) => openEditModal(viewingProduct, e)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black text-xs border">
              تعديل بيانات المنتج ✏️
            </button>
            <button onClick={(e) => handleDeleteProduct(viewingProduct.id, e)} className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-black text-xs border border-rose-200">
              حذف المنتج 🗑️
            </button>
          </div>
        </div>

        {/* 📋 سجل المبيعات بالزبائن والتواريخ */}
        <div className="glass-card p-4 space-y-3">
          <h3 className="font-black text-sm text-slate-800 flex items-center gap-2">
            <ArrowUpLeft className="w-4 h-4 text-emerald-600" />
            سجل المبيعات (الزبائن الذين اشتروا هذا المنتج)
          </h3>
          {productSales.length === 0 ? (
            <p className="text-xs text-slate-400 font-bold p-4 bg-slate-50 rounded-xl text-center">لا توجد مبيعات مدونة لهذا المنتج بعد</p>
          ) : (
            <div className="space-y-2">
              {productSales.map(tx => {
                const item = tx.items.find(i => i.product_id === viewingProduct.id);
                return (
                  <div key={tx.id} className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex justify-between items-center text-xs font-bold">
                    <div>
                      <p className="text-emerald-950 font-black">الزبون: {tx.contact_name || 'زبون كاش'}</p>
                      <p className="text-[10px] text-emerald-600">{new Date(tx.created_at).toLocaleString('ar-EG')}</p>
                    </div>
                    <div className="text-left">
                      <span className="badge badge-success text-[10px]">الكمية: {item?.quantity}</span>
                      <p className="tabnum font-black text-emerald-800 text-xs mt-0.5">{fmt((item?.unit_price || 0) * (item?.quantity || 1))} د.ج</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 🚚 سجل التوريد بالموردين */}
        <div className="glass-card p-4 space-y-3">
          <h3 className="font-black text-sm text-slate-800 flex items-center gap-2">
            <ArrowDownRight className="w-4 h-4 text-indigo-600" />
            سجل الشراء والتوريد (الموردون)
          </h3>
          {productPurchases.length === 0 ? (
            <p className="text-xs text-slate-400 font-bold p-4 bg-slate-50 rounded-xl text-center">لا توجد مقتنيات مدونة من الموردين</p>
          ) : (
            <div className="space-y-2">
              {productPurchases.map(tx => {
                const item = tx.items.find(i => i.product_id === viewingProduct.id);
                return (
                  <div key={tx.id} className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 flex justify-between items-center text-xs font-bold">
                    <div>
                      <p className="text-indigo-950 font-black">المورد: {tx.contact_name || 'مورد نقدي'}</p>
                      <p className="text-[10px] text-indigo-600">{new Date(tx.created_at).toLocaleString('ar-EG')}</p>
                    </div>
                    <div className="text-left">
                      <span className="badge badge-indigo text-[10px]">الكمية: {item?.quantity}</span>
                      <p className="tabnum font-black text-indigo-800 text-xs mt-0.5">{fmt(tx.total_amount)} د.ج</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ══ 📦 القائمة الرئيسية للمخزن ══ */
  return (
    <div className="space-y-4">

      {/* ─── بانر وصل البيع بعد خصم المخزون (اختياري) ─── */}
      {lastSale && (
        <div className="glass-card p-4 border-2 border-emerald-400 bg-emerald-50 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛒</span>
            <div className="flex-1 min-w-0">
              <p className="font-black text-emerald-900 text-sm">
                تم خصم {lastSale.qty} من {lastSale.product.name}
              </p>
              <p className="text-xs text-emerald-700 font-bold">
                {lastSale.person ? `مبيعة لـ ${lastSale.person.name} — ` : 'جرد عادي — '}
                المبلغ: {fmt(lastSale.total)} د.ج
              </p>
            </div>
            <button onClick={() => setLastSale(null)} className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100 shrink-0">
              <X size={16} />
            </button>
          </div>
          {lastSale.person ? (
            <button
              onClick={() => {
                printThermalReceipt({
                  id:            generateReceiptNumber(),
                  receipt_type:  'SALE',
                  contact_id:    lastSale.person!.id,
                  contact_name:  lastSale.person!.name,
                  contact_phone: lastSale.person!.phone,
                  items: [{
                    product_id:   lastSale.product.id,
                    product_name: lastSale.product.name,
                    quantity:     lastSale.qty,
                    unit_price:   lastSale.product.retail_price,
                    cost_price:   lastSale.product.cost_price,
                  }],
                  total_amount: lastSale.total,
                  paid_amount:  lastSale.total,
                  debt_amount:  0,
                  created_at:   new Date().toISOString(),
                });
                setLastSale(null);
                toast('🖨️ جارٍ فتح وصل البيع الحراري...', 'success');
              }}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2"
            >
              <Receipt size={18} />
              🖨️ طباعة وصل البيع الحراري (اختياري)
            </button>
          ) : (
            <p className="text-xs text-emerald-700 font-bold text-center py-1 bg-emerald-100 rounded-xl">
              ℹ️ جرد عادي بدون زبون — لا يوجد وصل مطلوب
            </p>
          )}
        </div>
      )}

      {/* ── ملخص المخزن ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'منتج بالترتيب', val: products.length, color: 'hsl(158 64% 38%)', bg: 'hsl(158 64% 38% / 0.08)' },
          { label: 'نقص المخزون',   val: lowCount,        color: 'hsl(28 80% 40%)',  bg: 'hsl(38 92% 50% / 0.08)' },
          { label: 'منتهي الصلاح',  val: expiredCount,    color: 'hsl(351 83% 52%)', bg: 'hsl(351 83% 58% / 0.08)' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: s.bg, border: `1px solid ${s.color}30` }}>
            <p className="font-black text-2xl tabnum leading-none" style={{ color: s.color }}>{s.val}</p>
            <p className="text-[10px] font-bold mt-1" style={{ color: s.color, opacity: 0.75 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── شريط البحث والإضافة ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.5} />
          <input type="text" placeholder="ابحث عن منتج..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} className="form-input pr-9" />
        </div>
        <button onClick={openAddModal} className="btn btn-primary shrink-0 gap-1.5 py-2.5 px-4">
          <Plus size={18} strokeWidth={2.5} />
          <span>منتج جديد 📦</span>
        </button>
      </div>

      {/* ── 🏷️ فلاتر الأقسام التلقائية الملتفة flex-wrap ── */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-bold text-slate-400 ml-1">الأقسام:</span>
          <button onClick={() => setFilterCategory('all')}
            className={`px-3 py-1 rounded-xl text-xs font-black ${filterCategory === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>
            كل الأقسام
          </button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-black ${filterCategory === cat ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── قائمة المنتجات مرتبة في شبكة متجاوبة مع التابلات والكمبيوتر ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.length === 0 ? (
          <div className="empty-state">
            <Package size={40} className="opacity-25" />
            <p className="font-bold text-sm">{searchQuery ? 'لا يوجد منتج بهذا الاسم' : 'المخزن فارغ — أضف أول منتج!'}</p>
          </div>
        ) : (
          sorted.map((p) => {
            const expiry    = getExpiryStatus(p.expiry_date, p.expiry_alert_days);
            const isLow     = p.stock_quantity <= p.min_stock_alert;
            const cardState = expiry?.cardCls ?? (isLow ? 'low' : 'ok');
            const pct       = profitPct(p.cost_price, p.retail_price);
            const stockPct  = Math.min(100, Math.round((p.stock_quantity / Math.max(1, p.min_stock_alert * 4)) * 100));

            return (
              <div
                key={p.id}
                onClick={() => setViewingProduct(p)}
                className={`product-card ${cardState} cursor-pointer hover:border-emerald-500 transition-all`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 overflow-hidden bg-slate-100">
                    {p.photo_url
                      ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                      : autoEmoji(p.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-900 text-base leading-tight truncate">{p.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {p.category && <span className="badge badge-indigo text-[10px]">{p.category}</span>}
                      {expiry && <span className={expiry.cls}>{expiry.label}</span>}
                      {isLow && cardState !== 'expired' && <span className="badge badge-warning">⚠️ مخزون منخفض</span>}
                    </div>
                  </div>

                  <div className="rounded-xl px-3 py-2 text-center shrink-0 bg-emerald-50 border border-emerald-200">
                    <p className="text-[10px] font-bold text-slate-500">المخزون</p>
                    <p className="font-black text-xl tabnum text-emerald-800 leading-tight">
                      {p.stock_quantity}
                    </p>
                  </div>
                </div>

                <div className="progress-bar my-2.5">
                  <div className={`progress-bar-fill ${expiry?.barCls ?? (isLow ? 'warning' : '')}`} style={{ width: `${stockPct}%` }} />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 grid grid-cols-3 gap-1.5">
                    <div className="rounded-lg p-1.5 text-center bg-slate-100">
                      <p className="text-[10px] text-slate-400 font-semibold">جملة</p>
                      <p className="text-xs font-black text-slate-700 tabnum">{fmt(p.cost_price)}</p>
                    </div>
                    <div className="rounded-lg p-1.5 text-center bg-emerald-50">
                      <p className="text-[10px] font-semibold text-emerald-600">تجزئة</p>
                      <p className="text-xs font-black tabnum text-emerald-800">{fmt(p.retail_price)}</p>
                    </div>
                    <div className="rounded-lg p-1.5 text-center bg-indigo-50">
                      <p className="text-[10px] font-semibold text-indigo-600">ربح</p>
                      <p className="text-xs font-black tabnum text-indigo-800">+{pct}%</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={(e) => openAdjustModal(p, 'reduce', e)} className="w-8 h-8 rounded-xl flex items-center justify-center touch-active bg-slate-200 text-slate-700 font-black">
                      <Minus size={14} />
                    </button>
                    <button onClick={(e) => openAdjustModal(p, 'add', e)} className="w-8 h-8 rounded-xl flex items-center justify-center touch-active text-white font-black shadow-sm" style={{ background: 'var(--grad-emerald)' }}>
                      <Plus size={14} />
                    </button>
                    <button onClick={(e) => openEditModal(p, e)} className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200">
                      <Edit2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-emerald-700">
                  <span className="flex items-center gap-1"><History size={12} /> اضغط لاستعراض سجل الحركة بالكامل</span>
                  <span>👈</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ══ Modal إضافة / تعديل منتج ══ */}
      {showAddModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-header">
              <h3 className="font-black text-slate-800 text-base">
                {editingProduct ? 'تعديل منتج في المخزن' : 'إضافة منتج جديد'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost p-2 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="modal-body space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">📝 اسم المنتج *</label>
                <input type="text" required placeholder="مثال: زيت زيتون 1 لتر..."
                  value={name} onChange={e => setName(e.target.value)} className="form-input" />
              </div>

              {/* 🏷️ قسم الفئة */}
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">🏷️ قسم المنتج</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${category === cat ? 'bg-indigo-600 text-white border-transparent' : 'bg-slate-100 text-slate-700 border-slate-200'}`}
                    >
                      {cat}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCategory('أخرى')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${category === 'أخرى' ? 'bg-indigo-600 text-white border-transparent' : 'bg-slate-100 text-slate-700 border-slate-200'}`}
                  >
                    + قسم جديد
                  </button>
                </div>
                {category === 'أخرى' && (
                  <input
                    type="text"
                    required
                    placeholder="اكتب اسم القسم الجديد (مثلاً: حلويات، مشروبات غازية...)"
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    className="form-input mt-1"
                  />
                )}
              </div>

              {/* 📦 نوع الوحدة وسعة الكرتونة */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">📦 وحدة التعبئة والبيع</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { val: 'piece' as const, label: 'حبة 🥛' },
                      { val: 'pack'  as const, label: 'كرتونة 📦' },
                      { val: 'kg'    as const, label: 'كغ ⚖️' },
                      { val: 'liter' as const, label: 'لتر 🧴' },
                    ].map(u => (
                      <button
                        key={u.val}
                        type="button"
                        onClick={() => setUnitType(u.val)}
                        className={`py-2 rounded-xl text-xs font-black border ${unitType === u.val ? 'bg-slate-900 text-white border-transparent' : 'bg-white text-slate-700 border-slate-200'}`}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>

                {unitType === 'pack' && (
                  <div>
                    <label className="block text-xs font-black text-indigo-900 mb-1">🥚 سعة الكرتونة (كم حبة داخلها؟)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="مثال: 30 حبة للكرتونة"
                      value={packQuantity || ''}
                      onChange={e => setPackQuantity(+e.target.value)}
                      className="form-input font-black tabnum text-indigo-900"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">📷 صورة المنتج</label>
                <div className="flex items-center gap-3">
                  <label htmlFor="product-photo-upload" className="flex-1 py-3 px-3 border-2 border-dashed border-indigo-300 rounded-2xl bg-indigo-50 text-indigo-800 text-xs font-black flex items-center justify-center gap-2 cursor-pointer touch-active">
                    <Camera className="w-4 h-4 text-indigo-600" />
                    <span>التقاط أو اختيار صورة من المعرض</span>
                  </label>
                  <input id="product-photo-upload" type="file" accept="image/*" onChange={handleProductImageChange} className="hidden" />
                  {photoUrl && <img src={photoUrl} alt="معاينة" className="w-12 h-12 rounded-xl object-cover border shrink-0" />}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">سعر الجملة (د.ج) *</label>
                  <input type="number" required min="0" placeholder="800"
                    value={costPrice || ''} onChange={e => setCostPrice(+e.target.value)} className="form-input tabnum" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">سعر التجزئة (د.ج) *</label>
                  <input type="number" required min="0" placeholder="1,100"
                    value={retailPrice || ''} onChange={e => setRetailPrice(+e.target.value)}
                    className="form-input tabnum text-emerald-700" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">الكمية الحالية *</label>
                  <input type="number" required min="0"
                    value={stockQuantity} onChange={e => setStockQuantity(+e.target.value)}
                    className="form-input text-center font-black text-lg tabnum" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">حد تنبيه النقص</label>
                  <input type="number" min="1"
                    value={minStockAlert} onChange={e => setMinStockAlert(+e.target.value)}
                    className="form-input text-center tabnum" />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border rounded-2xl space-y-2">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">📅 تاريخ انتهاء الصلاحية (اختياري)</label>
                  <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="form-input" />
                </div>

                {expiryDate && (
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">⏰ حد التنبيه بالصلاحية (التنبيه قبل كم يوم؟)</label>
                    <select value={expiryAlertDays} onChange={e => setExpiryAlertDays(+e.target.value)} className="form-input">
                      <option value={15}>15 يوم قبل الانتهاء</option>
                      <option value={30}>30 يوم قبل الانتهاء</option>
                      <option value={60}>60 يوم قبل الانتهاء</option>
                    </select>
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary w-full py-4 text-base shadow-md">
                <BadgeCheck size={18} strokeWidth={2.5} />
                حفظ المنتج 📦
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══ Modal تعديل الكمية المرتبط بالأشخاص والوحدات ══ */}
      {showAdjustModal && adjustingProduct && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAdjustModal(false); }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-header">
              <h3 className="font-black text-slate-800 text-base">
                {adjustType === 'add' ? 'إضافة مخزون (توريد من مورد) 🚚' : 'خصم مخزون (بيع لزبون) 👥'}
              </h3>
              <button onClick={() => setShowAdjustModal(false)} className="btn btn-ghost p-2 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={executeAdjustStock} className="modal-body space-y-4">
              <div className="p-3 bg-slate-100 rounded-xl text-xs font-bold text-slate-800 flex justify-between">
                <span>المنتج: {adjustingProduct.name}</span>
                <span>الموجود: {adjustingProduct.stock_quantity} حبة</span>
              </div>

              {/* اختيار الشخص (المورد أو الزبون) */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {adjustType === 'add' ? 'اختر المورد (اختياري)' : 'اختر الزبون (اختياري)'}
                </label>
                <select
                  value={selectedPersonId}
                  onChange={e => setSelectedPersonId(e.target.value)}
                  className="form-input"
                >
                  <option value="">-- بدون تحديد شخص (نقدي) --</option>
                  {contacts
                    .filter(c => adjustType === 'add' ? c.type === 'supplier' || c.type === 'both' : c.type === 'customer' || c.type === 'both')
                    .map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone || 'بدون هاتف'})</option>)}
                </select>
              </div>

              {/* اختيار وحدة الكمية المضافة/المخصومة (كرتونة أو حبة) */}
              {adjustingProduct.unit_type === 'pack' && (
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">وحدة الإضافة/الخصم</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustUnitChoice('pack')}
                      className={`py-2 rounded-xl text-xs font-black border ${adjustUnitChoice === 'pack' ? 'bg-indigo-600 text-white border-transparent' : 'bg-slate-100 text-slate-700'}`}
                    >
                      📦 كرتونة كاملة
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustUnitChoice('half_pack')}
                      className={`py-2 rounded-xl text-xs font-black border ${adjustUnitChoice === 'half_pack' ? 'bg-indigo-600 text-white border-transparent' : 'bg-slate-100 text-slate-700'}`}
                    >
                      📦½ نصف كرتونة
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustUnitChoice('piece')}
                      className={`py-2 rounded-xl text-xs font-black border ${adjustUnitChoice === 'piece' ? 'bg-indigo-600 text-white border-transparent' : 'bg-slate-100 text-slate-700'}`}
                    >
                      🥛 بالحبة الفردية
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">الكمية</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={adjustQty}
                  onChange={e => setAdjustQty(+e.target.value)}
                  className="form-input text-center font-black text-2xl tabnum text-emerald-700"
                />
              </div>

              <button type="submit" className="btn btn-primary w-full py-4 text-base shadow-md">
                تأكيد العملية وتحديث الحساب ✅
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
