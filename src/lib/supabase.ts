import { createClient } from '@supabase/supabase-js';
import { Contact, Product, Transaction, DebtPayment, getLocalData, setLocalData } from './store';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// -------------------------------------------------------------
// 🔄 خدمات مزامنة Supabase مع دعم النمط الهجين (Hybrid Mode)
// -------------------------------------------------------------

export async function fetchContactsFromSupabase(): Promise<Contact[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase fetch contacts error:', error);
      return null;
    }
    return data as Contact[];
  } catch (err) {
    console.error('Supabase fetch contacts exception:', err);
    return null;
  }
}

export async function saveContactToSupabase(contact: Contact): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('contacts').upsert(contact);
    if (error) console.error('Supabase upsert contact error:', error);
    return !error;
  } catch (err) {
    console.error('Supabase upsert contact exception:', err);
    return false;
  }
}

export async function saveAllContactsToSupabase(contacts: Contact[]): Promise<boolean> {
  if (!supabase || contacts.length === 0) return false;
  try {
    const { error } = await supabase.from('contacts').upsert(contacts);
    if (error) console.error('Supabase batch contacts upsert error:', error);
    return !error;
  } catch (err) {
    return false;
  }
}

export async function fetchProductsFromSupabase(): Promise<Product[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase fetch products error:', error);
      return null;
    }
    return data as Product[];
  } catch (err) {
    console.error('Supabase fetch products exception:', err);
    return null;
  }
}

export async function saveProductToSupabase(product: Product): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('products').upsert(product);
    if (error) console.error('Supabase upsert product error:', error);
    return !error;
  } catch (err) {
    console.error('Supabase upsert product exception:', err);
    return false;
  }
}

export async function saveAllProductsToSupabase(products: Product[]): Promise<boolean> {
  if (!supabase || products.length === 0) return false;
  try {
    const { error } = await supabase.from('products').upsert(products);
    if (error) console.error('Supabase batch products upsert error:', error);
    return !error;
  } catch (err) {
    return false;
  }
}

export async function fetchTransactionsFromSupabase(): Promise<Transaction[] | null> {
  if (!supabase) return null;
  try {
    const { data: txData, error: txError } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
    if (txError || !txData) return null;

    const { data: itemsData } = await supabase.from('transaction_items').select('*');
    
    const transactionsWithItems: Transaction[] = txData.map(tx => ({
      ...tx,
      items: (itemsData || []).filter(item => item.transaction_id === tx.id),
    }));

    return transactionsWithItems;
  } catch (err) {
    console.error('Supabase fetch transactions exception:', err);
    return null;
  }
}

export async function saveTransactionToSupabase(tx: Transaction): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { items, ...txData } = tx;
    const { error: txError } = await supabase.from('transactions').upsert(txData);
    if (txError) {
      console.error('Supabase transaction upsert error:', txError);
      return false;
    }

    if (items && items.length > 0) {
      const dbItems = items.map(item => ({
        transaction_id: tx.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        cost_price: item.cost_price,
      }));
      await supabase.from('transaction_items').upsert(dbItems);
    }
    return true;
  } catch (err) {
    console.error('Supabase save transaction exception:', err);
    return false;
  }
}

/** المزامنة الشاملة بين السحابة والتخزين المحلي لتوحيد البيانات على جميع الأجهزة */
export async function syncFullStoreWithCloud(): Promise<{
  success: boolean;
  contactsCount: number;
  productsCount: number;
  transactionsCount: number;
}> {
  if (!supabase) {
    return { success: false, contactsCount: 0, productsCount: 0, transactionsCount: 0 };
  }

  try {
    // 1. أولاً رفع البيانات المحلية الموجودة للسحابة لعدم ضياع أي إضافة جديدة
    const localContacts: Contact[]     = getLocalData('tajer_smart_contacts_v1', []);
    const localProducts: Product[]     = getLocalData('tajer_smart_products_v1', []);
    const localTx:       Transaction[] = getLocalData('tajer_smart_transactions_v1', []);

    if (localContacts.length > 0) await saveAllContactsToSupabase(localContacts);
    if (localProducts.length > 0) await saveAllProductsToSupabase(localProducts);
    for (const tx of localTx) {
      await saveTransactionToSupabase(tx);
    }

    // 2. ثانياً جلب أحدث البيانات من السحابة وتحديث التخزين المحلي بها
    const cloudContacts = await fetchContactsFromSupabase();
    const cloudProducts = await fetchProductsFromSupabase();
    const cloudTx       = await fetchTransactionsFromSupabase();

    if (cloudContacts && cloudContacts.length > 0) {
      setLocalData('tajer_smart_contacts_v1', cloudContacts);
    }
    if (cloudProducts && cloudProducts.length > 0) {
      setLocalData('tajer_smart_products_v1', cloudProducts);
    }
    if (cloudTx && cloudTx.length > 0) {
      setLocalData('tajer_smart_transactions_v1', cloudTx);
    }

    return {
      success: true,
      contactsCount: cloudContacts?.length || localContacts.length,
      productsCount: cloudProducts?.length || localProducts.length,
      transactionsCount: cloudTx?.length || localTx.length,
    };
  } catch (err) {
    console.error('Sync error:', err);
    return { success: false, contactsCount: 0, productsCount: 0, transactionsCount: 0 };
  }
}
