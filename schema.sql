-- -------------------------------------------------------------
-- 📦 قاعدة بيانات "التاجر الذكي المتنقل" (Tajer Smart Database Schema)
-- -------------------------------------------------------------

-- 1. جدول الأشخاص (الموردين والزبائن)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  type TEXT CHECK (type IN ('customer', 'supplier', 'both')) DEFAULT 'customer',
  notes TEXT,
  balance NUMERIC DEFAULT 0, -- موجب = دين لنا على الزبون | سالب = مستحق علينا للمورد
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول المنتجات (المخزن والأسعار)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  barcode TEXT,
  photo_url TEXT,
  cost_price NUMERIC DEFAULT 0,     -- سعر الشراء بالجملة
  retail_price NUMERIC DEFAULT 0,   -- سعر البيع بالتجزئة
  stock_quantity NUMERIC DEFAULT 0,  -- كمية المخزون بالحبة
  min_stock_alert NUMERIC DEFAULT 5, -- حد التنبيه بالنقص
  expiry_date DATE,                  -- تاريخ انتهاء الصلاحية
  last_purchased_at TIMESTAMPTZ,     -- متى تم شراؤها مؤخراً
  last_sold_at TIMESTAMPTZ,          -- متى تم بيع آخر قطعة
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. سجل العمليات الرئيسية (شراء من مورد / بيع لزبون)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_type TEXT CHECK (tx_type IN ('PURCHASE', 'SALE')) NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  total_amount NUMERIC NOT NULL,
  paid_amount NUMERIC DEFAULT 0,
  debt_amount NUMERIC DEFAULT 0,
  status TEXT CHECK (status IN ('PAID', 'PARTIAL', 'DEBT')) DEFAULT 'PAID',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. تفاصيل عناصر العملية (المنتجات وسعر الجملة/التجزئة في اللحظة نفسها)
CREATE TABLE IF NOT EXISTS transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,  -- السعر الفعلي بالعملية (تجزئة عند البيع / جملة عند الشراء)
  cost_price NUMERIC NOT NULL,  -- سعر التكلفة بالجملة وقت العملية لحساب صافي الأرباح
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. سجل الدفعات وسداد الديون الفردية
CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_type TEXT CHECK (payment_type IN ('COLLECTED', 'PAID_OUT')) NOT NULL, -- COLLECTED = تحصيل من زبون | PAID_OUT = دفع للمورد
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 📊 بيانات تجريبية سريعة للتاجر المتنقل (Seed Data)
-- -------------------------------------------------------------

INSERT INTO contacts (name, phone, type, balance, notes) VALUES
('أحمد التاجر (مورد جملة)', '213550123456', 'supplier', -15000, 'مورد زيوت ومواد غذائية بالجملة'),
('محمد العماري (زبون محل)', '213661987654', 'customer', 4500, 'زبون دائم لديه دين متبقي'),
('شركة البركة للاستيراد', '213770112233', 'supplier', 0, 'مورد شوكولاتة وحلويات'),
('كريم البقال', '213540998877', 'customer', 2000, 'محل بالتقسيط');

INSERT INTO products (name, cost_price, retail_price, stock_quantity, min_stock_alert, expiry_date, last_purchased_at) VALUES
('زيت زيتون ممتاز 1 لتر', 800, 1100, 45, 10, '2027-06-01', NOW()),
('عسل سدر طبيعي 500غ', 2500, 3400, 18, 5, '2028-01-15', NOW()),
('علبة شوكولاتة فاخرة 24 قطعة', 1200, 1700, 8, 10, '2026-11-30', NOW()),
('تمر مجدول ممتاز 1 كغ', 900, 1300, 60, 15, '2027-02-28', NOW());
