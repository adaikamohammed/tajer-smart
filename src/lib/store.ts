export interface Contact {
  id: string;
  name: string;
  phone: string;
  photo_url?: string;
  location?: string;
  category?: string;
  credit_limit?: number;
  type: 'customer' | 'supplier' | 'both';
  notes?: string;
  balance: number;
  created_at: string;
}

export interface StockLog {
  id: string;
  product_id: string;
  change: number;
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
  category?: string;
  unit_type?: 'pack' | 'piece' | 'kg' | 'liter';
  pack_quantity?: number;
  cost_price: number;
  retail_price: number;
  stock_quantity: number;
  min_stock_alert: number;
  expiry_date?: string;
  expiry_alert_days?: number;
  batches?: ProductBatch[];
  last_purchased_at?: string;
  last_sold_at?: string;
  created_at: string;
}

export interface TransactionItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_type?: string;
  unit_price: number;
  cost_price: number;
}

export interface Transaction {
  id: string;
  tx_type: 'PURCHASE' | 'SALE';
  contact_id?: string;
  contact_name?: string;
  total_amount: number;
  paid_amount: number;
  debt_amount: number;
  status: 'PAID' | 'PARTIAL' | 'DEBT' | 'CANCELLED';
  notes?: string;
  items: TransactionItem[];
  created_at: string;
}

export interface DebtPayment {
  id: string;
  contact_id: string;
  contact_name: string;
  amount: number;
  payment_type: 'COLLECTED' | 'PAID_OUT';
  note?: string;
  created_at: string;
}

// ─── نوع الوصل المحفوظ في الأرشيف ────────────────────────────────────────
export type ReceiptType = 'SALE' | 'PURCHASE' | 'DEBT_PAYMENT' | 'ACCOUNT_STATEMENT';

export interface Receipt {
  id: string;
  receipt_type: ReceiptType;
  contact_id?: string;
  contact_name?: string;
  contact_phone?: string;
  items?: TransactionItem[];
  total_amount?: number;
  paid_amount?: number;
  debt_amount?: number;
  payment_amount?: number;
  payment_type?: 'COLLECTED' | 'PAID_OUT';
  balance_after?: number;
  note?: string;
  html_snapshot?: string;
  created_at: string;
}

// ─── ثوابت بيانات المتجر ────────────────────────────────────────────────
export const MERCHANT_INFO = {
  name:    'التاجر المتنقل',
  owner:   'فوزي شكيمة',
  phone:   '0662555856',
  address: 'تكسبت / الوادي',
} as const;

