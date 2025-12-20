-- =====================================================
-- 订阅系统数据库迁移
-- 文件: 20251221_create_subscription_system.sql
-- 版本: v1.0 (无推荐系统)
-- 日期: 2025-12-21
-- =====================================================

-- =====================================================
-- 第一部分：创建新表
-- =====================================================

-- 1. 订阅方案表
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,                -- 'trial', 'basic', 'standard', 'professional', 'enterprise'
  display_name JSONB NOT NULL,              -- {"en": "Trial", "th": "ทดลองใช้", "zh": "试用期"}
  price DECIMAL(10,2) NOT NULL,             -- 月费（泰铢）
  product_limit INTEGER NOT NULL,           -- 产品上限
  coupon_type_limit INTEGER NOT NULL,       -- 优惠券券种上限
  features JSONB NOT NULL,                  -- 功能列表
  is_active BOOLEAN DEFAULT true,           -- 是否启用
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON subscription_plans(name);

-- 注释
COMMENT ON TABLE subscription_plans IS '订阅方案配置表';
COMMENT ON COLUMN subscription_plans.name IS '方案标识（用于代码引用）';
COMMENT ON COLUMN subscription_plans.display_name IS '方案显示名称（多语言）';
COMMENT ON COLUMN subscription_plans.price IS '月费（泰铢）';
COMMENT ON COLUMN subscription_plans.product_limit IS '产品上限';
COMMENT ON COLUMN subscription_plans.coupon_type_limit IS '优惠券券种上限';
COMMENT ON COLUMN subscription_plans.features IS '功能特性JSON：{"pos_system": true, "accounting": true, ...}';

-- =====================================================

