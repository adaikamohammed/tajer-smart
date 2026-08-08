import { NextResponse } from 'next/server';
import { getNeonSql, isVercelDbConfigured } from '@/lib/db';

export async function POST() {
  if (!isVercelDbConfigured) {
    return NextResponse.json({ success: false, error: 'لم يتم ربط Vercel Postgres بنجاح بعد' }, { status: 400 });
  }

  try {
    const query = getNeonSql();
    if (!query) {
      return NextResponse.json({ success: false, error: 'غير قادر على الاتصال بقاعدة Vercel' }, { status: 500 });
    }

    // تفريغ كافة الجداول سحابياً للبدء ببيانات جديدة وصافية
    await query`TRUNCATE TABLE transaction_items, transactions, products, contacts CASCADE;`;

    return NextResponse.json({
      success: true,
      message: 'تم تفريغ وتصفير قاعدة البيانات السحابية بالكامل للبدء ببيانات حقيقية جديدة'
    });
  } catch (err: any) {
    console.error('Reset DB error:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'حدث خطأ أثناء تصفير قاعدة البيانات'
    }, { status: 500 });
  }
}