// ─── البيانات الافتراضية ─────────────────────────────────────────────────
const DEFAULT_CONTACTS: Contact[] = [
  { id: 'c_seed_1', name: 'أحمد التاجر (مورد جملة مواد غذائية)', phone: '0550123456', type: 'supplier', category: 'مواد غذائية', location: 'الرباح / الوادي', balance: -45000, notes: 'مورد أساسي للزيوت والمواد الغذائية بالجملة', created_at: new Date(Date.now() - 86400000 * 15).toISOString() },
  { id: 'c_seed_2', name: 'محمد العماري (محل البركة)', phone: '0661987654', type: 'customer', category: 'مواد غذائية', location: 'تكسبت / الوادي', balance: 12500, credit_limit: 30000, notes: 'زبون دائم بالتقسيط الأسبوعي', created_at: new Date(Date.now() - 86400000 * 12).toISOString() },
  { id: 'c_seed_3', name: 'شركة التمر الذهبي (مورد تمور)', phone: '0770112233', type: 'supplier', category: 'خضر وفواكه', location: 'طولقة / بسكرة', balance: -18000, notes: 'مورد دقلة نور ممتاز كارتون', created_at: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: 'c_seed_4', name: 'كريم البقال (حي السلام)', phone: '0540998877', type: 'customer', category: 'مواد غذائية', location: 'حي السلام / الوادي', balance: 8400, credit_limit: 20000, notes: 'محل بقالة حي السلام', created_at: new Date(Date.now() - 86400000 * 8).toISOString() },
  { id: 'c_seed_5', name: 'سفيان المنصوري (مطعم النخيل)', phone: '0655443322', type: 'customer', category: 'مشروبات', location: 'وسط المدينة', balance: 15200, credit_limit: 40000, notes: 'طلب أسبوعي عصائر وزيوت', created_at: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: 'c_seed_6', name: 'مؤسسة الزيوت الذهبية', phone: '0780223344', type: 'supplier', category: 'مواد غذائية', location: 'حاسي مسعود', balance: 0, notes: 'مورد زيوت نباتية وزيت زيتون', created_at: new Date(Date.now() - 86400000 * 6).toISOString() },
  { id: 'c_seed_7', name: 'عبد القادر بوعافية (بقال الرباح)', phone: '0560778899', type: 'customer', category: 'مواد غذائية', location: 'الرباح', balance: 6300, created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 'c_seed_8', name: 'مراد الحلواني (مخبزة الأمل)', phone: '0670334455', type: 'customer', category: 'حلويات', location: 'شارع 1 نوفمبر', balance: 9800, created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: 'c_seed_9', name: 'شركة مياه سيدي حزام', phone: '0790445566', type: 'supplier', category: 'مشروبات', location: 'باتنة', balance: -32000, notes: 'شاحنة توزيع المياه والعصائر', created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 'c_seed_10', name: 'ياسين العروسي (زبون تجزئة)', phone: '0551887766', type: 'customer', category: 'مواد تنظيف', location: 'الشط', balance: 3100, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
];

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'p_seed_1', name: 'زيت زيتون ممتاز 1 لتر (عصرة أولى)', category: 'مواد غذائية', unit_type: 'pack', pack_quantity: 12, cost_price: 850, retail_price: 1150, stock_quantity: 48, min_stock_alert: 10, expiry_date: '2027-06-01', expiry_alert_days: 30, last_purchased_at: new Date(Date.now() - 86400000 * 4).toISOString(), created_at: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: 'p_seed_2', name: 'تمر دقلة نور ممتاز 1 كغ', category: 'خضر وفواكه', unit_type: 'piece', cost_price: 650, retail_price: 950, stock_quantity: 85, min_stock_alert: 15, expiry_date: '2027-02-28', expiry_alert_days: 30, last_purchased_at: new Date(Date.now() - 86400000 * 3).toISOString(), created_at: new Date(Date.now() - 86400000 * 9).toISOString() },
  { id: 'p_seed_3', name: 'عسل سدر طبيعي 500غ', category: 'مواد غذائية', unit_type: 'piece', cost_price: 2400, retail_price: 3200, stock_quantity: 14, min_stock_alert: 5, expiry_date: '2028-01-15', expiry_alert_days: 30, last_purchased_at: new Date(Date.now() - 86400000 * 2).toISOString(), created_at: new Date(Date.now() - 86400000 * 8).toISOString() },
  { id: 'p_seed_4', name: 'علبة شوكولاتة فاخرة 24 قطعة', category: 'حلويات', unit_type: 'piece', cost_price: 1300, retail_price: 1850, stock_quantity: 25, min_stock_alert: 8, expiry_date: '2026-11-30', expiry_alert_days: 20, last_purchased_at: new Date(Date.now() - 86400000 * 5).toISOString(), created_at: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: 'p_seed_5', name: 'مشروب عصير طبيعي 1 لتر', category: 'مشروبات', unit_type: 'pack', pack_quantity: 12, cost_price: 160, retail_price: 240, stock_quantity: 120, min_stock_alert: 20, expiry_date: '2026-12-30', expiry_alert_days: 30, last_purchased_at: new Date(Date.now() - 86400000 * 1).toISOString(), created_at: new Date(Date.now() - 86400000 * 6).toISOString() },
  { id: 'p_seed_6', name: 'معجون طماطم 800غ', category: 'مواد غذائية', unit_type: 'pack', pack_quantity: 24, cost_price: 190, retail_price: 270, stock_quantity: 72, min_stock_alert: 15, expiry_date: '2027-08-15', expiry_alert_days: 30, last_purchased_at: new Date(Date.now() - 86400000 * 4).toISOString(), created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 'p_seed_7', name: 'مسحوق غسيل ممتاز 3 كغ', category: 'مواد تنظيف', unit_type: 'piece', cost_price: 820, retail_price: 1100, stock_quantity: 30, min_stock_alert: 6, expiry_date: '2028-05-01', expiry_alert_days: 30, last_purchased_at: new Date(Date.now() - 86400000 * 2).toISOString(), created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: 'p_seed_8', name: 'جبن مفروم فاخر 1 كغ', category: 'مواد غذائية', unit_type: 'piece', cost_price: 1100, retail_price: 1500, stock_quantity: 18, min_stock_alert: 5, expiry_date: '2026-10-20', expiry_alert_days: 15, last_purchased_at: new Date(Date.now() - 86400000 * 1).toISOString(), created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 'p_seed_9', name: 'ماء معدني طبيعي 1.5 لتر', category: 'مشروبات', unit_type: 'pack', pack_quantity: 6, cost_price: 32, retail_price: 45, stock_quantity: 180, min_stock_alert: 30, expiry_date: '2027-11-01', expiry_alert_days: 30, last_purchased_at: new Date(Date.now() - 86400000 * 1).toISOString(), created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'p_seed_10', name: 'أرز بسمتي فاخر 1 كغ', category: 'مواد غذائية', unit_type: 'piece', cost_price: 280, retail_price: 390, stock_quantity: 65, min_stock_alert: 10, expiry_date: '2027-09-30', expiry_alert_days: 30, last_purchased_at: new Date(Date.now() - 86400000 * 2).toISOString(), created_at: new Date(Date.now() - 86400000 * 1).toISOString() },
];

