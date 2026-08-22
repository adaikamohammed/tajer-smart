-- -------------------------------------------------------------
-- 📦 قاعدة بيانات "التاجر الذكي المتنقل" المزامنة سحابياً (Tajer Smart Database Schema)
-- -------------------------------------------------------------

-- 1. جدول الأشخاص (الموردين والزبائن)
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
  balance NUMERIC DEFAULT 0, -- موجب = دين لنا على الزبون | سالب = مستحق علينا للمورد
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول المنتجات (المخزن والأسعار)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  barcode TEXT,
  photo_url TEXT,
  category TEXT,
  unit_type TEXT,
  cost_price NUMERIC DEFAULT 0,     -- سعر الشراء بالجملة
  retail_price NUMERIC DEFAULT 0,   -- سعر البيع بالتجزئة
  stock_quantity NUMERIC DEFAULT 0,  -- كمية المخزون بالحبة
  min_stock_alert NUMERIC DEFAULT 5, -- حد التنبيه بالنقص
  expiry_date DATE,                  -- تاريخ انتهاء الصلاحية
  expiry_alert_days NUMERIC DEFAULT 30,
  last_purchased_at TIMESTAMPTZ,     -- متى تم شراؤها مؤخراً
  last_sold_at TIMESTAMPTZ,          -- متى تم بيع آخر قطعة
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. سجل العمليات الرئيسية (شراء من مورد / بيع لزبون)
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

-- 4. تفاصيل عناصر العملية (المنتجات وسعر الجملة/التجزئة في اللحظة نفسها)
CREATE TABLE IF NOT EXISTS transaction_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  transaction_id TEXT REFERENCES transactions(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,  -- السعر الفعلي بالعملية (تجزئة عند البيع / جملة عند الشراء)
  cost_price NUMERIC NOT NULL,  -- سعر التكلفة بالجملة وقت العملية لحساب صافي الأرباح
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. سجل الدفعات وسداد الديون الفردية
CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  contact_id TEXT REFERENCES contacts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_type TEXT NOT NULL, -- COLLECTED = تحصيل من زبون | PAID_OUT = دفع للمورد
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. سجل الـ Tombstone (المحذوفات الدائمة — لمزامنة الحذف بين الأجهزة)
CREATE TABLE IF NOT EXISTS deleted_items (
  id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, entity_type)
);
