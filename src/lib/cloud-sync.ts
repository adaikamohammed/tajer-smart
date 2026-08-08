import { Contact, Product, Transaction, getLocalData, setLocalData } from './store';

const DELETED_KEYS = {
  CONTACTS:     'tajer_deleted_contacts_v1',
  PRODUCTS:     'tajer_deleted_products_v1',
  TRANSACTIONS: 'tajer_deleted_transactions_v1',
};

// ─── طوابير الحذف المحلية ────────────────────────────────────────────────
export function queueDeletedContact(id: string) {
  const q = getLocalData<string[]>(DELETED_KEYS.CONTACTS, []);
  if (!q.includes(id)) setLocalData(DELETED_KEYS.CONTACTS, [...q, id]);
}
export function queueDeletedProduct(id: string) {
  const q = getLocalData<string[]>(DELETED_KEYS.PRODUCTS, []);
  if (!q.includes(id)) setLocalData(DELETED_KEYS.PRODUCTS, [...q, id]);
}
export function queueDeletedTransaction(id: string) {
  const q = getLocalData<string[]>(DELETED_KEYS.TRANSACTIONS, []);
  if (!q.includes(id)) setLocalData(DELETED_KEYS.TRANSACTIONS, [...q, id]);
}

// ─── نظام الإشعارات للصفحات المفتوحة ────────────────────────────────────
type SyncCb = () => void;
const subs: Set<SyncCb> = new Set();
export function subscribeToCloudChanges(cb: SyncCb): () => void {
  subs.add(cb);
  return () => subs.delete(cb);
}
function notifySubs() {
  subs.forEach(cb => { try { cb(); } catch (_) {} });
}

// ─── حلقة مزامنة واحدة في المرة (لا تعارض) ─────────────────────────────
let syncInProgress = false;

export async function syncStoreWithVercelCloud(): Promise<{
  success: boolean;
  errorDetails?: string;
  contactsCount: number;
  productsCount: number;
  transactionsCount: number;
  hasChanges?: boolean;
}> {
  // منع التنفيذ المتداخل — أهم ضمان لعدم التعارض
  if (syncInProgress) {
    return { success: true, contactsCount: 0, productsCount: 0, transactionsCount: 0 };
  }
  syncInProgress = true;

  try {
    const localContacts:  Contact[]     = getLocalData('tajer_smart_contacts_v1', []);
    const localProducts:  Product[]     = getLocalData('tajer_smart_products_v1', []);
    const localTx:        Transaction[] = getLocalData('tajer_smart_transactions_v1', []);

    const deletedContacts:     string[] = getLocalData(DELETED_KEYS.CONTACTS, []);
    const deletedProducts:     string[] = getLocalData(DELETED_KEYS.PRODUCTS, []);
    const deletedTransactions: string[] = getLocalData(DELETED_KEYS.TRANSACTIONS, []);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let res: Response;
    try {
      res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contacts:             localContacts,
          products:             localProducts,
          transactions:         localTx,
          deleted_contacts:     deletedContacts,
          deleted_products:     deletedProducts,
          deleted_transactions: deletedTransactions,
        }),
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        success: false,
        errorDetails: data.error || 'تعذر الاتصال بـ Vercel Postgres',
        contactsCount: 0, productsCount: 0, transactionsCount: 0,
      };
    }

    // ─── تفريغ طوابير الحذف بعد تأكيد وصولها للسحابة ───
    if (deletedContacts.length     > 0) setLocalData(DELETED_KEYS.CONTACTS, []);
    if (deletedProducts.length     > 0) setLocalData(DELETED_KEYS.PRODUCTS, []);
    if (deletedTransactions.length > 0) setLocalData(DELETED_KEYS.TRANSACTIONS, []);

    // ─── تحديث البيانات المحلية فقط إذا تغيرت ───
    let changed = false;

    if (Array.isArray(data.contacts)) {
      if (JSON.stringify(data.contacts) !== JSON.stringify(localContacts)) {
        setLocalData('tajer_smart_contacts_v1', data.contacts);
        changed = true;
      }
    }
    if (Array.isArray(data.products)) {
      if (JSON.stringify(data.products) !== JSON.stringify(localProducts)) {
        setLocalData('tajer_smart_products_v1', data.products);
        changed = true;
      }
    }
    if (Array.isArray(data.transactions)) {
      if (JSON.stringify(data.transactions) !== JSON.stringify(localTx)) {
        setLocalData('tajer_smart_transactions_v1', data.transactions);
        changed = true;
      }
    }

    if (changed) notifySubs();

    return {
      success: true,
      hasChanges: changed,
      contactsCount:     data.contacts?.length     ?? localContacts.length,
      productsCount:     data.products?.length     ?? localProducts.length,
      transactionsCount: data.transactions?.length ?? localTx.length,
    };
  } catch (err: any) {
    return {
      success: false,
      errorDetails: err?.name === 'AbortError' ? 'انتهت مهلة الاتصال (10 ثوانٍ)' : err?.message,
      contactsCount: 0, productsCount: 0, transactionsCount: 0,
    };
  } finally {
    syncInProgress = false;
  }
}

// ─── تفريغ المخزن محلياً وسحابياً ────────────────────────────────────────
export async function clearAllStoreDataAndCloud(): Promise<boolean> {
  try {
    setLocalData('tajer_smart_contacts_v1', []);
    setLocalData('tajer_smart_products_v1', []);
    setLocalData('tajer_smart_transactions_v1', []);
    setLocalData('tajer_smart_payments_v1', []);
    setLocalData('tajer_smart_receipts_v1', []);
    setLocalData(DELETED_KEYS.CONTACTS, []);
    setLocalData(DELETED_KEYS.PRODUCTS, []);
    setLocalData(DELETED_KEYS.TRANSACTIONS, []);
    await fetch('/api/reset-db', { method: 'POST' });
    notifySubs();
    return true;
  } catch {
    return false;
  }
}

// ─── محرك المزامنة (مرة واحدة عند الفتح + عند العودة للتبويب فقط) ────────
// ❌ لا setInterval — يسبب تعارضات وثقل على الهاتف
// ✅ مزامنة ذكية: عند الفتح + عند العودة للتبويب + عند الفوكس
let isEngineStarted = false;

export function initAutoSyncEngine() {
  if (typeof window === 'undefined' || isEngineStarted) return;
  isEngineStarted = true;

  // مزامنة فورية عند فتح التطبيق
  syncStoreWithVercelCloud();

  // مزامنة عند العودة للتبويب بعد الغياب
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      syncStoreWithVercelCloud();
    }
  });

  // مزامنة عند الفوكس (alt-tab من تطبيق آخر)
  window.addEventListener('focus', () => {
    if (navigator.onLine) syncStoreWithVercelCloud();
  });

  // مزامنة خفيفة كل 30 ثانية فقط (للتحقق من تغييرات أجهزة أخرى)
  // 30 ثانية بدل 8 ثوانٍ = تخفيف الثقل بنسبة 75%
  setInterval(() => {
    if (navigator.onLine && document.visibilityState === 'visible') {
      syncStoreWithVercelCloud();
    }
  }, 30000);
}