const DEFAULT_PRODUCT_CATEGORIES = ['مواد غذائية', 'مشروبات', 'حلويات', 'مواد تنظيف', 'خضر وفواكه'];

const DEFAULT_TRANSACTIONS: Transaction[] = [
  { id: 'tx_seed_1', tx_type: 'SALE', contact_id: 'c_seed_2', contact_name: 'محمد العماري (محل البركة)', total_amount: 13800, paid_amount: 5000, debt_amount: 8800, status: 'PARTIAL', items: [{ product_id: 'p_seed_1', product_name: 'زيت زيتون ممتاز 1 لتر (عصرة أولى)', quantity: 8, unit_price: 1150, cost_price: 850 }, { product_id: 'p_seed_2', product_name: 'تمر دقلة نور ممتاز 1 كغ', quantity: 4, unit_price: 950, cost_price: 650 }], created_at: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: 'tx_seed_2', tx_type: 'SALE', contact_id: 'c_seed_4', contact_name: 'كريم البقال (حي السلام)', total_amount: 8400, paid_amount: 0, debt_amount: 8400, status: 'DEBT', items: [{ product_id: 'p_seed_5', product_name: 'مشروب عصير طبيعي 1 لتر', quantity: 20, unit_price: 240, cost_price: 160 }, { product_id: 'p_seed_6', product_name: 'معجون طماطم 800غ', quantity: 13, unit_price: 270, cost_price: 190 }], created_at: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: 'tx_seed_3', tx_type: 'PURCHASE', contact_id: 'c_seed_1', contact_name: 'أحمد التاجر (مورد جملة مواد غذائية)', total_amount: 45000, paid_amount: 0, debt_amount: 45000, status: 'DEBT', items: [{ product_id: 'p_seed_1', product_name: 'زيت زيتون ممتاز 1 لتر (عصرة أولى)', quantity: 36, unit_price: 850, cost_price: 850 }, { product_id: 'p_seed_6', product_name: 'معجون طماطم 800غ', quantity: 75, unit_price: 190, cost_price: 190 }], created_at: new Date(Date.now() - 86400000 * 1).toISOString() },
  { id: 'tx_seed_4', tx_type: 'SALE', contact_id: 'c_seed_5', contact_name: 'سفيان المنصوري (مطعم النخيل)', total_amount: 15200, paid_amount: 0, debt_amount: 15200, status: 'DEBT', items: [{ product_id: 'p_seed_3', product_name: 'عسل سدر طبيعي 500غ', quantity: 4, unit_price: 3200, cost_price: 2400 }, { product_id: 'p_seed_5', product_name: 'مشروب عصير طبيعي 1 لتر', quantity: 10, unit_price: 240, cost_price: 160 }], created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'tx_seed_5', tx_type: 'PURCHASE', contact_id: 'c_seed_3', contact_name: 'شركة التمر الذهبي (مورد تمور)', total_amount: 18000, paid_amount: 0, debt_amount: 18000, status: 'DEBT', items: [{ product_id: 'p_seed_2', product_name: 'تمر دقلة نور ممتاز 1 كغ', quantity: 27, unit_price: 650, cost_price: 650 }], created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 'tx_seed_6', tx_type: 'SALE', contact_id: 'c_seed_7', contact_name: 'عبد القادر بوعافية (بقال الرباح)', total_amount: 6300, paid_amount: 0, debt_amount: 6300, status: 'DEBT', items: [{ product_id: 'p_seed_10', product_name: 'أرز بسمتي فاخر 1 كغ', quantity: 10, unit_price: 390, cost_price: 280 }, { product_id: 'p_seed_9', product_name: 'ماء معدني طبيعي 1.5 لتر', quantity: 53, unit_price: 45, cost_price: 32 }], created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: 'tx_seed_7', tx_type: 'SALE', contact_id: 'c_seed_8', contact_name: 'مراد الحلواني (مخبزة الأمل)', total_amount: 9800, paid_amount: 0, debt_amount: 9800, status: 'DEBT', items: [{ product_id: 'p_seed_4', product_name: 'علبة شوكولاتة فاخرة 24 قطعة', quantity: 4, unit_price: 1850, cost_price: 1300 }, { product_id: 'p_seed_8', product_name: 'جبن مفروم فاخر 1 كغ', quantity: 1, unit_price: 1500, cost_price: 1100 }], created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 'tx_seed_8', tx_type: 'PURCHASE', contact_id: 'c_seed_9', contact_name: 'شركة مياه سيدي حزام', total_amount: 32000, paid_amount: 0, debt_amount: 32000, status: 'DEBT', items: [{ product_id: 'p_seed_9', product_name: 'ماء معدني طبيعي 1.5 لتر', quantity: 1000, unit_price: 32, cost_price: 32 }], created_at: new Date(Date.now() - 86400000 * 6).toISOString() },
  { id: 'tx_seed_9', tx_type: 'SALE', contact_id: 'c_seed_10', contact_name: 'ياسين العروسي (زبون تجزئة)', total_amount: 3100, paid_amount: 0, debt_amount: 3100, status: 'DEBT', items: [{ product_id: 'p_seed_7', product_name: 'مسحوق غسيل ممتاز 3 كغ', quantity: 2, unit_price: 1100, cost_price: 820 }, { product_id: 'p_seed_2', product_name: 'تمر دقلة نور ممتاز 1 كغ', quantity: 1, unit_price: 900, cost_price: 650 }], created_at: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: 'tx_seed_10', tx_type: 'SALE', contact_id: 'c_seed_2', contact_name: 'محمد العماري (محل البركة)', total_amount: 3700, paid_amount: 3700, debt_amount: 0, status: 'PAID', items: [{ product_id: 'p_seed_1', product_name: 'زيت زيتون ممتاز 1 لتر (عصرة أولى)', quantity: 2, unit_price: 1150, cost_price: 850 }, { product_id: 'p_seed_8', product_name: 'جبن مفروم فاخر 1 كغ', quantity: 1, unit_price: 1400, cost_price: 1100 }], created_at: new Date().toISOString() },
];

