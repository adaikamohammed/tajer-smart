import { getEncryptedLocalData, setEncryptedLocalData } from './encryptedStore';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  photo_url?: string;
  location?: string;
  category?: string;
  credit_limit?: number;
  type: 'customer' | 'supplier';
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
  retail_price_2?: number;
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
  packs_count?: number;
  loose_count?: number;
  pack_quantity?: number;
  unit_type?: string;
  original_price?: number;
  discount_percent?: number;
  discount_amount?: number;
  unit_price: number;
  cost_price: number;
}

export interface Transaction {
  id: string;
  tx_type: 'PURCHASE' | 'SALE';
  contact_id?: string;
  contact_name?: string;
  subtotal_amount?: number;
  total_discount?: number;
  items_count?: number;
  total_pieces?: number;
  total_amount: number;
  paid_amount: number;
  debt_amount: number;
  previous_balance?: number;
  final_balance?: number;
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
export type ReceiptType = 'SALE' | 'PURCHASE' | 'DEBT_PAYMENT' | 'ACCOUNT_STATEMENT' | 'DIRECT_DEBT';

export interface Receipt {
  id: string;
  receipt_type: ReceiptType;
  contact_id?: string;
  contact_name?: string;
  contact_phone?: string;
  items?: TransactionItem[];
  subtotal_amount?: number;
  total_discount?: number;
  items_count?: number;
  total_pieces?: number;
  total_amount?: number;
  paid_amount?: number;
  debt_amount?: number;
  previous_balance?: number;
  final_balance?: number;
  payment_amount?: number;
  payment_type?: 'COLLECTED' | 'PAID_OUT';
  balance_after?: number;
  note?: string;
  html_snapshot?: string;
  created_at: string;
}

/** تحويل أي أرقام مشرقية إلى أرقام لاتينية غريبة 0123456789 */
export function toLatinDigits(str: string): string {
  if (!str) return '';
  return String(str).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
}

/** توحيد صيغة التاريخ والوقت بالأرقام اللاتينية 0123456789 */
export function formatDateLatin(dateInput: Date | string | number): string {
  const d = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? 'م' : 'ص';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${year}/${month}/${day} ${pad(hours)}:${minutes} ${ampm}`;
}

// ─── ثوابت بيانات المتجر ────────────────────────────────────────────────
export const MERCHANT_INFO = {
  name:    'التاجر المتنقل',
  owner:   'فوزي شكيمة',
  phone:   '0662555856',
  address: 'تكسبت / الوادي',
} as const;

export interface AuthUser {
  name: string;
  email: string;
  role: string;
  merchantName?: string;
  phone?: string;
  address?: string;
  loggedAt?: string;
}

export function getActiveUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('tajer_smart_user');
    if (!raw) return null;
    const text = raw.startsWith('ENC_V1:')
      ? (() => {
          try {
            const S = 'TajerSmart_Secured_Key_2026_x89!@#';
            const c = decodeURIComponent(escape(atob(raw.slice(7))));
            let r = '';
            for (let i = 0; i < c.length; i++) r += String.fromCharCode(c.charCodeAt(i) ^ S.charCodeAt(i % S.length));
            return r;
          } catch { return ''; }
        })()
      : raw;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function getActiveUserEmail(): string {
  const user = getActiveUser();
  return user?.email?.trim().toLowerCase() || 'admin213@gmail.com';
}

export function getMerchantInfo() {
  const email = getActiveUserEmail();
  if (email === 'tajer@gmail.com') {
    const u = getActiveUser();
    return {
      name:    u?.merchantName || 'متجر التاجر',
      owner:   u?.name || 'تاجر تجريبي',
      phone:   u?.phone || '0550000000',
      address: u?.address || 'الجزائر',
    };
  }
  return MERCHANT_INFO;
}

// مفاتيح عامة لا يتم عزلها لكل مستخدم (تخص التطبيق نفسه أو جلسة الدخول)
const GLOBAL_UNSCOPED_KEYS = new Set([
  'tajer_smart_user',
  'tajer_smart_logged_in',
  'pwa_installed_dismissed',
]);

export function resolveUserScopedKey(key: string): string {
  if (GLOBAL_UNSCOPED_KEYS.has(key)) return key;
  const email = getActiveUserEmail();
  // حساب فوزي شكيمة الأصلي يحتفظ بمفاتيحه الأصلية تماماً 100% دون أي تعديل أو مساس
  if (email === 'admin213@gmail.com') {
    return key;
  }
  const slug = email.replace(/[^a-zA-Z0-9]/g, '_');
  return `${key}__u_${slug}`;
}

// ─── البيانات الافتراضية الفارغة (تم حذف البيانات التجريبية الوهمية كلياً) ─
const DEFAULT_CONTACTS: Contact[] = [];
const DEFAULT_PRODUCTS: Product[] = [];
const DEFAULT_PRODUCT_CATEGORIES = ['مواد غذائية', 'مواد تنظيف'];
const DEFAULT_TRANSACTIONS: Transaction[] = [];

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
  const packQty = p.pack_quantity !== undefined && p.pack_quantity !== null
    ? (Number(p.pack_quantity) || 1)
    : (p.unit_type === 'pack' ? 1 : undefined);

  return {
    ...p,
    cost_price: Number(p.cost_price) || 0,
    retail_price: Number(p.retail_price) || 0,
    retail_price_2: p.retail_price_2 !== undefined && p.retail_price_2 !== null
      ? (Number(p.retail_price_2) || 0)
      : undefined,
    stock_quantity: Number(p.stock_quantity) || 0,
    pack_quantity: packQty,
    min_stock_alert: Number(p.min_stock_alert) || 5,
    expiry_alert_days: Number(p.expiry_alert_days) || 30,
    expiry_date: cleanExpiry,
  };
}

export function sanitizeTransaction(t: any): Transaction {
  return {
    ...t,
    subtotal_amount: t.subtotal_amount !== undefined ? Number(t.subtotal_amount) : undefined,
    total_discount: t.total_discount !== undefined ? Number(t.total_discount) : undefined,
    items_count: t.items_count !== undefined ? Number(t.items_count) : undefined,
    total_pieces: t.total_pieces !== undefined ? Number(t.total_pieces) : undefined,
    total_amount: Number(t.total_amount) || 0,
    paid_amount: Number(t.paid_amount) || 0,
    debt_amount: Number(t.debt_amount) || 0,
    previous_balance: t.previous_balance !== undefined ? Number(t.previous_balance) : undefined,
    final_balance: t.final_balance !== undefined ? Number(t.final_balance) : undefined,
    items: Array.isArray(t.items) ? t.items.map((i: any) => ({
      ...i,
      quantity: Number(i.quantity) || 0,
      original_price: i.original_price !== undefined ? Number(i.original_price) : undefined,
      discount_percent: i.discount_percent !== undefined ? Number(i.discount_percent) : undefined,
      discount_amount: i.discount_amount !== undefined ? Number(i.discount_amount) : undefined,
      unit_price: Number(i.unit_price) || 0,
      cost_price: Number(i.cost_price) || 0,
      packs_count: i.packs_count !== undefined ? Number(i.packs_count) : undefined,
      loose_count: i.loose_count !== undefined ? Number(i.loose_count) : undefined,
      pack_quantity: i.pack_quantity !== undefined ? (Number(i.pack_quantity) || 1) : undefined,
      unit_type: i.unit_type || undefined,
    })) : [],
  };
}

// ─── In-Memory Cache — تسريع القراءة المتكررة ────────────────────────────────
// نخزّن النتيجة بعد أول قراءة/فك تشفير ونعيدها مباشرةً في الاستدعاءات التالية.
// يُمسح الكاش تلقائياً عند أي setLocalData حتى تظل البيانات متسقة.
const _memCache = new Map<string, { data: unknown; ts: number }>();
const _CACHE_TTL = 30_000; // 30 ثانية كحد أقصى قبل إجبار القراءة من localStorage

function _cacheGet<T>(key: string): T | undefined {
  const entry = _memCache.get(key);
  if (entry && Date.now() - entry.ts < _CACHE_TTL) return entry.data as T;
  return undefined;
}
function _cacheSet(key: string, data: unknown) {
  _memCache.set(key, { data, ts: Date.now() });
}
// يُصدَّر ليستخدمه cloud-sync عند استلام بيانات السحابة أو عند تسجيل الدخول/الخروج
export function clearLocalDataCache(key?: string) {
  if (key) {
    _memCache.delete(key);
    _memCache.delete(resolveUserScopedKey(key));
  } else {
    _memCache.clear();
  }
}

// ─── دوال التخزين العامة (المشفرة أمنياً بدقة والمعزولة لكل تاجر) ─────────────
export function getLocalData<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;

  const scopedKey = resolveUserScopedKey(key);

  // ✅ إعادة من الكاش إذا كانت البيانات حديثة
  const cached = _cacheGet<T>(scopedKey);
  if (cached !== undefined) return cached;

  try {
    const parsed = getEncryptedLocalData<T>(scopedKey, defaultValue);

    let result: T;
    if (Array.isArray(parsed)) {
      const cleanArray = parsed.filter((item: any) => !item.id || !String(item.id).includes('_seed_'));
      if (key.startsWith(STORAGE_KEYS.CONTACTS)) {
        result = cleanArray.map(sanitizeContact) as unknown as T;
      } else if (key.startsWith(STORAGE_KEYS.PRODUCTS)) {
        result = cleanArray.map(sanitizeProduct) as unknown as T;
      } else if (key.startsWith(STORAGE_KEYS.TRANSACTIONS)) {
        result = cleanArray.map(sanitizeTransaction) as unknown as T;
      } else {
        result = cleanArray as unknown as T;
      }
    } else {
      result = parsed;
    }

    // تخزين في الكاش لتجنب إعادة فك التشفير
    _cacheSet(scopedKey, result);
    return result;
  } catch (e) {
    console.error('Error reading encrypted local storage:', e);
    return defaultValue;
  }
}

export function setLocalData<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  const scopedKey = resolveUserScopedKey(key);
  try {
    // تحديث الكاش فوراً حتى تقرأ الصفحات البيانات الجديدة مباشرة بدون localStorage
    _cacheSet(scopedKey, value);
    // حفظ مشفر في التخزين المحلي بدون استدعاء لانهائي للمزامنة
    setEncryptedLocalData<T>(scopedKey, value);
  } catch (e) {
    console.error('Error writing encrypted local storage:', e);
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
  cancelTransaction(id);
  import('./cloud-sync').then(cs => {
    cs.queueDeletedTransaction(id);
    cs.syncStoreWithVercelCloud();
  });
}

/** توليد رقم وصل فريد بالتاريخ والوقت والميلي ثانية */
export function generateReceiptNumber(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  const msPart   = String(now.getMilliseconds()).padStart(3, '0');
  const email = getActiveUserEmail();
  const prefix = email === 'admin213@gmail.com' ? '' : 'T-';
  return `INV-${prefix}${datePart}-${timePart}${msPart}`;
}

// ─── توليد باركود Code 128 بصيغة SVG نقي بدون مكتبات خارجية ────────────────
export function generateBarcodeSVG(text: string): string {
  if (!text) return '';
  const clean = text.replace(/[^\x20-\x7E]/g, '');
  if (!clean) return '';

  const CODE128_PATTERNS = [
    '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213',
    '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
    '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
    '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
    '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
    '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
    '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
    '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
    '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
    '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
    '114131','311141','411131','211412','211214','211232','2331112'
  ];

  const START_B = 104;
  const STOP = 106;
  let checksum = START_B;
  const codes: number[] = [START_B];

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32;
    codes.push(code);
    checksum += code * (i + 1);
  }
  codes.push(checksum % 103);
  codes.push(STOP);

  let patternStr = '';
  for (const c of codes) {
    if (c >= 0 && c < CODE128_PATTERNS.length) {
      patternStr += CODE128_PATTERNS[c];
    }
  }

  let totalModules = 0;
  for (let i = 0; i < patternStr.length; i++) {
    totalModules += parseInt(patternStr[i], 10);
  }

  const barHeight = 44;
  const moduleWidth = 2;
  const totalSvgWidth = totalModules * moduleWidth;

  let currentX = 0;
  let rects = '';
  let isBar = true;

  for (let i = 0; i < patternStr.length; i++) {
    const w = parseInt(patternStr[i], 10) * moduleWidth;
    if (isBar) {
      rects += `<rect x="${currentX}" y="0" width="${w}" height="${barHeight}" fill="#000"/>`;
    }
    currentX += w;
    isBar = !isBar;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSvgWidth} ${barHeight}" width="180" height="42" style="display:block;margin:0 auto;">${rects}</svg>`;
}

// ─── محرك الطباعة الحرارية 80mm (XP-P323B) ────────────────────────────────
export function buildThermalReceiptHTML(receipt: Receipt): string {
  const fmt = (n: number) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateStr = formatDateLatin(receipt.created_at);
  const m = getMerchantInfo();

  const typeLabels: Record<ReceiptType, string> = {
    SALE:              'وصل بيع',
    PURCHASE:          'وصل شراء',
    DEBT_PAYMENT:      'وصل تسديد دين',
    ACCOUNT_STATEMENT: 'كشف حساب',
    DIRECT_DEBT:       'وصل دين مباشر',
  };
  // إذا كانت العملية دين مباشر (product_id = p_debt أو receipt_type = DIRECT_DEBT)
  const isDirectDebt = receipt.receipt_type === 'DIRECT_DEBT' || (receipt.items && receipt.items.length === 1 && receipt.items[0].product_id === 'p_debt');
  const typeLabel = isDirectDebt ? 'وصل دين مباشر' : (typeLabels[receipt.receipt_type] || 'وصل');

  // ─ وصل دين مباشر (بدون جدول بضاعة) ─
  let directDebtHTML = '';
  if (isDirectDebt && receipt.items && receipt.items.length > 0) {
    const debtItem = receipt.items[0];
    const debtAmt  = Number(debtItem.unit_price) || 0;
    const prevBal  = Number(receipt.previous_balance) || 0;
    const finalBal = receipt.final_balance !== undefined ? receipt.final_balance : prevBal + debtAmt;
    const note     = debtItem.product_name && debtItem.product_name !== 'دين مباشر' ? debtItem.product_name : '';

    let prevLabel = 'الدين القديم:';
    let finalLabel = 'الدين الجديد:';
    if (finalBal === 0) finalLabel = 'الدين الجديد: مصفى بالكامل ✅';

    directDebtHTML = `
    <div class="debt-direct-box">
      <div class="debt-label">📌 مبلغ الدين المسجَّل</div>
      <div class="debt-amount">${fmt(debtAmt)} د.ج</div>
      ${note ? `<div class="debt-note">📝 ${note}</div>` : ''}
    </div>
    <div class="summary-box">
      ${prevBal !== 0 ? `<div class="summary-row"><span class="label">${prevLabel}</span><span class="val">${fmt(Math.abs(prevBal))} د.ج</span></div>` : ''}
      <div class="summary-row total-balance-row"><span class="label">${finalLabel}</span><span class="val">${fmt(Math.abs(finalBal))} د.ج</span></div>
    </div>`;
  }

  // ─ جدول المنتجات (للبيع والشراء فقط — وليس للدين المباشر) ─
  let itemsHTML = '';
  if (!isDirectDebt && receipt.items && receipt.items.length > 0) {
    const validItems = receipt.items.filter(i => (Number(i.quantity) || 0) > 0);
    const storedProds: Product[] = getLocalData<Product[]>('tajer_smart_products_v1', []);

    let totalPacksCount = 0;
    let totalLooseCount = 0;
    let computedGrossTotal = 0;
    let computedDiscountTotal = 0;

    const rows = validItems.map(i => {
      const prodMatch = storedProds.find((p: Product) => p.id === i.product_id || p.name.trim() === i.product_name?.trim());
      const realCap = Number(i.pack_quantity || prodMatch?.pack_quantity) || 1;
      const isPackUnit = i.unit_type === 'pack' || (prodMatch && prodMatch.unit_type === 'pack') || realCap > 1 || (i.packs_count !== undefined && i.packs_count > 0);

      let packs = 0;
      let loose = 0;
      if (i.packs_count !== undefined && i.loose_count !== undefined) {
        packs = Number(i.packs_count) || 0;
        loose = Number(i.loose_count) || 0;
      } else if (isPackUnit) {
        packs = Math.floor((Number(i.quantity) || 0) / realCap);
        loose = (Number(i.quantity) || 0) % realCap;
      } else {
        packs = 0;
        loose = (Number(i.quantity) || 0);
      }

      totalPacksCount += packs;
      totalLooseCount += loose;

      const origPrice = Number(i.original_price || i.unit_price) || 0;
      const lineGross = (Number(i.quantity) || 0) * origPrice;
      const lineNet   = (Number(i.quantity) || 0) * (Number(i.unit_price) || 0);
      computedGrossTotal += lineGross;
      computedDiscountTotal += Math.max(0, lineGross - lineNet);

      const capDisplay   = isPackUnit ? `${realCap}` : '-';
      const packsDisplay = isPackUnit ? (packs > 0 ? `${packs}` : '-') : '-';
      const looseDisplay = loose > 0 ? `${loose}` : (!isPackUnit ? `${loose}` : '-');
      const hasDiscount  = (i.discount_percent && i.discount_percent > 0) || (origPrice > (Number(i.unit_price) || 0));

      return `
    <tr>
      <td class="col-name">
        ${i.product_name}
        ${hasDiscount && i.discount_percent ? `<div class="item-disc-tag">خصم %${i.discount_percent}</div>` : ''}
      </td>
      <td class="col-pack">${packsDisplay}</td>
      <td class="col-cap">${capDisplay}</td>
      <td class="col-loose">${looseDisplay}</td>
      <td class="col-price">${fmt(i.unit_price)}</td>
      <td class="col-total">${fmt(lineNet)}</td>
    </tr>`;
    }).join('');

    const currentGoods = receipt.total_amount ?? 0;
    const grossTotal = receipt.subtotal_amount !== undefined && receipt.subtotal_amount > 0
      ? receipt.subtotal_amount
      : (computedGrossTotal > 0 ? computedGrossTotal : currentGoods);
    const totalDiscount = receipt.total_discount !== undefined && receipt.total_discount > 0
      ? receipt.total_discount
      : (computedDiscountTotal > 0 ? computedDiscountTotal : Math.max(0, grossTotal - currentGoods));

    let prevBal = receipt.previous_balance;
    let finalBal = receipt.final_balance;

    if (prevBal === undefined && receipt.contact_id) {
      const storedContacts: Contact[] = getLocalData<Contact[]>('tajer_smart_contacts_v1', []);
      const match = storedContacts.find(c => c.id === receipt.contact_id || c.name.trim() === receipt.contact_name?.trim());
      if (match) {
        prevBal = Number(match.balance) || 0;
      }
    }
    if (prevBal === undefined) prevBal = 0;

    const totalDue  = currentGoods + prevBal;
    const paidToday = receipt.paid_amount ?? 0;
    if (finalBal === undefined) {
      finalBal = totalDue - paidToday;
    }

    const unpaidFromGoods = Math.max(0, currentGoods - paidToday);

    let prevBalLabel = 'الدين القديم:';
    let paidLabel = 'المبلغ المدفوع:';
    let finalBalLabel = 'الدين الجديد:';
    if (finalBal === 0) {
      finalBalLabel = 'الدين الجديد: مصفى بالكامل ✅';
    }

    itemsHTML = `
    <table class="items-table">
      <thead>
        <tr>
          <th class="col-name">البيان</th>
          <th class="col-pack">كرتونة</th>
          <th class="col-cap">السعة</th>
          <th class="col-loose">حبة</th>
          <th class="col-price">س.الوحدة</th>
          <th class="col-total">المجموع</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <!-- ملخص الوصل (شبكة عمودين مستوحاة من الوصل المرفق) -->
    <div class="receipt-summary-grid">
      <div class="summary-col">
        <div class="summary-item"><span class="lbl">عدد السلع:</span> <span class="val bold">${validItems.length}</span></div>
        <div class="summary-item"><span class="lbl">المبلغ المدفوع:</span> <span class="val">${fmt(paidToday)}</span></div>
        <div class="summary-item"><span class="lbl">الباقي:</span> <span class="val">${fmt(unpaidFromGoods)}</span></div>
      </div>
      <div class="summary-col">
        <div class="summary-item"><span class="lbl">المجموع:</span> <span class="val">${fmt(grossTotal)}</span></div>
        <div class="summary-item"><span class="lbl">التخفيض:</span> <span class="val ${totalDiscount > 0 ? 'text-disc' : ''}">${totalDiscount > 0 ? fmt(totalDiscount) : '0.00'}</span></div>
        ${totalPacksCount > 0 ? `<div class="summary-item"><span class="lbl">الكراتين:</span> <span class="val bold">${totalPacksCount}</span></div>` : ''}
      </div>
    </div>

    <!-- صندوق المبلغ الصافي (عريض وبارز كلياً كما في صورة الوصل) -->
    <div class="net-total-banner">
      <div class="net-title">المبلغ الصافي :</div>
      <div class="net-amount">${fmt(currentGoods)} <span class="currency">د.ج</span></div>
    </div>

    ${(prevBal !== 0 || finalBal !== 0) ? `
    <div class="debt-box">
      ${prevBal !== 0 ? `<div class="debt-row"><span class="lbl">${prevBalLabel}</span><span class="val">${fmt(Math.abs(prevBal))} د.ج</span></div>` : ''}
      <div class="debt-row total-balance-row"><span class="lbl">${finalBalLabel}</span><span class="val">${fmt(Math.abs(finalBal))} د.ج</span></div>
    </div>` : ''}`;
  }

  // ─ وصل تسديد دين ─
  let paymentHTML = '';
  if (receipt.receipt_type === 'DEBT_PAYMENT' && receipt.payment_amount) {
    const action = receipt.payment_type === 'COLLECTED' ? 'تحصيل من الزبون' : 'سداد للمورد';
    const paidAmt = receipt.payment_amount;
    const finalBal = receipt.balance_after !== undefined ? receipt.balance_after : receipt.final_balance;
    const prevBal = receipt.previous_balance !== undefined 
      ? receipt.previous_balance 
      : (finalBal !== undefined 
          ? (receipt.payment_type === 'COLLECTED' ? finalBal + paidAmt : finalBal - paidAmt) 
          : 0);

    let finalBalLabel = 'الدين الجديد:';
    if (finalBal === 0) finalBalLabel = 'الدين الجديد: مصفى بالكامل ✅';

    paymentHTML = `
    <div class="section-title">── تفاصيل التسديد ──</div>
    <div class="row"><span class="label">نوع العملية:</span><span class="value">${action}</span></div>
    ${receipt.note ? `<div class="row"><span class="label">ملاحظة:</span><span class="value">${receipt.note}</span></div>` : ''}
    <div class="summary-box" style="margin-top: 10px;">
      <div class="summary-row"><span class="label">الدين القديم:</span><span class="val">${fmt(Math.abs(prevBal))} د.ج</span></div>
      <div class="summary-row"><span class="label">المبلغ المدفوع:</span><span class="val">${fmt(paidAmt)} د.ج</span></div>
      ${finalBal !== undefined ? `<div class="summary-row total-balance-row"><span class="label">${finalBalLabel}</span><span class="val">${fmt(Math.abs(finalBal))} د.ج</span></div>` : ''}
    </div>`;
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
    font-size: 15px;
    font-weight: 800;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
  }
  @media print {
    @page { size: 80mm auto; margin: 0mm !important; }
    html { background: #fff !important; width: 100% !important; }
    body {
      width: 100% !important;
      max-width: 100% !important;
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
    border-bottom: 1px solid #ddd;
    padding-bottom: 5px;
    margin-bottom: 6px;
  }
  .merchant-name  { font-size: 22px; font-weight: 900; line-height: 1.2; }
  .merchant-owner { font-size: 16px; font-weight: 900; margin-top: 2px; }
  .merchant-sub   { font-size: 12px; font-weight: 800; margin-top: 2px; color: #222; }

  /* ── نوع الوصل ── */
  .receipt-type {
    text-align: center;
    font-size: 18px;
    font-weight: 900;
    background: #000;
    color: #fff;
    padding: 5px 0;
    margin: 5px 0;
    letter-spacing: 1px;
  }
  .receipt-id {
    text-align: center;
    font-size: 11px;
    font-weight: 800;
    color: #333;
    margin-bottom: 2px;
    word-break: break-all;
  }
  .receipt-date {
    text-align: center;
    font-size: 14px;
    font-weight: 900;
    color: #000;
    margin-bottom: 5px;
  }

  /* ── عناصر مشتركة ── */
  .divider { border-top: 1px solid #ddd; margin: 4px 0; }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    font-size: 14px;
  }
  .label { font-weight: 800; color: #111; }
  .value { font-weight: 900; font-size: 15px; }

  /* ── جدول المنتجات ── */
  .section-title {
    text-align: center;
    font-size: 15px;
    font-weight: 900;
    margin: 7px 0 5px;
  }
  .items-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin: 5px 0;
    table-layout: fixed;
  }
  .items-table th {
    background: #000 !important;
    color: #ffffff !important;
    padding: 4px 0.5px;
    font-weight: 900 !important;
    font-size: 11.5px !important;
    letter-spacing: -0.3px;
    white-space: nowrap;
    overflow: visible !important;
  }
  .items-table td {
    padding: 4px 0.5px;
    border-bottom: 1px dashed #555;
    font-weight: 900;
    font-size: 11.5px;
    color: #000;
  }
  .items-table .col-name { width: 30%; text-align: right; word-break: normal; white-space: normal; line-height: 1.15; font-weight: 900; }
  .items-table .col-pack { width: 12%; text-align: center; font-weight: 900; }
  .items-table .col-cap  { width: 12%; text-align: center; font-weight: 900; color: #1e293b; }
  .items-table .col-loose{ width: 10%; text-align: center; font-weight: 900; }
  .items-table .col-price{ width: 18%; text-align: center; font-weight: 900; }
  .items-table .col-total{ width: 18%; text-align: center; font-weight: 900; }
  .items-table tr:nth-child(even) td { background: #f4f4f4; }
  .item-disc-tag { font-size: 9.5px; color: #b91c1c; font-weight: 900; margin-top: 1px; }

  /* ── شبكة ملخص الوصل (عمودين مستوحاة من الوصل المرفق) ── */
  .receipt-summary-grid {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin: 6px 0;
    padding: 6px 4px;
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
    font-size: 12.5px;
    font-weight: 800;
  }
  .summary-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .summary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .summary-item .lbl { color: #222; font-weight: 800; font-size: 12px; }
  .summary-item .val { font-weight: 900; font-size: 13px; }
  .summary-item .val.bold { font-size: 14px; }
  .text-disc { color: #b91c1c; font-weight: 900; }

  /* ── صندوق المبلغ الصافي العريض البارز ── */
  .net-total-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 3px double #000;
    border-radius: 6px;
    padding: 6px 8px;
    margin: 6px 0;
    background: #fff;
  }
  .net-title {
    font-size: 17px;
    font-weight: 900;
    color: #000;
  }
  .net-amount {
    font-size: 21px;
    font-weight: 900;
    color: #000;
    letter-spacing: 0.5px;
  }
  .net-amount .currency { font-size: 13px; }

  /* ── صندوق الديون ── */
  .debt-box {
    border: 2px solid #000;
    border-radius: 6px;
    padding: 5px 6px;
    margin: 6px 0;
    background: #fff;
  }
  .debt-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    font-weight: 800;
    padding: 3px 0;
    border-bottom: 1px dashed #ccc;
  }
  .debt-row:last-child { border-bottom: none; }
  .debt-row.total-balance-row {
    background: #000 !important;
    color: #fff !important;
    padding: 4px 6px;
    border-radius: 4px;
    margin-top: 3px;
  }
  .debt-row.total-balance-row .lbl,
  .debt-row.total-balance-row .val {
    color: #fff !important;
    font-weight: 900;
  }

  /* ── صندوق الدين المباشر ── */
  .debt-direct-box {
    text-align: center;
    border: 2px solid #000;
    border-radius: 8px;
    padding: 10px 6px;
    margin: 8px 0;
    background: #fff;
  }
  .debt-label {
    font-size: 13px;
    font-weight: 800;
    color: #444;
    margin-bottom: 4px;
  }
  .debt-amount {
    font-size: 24px;
    font-weight: 900;
    color: #000;
    letter-spacing: 0.5px;
  }
  .debt-note {
    font-size: 12px;
    font-weight: 800;
    color: #555;
    margin-top: 6px;
    padding-top: 4px;
    border-top: 1px solid #eee;
  }

  .status-box {
    text-align: center;
    border: 3px solid #000;
    padding: 7px;
    font-size: 17px;
    font-weight: 900;
    margin: 6px 0;
  }

  /* ── الذيل والباركود ── */
  .footer {
    margin-top: 8px;
    border-top: 1px solid #ddd;
    padding-top: 5px;
    text-align: center;
    font-size: 13px;
    font-weight: 800;
  }
  .slogan-box {
    text-align: center;
    margin: 6px 0;
    padding: 4px 0;
  }
  .slogan-title { font-size: 13px; font-weight: 900; color: #000; }
  .slogan-sub   { font-size: 12px; font-weight: 900; color: #333; margin-top: 2px; }
  .legal-notice {
    font-size: 11.5px;
    font-weight: 800;
    line-height: 1.35;
    border: 1px solid #ddd;
    padding: 4px 5px;
    margin: 5px 0;
    text-align: center;
    background: #fafafa;
  }
  .barcode-wrapper {
    text-align: center;
    margin: 6px 0 4px;
    padding: 6px 4px;
    border-top: 1px solid #ddd;
    border-bottom: 1px solid #ddd;
  }
  .barcode-id {
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 1px;
    margin: 3px 0 6px;
  }
  .barcode-grid {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    font-weight: 800;
    color: #111;
    margin-top: 2px;
  }
  .thanks-msg {
    font-size: 14px;
    font-weight: 900;
    margin-top: 6px;
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
</style>
<script>
  function printRawBT(widthMode) {
    try {
      const clonedDoc = document.cloneNode(true);
      const noPrints = clonedDoc.querySelectorAll('.no-print');
      noPrints.forEach(el => el.remove());

      if (widthMode === '58') {
        const body = clonedDoc.querySelector('body');
        if (body) {
          body.style.maxWidth = '58mm';
          body.style.fontSize = '12px';
        }
      }

      const htmlStr = clonedDoc.documentElement.outerHTML;
      const b64 = btoa(unescape(encodeURIComponent(htmlStr)));
      
      const intentUrl = 'intent:base64,' + b64 + '#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;';
      window.location.href = intentUrl;
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
  <div class="receipt-date">📅 ${dateStr}</div>

  <div class="divider"></div>

  ${receipt.contact_name ? `
  <div class="row">
    <span class="label">${receipt.receipt_type === 'PURCHASE' ? '🚚 المورد:' : '👤 الزبون:'}</span>
    <span class="value">${receipt.contact_name}</span>
  </div>
  <div class="divider"></div>
  ` : ''}

  ${directDebtHTML}
  ${itemsHTML}
  ${paymentHTML}
  ${statementHTML}

  <div class="footer">
    <div class="slogan-box">
      <div class="slogan-title">💎 أفضل الماركات بأقل الأسعار 💎</div>
      <div class="slogan-sub">*** تغفل دقيقة يجدك الجديد ***</div>
      <div class="legal-notice">الرجاء الاحتفاظ بالوصل وتقديمه عند الاحتجاج</div>
    </div>

    <div class="barcode-wrapper">
      ${generateBarcodeSVG(receipt.id)}
      <div class="barcode-id">${receipt.id}</div>
      <div class="barcode-grid">
        <div><b>الزبون:</b> ${receipt.contact_name || 'زبون عام'}</div>
        <div><b>البائع:</b> ${m.owner}</div>
      </div>
      <div class="barcode-grid">
        <div><b>سند رقم:</b> ${receipt.id.replace(/^INV-[A-Z]*-?/, '')}</div>
        <div><b>التاريخ:</b> ${dateStr}</div>
      </div>
    </div>

    <div class="thanks-msg">شكراً لتعاملكم معنا 🌹</div>
  </div>

  <div class="actions-container no-print">
    <button class="print-btn" onclick="window.print();">🖨️ طباعة الوصل</button>
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

  const cKey   = resolveUserScopedKey(STORAGE_KEYS.CONTACTS);
  const pKey   = resolveUserScopedKey(STORAGE_KEYS.PRODUCTS);
  const catKey = resolveUserScopedKey(STORAGE_KEYS.PRODUCT_CATEGORIES);
  const txKey  = resolveUserScopedKey(STORAGE_KEYS.TRANSACTIONS);
  const payKey = resolveUserScopedKey(STORAGE_KEYS.PAYMENTS);
  const recKey = resolveUserScopedKey(STORAGE_KEYS.RECEIPTS);

  if (!localStorage.getItem(cKey)) {
    setLocalData(STORAGE_KEYS.CONTACTS, DEFAULT_CONTACTS);
  }
  if (!localStorage.getItem(pKey)) {
    setLocalData(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
  }
  if (!localStorage.getItem(catKey)) {
    setLocalData(STORAGE_KEYS.PRODUCT_CATEGORIES, DEFAULT_PRODUCT_CATEGORIES);
  }
  if (!localStorage.getItem(txKey)) {
    setLocalData(STORAGE_KEYS.TRANSACTIONS, DEFAULT_TRANSACTIONS);
  }
  if (!localStorage.getItem(payKey)) {
    setLocalData(STORAGE_KEYS.PAYMENTS, []);
  }
  if (!localStorage.getItem(recKey)) {
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

  const m = getMerchantInfo();
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

/** إلغاء معاملة/طلبية بالكامل وإرجاع كميات المخزون وتسوية الديون وحذفها نهائياً من كل الشاشات */
export function cancelTransaction(txId: string): boolean {
  const transactions: Transaction[] = getLocalData('tajer_smart_transactions_v1', []);
  const txIndex = transactions.findIndex(t => t.id === txId);
  if (txIndex === -1) return false;

  const tx = transactions[txIndex];

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

  // 3. حذف المعاملة كلياً بدلاً من تعليمها كـ CANCELLED
  const updatedTx = transactions.filter(t => t.id !== txId);

  // 4. حذف الوصل المقابل من أرشيف الأوصال أيضاً
  const receipts: Receipt[] = getLocalData('tajer_smart_receipts_v1', []);
  const updatedReceipts = receipts.filter(r => r.id !== txId && (!r.note || !r.note.includes(txId)));

  setLocalData('tajer_smart_products_v1', updatedProducts);
  setLocalData('tajer_smart_contacts_v1', updatedContacts);
  setLocalData('tajer_smart_transactions_v1', updatedTx);
  setLocalData('tajer_smart_receipts_v1', updatedReceipts);

  // 5. تسجيل الحذف السحابي بـ Tombstone لمنع عودة العملية عند التحديث
  import('./cloud-sync').then(cs => {
    cs.queueDeletedTransaction(txId);
    cs.syncStoreWithVercelCloud();
  });

  return true;
}

/**
 * تعديل معاملة/وصل محفوظ مع تصحيح كامل لـ:
 * المخزون — الديون — الأوصال المؤرشفة
 * المبدأ: عكس التأثير القديم ← تطبيق التأثير الجديد
 */
export function updateTransaction(
  txId: string,
  newItems: TransactionItem[],
  newPaidAmount: number
): { success: boolean; error?: string } {
  const transactions: Transaction[] = getLocalData('tajer_smart_transactions_v1', []);
  const txIndex = transactions.findIndex(t => t.id === txId);
  if (txIndex === -1) return { success: false, error: 'العملية غير موجودة' };

  const oldTx = transactions[txIndex];
  if (oldTx.status === 'CANCELLED')
    return { success: false, error: 'لا يمكن تعديل عملية ملغاة' };
  if (newItems.length === 0)
    return { success: false, error: 'يجب أن يحتوي الوصل على منتج واحد على الأقل' };

  const products: Product[] = getLocalData('tajer_smart_products_v1', []);
  const contacts: Contact[] = getLocalData('tajer_smart_contacts_v1', []);

  // ── بناء خريطة المخزون بعد عكس التأثير القديم ──────────────────────────
  const stockMap = new Map<string, number>();
  products.forEach(p => stockMap.set(p.id, p.stock_quantity));

  // عكس التأثير القديم على المخزون
  oldTx.items.forEach(item => {
    const cur = stockMap.get(item.product_id) ?? 0;
    if (oldTx.tx_type === 'SALE') {
      stockMap.set(item.product_id, cur + item.quantity); // إرجاع ما بيع
    } else {
      stockMap.set(item.product_id, Math.max(0, cur - item.quantity)); // إلغاء ما اشترينا
    }
  });

  // ── التحقق من كفاية المخزون للمنتجات الجديدة (للبيع فقط) ────────────────
  if (oldTx.tx_type === 'SALE') {
    for (const item of newItems) {
      if (item.quantity <= 0) continue;
      const available = stockMap.get(item.product_id) ?? 0;
      if (item.quantity > available) {
        const prod = products.find(p => p.id === item.product_id);
        return {
          success: false,
          error: `⚠️ كمية "${prod?.name || item.product_name}" غير كافية. المتوفر بعد التصحيح: ${available} حبة`,
        };
      }
    }
  }

  // تطبيق التأثير الجديد على المخزون
  newItems.forEach(item => {
    if (item.quantity <= 0) return;
    const cur = stockMap.get(item.product_id) ?? 0;
    if (oldTx.tx_type === 'SALE') {
      stockMap.set(item.product_id, cur - item.quantity);
    } else {
      stockMap.set(item.product_id, cur + item.quantity);
    }
  });

  // تحديث قائمة المنتجات
  const updatedProducts = products.map(p => {
    const newQty = stockMap.get(p.id);
    return newQty !== undefined && newQty !== p.stock_quantity
      ? { ...p, stock_quantity: Math.max(0, newQty) }
      : p;
  });

  // ── حساب القيم الجديدة ─────────────────────────────────────────────────
  const validItems = newItems.filter(i => i.quantity > 0);
  const newTotal = validItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const newDebt  = Math.max(0, newTotal - newPaidAmount);
  const newStatus: Transaction['status'] =
    newDebt === 0 ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : 'DEBT';

  // ── تصحيح رصيد الشخص بالفارق فقط (Delta) ─────────────────────────────
  // الفارق = الدين الجديد - الدين القديم
  // موجب: الدين زاد → نزيد الرصيد بنفس المقدار
  // سالب: الدين قل  → ننقص الرصيد بنفس المقدار
  const debtDelta = newDebt - (oldTx.debt_amount || 0);
  const updatedContacts = contacts.map(c => {
    if (!oldTx.contact_id || c.id !== oldTx.contact_id || debtDelta === 0) return c;
    if (oldTx.tx_type === 'SALE') {
      // زبون: رصيد موجب = يديننا
      return { ...c, balance: c.balance + debtDelta };
    } else {
      // مورد: رصيد سالب = نديننا
      return { ...c, balance: c.balance - debtDelta };
    }
  });

  // ── تحديث المعاملة ─────────────────────────────────────────────────────
  const updatedTx: Transaction = {
    ...oldTx,
    items: validItems,
    total_amount: newTotal,
    paid_amount: newPaidAmount,
    debt_amount: newDebt,
    status: newStatus,
  };
  const updatedTransactions = transactions.map(t => t.id === txId ? updatedTx : t);

  // ── تحديث أرشيف الأوصال بنفس الـ id ────────────────────────────────────
  const receipts: Receipt[] = getLocalData('tajer_smart_receipts_v1', []);
  const updatedReceipts = receipts.map(r => {
    if (r.id !== txId) return r;
    return {
      ...r,
      items: validItems,
      total_amount: newTotal,
      paid_amount: newPaidAmount,
      debt_amount: newDebt,
    };
  });

  // ── الحفظ ───────────────────────────────────────────────────────────────
  setLocalData('tajer_smart_products_v1', updatedProducts);
  setLocalData('tajer_smart_contacts_v1', updatedContacts);
  setLocalData('tajer_smart_transactions_v1', updatedTransactions);
  setLocalData('tajer_smart_receipts_v1', updatedReceipts);

  // مزامنة سحابية في الخلفية
  import('./cloud-sync').then(cs => cs.syncStoreWithVercelCloud()).catch(() => {});

  return { success: true };
}


// ─── خوارزمية البحث الذكية والمطابقة العربية ──────────────────────────────
/**
 * توحيد وتنظيف النصوص العربية لتجاوز أخطاء الهمزات، المسافات، والتشكيل
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    // إزالة التشكيل (الحركات والتنوين والشدة)
    .replace(/[\u064B-\u0652]/g, '')
    // توحيد جميع صور الألف والهمزات (أ، إ، آ، ٱ -> ا)
    .replace(/[أإآٱ]/g, 'ا')
    // توحيد التاء المربوطة والهاء (ة -> ه)
    .replace(/ة/g, 'ه')
    // توحيد الألف المقصورة والياء (ى -> ي)
    .replace(/ى/g, 'ي')
    .trim();
}

/**
 * دالة مطابقة ذكية تقارن النص المعطى مع الاستعلام مع مراعاة:
 * 1. المطابقة بدون مسافات (جافيل === جا فيل)
 * 2. المطابقة بتوحيد الهمزات والرموز (أوان === اوان)
 * 3. المطابقة التفكيكية بالكلمات (Token-based match)
 */
export function smartMatchText(targetText: string, query: string): boolean {
  if (!query || !query.trim()) return true;
  if (!targetText) return false;

  const normTarget = normalizeArabicText(targetText);
  const normQuery  = normalizeArabicText(query);

  // 1. مطابقة مباشرة بعد التوحيد
  if (normTarget.includes(normQuery)) return true;

  // 2. مطابقة بدون مسافات (Space-insensitive)
  const noSpaceTarget = normTarget.replace(/[\s\-_./\\,]/g, '');
  const noSpaceQuery  = normQuery.replace(/[\s\-_./\\,]/g, '');
  if (noSpaceTarget.includes(noSpaceQuery)) return true;

  // 3. مطابقة بالكلمات التفكيكية (كل كلمة في الاستعلام يجب أن تنتمي للهدف)
  const queryTokens = normQuery.split(/\s+/).filter(Boolean);
  if (queryTokens.length > 1) {
    const allTokensFound = queryTokens.every(token => {
      const cleanToken = token.replace(/[\s\-_./\\,]/g, '');
      return noSpaceTarget.includes(cleanToken);
    });
    if (allTokensFound) return true;
  }

  return false;
}
