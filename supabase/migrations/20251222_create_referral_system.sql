-- =====================================================
-- KUMMAK 推荐系统数据库迁移
-- 创建日期: 2024-12-22
-- =====================================================

-- 1. 扩展 profiles 表
-- -----------------------------------------------------

-- 添加推荐码字段（每个商户唯一）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10) UNIQUE;

-- 添加推荐人字段（记录是谁推荐的）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);

-- 添加推荐余额（累计可提现金额）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_balance DECIMAL(10,2) DEFAULT 0;

-- 添加被推荐时间
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_at TIMESTAMPTZ;

-- 创建推荐码索引
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);

-- 2. 创建推荐返利记录表
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联信息
  referrer_id UUID NOT NULL REFERENCES profiles(id),      -- 推荐人
  referee_id UUID NOT NULL REFERENCES profiles(id),       -- 被推荐人

  -- 订阅信息
  subscription_plan VARCHAR(20) NOT NULL,                  -- standard/professional/enterprise
  subscription_amount DECIMAL(10,2) NOT NULL,              -- 订阅金额
  reward_amount DECIMAL(10,2) NOT NULL,                    -- 返利金额

  -- 状态
  status VARCHAR(20) DEFAULT 'pending',                    -- pending/approved/cancelled
  -- pending: 等待审批（1天后自动审批）
  -- approved: 已审批，已计入余额
  -- cancelled: 已取消（如退款）

  -- 时间信息
  eligible_at TIMESTAMPTZ NOT NULL,                        -- 可发放时间（订阅后1天）
  approved_at TIMESTAMPTZ,                                 -- 实际发放时间
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束：每个被推荐人只能触发一次返利
  CONSTRAINT unique_referee_reward UNIQUE (referee_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON referral_rewards(status, eligible_at);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_created ON referral_rewards(created_at DESC);

-- 3. 创建提现记录表
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS referral_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 用户信息
  user_id UUID NOT NULL REFERENCES profiles(id),

  -- 提现信息
  amount DECIMAL(10,2) NOT NULL,
  bank_account VARCHAR(100),                               -- 银行账户（建议加密存储）
  bank_name VARCHAR(100),                                  -- 银行名称
  account_name VARCHAR(100),                               -- 账户名

  -- 状态
  status VARCHAR(20) DEFAULT 'pending',                    -- pending/processing/completed/rejected
  -- pending: 待处理
  -- processing: 处理中
  -- completed: 已完成
  -- rejected: 已拒绝

  -- 时间信息
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  -- 管理员备注
  admin_note TEXT,
  processed_by UUID REFERENCES profiles(id)                -- 处理人
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_referral_withdrawals_user ON referral_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_withdrawals_status ON referral_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_referral_withdrawals_requested ON referral_withdrawals(requested_at DESC);

-- 4. 创建推荐码生成函数
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  chars VARCHAR(36) := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result VARCHAR(6) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * 36 + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. 为现有商户生成推荐码的函数
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION assign_referral_codes()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
  profile_record RECORD;
  new_code VARCHAR(6);
  code_exists BOOLEAN;
BEGIN
  FOR profile_record IN
    SELECT id FROM profiles WHERE referral_code IS NULL
  LOOP
    -- 生成唯一推荐码
    LOOP
      new_code := generate_referral_code();
      SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;

    -- 更新用户推荐码
    UPDATE profiles SET referral_code = new_code WHERE id = profile_record.id;
    updated_count := updated_count + 1;
  END LOOP;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建触发器：新用户自动生成推荐码
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code VARCHAR(6);
  code_exists BOOLEAN;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      new_code := generate_referral_code();
      SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.referral_code := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS trigger_auto_referral_code ON profiles;

-- 创建触发器
CREATE TRIGGER trigger_auto_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_code();

-- 7. 创建返利发放函数
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION process_pending_rewards()
RETURNS INTEGER AS $$
DECLARE
  processed_count INTEGER := 0;
  reward_record RECORD;
BEGIN
  -- 找到所有已到期的待处理返利
  FOR reward_record IN
    SELECT * FROM referral_rewards
    WHERE status = 'pending'
    AND eligible_at <= NOW()
  LOOP
    -- 更新返利状态
    UPDATE referral_rewards
    SET status = 'approved', approved_at = NOW()
    WHERE id = reward_record.id;

    -- 增加推荐人余额
    UPDATE profiles
    SET referral_balance = COALESCE(referral_balance, 0) + reward_record.reward_amount
    WHERE id = reward_record.referrer_id;

    processed_count := processed_count + 1;
  END LOOP;

  RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- 8. 创建推荐统计视图
-- -----------------------------------------------------

CREATE OR REPLACE VIEW referral_stats AS
SELECT
  p.id as user_id,
  p.referral_code,
  p.referral_balance,
  COUNT(DISTINCT r.id) as total_referrals,
  COUNT(DISTINCT CASE WHEN rw.status = 'approved' THEN rw.referee_id END) as successful_referrals,
  COALESCE(SUM(CASE WHEN rw.status = 'approved' THEN rw.reward_amount ELSE 0 END), 0) as total_earned,
  COALESCE(SUM(CASE WHEN w.status = 'completed' THEN w.amount ELSE 0 END), 0) as total_withdrawn
FROM profiles p
LEFT JOIN profiles r ON r.referred_by = p.id
LEFT JOIN referral_rewards rw ON rw.referrer_id = p.id
LEFT JOIN referral_withdrawals w ON w.user_id = p.id
WHERE p.referral_code IS NOT NULL
GROUP BY p.id, p.referral_code, p.referral_balance;

-- 9. RLS 策略
-- -----------------------------------------------------

-- 启用 RLS
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_withdrawals ENABLE ROW LEVEL SECURITY;

-- referral_rewards 策略
CREATE POLICY "Users can view own referral rewards"
  ON referral_rewards FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE POLICY "System can insert referral rewards"
  ON referral_rewards FOR INSERT
  WITH CHECK (true);

-- referral_withdrawals 策略
CREATE POLICY "Users can view own withdrawals"
  ON referral_withdrawals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can request withdrawals"
  ON referral_withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 10. 为现有用户生成推荐码
-- -----------------------------------------------------

SELECT assign_referral_codes();

-- =====================================================
-- 迁移完成
-- =====================================================