const STORAGE_KEYS = {
  CONTACTS:           'tajer_smart_contacts_v1',
  PRODUCTS:           'tajer_smart_products_v1',
  PRODUCT_CATEGORIES: 'tajer_smart_product_categories_v1',
  TRANSACTIONS:       'tajer_smart_transactions_v1',
  PAYMENTS:           'tajer_smart_payments_v1',
  RECEIPTS:           'tajer_smart_receipts_v1',
};

export function sanitizeContact(c: any): Contact {
  return {
    ...c,
    balance: Number(c.balance) || 0,
    credit_limit: c.credit_limit !== undefined ? (Number(c.credit_limit) || 0) : undefined,
  };
}

export function sanitizeProduct(p: any): Product {
  let cleanExpiry = p.expiry_date;
  if (cleanExpiry && typeof cleanExpiry === 'string' && cleanExpiry.includes('T')) {
    cleanExpiry = cleanExpiry.split('T')[0];
  }
  return {
    ...p,
    cost_price: Number(p.cost_price) || 0,
    retail_price: Number(p.retail_price) || 0,
    stock_quantity: Number(p.stock_quantity) || 0,
    pack_quantity: p.pack_quantity ? (Number(p.pack_quantity) || 1) : undefined,
    min_stock_alert: Number(p.min_stock_alert) || 5,
    expiry_alert_days: Number(p.expiry_alert_days) || 30,
    expiry_date: cleanExpiry,
  };
}

