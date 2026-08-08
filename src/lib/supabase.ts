import { createClient } from '@supabase/supabase-js';
import { Contact, Product, Transaction, DebtPayment, getLocalData, setLocalData } from './store';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// -------------------------------------------------------------
// 🔄 خدمات مزامنة Supabase وطباعة تفاصيل الأخطاء الحقيقية
// -------------------------------------------------------------

export async function fetchContactsFromSupabase(): Promise<{ data: Contact[] | null; error?: string }> {
  if (!supabase) return { data: null, error: 'لم يتم ضبط إعدادات Supabase URL/Key في البيئة' };
  try {
    const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
    if (error) {
      return { data: null, error: `[contacts] ${error.message || error.details || JSON.stringify(error)}` };
    }
    return { data: data as Contact[] };
  } catch (err: any) {
    return { data: null, error: err?.message || 'خطأ اتصال بالشبكة' };
  }
}

export async function saveAllContactsToSupabase(contacts: Contact[]): Promise<{ success: boolean; error?: string }> {
  if (!supabase || contacts.length === 0) return { success: false };
  try {
    const { error } = await supabase.from('contacts').upsert(contacts);
    if (error) return { success: false, error: `[contacts_upsert] ${error.message || JSON.stringify(error)}` };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function fetchProductsFromSupabase(): Promise<{ data: Product[] | null; error?: string }> {
  if (!supabase) return { data: null, error: 'لم يتم ضبط إعدادات Supabase' };
  try {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) return { data: null, error: `[products] ${error.message || JSON.stringify(error)}` };
    return { data: data as Product[] };
  } catch (err: any) {
    return { data: null, error: err?.message };
  }
}

export async function saveAllProductsToSupabase(products: Product[]): Promise<{ success: boolean; error?: string }> {
  if (!supabase || products.length === 0) return { success: false };
  try {
    const { error } = await supabase.from('products').upsert(products);
    if (error) return { success: false, error: `[products_upsert] ${error.message || JSON.stringify(error)}` };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function fetchTransactionsFromSupabase(): Promise<{ data: Transaction[] | null; error?: string }> {
  if (!supabase) return { data: null, error: 'لم يتم ضبط إعدادات Supabase' };
  try {
    const { data: txData, error: txError } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
    if (txError) return { data: null, error: `[transactions] ${txError.message || JSON.stringify(txError)}` };
    if (!txData) return { data: [] };

    const { data: itemsData, error: itemsError } = await supabase.from('transaction_items').select('*');
    if (itemsError) return { data: null, error: `[transaction_items] ${itemsError.message}` };

    const transactionsWithItems: Transaction[] = txData.map(tx => ({
      ...tx,
      items: (itemsData || []).filter(item => item.transaction_id === tx.id),
    }));

    return { data: transactionsWithItems };
  } catch (err: any) {
    return { data: null, error: err?.message };
  }
}

export async function saveTransactionToSupabase(tx: Transaction): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false };
  try {
    const { items, ...txData } = tx;
    const { error: txError } = await supabase.from('transactions').upsert(txData);
    if (txError) return { success: false, error: `[tx_upsert] ${txError.message}` };

    if (items && items.length > 0) {
      const dbItems = items.map(item => ({
        transaction_id: tx.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        cost_price: item.cost_price,
      }));
      const { error: itemsError } = await supabase.from('transaction_items').upsert(dbItems);
      if (itemsError) return { success: false, error: `[items_upsert] ${itemsError.message}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/** المزامنة الشاملة وطباعة التشخيص والخطأ بدقة عالية */
export async function syncFullStoreWithCloud(): Promise<{
  success: boolean;
  errorDetails?: string;
  contactsCount: number;
  productsCount: number;
  transactionsCount: number;
}> {
  if (!supabase) {
    return {
      success: false,
      errorDetails: 'تنبيه: لم يتم العثور على مشروع Supabase مفعّل في متغيرات البيئة (.env.local)',
      contactsCount: 0,
      productsCount: 0,
      transactionsCount: 0,
    };
  }

  const errors: string[] = [];

  try {
    // 1. رفـع البيانات المحلية السابقة للسحابة
    const localContacts: Contact[]     = getLocalData('tajer_smart_contacts_v1', []);
    const localProducts: Product[]     = getLocalData('tajer_smart_products_v1', []);
    const localTx:       Transaction[] = getLocalData('tajer_smart_transactions_v1', []);

    if (localContacts.length > 0) {
      const res = await saveAllContactsToSupabase(localContacts);
      if (res.error) errors.push(res.error);
    }

    if (localProducts.length > 0) {
      const res = await saveAllProductsToSupabase(localProducts);
      if (res.error) errors.push(res.error);
    }

    for (const tx of localTx) {
      const res = await saveTransactionToSupabase(tx);
      if (res.error) errors.push(res.error);
    }

    // 2. جـلـب أحدث البيانات من السحابة وتعديل الذاكرة المحلية
    const cloudContacts = await fetchContactsFromSupabase();
    if (cloudContacts.error) errors.push(cloudContacts.error);
    else if (cloudContacts.data && cloudContacts.data.length > 0) {
      setLocalData('tajer_smart_contacts_v1', cloudContacts.data);
    }

    const cloudProducts = await fetchProductsFromSupabase();
    if (cloudProducts.error) errors.push(cloudProducts.error);
    else if (cloudProducts.data && cloudProducts.data.length > 0) {
      setLocalData('tajer_smart_products_v1', cloudProducts.data);
    }

    const cloudTx = await fetchTransactionsFromSupabase();
    if (cloudTx.error) errors.push(cloudTx.error);
    else if (cloudTx.data && cloudTx.data.length > 0) {
      setLocalData('tajer_smart_transactions_v1', cloudTx.data);
    }

    if (errors.length > 0) {
      return {
        success: false,
        errorDetails: errors.join(' | '),
        contactsCount: cloudContacts.data?.length || localContacts.length,
        productsCount: cloudProducts.data?.length || localProducts.length,
        transactionsCount: cloudTx.data?.length || localTx.length,
      };
    }

    return {
      success: true,
      contactsCount: cloudContacts.data?.length || localContacts.length,
      productsCount: cloudProducts.data?.length || localProducts.length,
      transactionsCount: cloudTx.data?.length || localTx.length,
    };
  } catch (err: any) {
    return {
      success: false,
      errorDetails: err?.message || 'تعذر الاتصال بخادم قاعدة البيانات السحابية',
      contactsCount: 0,
      productsCount: 0,
      transactionsCount: 0,
    };
  }
}
