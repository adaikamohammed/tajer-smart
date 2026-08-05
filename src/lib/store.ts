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
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  barcode?: string;
  photo_url?: string;
  cost_price: number;     // سعر الشراء بالجملة
  retail_price: number;   // سعر البيع بالتجزئة
  stock_quantity: number; // كمية المخزون بالحبة
  min_stock_alert: number;
  expiry_date?: string;   // YYYY-MM-DD
  expiry_alert_days?: number; // حد التنبيه بالصلاحية بالأيام (15, 30, 60...)
  last_purchased_at?: string;
  last_sold_at?: string;
  created_at: string;
}

export interface TransactionItem {
  product_id: string;
  product_name: string;
  quantity: number;
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
    name: 'عسل سدر طبيعي 500غ',
    cost_price: 2500,
    retail_price: 3400,
    stock_quantity: 18,
    min_stock_alert: 5,
    expiry_date: '2028-01-15',
    expiry_alert_days: 60,
    last_purchased_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
  {
    id: 'p3',
    name: 'علبة شوكولاتة فاخرة 24 قطعة',
    cost_price: 1200,
    retail_price: 1700,
    stock_quantity: 8,
    min_stock_alert: 10,
    expiry_date: '2026-11-30',
    expiry_alert_days: 15,
    last_purchased_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
  {
    id: 'p4',
    name: 'تمر مجدول ممتاز 1 كغ',
    cost_price: 900,
    retail_price: 1300,
    stock_quantity: 60,
    min_stock_alert: 15,
    expiry_date: '2027-02-28',
    expiry_alert_days: 30,
    last_purchased_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
  },
];

const STORAGE_KEYS = {
  CONTACTS: 'tajer_smart_contacts_v1',
  PRODUCTS: 'tajer_smart_products_v1',
  TRANSACTIONS: 'tajer_smart_transactions_v1',
  PAYMENTS: 'tajer_smart_payments_v1',
  STOCK_LOGS: 'tajer_smart_stock_logs_v1',
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

export function initStorageIfEmpty(): void {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(STORAGE_KEYS.CONTACTS)) {
    setLocalData(STORAGE_KEYS.CONTACTS, DEFAULT_CONTACTS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    setLocalData(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
    setLocalData(STORAGE_KEYS.TRANSACTIONS, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.PAYMENTS)) {
    setLocalData(STORAGE_KEYS.PAYMENTS, []);
  }
}

export function createWhatsAppLink(phone: string, text: string): string {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

export function generateAccountStatementText(contactName: string, balance: number, transactions: Transaction[]): string {
  const dateStr = new Date().toLocaleDateString('ar-EG');
  let statusText = balance > 0 
    ? `⚠️ الرصيد المتبقي المستحق عليك: ${balance.toLocaleString('en-US')} د.ج`
    : balance < 0 
    ? `✅ الرصيد المستحق لك لدينا: ${Math.abs(balance).toLocaleString('en-US')} د.ج`
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
