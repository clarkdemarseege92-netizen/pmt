-- 商户钱包提现表
-- 用于管理商户从平台钱包提现到银行账户的请求

-- 1. 创建商户提现表
CREATE TABLE IF NOT EXISTS merchant_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,                  -- 提现金额
  fee DECIMAL(10,2) NOT NULL DEFAULT 0,           -- 手续费
  net_amount DECIMAL(10,2) NOT NULL,              -- 实际到账金额
  bank_name VARCHAR(100) NOT NULL,                -- 银行名称
  bank_account VARCHAR(50) NOT NULL,              -- 银行账号
  account_name VARCHAR(100) NOT NULL,             -- 账户名称
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending/processing/completed/rejected
  transaction_id BIGINT REFERENCES merchant_transactions(id), -- 关联的交易记录（扣款）
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id),      -- 处理人员
  admin_note TEXT,                                -- 管理员备注
  rejection_reason TEXT,                          -- 拒绝原因
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_merchant_withdrawals_merchant ON merchant_withdrawals(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_withdrawals_status ON merchant_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_merchant_withdrawals_requested ON merchant_withdrawals(requested_at DESC);

-- 3. RLS 策略
ALTER TABLE merchant_withdrawals ENABLE ROW LEVEL SECURITY;

-- 商户可以查看自己的提现记录
CREATE POLICY "Merchants can view own withdrawals" ON merchant_withdrawals
  FOR SELECT
  USING (
    merchant_id IN (
      SELECT m.merchant_id FROM merchants m WHERE m.owner_id = auth.uid()
    )
  );

-- 商户可以创建提现申请
CREATE POLICY "Merchants can create withdrawals" ON merchant_withdrawals
  FOR INSERT
  WITH CHECK (
    merchant_id IN (
      SELECT m.merchant_id FROM merchants m WHERE m.owner_id = auth.uid()
    )
  );

-- 管理员可以查看所有提现记录
CREATE POLICY "Admins can view all withdrawals" ON merchant_withdrawals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 管理员可以更新提现状态
CREATE POLICY "Admins can update withdrawals" ON merchant_withdrawals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. 计算提现手续费的函数（2%，最低10泰铢）
CREATE OR REPLACE FUNCTION calculate_withdrawal_fee(amount DECIMAL(10,2))
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
  fee DECIMAL(10,2);
BEGIN
  fee := amount * 0.02;  -- 2% 手续费
  IF fee < 10 THEN
    fee := 10;  -- 最低10泰铢
  END IF;
  RETURN fee;
END;
$$;

-- 5. 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_merchant_withdrawal_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_merchant_withdrawal_timestamp
  BEFORE UPDATE ON merchant_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION update_merchant_withdrawal_timestamp();

-- 添加注释
COMMENT ON TABLE merchant_withdrawals IS '商户钱包提现记录表';
COMMENT ON COLUMN merchant_withdrawals.amount IS '提现金额（扣除手续费前）';
COMMENT ON COLUMN merchant_withdrawals.fee IS '手续费（2%，最低10泰铢）';
COMMENT ON COLUMN merchant_withdrawals.net_amount IS '实际到账金额（amount - fee）';
COMMENT ON COLUMN merchant_withdrawals.status IS '状态：pending-待审核, processing-处理中, completed-已完成, rejected-已拒绝';
