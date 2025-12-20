-- =====================================================
-- 添加商户余额查询函数
-- 文件: 20251221_add_get_merchant_balance.sql
-- =====================================================

-- 创建商户余额查询函数
CREATE OR REPLACE FUNCTION get_merchant_balance(p_merchant_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  current_balance DECIMAL(10,2);
BEGIN
  -- 从最后一笔完成的交易获取余额
  SELECT balance_after INTO current_balance
  FROM merchant_transactions
  WHERE merchant_id = p_merchant_id
    AND status = 'completed'
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN COALESCE(current_balance, 0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_merchant_balance IS '获取商户钱包余额（从最后一笔交易的balance_after字段）';

-- 验证函数创建
DO $$
BEGIN
  RAISE NOTICE 'Successfully created get_merchant_balance function';
END $$;
