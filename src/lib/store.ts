export interface Contact {
  id: string;
  name: string;
  phone: string;
  photo_url?: string;
  location?: string;      // مكان المحل / العنوان
  category?: string;      // نوع التجارة / النشاط
  credit_limit?: number;  // سقف الدين المسموح به
  type: 'customer' | 'supplier' | 'both';
  notes?: string;
  balance: number;        // موجب = دين لنا على الزبون | سالب = مستحق علينا للمورد
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
  payment_type: 'COLLECTED' | 'PAID_OUT';
  note?: string;
  created_at: string;
}

// ─── نوع الوصل المحفوظ في الأرشيف ────────────────────────────────────────
export type ReceiptType = 'SALE' | 'PURCHASE' | 'DEBT_PAYMENT' | 'ACCOUNT_STATEMENT';

export interface Receipt {
  id: string;                  // رقم الوصل الفريد مثل INV-20260808-1042
  receipt_type: ReceiptType;   // نوع الوصل
  contact_id?: string;
  contact_name?: string;       // اسم الزبون أو المورد
  contact_phone?: string;
  items?: TransactionItem[];   // المنتجات (في وصل البيع/الشراء)
  total_amount?: number;       // المبلغ الإجمالي
  paid_amount?: number;        // المدفوع نقداً
  debt_amount?: number;        // الدين المتبقي
  payment_amount?: number;     // مبلغ التسديد (في وصل تسديد الدين)
  payment_type?: 'COLLECTED' | 'PAID_OUT';
  balance_after?: number;      // الرصيد بعد العملية
  note?: string;
  html_snapshot?: string;      // نسخة HTML الجاهزة للطباعة
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
  CONTACTS:           'tajer_smart_contacts_v1',
  PRODUCTS:           'tajer_smart_products_v1',
  PRODUCT_CATEGORIES: 'tajer_smart_product_categories_v1',
  TRANSACTIONS:       'tajer_smart_transactions_v1',
  PAYMENTS:           'tajer_smart_payments_v1',
  RECEIPTS:           'tajer_smart_receipts_v1',
};

// ─── دوال التخزين العامة ──────────────────────────────────────────────────
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

// ─── دوال أرشيف الأوصال ──────────────────────────────────────────────────
export function getReceipts(): Receipt[] {
  return getLocalData<Receipt[]>(STORAGE_KEYS.RECEIPTS, []);
}

export function saveReceipt(receipt: Receipt): void {
  const existing = getReceipts();
  // منع إضافة نفس الوصل مرتين بنفس الـ ID
  const filtered = existing.filter(r => r.id !== receipt.id);
  setLocalData(STORAGE_KEYS.RECEIPTS, [receipt, ...filtered]);
}

export function deleteReceipt(id: string): void {
  const existing = getReceipts();
  setLocalData(STORAGE_KEYS.RECEIPTS, existing.filter(r => r.id !== id));
}

/** توليد رقم وصل فريد بالتاريخ والوقت والميلي ثانية لمنع التكرار */
export function generateReceiptNumber(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  const msPart   = String(now.getMilliseconds()).padStart(3, '0');
  return `INV-${datePart}-${timePart}${msPart}`;
}

