-- 修复 account_transactions 表的 RLS 策略
-- 问题：商户无法通过客户端插入交易记录（手机端快捷记账功能）
-- 解决：允许商户插入和管理自己店铺的交易记录

-- 启用 RLS（如果尚未启用）
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;

-- 删除旧的插入策略（如果存在）
DROP POLICY IF EXISTS "Merchants can insert own transactions" ON account_transactions;
DROP POLICY IF EXISTS "Merchants can view own transactions" ON account_transactions;
DROP POLICY IF EXISTS "Merchants can update own transactions" ON account_transactions;
DROP POLICY IF EXISTS "Merchants can delete own transactions" ON account_transactions;

-- 创建新的 RLS 策略

-- 1. 商户可以查看自己店铺的交易记录
CREATE POLICY "Merchants can view own transactions"
ON account_transactions
FOR SELECT
USING (
  merchant_id IN (
    SELECT merchant_id FROM merchants WHERE owner_id = auth.uid()
  )
);

-- 2. 商户可以插入自己店铺的交易记录
CREATE POLICY "Merchants can insert own transactions"
ON account_transactions
FOR INSERT
WITH CHECK (
  merchant_id IN (
    SELECT merchant_id FROM merchants WHERE owner_id = auth.uid()
  )
);

-- 3. 商户可以更新自己店铺的交易记录（仅当 is_editable = true）
CREATE POLICY "Merchants can update own transactions"
ON account_transactions
FOR UPDATE
USING (
  merchant_id IN (
    SELECT merchant_id FROM merchants WHERE owner_id = auth.uid()
  )
  AND is_editable = true
);

-- 4. 商户可以删除自己店铺的交易记录（仅当 is_deletable = true）
-- 实际上使用软删除（设置 deleted_at）
CREATE POLICY "Merchants can delete own transactions"
ON account_transactions
FOR DELETE
USING (
  merchant_id IN (
    SELECT merchant_id FROM merchants WHERE owner_id = auth.uid()
  )
  AND is_deletable = true
);

-- 添加注释
COMMENT ON POLICY "Merchants can view own transactions" ON account_transactions IS '商户可以查看自己店铺的交易记录';
COMMENT ON POLICY "Merchants can insert own transactions" ON account_transactions IS '商户可以插入自己店铺的交易记录（用于快捷记账功能）';
COMMENT ON POLICY "Merchants can update own transactions" ON account_transactions IS '商户可以更新自己店铺可编辑的交易记录';
COMMENT ON POLICY "Merchants can delete own transactions" ON account_transactions IS '商户可以删除自己店铺可删除的交易记录';
