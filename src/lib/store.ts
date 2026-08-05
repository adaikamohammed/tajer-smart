export interface Contact {
  id: string;
  name: string;
  phone: string;
  photo_url?: string;
  location?: string;      // مكان المحل / العنوان
  category?: string;      // نوع التجارة / النشاط (مواد غذائية، مواد تنظيف، خضر وفواكه...)
  credit_limit?: number;  // سقف الدين المسموح به
  type: 'customer' | 'supplier' | 'both';
  notes?: string;
  balance: number;        // موجب = دين لنا على الزبون | سالب = مستحق علينا للمورد
  created_at: string;
}

export interface StockLog {
  id: string;
  product_id: string;
  change: number; // +20 أو -5
  note?: string;
  contact_id?: string;
  contact_name?: string;
  created_at: string;
}

export interface ProductBatch {
  id: string;
  qty: number;
  expiry_date: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  barcode?: string;
  photo_url?: string;
  category?: string;      // قسم المنتج (مشروبات، حلويات، مواد تنظيف...)
  unit_type?: 'pack' | 'piece' | 'kg' | 'liter'; // نوع الوحدة
  pack_quantity?: number; // سعة الكرتونة بالحبة (مثلاً 30 حبة للكرتونة)
  cost_price: number;     // سعر الشراء بالجملة (للكرتونة أو الوحدة)
  retail_price: number;   // سعر البيع بالتجزئة
  stock_quantity: number; // كمية المخزون بالحبة أو الكرتونة
  min_stock_alert: number;
  expiry_date?: string;   // أقرب تاريخ صلاحية
  expiry_alert_days?: number; // حد التنبيه بالصلاحية بالأيام
  batches?: ProductBatch[]; // سجل دفعات الصلاحيات المتعددة
  last_purchased_at?: string;
  last_sold_at?: string;
  created_at: string;
}

export interface TransactionItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_type?: string;
  unit_price: number; // سعر البيع التجزيئي أو سعر الشراء الإفرادي
  cost_price: number; // سعر التكلفة للجملة لحساب صافي الأرباح
}

export interface Transaction {
  id: string;
  tx_type: 'PURCHASE' | 'SALE';
  contact_id?: string;
  contact_name?: string;
  total_amount: number;
  paid_amount: number;
  debt_amount: number;
  status: 'PAID' | 'PARTIAL' | 'DEBT';
  notes?: string;
  items: TransactionItem[];
  created_at: string;
}

export interface DebtPayment {
  id: string;
  contact_id: string;
  contact_name: string;
  amount: number;
  payment_type: 'COLLECTED' | 'PAID_OUT'; // COLLECTED = تحصيل من زبون | PAID_OUT = دفع للمورد
  note?: string;
  created_at: string;
}

