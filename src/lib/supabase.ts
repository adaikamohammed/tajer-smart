import { createClient } from '@supabase/supabase-js';
import { Contact, Product, Transaction, DebtPayment } from './store';

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

export async function saveDebtPaymentToSupabase(payment: DebtPayment): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('debt_payments').upsert(payment);
    if (error) console.error('Supabase debt payment error:', error);
    return !error;
  } catch (err) {
    console.error('Supabase debt payment exception:', err);
    return false;
  }
}