// ─── محرك الطباعة الحرارية (80mm / 58mm) ─────────────────────────────────
export function buildThermalReceiptHTML(receipt: Receipt): string {
  const fmt = (n: number) => n.toLocaleString('en-US');
  const dateStr = new Date(receipt.created_at).toLocaleDateString('en-GB').replace(/\//g, '/') + ' ' + new Date(receipt.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const m = MERCHANT_INFO;

  const typeLabels: Record<ReceiptType, string> = {
    SALE:              '🛒 وصل بيع',
    PURCHASE:          '📦 وصل شراء',
    DEBT_PAYMENT:      '💵 وصل تسديد دين',
    ACCOUNT_STATEMENT: '📜 كشف حساب',
  };
  const typeLabel = typeLabels[receipt.receipt_type];

  // ─ جدول المنتجات ─
  let itemsHTML = '';
  if (receipt.items && receipt.items.length > 0) {
    itemsHTML = `
    <div class="section-title">تفاصيل البضاعة</div>
    <table class="items-table">
      <thead>
        <tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr>
      </thead>
      <tbody>
        ${receipt.items.map(item => `
        <tr>
          <td>${item.product_name}</td>
          <td>${item.quantity}</td>
          <td>${fmt(item.unit_price)}</td>
          <td>${fmt(item.quantity * item.unit_price)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="divider"></div>
    <div class="row">
      <span class="label">المبلغ الإجمالي:</span>
      <span class="value bold">${fmt(receipt.total_amount ?? 0)} د.ج</span>
    </div>
    <div class="row">
      <span class="label">المدفوع نقداً:</span>
      <span class="value">${fmt(receipt.paid_amount ?? 0)} د.ج</span>
    </div>
    ${(receipt.debt_amount ?? 0) > 0 ? `
    <div class="row debt-row">
      <span class="label">⚠️ الدين المتبقي:</span>
      <span class="value bold">${fmt(receipt.debt_amount ?? 0)} د.ج</span>
    </div>` : `
    <div class="row paid-row">
      <span class="label">✅ تم الدفع بالكامل</span>
    </div>`}
    `;
  }

  // ─ وصل تسديد دين ─
  let paymentHTML = '';
  if (receipt.receipt_type === 'DEBT_PAYMENT' && receipt.payment_amount) {
    const action = receipt.payment_type === 'COLLECTED' ? 'تحصيل من الزبون' : 'سداد للمورد';
    paymentHTML = `
    <div class="section-title">تفاصيل التسديد</div>
    <div class="row"><span class="label">نوع العملية:</span><span class="value">${action}</span></div>
    <div class="row"><span class="label">المبلغ المُسدَّد:</span><span class="value bold">${fmt(receipt.payment_amount)} د.ج</span></div>
    ${receipt.balance_after !== undefined ? `
    <div class="row"><span class="label">الرصيد المتبقي:</span><span class="value bold">${fmt(Math.abs(receipt.balance_after))} د.ج</span></div>
    ` : ''}
    ${receipt.note ? `<div class="row"><span class="label">ملاحظة:</span><span class="value">${receipt.note}</span></div>` : ''}
    `;
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
    <div class="section-title">ملخص الحساب</div>
    <div class="status-box">${status}</div>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${typeLabel} — ${receipt.id}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Cairo', sans-serif;
    direction: rtl;
    background: white;
    color: #000;
    padding: 4mm 5mm;
    font-size: 12px;
  }
  @page { size: 79mm auto; margin: 0 !important; }
  @media print {
    html, body { width: 79mm !important; padding: 2mm 4mm !important; }
    .no-print { display: none !important; }
  }
  .header {
    text-align: center;
    border-bottom: 2px dashed #000;
    padding-bottom: 6px;
    margin-bottom: 8px;
  }
  .merchant-name { font-size: 16px; font-weight: 900; }
  .merchant-owner { font-size: 13px; font-weight: 700; }
  .merchant-sub { font-size: 10px; color: #333; }
  .receipt-type {
    text-align: center;
    font-size: 13px;
    font-weight: 900;
    background: #000;
    color: #fff;
    padding: 3px 0;
    margin: 6px 0;
    border-radius: 2px;
    letter-spacing: 0.5px;
  }
  .receipt-id { text-align: center; font-size: 10px; color: #555; margin-bottom: 4px; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    font-size: 11px;
  }
  .label { color: #444; }
  .value { font-weight: 700; }
  .bold { font-weight: 900; font-size: 12px; }
  .section-title {
    font-size: 10px;
    font-weight: 900;
    text-decoration: underline;
    margin: 6px 0 4px;
    text-align: center;
  }
  .items-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
    margin: 4px 0;
  }
  .items-table th {
    background: #000;
    color: #fff;
    padding: 2px 3px;
    text-align: right;
    font-weight: 700;
  }
  .items-table td {
    padding: 2px 3px;
    border-bottom: 1px dotted #aaa;
    text-align: right;
  }
  .debt-row .value { color: #c00; }
  .paid-row { color: #060; font-weight: 900; }
  .status-box {
    text-align: center;
    border: 2px solid #000;
    border-radius: 4px;
    padding: 5px;
    font-size: 12px;
    font-weight: 900;
    margin: 4px 0;
  }
  .footer {
    margin-top: 10px;
    border-top: 2px dashed #000;
    padding-top: 6px;
    text-align: center;
    font-size: 10px;
  }
  .seal {
    display: inline-block;
    border: 2px solid #000;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 9px;
    font-weight: 900;
    transform: rotate(-2deg);
    margin-bottom: 4px;
  }
  .print-btn {
    display: block;
    width: 100%;
    padding: 10px;
    background: #000;
    color: white;
    border: none;
    border-radius: 6px;
    font-family: 'Cairo', sans-serif;
    font-size: 14px;
    font-weight: 900;
    cursor: pointer;
    margin-top: 12px;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="merchant-name">🚛 ${m.name}</div>
    <div class="merchant-owner">${m.owner}</div>
    <div class="merchant-sub">📞 ${m.phone} | 📍 ${m.address}</div>
  </div>

  <div class="receipt-type">${typeLabel}</div>
  <div class="receipt-id">رقم الوصل: ${receipt.id} | ${dateStr}</div>

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

  <button class="print-btn no-print" onclick="window.print(); window.close();">🖨️ اضغط هنا للطباعة</button>
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
    setLocalData(STORAGE_KEYS.TRANSACTIONS, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.PAYMENTS)) {
    setLocalData(STORAGE_KEYS.PAYMENTS, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.RECEIPTS)) {
    setLocalData(STORAGE_KEYS.RECEIPTS, []);
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