const DEFAULT_CONTACTS: Contact[] = [
  {
    id: 'c1',
    name: 'أحمد التاجر (مورد جملة)',
    phone: '213550123456',
    category: 'مواد غذائية',
    location: 'سوق الجملة، المحل 12',
    type: 'supplier',
    notes: 'مورد زيوت ومواد غذائية بالجملة',
    balance: -15000,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'c2',
    name: 'محمد العماري (زبون محل)',
    phone: '213661987654',
    category: 'خضر وفواكه',
    location: 'حي النصر',
    credit_limit: 10000,
    type: 'customer',
    notes: 'زبون دائم لديه دين متبقي',
    balance: 4500,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'c3',
    name: 'شركة البركة للاستيراد',
    phone: '213770112233',
    category: 'مواد تنظيف',
    location: 'المنطقة الصناعية',
    type: 'supplier',
    notes: 'مورد مواد تنظيف وحلويات',
    balance: 0,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'زيت زيتون ممتاز 1 لتر',
    category: 'مواد غذائية',
    unit_type: 'piece',
    cost_price: 800,
    retail_price: 1100,
    stock_quantity: 45,
    min_stock_alert: 10,
    expiry_date: '2027-06-01',
    expiry_alert_days: 30,
    last_purchased_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'p2',
    name: 'كرتونة بيض (30 حبة)',
    category: 'مواد غذائية',
    unit_type: 'pack',
    pack_quantity: 30,
    cost_price: 550,
    retail_price: 700,
    stock_quantity: 20,
    min_stock_alert: 5,
    expiry_date: '2026-09-15',
    expiry_alert_days: 15,
    last_purchased_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'p3',
    name: 'مشروب عصير طبيعي 1 لتر',
    category: 'مشروبات',
    unit_type: 'piece',
    cost_price: 150,
    retail_price: 220,
    stock_quantity: 60,
    min_stock_alert: 12,
    expiry_date: '2026-12-30',
    expiry_alert_days: 30,
    last_purchased_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
];

const DEFAULT_PRODUCT_CATEGORIES = ['مواد غذائية', 'مشروبات', 'حلويات', 'مواد تنظيف', 'خضر وفواكه'];

const STORAGE_KEYS = {
  CONTACTS: 'tajer_smart_contacts_v1',
  PRODUCTS: 'tajer_smart_products_v1',
  PRODUCT_CATEGORIES: 'tajer_smart_product_categories_v1',
  TRANSACTIONS: 'tajer_smart_transactions_v1',
  PAYMENTS: 'tajer_smart_payments_v1',
};

export function getLocalData<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error('Error reading localStorage:', e);
    return defaultValue;
  }
}

export function setLocalData<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Error writing localStorage:', e);
  }
}

export function getProductCategories(): string[] {
  return getLocalData(STORAGE_KEYS.PRODUCT_CATEGORIES, DEFAULT_PRODUCT_CATEGORIES);
}

export function saveProductCategory(newCat: string): string[] {
  const cats = getProductCategories();
  const trimmed = newCat.trim();
  if (trimmed && !cats.includes(trimmed)) {
    const updated = [...cats, trimmed];
    setLocalData(STORAGE_KEYS.PRODUCT_CATEGORIES, updated);
    return updated;
  }
  return cats;
}

export function initStorageIfEmpty(): void {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(STORAGE_KEYS.CONTACTS)) {
    setLocalData(STORAGE_KEYS.CONTACTS, DEFAULT_CONTACTS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    setLocalData(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCT_CATEGORIES)) {
    setLocalData(STORAGE_KEYS.PRODUCT_CATEGORIES, DEFAULT_PRODUCT_CATEGORIES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
    setLocalData(STORAGE_KEYS.TRANSACTIONS, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.PAYMENTS)) {
    setLocalData(STORAGE_KEYS.PAYMENTS, []);
  }
}

export function createWhatsAppLink(phone: string, text: string): string {
  let cleanPhone = phone.replace(/[^\d]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '213' + cleanPhone.substring(1);
  }
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

export function generateAccountStatementText(contactName: string, balance: number, transactions: Transaction[]): string {
  const dateStr = new Date().toLocaleDateString('ar-EG');
  let statusText = balance > 0 
    ? `⚠️ الرصيد المتبقي المستحق عليك (نطالبك به): ${balance.toLocaleString('en-US')} د.ج`
    : balance < 0 
    ? `✅ الرصيد المستحق لك لدينا (تطالبنا به): ${Math.abs(balance).toLocaleString('en-US')} د.ج`
    : `✅ الحساب مصفى بالكامل (0 د.ج)`;

  let msg = `🧾 *كشف حساب - التاجر المتنقل*\n`;
  msg += `👤 *العميل/المورد:* ${contactName}\n`;
  msg += `📅 *التاريخ:* ${dateStr}\n`;
  msg += `------------------------------\n`;
  msg += `${statusText}\n`;
  msg += `------------------------------\n`;
  msg += `شكراً لتعاملكم معنا! 🌹`;
  return msg;
}