-- 2. 商户订阅记录表
CREATE TABLE IF NOT EXISTS merchant_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL UNIQUE REFERENCES merchants(merchant_id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL,                     -- 'trial', 'active', 'past_due', 'canceled', 'locked'
  trial_start_date TIMESTAMPTZ,             -- 试用期开始时间
  trial_end_date TIMESTAMPTZ,               -- 试用期结束时间
  current_period_start TIMESTAMPTZ,         -- 当前计费周期开始
  current_period_end TIMESTAMPTZ,           -- 当前计费周期结束
  cancel_at_period_end BOOLEAN DEFAULT false, -- 期末取消标记
  canceled_at TIMESTAMPTZ,                  -- 取消时间
  locked_at TIMESTAMPTZ,                    -- 账号锁定时间
  data_retention_until TIMESTAMPTZ,         -- 数据保留截止时间（锁定后90天）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_merchant_subscriptions_merchant ON merchant_subscriptions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_subscriptions_status ON merchant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_merchant_subscriptions_trial_end ON merchant_subscriptions(trial_end_date) WHERE status = 'trial';
CREATE INDEX IF NOT EXISTS idx_merchant_subscriptions_period_end ON merchant_subscriptions(current_period_end) WHERE status IN ('active', 'past_due');
CREATE INDEX IF NOT EXISTS idx_merchant_subscriptions_retention ON merchant_subscriptions(data_retention_until) WHERE status = 'locked';

-- 注释
COMMENT ON TABLE merchant_subscriptions IS '商户订阅记录表';
COMMENT ON COLUMN merchant_subscriptions.status IS '订阅状态：trial(试用中), active(活跃), past_due(欠费), canceled(已取消), locked(已锁定)';
COMMENT ON COLUMN merchant_subscriptions.trial_start_date IS '试用期开始时间';
COMMENT ON COLUMN merchant_subscriptions.trial_end_date IS '试用期结束时间';
COMMENT ON COLUMN merchant_subscriptions.locked_at IS '账号锁定时间（试用期结束未订阅或欠费超时）';
COMMENT ON COLUMN merchant_subscriptions.data_retention_until IS '数据保留截止时间（锁定后90天删除数据）';

-- =====================================================

-- 3. 订阅账单表
CREATE TABLE IF NOT EXISTS subscription_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES merchant_subscriptions(id),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  amount DECIMAL(10,2) NOT NULL,            -- 账单金额
  status TEXT NOT NULL,                     -- 'pending', 'paid', 'failed', 'refunded'
  period_start TIMESTAMPTZ NOT NULL,        -- 计费周期开始
  period_end TIMESTAMPTZ NOT NULL,          -- 计费周期结束
  paid_at TIMESTAMPTZ,                      -- 支付时间
  payment_method TEXT,                      -- 'wallet', 'promptpay', etc.
  merchant_transaction_id BIGINT REFERENCES merchant_transactions(id),  -- 关联钱包交易（修改为BIGINT）
  failure_reason TEXT,                      -- 失败原因
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_merchant ON subscription_invoices(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_status ON subscription_invoices(status);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_subscription ON subscription_invoices(subscription_id);

-- 注释
COMMENT ON TABLE subscription_invoices IS '订阅账单表';
COMMENT ON COLUMN subscription_invoices.status IS '账单状态：pending(待支付), paid(已支付), failed(支付失败), refunded(已退款)';
COMMENT ON COLUMN subscription_invoices.payment_method IS '支付方式：wallet(钱包余额), promptpay(PromptPay)';

-- =====================================================
-- 第二部分：修改现有表
-- =====================================================

-- 为 coupons 表添加索引（用于券种计数）
CREATE INDEX IF NOT EXISTS idx_coupons_merchant_id
ON coupons(merchant_id);

-- 为 products 表添加索引（用于产品计数，可能已存在）
CREATE INDEX IF NOT EXISTS idx_products_merchant_id
ON products(merchant_id);

-- =====================================================
-- 第三部分：数据库函数
-- =====================================================

-- 1. 订阅状态检查函数
CREATE OR REPLACE FUNCTION check_subscription_status(p_merchant_id UUID)
RETURNS TABLE (
  is_active BOOLEAN,
  plan_name TEXT,
  status TEXT,
  features JSONB,
  product_limit INTEGER,
  coupon_type_limit INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.status IN ('trial', 'active') as is_active,
    sp.name as plan_name,
    ms.status,
    sp.features,
    sp.product_limit,
    sp.coupon_type_limit
  FROM merchant_subscriptions ms
  JOIN subscription_plans sp ON ms.plan_id = sp.id
  WHERE ms.merchant_id = p_merchant_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_subscription_status IS '检查商户订阅状态和权限';

-- =====================================================

-- 2. 余额检查函数
CREATE OR REPLACE FUNCTION check_balance_unlock(p_merchant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance DECIMAL(10,2);
BEGIN
  -- 计算钱包余额（sum of transactions）
  SELECT COALESCE(SUM(
    CASE
      WHEN type = 'deposit' THEN amount
      WHEN type = 'withdrawal' THEN -amount
      WHEN type = 'fee' THEN -amount
      ELSE 0
    END
  ), 0) INTO current_balance
  FROM merchant_transactions
  WHERE merchant_id = p_merchant_id
    AND status = 'completed';

  RETURN current_balance >= 200;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_balance_unlock IS '检查商户余额是否 >= ฿200（解锁Slip2Go和优惠券发行）';

-- =====================================================

-- 3. 产品数量限制检查函数
CREATE OR REPLACE FUNCTION check_product_limit(p_merchant_id UUID)
RETURNS TABLE (
  current_count INTEGER,
  limit_count INTEGER,
  can_create BOOLEAN
) AS $$
DECLARE
  product_count INTEGER;
  product_limit INTEGER;
BEGIN
  -- 获取当前产品数
  SELECT COUNT(*) INTO product_count
  FROM products
  WHERE merchant_id = p_merchant_id;

  -- 获取订阅计划的产品上限
  SELECT sp.product_limit INTO product_limit
  FROM merchant_subscriptions ms
  JOIN subscription_plans sp ON ms.plan_id = sp.id
  WHERE ms.merchant_id = p_merchant_id;

  RETURN QUERY SELECT
    product_count,
    COALESCE(product_limit, 0),
    product_count < COALESCE(product_limit, 0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_product_limit IS '检查商户产品数量是否达到上限';

-- =====================================================

-- 4. 优惠券券种限制检查函数
CREATE OR REPLACE FUNCTION check_coupon_type_limit(p_merchant_id UUID)
RETURNS TABLE (
  current_count INTEGER,
  limit_count INTEGER,
  can_create BOOLEAN
) AS $$
DECLARE
  coupon_count INTEGER;
  coupon_limit INTEGER;
BEGIN
  -- 获取当前优惠券券种数
  SELECT COUNT(*) INTO coupon_count
  FROM coupons
  WHERE merchant_id = p_merchant_id;

  -- 获取订阅计划的券种上限
  SELECT sp.coupon_type_limit INTO coupon_limit
  FROM merchant_subscriptions ms
  JOIN subscription_plans sp ON ms.plan_id = sp.id
  WHERE ms.merchant_id = p_merchant_id;

  RETURN QUERY SELECT
    coupon_count,
    COALESCE(coupon_limit, 0),
    coupon_count < COALESCE(coupon_limit, 0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_coupon_type_limit IS '检查商户优惠券券种数量是否达到上限';

-- =====================================================
-- 第四部分：初始化订阅方案数据
-- =====================================================

INSERT INTO subscription_plans (name, display_name, price, product_limit, coupon_type_limit, features) VALUES

-- 试用期
('trial',
 '{"en": "Trial", "th": "ทดลองใช้", "zh": "试用期"}'::jsonb,
 0,
 50,
 15,
 '{
   "pos_system": true,
   "basic_accounting": true,
   "advanced_accounting": true,
   "advanced_dashboard": true,
   "product_management": true,
   "coupon_management": true,
   "order_management": true,
   "review_management": true,
   "shop_design": true,
   "data_export": false,
   "expo_app": false,
   "push_notifications": false,
   "employee_management": false,
   "api_access": false,
   "marketing_tools": false
 }'::jsonb),

-- 基础版
('basic',
 '{"en": "Basic", "th": "พื้นฐาน", "zh": "基础版"}'::jsonb,
 89,
 25,
 8,
 '{
   "pos_system": true,
   "basic_accounting": true,
   "advanced_accounting": false,
   "advanced_dashboard": false,
   "product_management": true,
   "coupon_management": true,
   "order_management": true,
   "review_management": true,
   "shop_design": true,
   "data_export": false,
   "expo_app": false,
   "push_notifications": false,
   "employee_management": false,
   "api_access": false,
   "marketing_tools": false
 }'::jsonb),

-- 标准版
('standard',
 '{"en": "Standard", "th": "มาตรฐาน", "zh": "标准版"}'::jsonb,
 169,
 50,
 15,
 '{
   "pos_system": true,
   "basic_accounting": true,
   "advanced_accounting": true,
   "advanced_dashboard": true,
   "product_management": true,
   "coupon_management": true,
   "order_management": true,
   "review_management": true,
   "shop_design": true,
   "data_export": false,
   "expo_app": false,
   "push_notifications": false,
   "employee_management": false,
   "api_access": false,
   "marketing_tools": false
 }'::jsonb),

-- 专业版
('professional',
 '{"en": "Professional", "th": "มืออาชีพ", "zh": "专业版"}'::jsonb,
 269,
 100,
 20,
 '{
   "pos_system": true,
   "basic_accounting": true,
   "advanced_accounting": true,
   "advanced_dashboard": true,
   "product_management": true,
   "coupon_management": true,
   "order_management": true,
   "review_management": true,
   "shop_design": true,
   "data_export": true,
   "expo_app": true,
   "push_notifications": true,
   "employee_management": false,
   "api_access": false,
   "marketing_tools": false
 }'::jsonb),

-- 企业版
('enterprise',
 '{"en": "Enterprise", "th": "องค์กร", "zh": "企业版"}'::jsonb,
 399,
 200,
 30,
 '{
   "pos_system": true,
   "basic_accounting": true,
   "advanced_accounting": true,
   "advanced_dashboard": true,
   "product_management": true,
   "coupon_management": true,
   "order_management": true,
   "review_management": true,
   "shop_design": true,
   "data_export": true,
   "expo_app": true,
   "push_notifications": true,
   "employee_management": true,
   "api_access": true,
   "marketing_tools": true
 }'::jsonb)

ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 第五部分：数据验证
-- =====================================================

-- 验证订阅方案是否正确插入
DO $$
DECLARE
  plan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO plan_count FROM subscription_plans;

  IF plan_count < 5 THEN
    RAISE WARNING 'Expected 5 subscription plans, but found %', plan_count;
  ELSE
    RAISE NOTICE 'Successfully created % subscription plans', plan_count;
  END IF;
END $$;

-- =====================================================
-- 迁移完成
-- =====================================================

-- 显示完成消息
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '订阅系统数据库迁移完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '创建的表：';
  RAISE NOTICE '  - subscription_plans';
  RAISE NOTICE '  - merchant_subscriptions';
  RAISE NOTICE '  - subscription_invoices';
  RAISE NOTICE '';
  RAISE NOTICE '创建的函数：';
  RAISE NOTICE '  - check_subscription_status()';
  RAISE NOTICE '  - check_balance_unlock()';
  RAISE NOTICE '  - check_product_limit()';
  RAISE NOTICE '  - check_coupon_type_limit()';
  RAISE NOTICE '';
  RAISE NOTICE '初始化的订阅方案：';
  RAISE NOTICE '  - Trial (฿0, 50 products, 15 coupons)';
  RAISE NOTICE '  - Basic (฿89, 25 products, 8 coupons)';
  RAISE NOTICE '  - Standard (฿169, 50 products, 15 coupons)';
  RAISE NOTICE '  - Professional (฿269, 100 products, 20 coupons)';
  RAISE NOTICE '  - Enterprise (฿399, 200 products, 30 coupons)';
  RAISE NOTICE '========================================';
END $$;
