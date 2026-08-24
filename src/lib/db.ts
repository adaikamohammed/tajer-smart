import { neon } from '@neondatabase/serverless';

export function getDbConnectionString(): string | null {
  const isValidUrl = (val?: string): val is string =>
    Boolean(val && (val.startsWith('postgres://') || val.startsWith('postgresql://')));

  if (isValidUrl(process.env.TAJER_POSTGRES_POSTGRES_URL)) return process.env.TAJER_POSTGRES_POSTGRES_URL;
  if (isValidUrl(process.env.TAJER_POSTGRES_DATABASE_URL)) return process.env.TAJER_POSTGRES_DATABASE_URL;
  if (isValidUrl(process.env.POSTGRES_URL)) return process.env.POSTGRES_URL;
  if (isValidUrl(process.env.DATABASE_URL)) return process.env.DATABASE_URL;
  if (isValidUrl(process.env.POSTGRES_PRISMA_URL)) return process.env.POSTGRES_PRISMA_URL;
  if (isValidUrl(process.env.POSTGRES_URL_NON_POOLING)) return process.env.POSTGRES_URL_NON_POOLING;
  if (isValidUrl(process.env.STORAGE_URL)) return process.env.STORAGE_URL;
  if (isValidUrl(process.env.STORAGE_POSTGRES_URL)) return process.env.STORAGE_POSTGRES_URL;

  if (typeof process !== 'undefined' && process.env) {
    for (const key of Object.keys(process.env)) {
      if ((key.includes('POSTGRES') || key.includes('DATABASE') || key.includes('NEON') || key.includes('STORAGE')) && key.endsWith('_URL')) {
        const val = process.env[key];
        if (isValidUrl(val)) {
          return val;
        }
      }
    }
  }
  return null;
}

export function getAvailableDbKeys(): string[] {
  const keys: string[] = [];
  if (typeof process !== 'undefined' && process.env) {
    for (const key of Object.keys(process.env)) {
      if (key.includes('POSTGRES') || key.includes('DATABASE') || key.includes('NEON') || key.includes('STORAGE')) {
        keys.push(key);
      }
    }
  }
  return keys;
}

export const isVercelDbConfigured = Boolean(getDbConnectionString());

export function getNeonSql() {
  const dbUrl = getDbConnectionString();
  if (!dbUrl) return null;
  return neon(dbUrl);
}

export async function initTablesIfMissing() {
  const query = getNeonSql();
  if (!query) return false;
  try {
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
        unit_type TEXT DEFAULT 'piece',
        pack_quantity NUMERIC DEFAULT 1,
        cost_price NUMERIC DEFAULT 0,
        retail_price NUMERIC DEFAULT 0,
        retail_price_2 NUMERIC DEFAULT 0,
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
        previous_balance NUMERIC DEFAULT 0,
        final_balance NUMERIC DEFAULT 0,
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
        packs_count NUMERIC,
        loose_count NUMERIC,
        pack_quantity NUMERIC DEFAULT 1,
        unit_type TEXT,
        unit_price NUMERIC NOT NULL,
        cost_price NUMERIC NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    // ─── جدول الـ Tombstone: يحفظ كل محذوف بشكل دائم لا يُعاد أبداً ───
    await query`
      CREATE TABLE IF NOT EXISTS deleted_items (
        id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        deleted_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (id, entity_type)
      );
    `;

    // ─── Migrations: تحديث الأعمدة للجداول المنشأة مسبقاً ───
    await query`ALTER TABLE products ADD COLUMN IF NOT EXISTS pack_quantity NUMERIC DEFAULT 1;`;
    await query`ALTER TABLE products ADD COLUMN IF NOT EXISTS retail_price_2 NUMERIC DEFAULT 0;`;
    await query`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS previous_balance NUMERIC DEFAULT 0;`;
    await query`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS final_balance NUMERIC DEFAULT 0;`;
    await query`ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS packs_count NUMERIC;`;
    await query`ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS loose_count NUMERIC;`;
    await query`ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS pack_quantity NUMERIC DEFAULT 1;`;
    await query`ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS unit_type TEXT;`;

    return true;
  } catch (err) {
    console.error('Error initializing tables / running migrations:', err);
    return false;
  }
}
