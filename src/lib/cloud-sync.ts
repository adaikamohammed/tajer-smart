import {
  Contact, Product, Transaction,
  getLocalData, setLocalData, clearLocalDataCache,
  sanitizeProduct, sanitizeContact, sanitizeTransaction
} from './store';

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

// ─── حلقة مزامنة واحدة في المرة (Vercel Postgres Sync) ─────────────────
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
    const isSeed = (id: string) => !id || String(id).includes('_seed_') || String(id).toLowerCase().includes('seed');

    // ─── 1. جمع وتنظيف البيانات المحلية الجديدة المُراد رفعها ───────────────
    const rawContacts: Contact[]     = getLocalData('tajer_smart_contacts_v1', []);
    const rawProducts: Product[]     = getLocalData('tajer_smart_products_v1', []);
    const rawTx:       Transaction[] = getLocalData('tajer_smart_transactions_v1', []);

    // تطهير البيانات الوهمية من المحلي قبل الإرسال
    const localContacts = rawContacts.filter(c => !isSeed(c.id));
    const localProducts = rawProducts.filter(p => !isSeed(p.id));
    const localTx       = rawTx.filter(t => !isSeed(t.id));

    const deletedContacts:     string[] = getLocalData(DELETED_KEYS.CONTACTS, []);
    const deletedProducts:     string[] = getLocalData(DELETED_KEYS.PRODUCTS, []);
    const deletedTransactions: string[] = getLocalData(DELETED_KEYS.TRANSACTIONS, []);

    // ─── 2. إرسال البيانات المحلية للسيرفر (PUSH) ────────────────────────
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

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

    // تفريغ طوابير الحذف بعد تأكيد السيرفر
    if (deletedContacts.length     > 0) setLocalData(DELETED_KEYS.CONTACTS, []);
    if (deletedProducts.length     > 0) setLocalData(DELETED_KEYS.PRODUCTS, []);
    if (deletedTransactions.length > 0) setLocalData(DELETED_KEYS.TRANSACTIONS, []);

    // ─── 3. نموذج "السحاب حاكم" — استبدال المحلي بما رجعه السيرفر بالكامل ─
    // السيرفر هو مصدر الحقيقة الوحيد. بعد رفع البيانات الجديدة، نستبدل المحلي
    // بالكامل بما أعاده السيرفر. هذا يضمن تطابق جميع الأجهزة مع قاعدة البيانات.

    let changed = false;

    if (Array.isArray(data.products)) {
      // السيرفر يرجع فقط البيانات النظيفة الصحيحة — نحفظها مباشرة بعد التطبيع
      const authoritative = (data.products as any[])
        .filter(p => p.id && !isSeed(p.id))
        .map(sanitizeProduct);
      if (JSON.stringify(authoritative) !== JSON.stringify(rawProducts)) {
        setLocalData('tajer_smart_products_v1', authoritative);
        changed = true;
      }
    }

    if (Array.isArray(data.contacts)) {
      const authoritative = (data.contacts as any[])
        .filter(c => c.id && !isSeed(c.id))
        .map(sanitizeContact);
      if (JSON.stringify(authoritative) !== JSON.stringify(rawContacts)) {
        setLocalData('tajer_smart_contacts_v1', authoritative);
        changed = true;
      }
    }

    if (Array.isArray(data.transactions)) {
      const cleanTxItems = (items: any[]) => {
        if (!Array.isArray(items)) return [];
        const seen = new Set<string>();
        return items.filter(it => {
          const key = `${it.product_id || ''}_${it.product_name || ''}_${it.quantity}_${it.unit_price}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };
      const authoritative = (data.transactions as any[])
        .filter(t => t.id && !isSeed(t.id))
        .map(t => sanitizeTransaction({ ...t, items: cleanTxItems(t.items) }));
      if (JSON.stringify(authoritative) !== JSON.stringify(rawTx)) {
        setLocalData('tajer_smart_transactions_v1', authoritative);
        changed = true;
      }
    }

    if (changed) {
      // مسح الكاش لإجبار الصفحات على قراءة البيانات الجديدة فور وصولها من السحابة
      clearLocalDataCache();
      notifySubs();
    }
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

// ─── محرك المزامنة التلقائي المستقر (Silent Auto Sync Engine) ───────────
let isEngineStarted = false;

export function initAutoSyncEngine() {
  if (typeof window === 'undefined' || isEngineStarted) return;
  isEngineStarted = true;

  // 1. مزامنة عند فتح التطبيق
  syncStoreWithVercelCloud();

  // 2. مزامنة عند العودة للتبويب
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      syncStoreWithVercelCloud();
    }
  });

  // 3. مزامنة عند عودة الإنترنت
  window.addEventListener('online', async () => {
    const res = await syncStoreWithVercelCloud();
    if (res && res.success) {
      const { toast } = await import('@/components/Toast');
      toast('☁️ تم المزامنة بنجاح', 'success');
    }
  });
  window.addEventListener('offline', () => updateStatus('offline'));
}
