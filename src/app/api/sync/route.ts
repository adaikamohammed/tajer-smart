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
      error: `لم يتم العثور على رابط Vercel Postgres. المفاتيح المتوفرة: [${availableKeys.join(', ') || 'لا توجد'}].`
    }, { status: 400 });
  }

  try {
    const query = getNeonSql()!;

    await initTablesIfMissing();

    // ─── 0. التطهير السحابي التلقائي لكافة البيانات الوهمية القديمة ───
    await query`DELETE FROM contacts WHERE id LIKE '%_seed_%';`;
    await query`DELETE FROM products WHERE id LIKE '%_seed_%';`;
    await query`DELETE FROM transactions WHERE id LIKE '%_seed_%';`;
    await query`DELETE FROM transaction_items WHERE product_id LIKE '%_seed_%' OR transaction_id LIKE '%_seed_%';`;
    await query`DELETE FROM deleted_items WHERE id LIKE '%_seed_%';`;

    const body = await req.json();
    const {
      contacts = [],
      products = [],
      transactions = [],
      deleted_contacts = [],
      deleted_products = [],
      deleted_transactions = []
    } = body;

    const delC  = (deleted_contacts  as string[]).filter(Boolean);
    const delP  = (deleted_products  as string[]).filter(Boolean);
    const delTx = (deleted_transactions as string[]).filter(Boolean);

    // ─── 1. تسجيل المحذوفات في Tombstone الدائم + حذفها من جداولها ───
    // هذا يضمن أن أي جهاز آخر لن يعيد إدخالها مطلقاً
    const tombstoneInserts: Promise<any>[] = [];
    const hardDeletes: Promise<any>[] = [];

    for (const id of delC) {
      tombstoneInserts.push(
        query`INSERT INTO deleted_items (id, entity_type) VALUES (${id}, 'contact') ON CONFLICT DO NOTHING;`
      );
      hardDeletes.push(query`DELETE FROM contacts WHERE id = ${id};`);
    }
    for (const id of delP) {
      tombstoneInserts.push(
        query`INSERT INTO deleted_items (id, entity_type) VALUES (${id}, 'product') ON CONFLICT DO NOTHING;`
      );
      hardDeletes.push(query`DELETE FROM products WHERE id = ${id};`);
    }
    for (const id of delTx) {
      tombstoneInserts.push(
        query`INSERT INTO deleted_items (id, entity_type) VALUES (${id}, 'transaction') ON CONFLICT DO NOTHING;`
      );
      hardDeletes.push(query`DELETE FROM transactions WHERE id = ${id};`);
    }

    if (tombstoneInserts.length > 0) await Promise.all(tombstoneInserts);
    if (hardDeletes.length > 0)     await Promise.all(hardDeletes);

    // ─── 2. جلب قوائم الـ Tombstone لفلترة أي بيانات قادمة ───
    const tombstones = await query`SELECT id, entity_type FROM deleted_items;`;
    const deadContacts  = new Set(tombstones.filter((r: any) => r.entity_type === 'contact').map((r: any) => r.id));
    const deadProducts  = new Set(tombstones.filter((r: any) => r.entity_type === 'product').map((r: any) => r.id));
    const deadTx        = new Set(tombstones.filter((r: any) => r.entity_type === 'transaction').map((r: any) => r.id));

    // ─── 3. Upsert بالتوازي — مع تجاهل أي عنصر محذوف أو وهمي ───
    const isSeed = (id: string) => !id || String(id).includes('_seed_') || String(id).toLowerCase().includes('seed');
    const validContacts     = (contacts     as any[]).filter(c => c.id && c.name && !deadContacts.has(c.id) && !isSeed(c.id));
    const validProducts     = (products     as any[]).filter(p => p.id && p.name && !deadProducts.has(p.id) && !isSeed(p.id));
    const validTransactions = (transactions as any[]).filter(t => t.id           && !deadTx.has(t.id)        && !isSeed(t.id));

    if (validContacts.length > 0) {
      await Promise.all(validContacts.map((c: any) => query`
        INSERT INTO contacts (id, name, phone, photo_url, type, notes, category, location, credit_limit, balance)
        VALUES (${c.id}, ${c.name}, ${c.phone || null}, ${c.photo_url || null},
                ${c.type || 'customer'}, ${c.notes || null}, ${c.category || null},
                ${c.location || null}, ${c.credit_limit || 0}, ${c.balance || 0})
        ON CONFLICT (id) DO UPDATE SET
          name         = EXCLUDED.name,
          phone        = EXCLUDED.phone,
          photo_url    = EXCLUDED.photo_url,
          type         = EXCLUDED.type,
          notes        = EXCLUDED.notes,
          category     = EXCLUDED.category,
          location     = EXCLUDED.location,
          credit_limit = EXCLUDED.credit_limit,
          balance      = EXCLUDED.balance;
      `));
    }

    if (validProducts.length > 0) {
      await Promise.all(validProducts.map((p: any) => query`
        INSERT INTO products (id, name, barcode, photo_url, category, unit_type,
                              cost_price, retail_price, stock_quantity, min_stock_alert,
                              expiry_date, expiry_alert_days)
        VALUES (${p.id}, ${p.name}, ${p.barcode || null}, ${p.photo_url || null},
                ${p.category || null}, ${p.unit_type || null},
                ${p.cost_price || 0}, ${p.retail_price || 0}, ${p.stock_quantity || 0},
                ${p.min_stock_alert || 5}, ${p.expiry_date || null}, ${p.expiry_alert_days || 30})
        ON CONFLICT (id) DO UPDATE SET
          name           = EXCLUDED.name,
          barcode        = EXCLUDED.barcode,
          photo_url      = EXCLUDED.photo_url,
          category       = EXCLUDED.category,
          unit_type      = EXCLUDED.unit_type,
          cost_price     = EXCLUDED.cost_price,
          retail_price   = EXCLUDED.retail_price,
          stock_quantity = EXCLUDED.stock_quantity,
          min_stock_alert= EXCLUDED.min_stock_alert,
          expiry_date    = EXCLUDED.expiry_date,
          expiry_alert_days = EXCLUDED.expiry_alert_days;
      `));
    }

    if (validTransactions.length > 0) {
      await Promise.all(validTransactions.map(async (tx: any) => {
        await query`
          INSERT INTO transactions (id, tx_type, contact_id, contact_name,
                                    total_amount, paid_amount, debt_amount, status, notes)
          VALUES (${tx.id}, ${tx.tx_type}, ${tx.contact_id || null}, ${tx.contact_name || null},
                  ${tx.total_amount || 0}, ${tx.paid_amount || 0}, ${tx.debt_amount || 0},
                  ${tx.status || 'PAID'}, ${tx.notes || null})
          ON CONFLICT (id) DO UPDATE SET
            tx_type      = EXCLUDED.tx_type,
            contact_id   = EXCLUDED.contact_id,
            contact_name = EXCLUDED.contact_name,
            total_amount = EXCLUDED.total_amount,
            paid_amount  = EXCLUDED.paid_amount,
            debt_amount  = EXCLUDED.debt_amount,
            status       = EXCLUDED.status,
            notes        = EXCLUDED.notes;
        `;
        if (tx.items?.length > 0) {
          // 1. مسح أي سجلات قديمة للمعاملة في القاعدة قبل إعادة الإدخال النظيف لمنع التكرار
          await query`DELETE FROM transaction_items WHERE transaction_id = ${tx.id};`;
          await Promise.all((tx.items as any[]).map((item: any) => query`
            INSERT INTO transaction_items (transaction_id, product_id, product_name, quantity, unit_price, cost_price)
            VALUES (${tx.id}, ${item.product_id || null}, ${item.product_name || null},
                    ${item.quantity || 0}, ${item.unit_price || 0}, ${item.cost_price || 0});
          `));
        }
      }));
    }

    // ─── 4. إرجاع البيانات المفلترة — مع تنقية الأوصال ومنع التكرار ───
    const [cloudContacts, cloudProducts, cloudTx, cloudItems] = await Promise.all([
      query`SELECT * FROM contacts  WHERE id NOT IN (SELECT id FROM deleted_items WHERE entity_type='contact')    ORDER BY created_at DESC;`,
      query`SELECT * FROM products  WHERE id NOT IN (SELECT id FROM deleted_items WHERE entity_type='product')    ORDER BY created_at DESC;`,
      query`SELECT * FROM transactions WHERE id NOT IN (SELECT id FROM deleted_items WHERE entity_type='transaction') ORDER BY created_at DESC;`,
      query`SELECT * FROM transaction_items;`,
    ]);

    const fullTransactions = (cloudTx as any[]).map((tx: any) => {
      const rawItems = (cloudItems as any[]).filter((it: any) => it.transaction_id === tx.id);
      const seen = new Set<string>();
      const cleanItems = rawItems.filter((it: any) => {
        const key = `${it.product_id || ''}_${it.product_name || ''}_${it.quantity}_${it.unit_price}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return {
        ...tx,
        items: cleanItems,
      };
    });

    return NextResponse.json({
      success: true,
      contacts:     cloudContacts,
      products:     cloudProducts,
      transactions: fullTransactions,
    });
  } catch (err: any) {
    console.error('Sync error:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'خطأ في المزامنة'
    }, { status: 500 });
  }
}
