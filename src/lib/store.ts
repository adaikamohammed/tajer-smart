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
  return {
    ...p,
    cost_price: Number(p.cost_price) || 0,
    retail_price: Number(p.retail_price) || 0,
    retail_price_2: p.retail_price_2 !== undefined ? (Number(p.retail_price_2) || 0) : undefined,
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

// ─── دوال التخزين العامة (المشفرة أمنياً بدقة) ──────────────────────────────
export function getLocalData<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const parsed = getEncryptedLocalData<T>(key, defaultValue);

    if (Array.isArray(parsed)) {
      const cleanArray = parsed.filter((item: any) => !item.id || !String(item.id).includes('_seed_'));
      if (key === STORAGE_KEYS.CONTACTS) {
        return cleanArray.map(sanitizeContact) as unknown as T;
      }
      if (key === STORAGE_KEYS.PRODUCTS) {
        return cleanArray.map(sanitizeProduct) as unknown as T;
      }
      if (key === STORAGE_KEYS.TRANSACTIONS) {
        return cleanArray.map(sanitizeTransaction) as unknown as T;
      }
    }
    return parsed;
  } catch (e) {
    console.error('Error reading encrypted local storage:', e);
    return defaultValue;
  }
}

export function setLocalData<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    // حفظ مشفر في التخزين المحلي بدون استدعاء لانهائي للمزامنة
    setEncryptedLocalData<T>(key, value);
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
  return `INV-${datePart}-${timePart}${msPart}`;
}

