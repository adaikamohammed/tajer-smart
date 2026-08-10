import { Contact, Product, Transaction, getLocalData, setLocalData } from './store';

const DELETED_KEYS = {
  CONTACTS:     'tajer_deleted_contacts_v1',
  PRODUCTS:     'tajer_deleted_products_v1',
  TRANSACTIONS: 'tajer_deleted_transactions_v1',
};

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
let currentStatus: SyncStatus = 'synced';
const statusSubscribers: Set<(status: SyncStatus) => void> = new Set();

export function subscribeToSyncStatus(cb: (status: SyncStatus) => void): () => void {
  statusSubscribers.add(cb);
  cb(currentStatus);
  return () => statusSubscribers.delete(cb);
}

function updateStatus(status: SyncStatus) {
  currentStatus = status;
  statusSubscribers.forEach(cb => {
    try { cb(status); } catch (_) {}
  });
}

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
  if (typeof window !== 'undefined' && !navigator.onLine) {
    updateStatus('offline');
    return { success: false, errorDetails: 'لا يوجد اتصال بالإنترنت', contactsCount: 0, productsCount: 0, transactionsCount: 0 };
  }

  if (syncInProgress) {
    return { success: true, contactsCount: 0, productsCount: 0, transactionsCount: 0 };
  }
  syncInProgress = true;
  updateStatus('syncing');

  try {
    const localContacts:  Contact[]     = getLocalData('tajer_smart_contacts_v1', []);
    const localProducts:  Product[]     = getLocalData('tajer_smart_products_v1', []);
    const localTx:        Transaction[] = getLocalData('tajer_smart_transactions_v1', []);

    const deletedContacts:     string[] = getLocalData(DELETED_KEYS.CONTACTS, []);
    const deletedProducts:     string[] = getLocalData(DELETED_KEYS.PRODUCTS, []);
    const deletedTransactions: string[] = getLocalData(DELETED_KEYS.TRANSACTIONS, []);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

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
      updateStatus('error');
      return {
        success: false,
        errorDetails: data.error || 'تعذر الاتصال بـ Vercel Postgres',
        contactsCount: 0, productsCount: 0, transactionsCount: 0,
      };
    }

    // تفريغ طوابير الحذف عند النجاح
    if (deletedContacts.length     > 0) setLocalData(DELETED_KEYS.CONTACTS, []);
    if (deletedProducts.length     > 0) setLocalData(DELETED_KEYS.PRODUCTS, []);
    if (deletedTransactions.length > 0) setLocalData(DELETED_KEYS.TRANSACTIONS, []);

    let changed = false;

    // ─── 1. الدمج الثنائي الذكي للمنتجات (Smart Union Merge) ───
    if (Array.isArray(data.products)) {
      const mergedProductsMap = new Map<string, Product>();
      // إضافة عناصر السيرفر أولاً
      data.products.forEach((p: Product) => {
        if (!deletedProducts.includes(p.id)) mergedProductsMap.set(p.id, p);
      });
      // دمج العناصر المحلية ومنع مسح أي منتج محلي مضاف حديثاً
      localProducts.forEach((p: Product) => {
        if (!deletedProducts.includes(p.id)) {
          const existing = mergedProductsMap.get(p.id);
          mergedProductsMap.set(p.id, existing ? { ...existing, ...p } : p);
        }
      });
      const mergedProducts = Array.from(mergedProductsMap.values());
      if (JSON.stringify(mergedProducts) !== JSON.stringify(localProducts)) {
        setLocalData('tajer_smart_products_v1', mergedProducts);
        changed = true;
      }
    }

    // ─── 2. الدمج الثنائي الذكي للأشخاص والزبائن والموردين ───
    if (Array.isArray(data.contacts)) {
      const mergedContactsMap = new Map<string, Contact>();
      data.contacts.forEach((c: Contact) => {
        if (!deletedContacts.includes(c.id)) mergedContactsMap.set(c.id, c);
      });
      localContacts.forEach((c: Contact) => {
        if (!deletedContacts.includes(c.id)) {
          const existing = mergedContactsMap.get(c.id);
          mergedContactsMap.set(c.id, existing ? { ...existing, ...c } : c);
        }
      });
      const mergedContacts = Array.from(mergedContactsMap.values());
      if (JSON.stringify(mergedContacts) !== JSON.stringify(localContacts)) {
        setLocalData('tajer_smart_contacts_v1', mergedContacts);
        changed = true;
      }
    }

    // ─── 3. الدمج الثنائي الذكي للمعاملات والعمليات ───
    if (Array.isArray(data.transactions)) {
      const mergedTxMap = new Map<string, Transaction>();
      data.transactions.forEach((t: Transaction) => {
        if (!deletedTransactions.includes(t.id)) mergedTxMap.set(t.id, t);
      });
      localTx.forEach((t: Transaction) => {
        if (!deletedTransactions.includes(t.id)) {
          const existing = mergedTxMap.get(t.id);
          mergedTxMap.set(t.id, existing ? { ...existing, ...t } : t);
        }
      });
      const mergedTx = Array.from(mergedTxMap.values());
      if (JSON.stringify(mergedTx) !== JSON.stringify(localTx)) {
        setLocalData('tajer_smart_transactions_v1', mergedTx);
        changed = true;
      }
    }

    if (changed) notifySubs();
    updateStatus('synced');

    return {
      success: true,
      hasChanges: changed,
      contactsCount:     data.contacts?.length     ?? localContacts.length,
      productsCount:     data.products?.length     ?? localProducts.length,
      transactionsCount: data.transactions?.length ?? localTx.length,
    };
  } catch (err: any) {
    updateStatus('offline');
    return {
      success: false,
      errorDetails: err?.name === 'AbortError' ? 'انتهت مهلة الاتصال' : err?.message,
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
    updateStatus('synced');
    return true;
  } catch {
    return false;
  }
}

// ─── محرك المزامنة المستمرة التلقائي (Auto Sync Engine) ─────────────────
let isEngineStarted = false;

export function initAutoSyncEngine() {
  if (typeof window === 'undefined' || isEngineStarted) return;
  isEngineStarted = true;

  // 1. مزامنة فورية عند فتح التطبيق
  syncStoreWithVercelCloud();

  // 2. مزامنة فورية عند العودة للتبويب
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      syncStoreWithVercelCloud();
    }
  });

  // 3. مزامنة فورية عند الفوكس
  window.addEventListener('focus', () => {
    if (navigator.onLine) syncStoreWithVercelCloud();
  });

  // 4. استماع لحالة اتصال النت بالهاتف/الكمبيوتر
  window.addEventListener('online', () => syncStoreWithVercelCloud());
  window.addEventListener('offline', () => updateStatus('offline'));

  // 5. فحص خفيف وسريع كل 10 ثوانٍ فقط عندما يكون التبويب مفتوحاً وم نشطاً
  setInterval(() => {
    if (navigator.onLine && document.visibilityState === 'visible') {
      syncStoreWithVercelCloud();
    }
  }, 10000);
}
