/**
 * 🚀 ذاكرة البيانات السريعة — In-Memory Data Cache
 * ─────────────────────────────────────────────────
 * بدلاً من قراءة localStorage وفك التشفير وJSON.parse
 * والـ sanitization في كل صفحة من الصفر، نخزّن النتيجة
 * في الذاكرة مرة واحدة ونخدم منها جميع الصفحات.
 *
 * التحديث: يحدث عند أي setLocalData أو syncStoreWithVercelCloud.
 */

import { Contact, Product, Transaction, getLocalData, setLocalData as _origSet } from './store';

type CacheKey = 'contacts' | 'products' | 'transactions';

interface DataCache {
  contacts: Contact[] | null;
  products: Product[] | null;
  transactions: Transaction[] | null;
  lastRead: Record<CacheKey, number>;
}

const cache: DataCache = {
  contacts:     null,
  products:     null,
  transactions: null,
  lastRead:     { contacts: 0, products: 0, transactions: 0 },
};

const TTL_MS = 500; // إذا مضى أكثر من 500ms منذ آخر قراءة → أعد القراءة مرة واحدة

type Subscriber = () => void;
const subscribers = new Set<Subscriber>();

export function subscribeToDataCache(cb: Subscriber): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

function notifyAll() {
  subscribers.forEach(cb => { try { cb(); } catch (_) {} });
}

/** يُستخدم بدلاً من getLocalData لجميع الصفحات */
export function getCachedContacts(): Contact[] {
  const now = Date.now();
  if (!cache.contacts || now - cache.lastRead.contacts > TTL_MS) {
    cache.contacts = getLocalData<Contact[]>('tajer_smart_contacts_v1', []);
    cache.lastRead.contacts = now;
  }
  return cache.contacts;
}

export function getCachedProducts(): Product[] {
  const now = Date.now();
  if (!cache.products || now - cache.lastRead.products > TTL_MS) {
    cache.products = getLocalData<Product[]>('tajer_smart_products_v1', []);
    cache.lastRead.products = now;
  }
  return cache.products;
}

export function getCachedTransactions(): Transaction[] {
  const now = Date.now();
  if (!cache.transactions || now - cache.lastRead.transactions > TTL_MS) {
    cache.transactions = getLocalData<Transaction[]>('tajer_smart_transactions_v1', []);
    cache.lastRead.transactions = now;
  }
  return cache.transactions;
}

/** يمسح الكاش بعد أي تعديل ليُجبر الصفحات على قراءة جديدة */
export function invalidateCache(keys?: CacheKey[]) {
  const toInvalidate = keys ?? (['contacts', 'products', 'transactions'] as CacheKey[]);
  toInvalidate.forEach(k => {
    cache[k] = null;
    cache.lastRead[k] = 0;
  });
  notifyAll();
}

/** wrapper لـ setLocalData يمسح الكاش تلقائياً */
export function setAndInvalidate<T>(key: string, value: T, cacheKey?: CacheKey) {
  _origSet(key, value);
  if (cacheKey) invalidateCache([cacheKey]);
  else invalidateCache();
}