// ─── محرك الطباعة الحرارية 80mm (XP-P323B) ────────────────────────────────
export function buildThermalReceiptHTML(receipt: Receipt): string {
  const fmt = (n: number) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateStr = formatDateLatin(receipt.created_at);
  const m = MERCHANT_INFO;

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
        loose = (Number(i.quantity) || 0) % realCap;
      }

      const capDisplay   = `${realCap}`;
      const packsDisplay = isPackUnit ? (packs > 0 ? `${packs}` : '-') : '-';
      const looseDisplay = loose > 0 ? `${loose}` : (!isPackUnit ? `${loose}` : '-');
      const lineTotal    = (Number(i.quantity) || 0) * (Number(i.unit_price) || 0);

      return `
    <tr>
      <td class="col-name">${i.product_name}</td>
      <td class="col-pack">${packsDisplay}</td>
      <td class="col-cap">${capDisplay}</td>
      <td class="col-loose">${looseDisplay}</td>
      <td class="col-price">${fmt(i.unit_price)}</td>
      <td class="col-total">${fmt(lineTotal)}</td>
    </tr>`;
    }).join('');

    const currentGoods = receipt.total_amount ?? 0;
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
          <th class="col-name">المنتج</th>
          <th class="col-pack">كرتونة</th>
          <th class="col-cap">السعة</th>
          <th class="col-loose">حبة</th>
          <th class="col-price">السعر</th>
          <th class="col-total">المجموع</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary-box">
      <div class="summary-row"><span class="label">البضاعة الحالية:</span><span class="val">${fmt(currentGoods)} د.ج</span></div>
      ${prevBal !== 0 ? `<div class="summary-row"><span class="label">${prevBalLabel}</span><span class="val">${fmt(Math.abs(prevBal))} د.ج</span></div>` : ''}
      <div class="summary-row"><span class="label">${paidLabel}</span><span class="val">${fmt(paidToday)} د.ج</span></div>
      <div class="summary-row total-balance-row"><span class="label">${finalBalLabel}</span><span class="val">${fmt(Math.abs(finalBal))} د.ج</span></div>
    </div>`;
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
  .merchant-name  { font-size: 23px; font-weight: 900; line-height: 1.2; }
  .merchant-owner { font-size: 17px; font-weight: 900; margin-top: 2px; }
  .merchant-sub   { font-size: 13px; font-weight: 800; margin-top: 2px; color: #111; }

  /* ── نوع الوصل ── */
  .receipt-type {
    text-align: center;
    font-size: 19px;
    font-weight: 900;
    background: #000;
    color: #fff;
    padding: 6px 0;
    margin: 6px 0;
    letter-spacing: 1px;
  }
  .receipt-id {
    text-align: center;
    font-size: 11px;
    font-weight: 800;
    color: #222;
    margin-bottom: 2px;
    word-break: break-all;
  }
  .receipt-date {
    text-align: center;
    font-size: 17px;
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
    margin-bottom: 5px;
    font-size: 15px;
  }
  .label { font-weight: 800; color: #111; }
  .value { font-weight: 900; font-size: 16px; }

  /* ── صندوق الإجمالي ── */
  .total-box {
    text-align: center;
    border: 3px double #000;
    padding: 6px 4px;
    margin: 6px 0;
    font-size: 21px;
    font-weight: 900;
    letter-spacing: 0.5px;
  }

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
    font-size: 12px !important;
    letter-spacing: -0.3px;
    white-space: nowrap;
    overflow: visible !important;
  }
  .items-table td {
    padding: 4px 0.5px;
    border-bottom: 1px dashed #555;
    font-weight: 900;
    font-size: 12px;
    color: #000;
  }
  .items-table .col-name { width: 28%; text-align: right; word-break: normal; white-space: normal; line-height: 1.15; font-weight: 900; font-size: 12px; }
  .items-table .col-pack { width: 13%; text-align: center; font-size: 12px; font-weight: 900; }
  .items-table .col-cap  { width: 13%; text-align: center; font-size: 12px; font-weight: 900; }
  .items-table td.col-cap{ color: #1e293b; }
  .items-table .col-loose{ width: 10%; text-align: center; font-size: 12px; font-weight: 900; }
  .items-table .col-price{ width: 18%; text-align: center; font-size: 12px; font-weight: 900; }
  .items-table .col-total{ width: 18%; text-align: center; font-size: 12px; font-weight: 900; }
  .items-table tr:nth-child(even) td { background: #f0f0f0; }

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

  /* ── ملخص الفاتورة والدين ── */
  .summary-box {
    margin-top: 6px;
    border: 2px solid #000;
    border-radius: 6px;
    padding: 5px 6px;
    background: #fff;
  }
  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    font-weight: 800;
    padding: 3px 0;
    border-bottom: 1px dashed #ccc;
    color: #000;
  }
  .summary-row:last-child {
    border-bottom: none;
  }
  .summary-row.highlight {
    background: #f1f5f9;
    padding: 3px 4px;
    border-radius: 4px;
    font-size: 12.5px;
    font-weight: 900;
  }
  .summary-row.total-balance-row {
    background: #000 !important;
    padding: 5px 6px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 900;
    margin-top: 4px;
  }
  .summary-row.total-balance-row,
  .summary-row.total-balance-row .label,
  .summary-row.total-balance-row .val {
    color: #ffffff !important;
  }
  .status-box {
    text-align: center;
    border: 3px solid #000;
    padding: 7px;
    font-size: 17px;
    font-weight: 900;
    margin: 6px 0;
  }

  /* ── الذيل ── */
  .footer {
    margin-top: 8px;
    border-top: 1px solid #ddd;
    padding-top: 5px;
    text-align: center;
    font-size: 13px;
    font-weight: 800;
  }
  .legal-notice {
    font-size: 12px;
    font-weight: 800;
    line-height: 1.35;
    border: 1px solid #ddd;
    padding: 4px 5px;
    margin: 5px 0;
    text-align: center;
    background: #fafafa;
  }
  .thanks-msg {
    font-size: 15px;
    font-weight: 900;
    margin-top: 3px;
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
  .rawbt-btn-alt {
    background: #0369a1;
  }
  .help-box {
    margin-top: 10px;
    background: #fef3c7;
    border: 1px solid #f59e0b;
    color: #92400e;
    padding: 10px;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.6;
    text-align: right;
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
    <div class="legal-notice">
      📌 <b>تنبيه:</b> يُرجى تفقد البضاعة خلال 24 ساعة من تاريخ الشراء، ولا يُقبل الاسترجاع بعد انقضاء المهلة.
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
