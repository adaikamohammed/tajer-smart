import { sql } from '@vercel/postgres';
import { neon } from '@neondatabase/serverless';

export const isVercelDbConfigured = Boolean(
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL
);

export function getNeonSql() {
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
  if (!dbUrl) return null;
  return neon(dbUrl);
}

/** إنشاء الجداول الأساسية تلقائياً إذا لم تكن موجودة في قاعدة بيانات Vercel Postgres */
export async function initTablesIfMissing() {
  if (!isVercelDbConfigured) return false;
  try {
    const query = getNeonSql();
    if (!query) return false;

    await query`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        photo_url TEXT,
        type TEXT DEFAULT 'customer',
        notes TEXT,
        category TEXT,
        location TEXT,
        credit_limit NUMERIC,
        balance NUMERIC DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await query`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        barcode TEXT,
        photo_url TEXT,
        category TEXT,
        unit_type TEXT,
        cost_price NUMERIC DEFAULT 0,
        retail_price NUMERIC DEFAULT 0,
        stock_quantity NUMERIC DEFAULT 0,
        min_stock_alert NUMERIC DEFAULT 5,
        expiry_date DATE,
        expiry_alert_days NUMERIC DEFAULT 30,
        last_purchased_at TIMESTAMPTZ,
        last_sold_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await query`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        tx_type TEXT NOT NULL,
        contact_id TEXT,
        contact_name TEXT,
        total_amount NUMERIC NOT NULL,
        paid_amount NUMERIC DEFAULT 0,
        debt_amount NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'PAID',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await query`
      CREATE TABLE IF NOT EXISTS transaction_items (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        transaction_id TEXT REFERENCES transactions(id) ON DELETE CASCADE,
        product_id TEXT,
        product_name TEXT,
        quantity NUMERIC NOT NULL,
        unit_price NUMERIC NOT NULL,
        cost_price NUMERIC NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    return true;
  } catch (err) {
    console.error('Error initializing tables:', err);
    return false;
  }
}
