import { Contact, Product, Transaction, getLocalData, setLocalData } from './store';

const DELETED_KEYS = {
  CONTACTS: 'tajer_deleted_contacts_v1',
  PRODUCTS: 'tajer_deleted_products_v1',
  TRANSACTIONS: 'tajer_deleted_transactions_v1',
};

export function queueDeletedContact(id: string) {
  const existing = getLocalData<string[]>(DELETED_KEYS.CONTACTS, []);
  if (!existing.includes(id)) {
    setLocalData(DELETED_KEYS.CONTACTS, [...existing, id]);
  }
}

export function queueDeletedProduct(id: string) {
  const existing = getLocalData<string[]>(DELETED_KEYS.PRODUCTS, []);
  if (!existing.includes(id)) {
    setLocalData(DELETED_KEYS.PRODUCTS, [...existing, id]);
  }
}

export function queueDeletedTransaction(id: string) {
  const existing = getLocalData<string[]>(DELETED_KEYS.TRANSACTIONS, []);
  if (!existing.includes(id)) {
    setLocalData(DELETED_KEYS.TRANSACTIONS, [...existing, id]);
  }
}

type SyncChangeCallback = () => void;
const changeSubscribers: Set<SyncChangeCallback> = new Set();

export function subscribeToCloudChanges(callback: SyncChangeCallback): () => void {
  changeSubscribers.add(callback);
  return () => changeSubscribers.delete(callback);
}

function notifySubscribers() {
  changeSubscribers.forEach(cb => {
    try { cb(); } catch (e) {}
  });
}

export async function syncStoreWithVercelCloud(): Promise<{
  success: boolean;
  errorDetails?: string;
  contactsCount: number;
  productsCount: number;
  transactionsCount: number;
  hasChanges?: boolean;
}> {
  try {
    const localContacts: Contact[]     = getLocalData('tajer_smart_contacts_v1', []);
    const localProducts: Product[]     = getLocalData('tajer_smart_products_v1', []);
    const localTx:       Transaction[] = getLocalData('tajer_smart_transactions_v1', []);

    const deletedContacts: string[]     = getLocalData(DELETED_KEYS.CONTACTS, []);
    const deletedProducts: string[]     = getLocalData(DELETED_KEYS.PRODUCTS, []);
    const deletedTx:       string[]     = getLocalData(DELETED_KEYS.TRANSACTIONS, []);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let res: Response;
    try {
      res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contacts: localContacts,
          products: localProducts,
          transactions: localTx,
          deleted_contacts: deletedContacts,
          deleted_products: deletedProducts,
          deleted_transactions: deletedTx,
        }),
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        success: false,
        errorDetails: data.error || 'تعذر الاتصال بقاعدة Vercel Postgres',
        contactsCount: 0,
        productsCount: 0,
        transactionsCount: 0,
      };
    }

    // تفريغ طابور الحذف عند النجاح
    if (deletedContacts.length > 0) setLocalData(DELETED_KEYS.CONTACTS, []);
    if (deletedProducts.length > 0) setLocalData(DELETED_KEYS.PRODUCTS, []);
    if (deletedTx.length > 0)       setLocalData(DELETED_KEYS.TRANSACTIONS, []);

    let stateChanged = false;

    if (data.contacts && Array.isArray(data.contacts)) {
      const prevStr = JSON.stringify(localContacts);
      const newStr  = JSON.stringify(data.contacts);
      if (prevStr !== newStr) {
        setLocalData('tajer_smart_contacts_v1', data.contacts);
        stateChanged = true;
      }
    }

    if (data.products && Array.isArray(data.products)) {
      const prevStr = JSON.stringify(localProducts);
      const newStr  = JSON.stringify(data.products);
      if (prevStr !== newStr) {
        setLocalData('tajer_smart_products_v1', data.products);
        stateChanged = true;
      }
    }

    if (data.transactions && Array.isArray(data.transactions)) {
      const prevStr = JSON.stringify(localTx);
      const newStr  = JSON.stringify(data.transactions);
      if (prevStr !== newStr) {
        setLocalData('tajer_smart_transactions_v1', data.transactions);
        stateChanged = true;
      }
    }

    if (stateChanged) {
      notifySubscribers();
    }

    return {
      success: true,
      hasChanges: stateChanged,
      contactsCount: data.contacts?.length || localContacts.length,
      productsCount: data.products?.length || localProducts.length,
      transactionsCount: data.transactions?.length || localTx.length,
    };
  } catch (err: any) {
    return {
      success: false,
      errorDetails: err?.message || 'خطأ اتصال بالشبكة أو لم تكتمل المزامنة بعد',
      contactsCount: 0,
      productsCount: 0,
      transactionsCount: 0,
    };
  }
}

/** تصفير وتفريغ جميع المنتجات والأشخاص والطلبيات محلياً وسحابياً للبدء ببيانات حقيقية صافية */
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
    notifySubscribers();
    return true;
  } catch (e) {
    return false;
  }
}

// ─── محرك المزامنة المستمر في الخلفية (Polling & Focus Sync) ───
let isEngineStarted = false;

export function initAutoSyncEngine() {
  if (typeof window === 'undefined' || isEngineStarted) return;
  isEngineStarted = true;

  // 1. المزامنة الأولى الفورية عند الفتح
  syncStoreWithVercelCloud();

  // 2. المزامنة التلقائية كل 8 ثوانٍ في الخلفية
  setInterval(() => {
    if (navigator.onLine) {
      syncStoreWithVercelCloud();
    }
  }, 8000);

  // 3. المزامنة الفورية عند عودة المستخدم للتبويب أو التركيز على الشاشة
  window.addEventListener('focus', () => {
    if (navigator.onLine) syncStoreWithVercelCloud();
  });
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      syncStoreWithVercelCloud();
    }
  });
}
