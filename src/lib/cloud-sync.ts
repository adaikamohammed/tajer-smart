import {
  Contact, Product, Transaction, Receipt,
  getLocalData, setLocalData, clearLocalDataCache,
  sanitizeProduct, sanitizeContact, sanitizeTransaction,
  getActiveUserEmail
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

let syncInProgress = false;
let hasPendingSync = false;
let lastSyncTimestamp = 0;
let debounceTimer: any = null;

export function triggerDebouncedSync(delayMs = 2500) {
  if (typeof window === 'undefined') return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    syncStoreWithVercelCloud();
  }, delayMs);
}

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
    hasPendingSync = true;
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

    // ─── استرجاع تلقائي للأوصال الحرارية التي فُقدت معاملاتها قبل المزامنة ───
    const localReceiptsForSync: Receipt[] = getLocalData('tajer_smart_receipts_v1', []);
    const txIdSet = new Set(localTx.map(t => t.id));
    const deadTxSetInitial = new Set(deletedTransactions);
    const missingTxFromReceipts: Transaction[] = [];

    localReceiptsForSync.forEach(r => {
      if (r.id && !txIdSet.has(r.id) && !deadTxSetInitial.has(r.id) && !isSeed(r.id)) {
        if (r.receipt_type === 'SALE' || r.receipt_type === 'PURCHASE' || r.receipt_type === 'DIRECT_DEBT') {
          missingTxFromReceipts.push({
            id: r.id,
            tx_type: r.receipt_type === 'PURCHASE' ? 'PURCHASE' : 'SALE',
            contact_id: r.contact_id,
            contact_name: r.contact_name,
            subtotal_amount: r.subtotal_amount,
            total_discount: r.total_discount,
            items_count: r.items_count,
            total_amount: r.total_amount || 0,
            paid_amount: r.paid_amount || 0,
            debt_amount: r.debt_amount || 0,
            previous_balance: r.previous_balance,
            final_balance: r.final_balance,
            status: (r.debt_amount || 0) === 0 ? 'PAID' : (r.paid_amount || 0) > 0 ? 'PARTIAL' : 'DEBT',
            notes: r.note,
            items: r.items || [],
            created_at: r.created_at,
          });
        }
      }
    });

    const allTxToSend = [...localTx, ...missingTxFromReceipts];

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
          user_id:              getActiveUserEmail(),
          contacts:             localContacts,
          products:             localProducts,
          transactions:         allTxToSend,
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

    // ─── 3. دمج آمن وقراءة أحدث بيانات محلية من جديد لمنع مسح أي عملية حدثت أثناء المزامنة ───
    let changed = false;

    if (Array.isArray(data.products)) {
      const currentFreshProducts: Product[] = getLocalData('tajer_smart_products_v1', []);
      const prodMap = new Map<string, Product>();

      // نبدأ ببيانات السيرفر
      (data.products as any[])
        .filter(p => p.id && !isSeed(p.id))
        .map(sanitizeProduct)
        .forEach(p => prodMap.set(p.id, p));

      // الاحتفاظ بأي منتج محلي أضيف أثناء المزامنة
      const deadProdSet = new Set(deletedProducts);
      currentFreshProducts.forEach(lp => {
        if (!deadProdSet.has(lp.id) && !isSeed(lp.id) && !prodMap.has(lp.id)) {
          prodMap.set(lp.id, lp);
        }
      });

      const mergedProducts = Array.from(prodMap.values());
      if (JSON.stringify(mergedProducts) !== JSON.stringify(currentFreshProducts)) {
        setLocalData('tajer_smart_products_v1', mergedProducts);
        changed = true;
      }
    }

    if (Array.isArray(data.contacts)) {
      const currentFreshContacts: Contact[] = getLocalData('tajer_smart_contacts_v1', []);
      const contactMap = new Map<string, Contact>();

      (data.contacts as any[])
        .filter(c => c.id && !isSeed(c.id))
        .map(sanitizeContact)
        .forEach(c => contactMap.set(c.id, c));

      const deadContactSet = new Set(deletedContacts);
      currentFreshContacts.forEach(lc => {
        if (!deadContactSet.has(lc.id) && !isSeed(lc.id) && !contactMap.has(lc.id)) {
          contactMap.set(lc.id, lc);
        }
      });

      const mergedContacts = Array.from(contactMap.values());
      if (JSON.stringify(mergedContacts) !== JSON.stringify(currentFreshContacts)) {
        setLocalData('tajer_smart_contacts_v1', mergedContacts);
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

      const txMap = new Map<string, Transaction>();
      authoritative.forEach(tx => txMap.set(tx.id, tx));

      // 🔴 جوهر الحل: إعادة قراءة المعاملات المحلية الحالية (currentFreshTx)
      // بدلاً من المتغير القديم localTx، حتى لا تُمحى أي عملية أُضيفت أثناء اتصال الشبكة!
      const currentFreshTx: Transaction[] = getLocalData('tajer_smart_transactions_v1', []);
      const deadTxSet = new Set(deletedTransactions);
      currentFreshTx.forEach(ltx => {
        if (!txMap.has(ltx.id) && !deadTxSet.has(ltx.id) && !isSeed(ltx.id)) {
          txMap.set(ltx.id, ltx);
        }
      });

      const mergedTransactions = Array.from(txMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      if (JSON.stringify(mergedTransactions) !== JSON.stringify(currentFreshTx)) {
        setLocalData('tajer_smart_transactions_v1', mergedTransactions);
        changed = true;
      }

      // مزامنة وتحديث أرشيف الأوصال tajer_smart_receipts_v1 تلقائياً
      const localReceipts: Receipt[] = getLocalData('tajer_smart_receipts_v1', []);
      const receiptMap = new Map<string, Receipt>();
      localReceipts.forEach(r => { if (r.id && !isSeed(r.id)) receiptMap.set(r.id, r); });

      mergedTransactions.forEach(tx => {
        if (!receiptMap.has(tx.id)) {
          receiptMap.set(tx.id, {
            id: tx.id,
            receipt_type: tx.tx_type === 'SALE' ? 'SALE' : 'PURCHASE',
            contact_id: tx.contact_id,
            contact_name: tx.contact_name,
            items: tx.items,
            subtotal_amount: tx.subtotal_amount,
            total_discount: tx.total_discount,
            items_count: tx.items_count,
            total_amount: tx.total_amount,
            paid_amount: tx.paid_amount,
            debt_amount: tx.debt_amount,
            previous_balance: tx.previous_balance,
            final_balance: tx.final_balance,
            note: tx.notes,
            created_at: tx.created_at,
          });
        }
      });

      const updatedReceipts = Array.from(receiptMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      if (JSON.stringify(updatedReceipts) !== JSON.stringify(localReceipts)) {
        setLocalData('tajer_smart_receipts_v1', updatedReceipts);
        changed = true;
      }
    }

    if (changed) {
      clearLocalDataCache();
      notifySubs();
    }
    lastSyncTimestamp = Date.now();
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
    // إذا طُلبت مزامنة أثناء انشغال المزامنة السابقة، تشغيلها فوراً لضمان عدم ضياع أي طلبية
    if (hasPendingSync) {
      hasPendingSync = false;
      setTimeout(() => {
        syncStoreWithVercelCloud();
      }, 100);
    }
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

  // 2. مزامنة عند العودة للتبويب (فقط إذا مر أكثر من 45 ثانية لتفادي الثقل وتجميد الواجهة)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      if (Date.now() - lastSyncTimestamp > 45_000) {
        syncStoreWithVercelCloud();
      }
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
