-- 修复 merchant_product_categories 表的 RLS 策略
-- 问题：手机端无法查询商户自定义类目
-- 解决：允许商户查询和管理自己的商品类目

-- 启用 RLS（如果尚未启用）
ALTER TABLE merchant_product_categories ENABLE ROW LEVEL SECURITY;

-- 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "Merchants can view own categories" ON merchant_product_categories;
DROP POLICY IF EXISTS "Merchants can insert own categories" ON merchant_product_categories;
DROP POLICY IF EXISTS "Merchants can update own categories" ON merchant_product_categories;
DROP POLICY IF EXISTS "Merchants can delete own categories" ON merchant_product_categories;

-- 1. 商户可以查看自己的类目
CREATE POLICY "Merchants can view own categories"
ON merchant_product_categories
FOR SELECT
USING (
  merchant_id IN (
    SELECT merchant_id FROM merchants WHERE owner_id = auth.uid()
  )
);

-- 2. 商户可以创建自己的类目
CREATE POLICY "Merchants can insert own categories"
ON merchant_product_categories
FOR INSERT
WITH CHECK (
  merchant_id IN (
    SELECT merchant_id FROM merchants WHERE owner_id = auth.uid()
  )
);

-- 3. 商户可以更新自己的类目
CREATE POLICY "Merchants can update own categories"
ON merchant_product_categories
FOR UPDATE
USING (
  merchant_id IN (
    SELECT merchant_id FROM merchants WHERE owner_id = auth.uid()
  )
);

-- 4. 商户可以删除自己的类目
CREATE POLICY "Merchants can delete own categories"
ON merchant_product_categories
FOR DELETE
USING (
  merchant_id IN (
    SELECT merchant_id FROM merchants WHERE owner_id = auth.uid()
  )
);

-- 添加注释
COMMENT ON POLICY "Merchants can view own categories" ON merchant_product_categories IS '商户可以查看自己的商品类目';
COMMENT ON POLICY "Merchants can insert own categories" ON merchant_product_categories IS '商户可以创建自己的商品类目';
COMMENT ON POLICY "Merchants can update own categories" ON merchant_product_categories IS '商户可以更新自己的商品类目';
COMMENT ON POLICY "Merchants can delete own categories" ON merchant_product_categories IS '商户可以删除自己的商品类目';
