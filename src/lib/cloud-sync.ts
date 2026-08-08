import { Contact, Product, Transaction, getLocalData, setLocalData } from './store';

export async function syncStoreWithVercelCloud(): Promise<{
  success: boolean;
  errorDetails?: string;
  contactsCount: number;
  productsCount: number;
  transactionsCount: number;
}> {
  try {
    const localContacts: Contact[]     = getLocalData('tajer_smart_contacts_v1', []);
    const localProducts: Product[]     = getLocalData('tajer_smart_products_v1', []);
    const localTx:       Transaction[] = getLocalData('tajer_smart_transactions_v1', []);

    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contacts: localContacts,
        products: localProducts,
        transactions: localTx,
      }),
    });

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

    if (data.contacts && Array.isArray(data.contacts)) {
      setLocalData('tajer_smart_contacts_v1', data.contacts);
    }

    if (data.products && Array.isArray(data.products)) {
      setLocalData('tajer_smart_products_v1', data.products);
    }

    if (data.transactions && Array.isArray(data.transactions)) {
      setLocalData('tajer_smart_transactions_v1', data.transactions);
    }

    return {
      success: true,
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