export function sanitizeTransaction(t: any): Transaction {
  return {
    ...t,
    total_amount: Number(t.total_amount) || 0,
    paid_amount: Number(t.paid_amount) || 0,
    debt_amount: Number(t.debt_amount) || 0,
    items: Array.isArray(t.items) ? t.items.map((i: any) => ({
      ...i,
      quantity: Number(i.quantity) || 0,
      unit_price: Number(i.unit_price) || 0,
      cost_price: Number(i.cost_price) || 0,
    })) : [],
  };
}

// ─── دوال التخزين العامة ──────────────────────────────────────────────────
export function getLocalData<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    const parsed = JSON.parse(item);

    if (Array.isArray(parsed)) {
      if (key === STORAGE_KEYS.CONTACTS) {
        return parsed.map(sanitizeContact) as unknown as T;
      }
      if (key === STORAGE_KEYS.PRODUCTS) {
        return parsed.map(sanitizeProduct) as unknown as T;
      }
      if (key === STORAGE_KEYS.TRANSACTIONS) {
        return parsed.map(sanitizeTransaction) as unknown as T;
      }
    }
    return parsed;
  } catch (e) {
    console.error('Error reading localStorage:', e);
    return defaultValue;
  }
}

export function setLocalData<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));

    // المزامنة التلقائية السحابية مع Vercel Postgres في الخلفية
    if (key === STORAGE_KEYS.CONTACTS || key === STORAGE_KEYS.PRODUCTS || key === STORAGE_KEYS.TRANSACTIONS) {
      import('./cloud-sync').then(cs => cs.syncStoreWithVercelCloud()).catch(() => {});
    }
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

// ─── دوال أرشيف الأوصال ──────────────────────────────────────────────────
export function getReceipts(): Receipt[] {
  return getLocalData<Receipt[]>(STORAGE_KEYS.RECEIPTS, []);
}

export function saveReceipt(receipt: Receipt): void {
  const existing = getReceipts();
  const filtered = existing.filter(r => r.id !== receipt.id);
  setLocalData(STORAGE_KEYS.RECEIPTS, [receipt, ...filtered]);
}

export function deleteReceipt(id: string): void {
  const existing = getReceipts();
  setLocalData(STORAGE_KEYS.RECEIPTS, existing.filter(r => r.id !== id));
}

/** توليد رقم وصل فريد بالتاريخ والوقت والميلي ثانية */
export function generateReceiptNumber(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  const msPart   = String(now.getMilliseconds()).padStart(3, '0');
  return `INV-${datePart}-${timePart}${msPart}`;
}

