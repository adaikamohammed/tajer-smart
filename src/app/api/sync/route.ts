import { NextResponse } from 'next/server';
import { getNeonSql, getDbConnectionString, getAvailableDbKeys, initTablesIfMissing } from '@/lib/db';

export async function GET() {
  const dbUrl = getDbConnectionString();
  const availableKeys = getAvailableDbKeys();
  return NextResponse.json({
    configured: Boolean(dbUrl),
    foundEnvKeys: availableKeys,
    connectionStatus: dbUrl ? 'قاعدة البيانات مسجلة وجاهزة' : 'لم يتم العثور على متغيرات الاتصال في Vercel',
  });
}

export async function POST(req: Request) {
  const dbUrl = getDbConnectionString();
  if (!dbUrl) {
    const availableKeys = getAvailableDbKeys();
    return NextResponse.json({
      success: false,
      error: `لم يتم العثور على رابط Vercel Postgres في متغيرات البيئة. المفاتيح المتوفرة: [${availableKeys.join(', ') || 'لا توجد'}]. يرجى الضغط على Connect في Vercel ثم Redeploy.`
    }, { status: 400 });
  }

  try {
    const query = getNeonSql();
    if (!query) {
      return NextResponse.json({ success: false, error: 'غير قادر على فتح الاتصال بقاعدة Vercel Postgres' }, { status: 500 });
    }

    // التأكد من وجود الجداول
    await initTablesIfMissing();

    const body = await req.json();
    const {
      contacts = [],
      products = [],
      transactions = [],
      deleted_contacts = [],
      deleted_products = [],
      deleted_transactions = []
    } = body;

    // 0. تنفيذ عمليات الحذف الحقيقية أولاً من السحابة لعدم عودتها أبداً
    for (const delId of deleted_contacts) {
      if (delId) await query`DELETE FROM contacts WHERE id = ${delId};`;
    }
    for (const delId of deleted_products) {
      if (delId) await query`DELETE FROM products WHERE id = ${delId};`;
    }
    for (const delId of deleted_transactions) {
      if (delId) await query`DELETE FROM transactions WHERE id = ${delId};`;
    }

    // 1. رفع وتحديث الأشخاص (contacts)
    for (const c of contacts) {
      if (c.id && c.name) {
        await query`
          INSERT INTO contacts (id, name, phone, photo_url, type, notes, category, location, credit_limit, balance)
          VALUES (${c.id}, ${c.name}, ${c.phone || null}, ${c.photo_url || null}, ${c.type || 'customer'}, ${c.notes || null}, ${c.category || null}, ${c.location || null}, ${c.credit_limit || 0}, ${c.balance || 0})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            photo_url = EXCLUDED.photo_url,
            type = EXCLUDED.type,
            notes = EXCLUDED.notes,
            category = EXCLUDED.category,
            location = EXCLUDED.location,
            credit_limit = EXCLUDED.credit_limit,
            balance = EXCLUDED.balance;
        `;
      }
    }

    // 2. رفع وتحديث المنتجات (products)
    for (const p of products) {
      if (p.id && p.name) {
        await query`
          INSERT INTO products (id, name, barcode, photo_url, category, unit_type, cost_price, retail_price, stock_quantity, min_stock_alert, expiry_date, expiry_alert_days)
          VALUES (${p.id}, ${p.name}, ${p.barcode || null}, ${p.photo_url || null}, ${p.category || null}, ${p.unit_type || null}, ${p.cost_price || 0}, ${p.retail_price || 0}, ${p.stock_quantity || 0}, ${p.min_stock_alert || 5}, ${p.expiry_date || null}, ${p.expiry_alert_days || 30})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            barcode = EXCLUDED.barcode,
            photo_url = EXCLUDED.photo_url,
            category = EXCLUDED.category,
            unit_type = EXCLUDED.unit_type,
            cost_price = EXCLUDED.cost_price,
            retail_price = EXCLUDED.retail_price,
            stock_quantity = EXCLUDED.stock_quantity,
            min_stock_alert = EXCLUDED.min_stock_alert,
            expiry_date = EXCLUDED.expiry_date,
            expiry_alert_days = EXCLUDED.expiry_alert_days;
        `;
      }
    }

    // 3. رفع وتحديث العمليات (transactions)
    for (const tx of transactions) {
      if (tx.id) {
        await query`
          INSERT INTO transactions (id, tx_type, contact_id, contact_name, total_amount, paid_amount, debt_amount, status, notes)
          VALUES (${tx.id}, ${tx.tx_type}, ${tx.contact_id || null}, ${tx.contact_name || null}, ${tx.total_amount || 0}, ${tx.paid_amount || 0}, ${tx.debt_amount || 0}, ${tx.status || 'PAID'}, ${tx.notes || null})
          ON CONFLICT (id) DO UPDATE SET
            tx_type = EXCLUDED.tx_type,
            contact_id = EXCLUDED.contact_id,
            contact_name = EXCLUDED.contact_name,
            total_amount = EXCLUDED.total_amount,
            paid_amount = EXCLUDED.paid_amount,
            debt_amount = EXCLUDED.debt_amount,
            status = EXCLUDED.status,
            notes = EXCLUDED.notes;
        `;

        if (tx.items && tx.items.length > 0) {
          for (const item of tx.items) {
            await query`
              INSERT INTO transaction_items (transaction_id, product_id, product_name, quantity, unit_price, cost_price)
              VALUES (${tx.id}, ${item.product_id || null}, ${item.product_name || null}, ${item.quantity || 0}, ${item.unit_price || 0}, ${item.cost_price || 0});
            `;
          }
        }
      }
    }

    // 4. جلب البيانات الموحدة الكاملة من Vercel Postgres
    const cloudContacts     = await query`SELECT * FROM contacts ORDER BY created_at DESC;`;
    const cloudProducts     = await query`SELECT * FROM products ORDER BY created_at DESC;`;
    const cloudTx           = await query`SELECT * FROM transactions ORDER BY created_at DESC;`;
    const cloudItems        = await query`SELECT * FROM transaction_items;`;

    const fullTransactions = cloudTx.map((tx: any) => ({
      ...tx,
      items: cloudItems.filter((it: any) => it.transaction_id === tx.id),
    }));

    return NextResponse.json({
      success: true,
      contacts: cloudContacts,
      products: cloudProducts,
      transactions: fullTransactions,
    });
  } catch (err: any) {
    console.error('Vercel Postgres sync error:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'حدث خطأ أثناء المزامنة مع Vercel Postgres'
    }, { status: 500 });
  }
}