// ─── محرك الطباعة الحرارية 80mm (XP-P323B) ────────────────────────────────
export function buildThermalReceiptHTML(receipt: Receipt): string {
  const fmt = (n: number) => (Number(n) || 0).toLocaleString('en-US');
  const now = new Date(receipt.created_at);
  const dateStr = now.toLocaleDateString('ar-DZ') + '  ' +
                  now.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
  const m = MERCHANT_INFO;

  const typeLabels: Record<ReceiptType, string> = {
    SALE:              'وصل بيع',
    PURCHASE:          'وصل شراء',
    DEBT_PAYMENT:      'وصل تسديد دين',
    ACCOUNT_STATEMENT: 'كشف حساب',
  };
  const typeLabel = typeLabels[receipt.receipt_type];

  // ─ جدول المنتجات ─
  let itemsHTML = '';
  if (receipt.items && receipt.items.length > 0) {
    const rows = receipt.items.map(i => `
    <tr>
      <td class="name-cell">${i.product_name}</td>
      <td>${Number(i.quantity) || 0}</td>
      <td>${fmt(i.unit_price)}</td>
      <td>${fmt((Number(i.quantity) || 0) * (Number(i.unit_price) || 0))}</td>
    </tr>`).join('');

    itemsHTML = `
    <div class="section-title">── تفاصيل البضاعة ──</div>
    <table class="items-table">
      <thead>
        <tr><th>المنتج</th><th>ك</th><th>السعر</th><th>المجموع</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="divider"></div>
    <div class="total-box">الإجمالي: ${fmt(receipt.total_amount ?? 0)} د.ج</div>
    <div class="row"><span class="label">المدفوع نقداً:</span><span class="value">${fmt(receipt.paid_amount ?? 0)} د.ج</span></div>
    ${(receipt.debt_amount ?? 0) > 0
      ? `<div class="row debt-row"><span class="label">⚠️ الدين المتبقي:</span><span class="value">${fmt(receipt.debt_amount ?? 0)} د.ج</span></div>`
      : `<div class="paid-row">✅ تم الدفع بالكامل</div>`
    }`;
  }

  // ─ وصل تسديد دين ─
  let paymentHTML = '';
  if (receipt.receipt_type === 'DEBT_PAYMENT' && receipt.payment_amount) {
    const action = receipt.payment_type === 'COLLECTED' ? 'تحصيل من الزبون' : 'سداد للمورد';
    paymentHTML = `
    <div class="section-title">── تفاصيل التسديد ──</div>
    <div class="row"><span class="label">نوع العملية:</span><span class="value">${action}</span></div>
    <div class="total-box">${fmt(receipt.payment_amount)} د.ج</div>
    ${receipt.balance_after !== undefined
      ? `<div class="row"><span class="label">الرصيد المتبقي:</span><span class="value">${fmt(Math.abs(receipt.balance_after))} د.ج</span></div>`
      : ''}
    ${receipt.note ? `<div class="row"><span class="label">ملاحظة:</span><span class="value">${receipt.note}</span></div>` : ''}`;
  }

  // ─ كشف حساب ─
  let statementHTML = '';
  if (receipt.receipt_type === 'ACCOUNT_STATEMENT' && receipt.balance_after !== undefined) {
    const bal = receipt.balance_after;
    const status = bal > 0
      ? `⚠️ نطالبه بمبلغ: ${fmt(bal)} د.ج`
      : bal < 0
      ? `🔴 يطالبنا بمبلغ: ${fmt(Math.abs(bal))} د.ج`
      : `✅ الحساب مصفى بالكامل`;
    statementHTML = `
    <div class="section-title">── ملخص الحساب ──</div>
    <div class="status-box">${status}</div>`;
  }

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
<title>${typeLabel}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@700;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }

  /* ── عرض الورقة 80mm ── */
  @page { size: 80mm auto; margin: 0mm !important; }
  html { width: 100%; background: #eee; }
  body {
    font-family: 'Cairo', 'Tahoma', sans-serif;
    direction: rtl;
    background: #fff;
    color: #000;
    width: 100%;
    max-width: 80mm;
    margin: 0 auto;
    padding: 3mm 2mm;
    font-size: 13px;
    font-weight: 700;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
  }
  @media print {
    html { background: #fff; width: 80mm !important; }
    body {
      width: 80mm !important;
      max-width: 80mm !important;
      padding: 0mm 1mm !important;
      margin: 0 !important;
      box-shadow: none !important;
      -webkit-print-color-adjust: exact;
    }
    .no-print { display: none !important; }
  }

  /* ── ترويسة المتجر ── */
  .header {
    text-align: center;
    border-bottom: 3px dashed #000;
    padding-bottom: 5px;
    margin-bottom: 6px;
  }
  .merchant-name  { font-size: 20px; font-weight: 900; line-height: 1.2; }
  .merchant-owner { font-size: 15px; font-weight: 900; margin-top: 2px; }
  .merchant-sub   { font-size: 11px; font-weight: 700; margin-top: 2px; color: #111; }

  /* ── نوع الوصل ── */
  .receipt-type {
    text-align: center;
    font-size: 17px;
    font-weight: 900;
    background: #000;
    color: #fff;
    padding: 5px 0;
    margin: 5px 0;
    letter-spacing: 1px;
  }
  .receipt-id {
    text-align: center;
    font-size: 10px;
    font-weight: 700;
    color: #333;
    margin-bottom: 3px;
    word-break: break-all;
  }

  /* ── عناصر مشتركة ── */
  .divider { border-top: 2px dashed #000; margin: 5px 0; }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
    font-size: 13px;
  }
  .label { font-weight: 700; color: #111; }
  .value { font-weight: 900; font-size: 14px; }

  /* ── صندوق الإجمالي ── */
  .total-box {
    text-align: center;
    border: 3px double #000;
    padding: 5px;
    margin: 5px 0;
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 1px;
  }

  /* ── جدول المنتجات ── */
  .section-title {
    text-align: center;
    font-size: 13px;
    font-weight: 900;
    margin: 6px 0 4px;
  }
  .items-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin: 3px 0;
  }
  .items-table th {
    background: #000;
    color: #fff;
    padding: 3px 2px;
    text-align: right;
    font-weight: 900;
    font-size: 12px;
  }
  .items-table td {
    padding: 4px 2px;
    border-bottom: 1px dashed #555;
    text-align: right;
    font-weight: 700;
    font-size: 12px;
  }
  .items-table .name-cell {
    font-weight: 900;
    max-width: 38mm;
    word-break: break-word;
  }
  .items-table tr:nth-child(even) td { background: #f0f0f0; }

  /* ── الديون والتسديد ── */
  .debt-row .value { color: #c00; font-size: 16px; }
  .paid-row {
    text-align: center;
    color: #050;
    font-weight: 900;
    font-size: 15px;
    margin: 5px 0;
  }
  .status-box {
    text-align: center;
    border: 3px solid #000;
    padding: 6px;
    font-size: 15px;
    font-weight: 900;
    margin: 5px 0;
  }

  /* ── الذيل ── */
  .footer {
    margin-top: 8px;
    border-top: 3px dashed #000;
    padding-top: 5px;
    text-align: center;
    font-size: 13px;
    font-weight: 700;
  }
  .seal {
    display: inline-block;
    border: 2px solid #000;
    padding: 2px 12px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 900;
    margin-bottom: 3px;
  }

  /* ── أزرار التحكم في الطباعة ── */
  .actions-container {
    margin-top: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .print-btn {
    display: block;
    width: 100%;
    padding: 12px;
    background: #000;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-family: 'Cairo', sans-serif;
    font-size: 15px;
    font-weight: 900;
    cursor: pointer;
    text-align: center;
    text-decoration: none;
  }
  .rawbt-btn {
    background: #15803d;
  }
</style>
<script>
  function printRawBT() {
    try {
      const clonedDoc = document.cloneNode(true);
      const noPrints = clonedDoc.querySelectorAll('.no-print');
      noPrints.forEach(el => el.remove());
      const htmlStr = clonedDoc.documentElement.outerHTML;
      const b64 = btoa(unescape(encodeURIComponent(htmlStr)));
      window.location.href = 'intent:base64,' + b64 + '#Intent;scheme=rawbt;package=ru.a41500.rawbtprinter;end;';
    } catch(e) {
      alert('خطأ في إرسال الوصل إلى RawBT: ' + e.message);
    }
  }
</script>
</head>
<body>

  <div class="header">
    <div class="merchant-name">🚛 ${m.name}</div>
    <div class="merchant-owner">${m.owner}</div>
    <div class="merchant-sub">📞 ${m.phone} | 📍 ${m.address}</div>
  </div>

  <div class="receipt-type">${typeLabel}</div>
  <div class="receipt-id">${receipt.id}</div>
  <div class="receipt-id">${dateStr}</div>

  <div class="divider"></div>

  ${receipt.contact_name ? `
  <div class="row">
    <span class="label">${receipt.receipt_type === 'PURCHASE' ? '🚚 المورد:' : '👤 الزبون:'}</span>
    <span class="value">${receipt.contact_name}</span>
  </div>
  ${receipt.contact_phone ? `<div class="row"><span class="label">📞 الهاتف:</span><span class="value">${receipt.contact_phone}</span></div>` : ''}
  <div class="divider"></div>
  ` : ''}

  ${itemsHTML}
  ${paymentHTML}
  ${statementHTML}

  <div class="footer">
    <div class="seal">✅ معتمد ومسجل</div>
    <div>شكراً لتعاملكم معنا 🌹</div>
  </div>

  <div class="actions-container no-print">
    <button class="print-btn rawbt-btn" onclick="printRawBT();">📱 طباعة مباشرة 80mm عبر RawBT (أندرويد)</button>
    <button class="print-btn" onclick="window.print();">🖨️ طباعة متصفح (PC / هاتف)</button>
  </div>
</body>
</html>`;
}

/** فتح نافذة طباعة حرارية وحفظ الوصل في الأرشيف تلقائياً */
export function printThermalReceipt(receipt: Receipt): void {
  const html = buildThermalReceiptHTML(receipt);
  // حفظ في الأرشيف
  saveReceipt({ ...receipt, html_snapshot: html });
  // فتح نافذة الطباعة
  const win = window.open('', '_blank', 'width=400,height=700');
  if (!win) {
    alert('يرجى السماح بالنوافذ المنبثقة لتمكين الطباعة');
    return;
  }
  win.document.write(html);
  win.document.close();
}

// ─── التهيئة الأولية ──────────────────────────────────────────────────────
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
    setLocalData(STORAGE_KEYS.TRANSACTIONS, DEFAULT_TRANSACTIONS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.PAYMENTS)) {
    setLocalData(STORAGE_KEYS.PAYMENTS, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.RECEIPTS)) {
    setLocalData(STORAGE_KEYS.RECEIPTS, []);
  }

  // مزامنة فورية في الخلفية مع Vercel Postgres
  import('./cloud-sync').then(cs => cs.syncStoreWithVercelCloud()).catch(() => {});
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

  const m = MERCHANT_INFO;
  let msg = `🧾 *كشف حساب — ${m.name}*\n`;
  msg += `👤 *العميل/المورد:* ${contactName}\n`;
  msg += `📅 *التاريخ:* ${dateStr}\n`;
  msg += `📞 *هاتف المتجر:* ${m.phone}\n`;
  msg += `📍 *العنوان:* ${m.address}\n`;
  msg += `——————————————————\n`;
  msg += `${statusText}\n`;
  msg += `——————————————————\n`;
  msg += `شكراً لتعاملكم معنا! 🌹`;
  return msg;
}

/** إلغاء معاملة/طلبية بالكامل وإرجاع كميات المخزون وتسوية الديون */
export function cancelTransaction(txId: string): boolean {
  const transactions: Transaction[] = getLocalData('tajer_smart_transactions_v1', []);
  const txIndex = transactions.findIndex(t => t.id === txId);
  if (txIndex === -1) return false;

  const tx = transactions[txIndex];
  if (tx.status === 'CANCELLED') return false;

  const products: Product[] = getLocalData('tajer_smart_products_v1', []);
  const contacts: Contact[] = getLocalData('tajer_smart_contacts_v1', []);

  // 1. استعادة كميات المخزون
  const updatedProducts = products.map(p => {
    const itemMatch = tx.items.find(i => i.product_id === p.id);
    if (itemMatch) {
      if (tx.tx_type === 'SALE') {
        return { ...p, stock_quantity: p.stock_quantity + itemMatch.quantity };
      } else if (tx.tx_type === 'PURCHASE') {
        return { ...p, stock_quantity: p.stock_quantity - itemMatch.quantity };
      }
    }
    return p;
  });

  // 2. تسوية ديون الزبون أو المورد
  const updatedContacts = contacts.map(c => {
    if (tx.contact_id && c.id === tx.contact_id && tx.debt_amount > 0) {
      if (tx.tx_type === 'SALE') {
        return { ...c, balance: Math.max(0, c.balance - tx.debt_amount) };
      } else if (tx.tx_type === 'PURCHASE') {
        return { ...c, balance: Math.min(0, c.balance + tx.debt_amount) };
      }
    }
    return c;
  });

  // 3. تحديث حالة المعاملة إلى CANCELLED
  const updatedTx = [...transactions];
  updatedTx[txIndex] = {
    ...tx,
    status: 'CANCELLED',
    notes: (tx.notes ? tx.notes + ' ' : '') + '[تم إلغاء الطلبية وتصفية المخزون والدين]',
  };

  setLocalData('tajer_smart_products_v1', updatedProducts);
  setLocalData('tajer_smart_contacts_v1', updatedContacts);
  setLocalData('tajer_smart_transactions_v1', updatedTx);

  return true;
}
