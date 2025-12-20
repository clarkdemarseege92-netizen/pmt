# 订阅系统技术设计文档

**版本**: v1.0
**日期**: 2025-12-21
**状态**: 阶段 0 - 准备工作

---

## 📋 目录

1. [现有数据库架构分析](#现有数据库架构分析)
2. [新增数据库设计](#新增数据库设计)
3. [API 端点设计](#api-端点设计)
4. [前端组件架构](#前端组件架构)
5. [权限控制逻辑](#权限控制逻辑)
6. [自动化任务设计](#自动化任务设计)

---

## 现有数据库架构分析

### 关键表结构

基于 `supabase.txt` 索引信息和代码分析，现有关键表包括：

#### 1. merchants 表

**现有字段**（从索引和代码推断）：
```sql
CREATE TABLE merchants (
  merchant_id UUID PRIMARY KEY,
  owner_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
  name TEXT,
  slug TEXT UNIQUE,                    -- SEO友好URL
  custom_slug TEXT,                    -- 商户自定义slug
  latitude DECIMAL,
  longitude DECIMAL,
  -- ... 其他字段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**现有索引**：
- `merchants_pkey`: PRIMARY KEY (merchant_id)
- `merchants_owner_id_key`: UNIQUE (owner_id)
- `merchants_slug_key`: UNIQUE (slug)
- `idx_merchants_slug`: INDEX (slug)
- `idx_merchants_custom_slug`: INDEX (custom_slug)
- `idx_merchants_location`: INDEX (latitude, longitude)

**需要新增字段**：
```sql
ALTER TABLE merchants
ADD COLUMN referral_code TEXT UNIQUE,           -- 推荐码（6位随机）
ADD COLUMN referred_by UUID REFERENCES merchants(merchant_id),  -- 被谁推荐
ADD COLUMN trial_extended BOOLEAN DEFAULT false;       -- 试用期是否延长
```

**需要新增索引**：
```sql
CREATE INDEX idx_merchants_referral_code ON merchants(referral_code);
CREATE INDEX idx_merchants_referred_by ON merchants(referred_by);
```

---

#### 2. products 表

**现有字段**（从代码推断）：
```sql
CREATE TABLE products (
  product_id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(merchant_id),
  name JSONB NOT NULL,                 -- 多语言名称 {"en": "...", "th": "...", "zh": "..."}
  original_price DECIMAL(10,2),
  category_id UUID REFERENCES categories(category_id),  -- 系统分类
  merchant_category_id UUID REFERENCES merchant_product_categories(category_id),  -- 商户自定义分类
  -- ... 其他字段
  deleted_at TIMESTAMPTZ,              -- 软删除
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**现有索引**：
- `products_pkey`: PRIMARY KEY (product_id)
- `idx_products_category_id`: INDEX (category_id)
- `idx_products_merchant_category`: INDEX (merchant_category_id) WHERE merchant_category_id IS NOT NULL
- `idx_products_merchant_category_lookup`: INDEX (merchant_id, merchant_category_id)

**订阅限制逻辑**：
- 通过 `COUNT(*) WHERE merchant_id = ? AND deleted_at IS NULL` 统计产品数
- 与订阅方案的 `product_limit` 字段比较

---

#### 3. coupons 表

**现有字段**（从代码推断）：
```sql
CREATE TABLE coupons (
  coupon_id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(merchant_id),
  name JSONB NOT NULL,                 -- 多语言名称
  selling_price DECIMAL(10,2),         -- 售价
  original_value DECIMAL(10,2),        -- 原价
  category_id UUID REFERENCES categories(category_id),
  -- ... 其他字段（如有效期、库存等）
  deleted_at TIMESTAMPTZ,              -- 软删除
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**现有索引**：
- `coupons_pkey`: PRIMARY KEY (coupon_id)
- `idx_coupons_category_id`: INDEX (category_id)

**需要新增索引**（用于券种计数）：
```sql
CREATE INDEX IF NOT EXISTS idx_coupons_merchant_id
ON coupons(merchant_id)
WHERE deleted_at IS NULL;
```

**订阅限制逻辑**：
- 通过 `COUNT(*) WHERE merchant_id = ? AND deleted_at IS NULL` 统计券种数
- 与订阅方案的 `coupon_type_limit` 字段比较

---

#### 4. merchant_transactions 表

**现有字段**（从索引推断）：
```sql
CREATE TABLE merchant_transactions (
  id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(merchant_id),
  amount DECIMAL(10,2),
  type TEXT,                           -- 'deposit', 'withdrawal', 'fee', etc.
  status TEXT,                         -- 'pending', 'completed', 'failed'
  -- ... 其他字段
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**现有索引**：
- `merchant_transactions_pkey`: PRIMARY KEY (id)
- `idx_merchant_transactions_status`: INDEX (status)

**用途**：
- 记录商户钱包交易（充值、扣款、退款）
- 订阅续费将从钱包余额扣款

---

#### 5. 其他相关表

**merchant_staff** (员工管理 - 企业版功能):
```sql
CREATE TABLE merchant_staff (
  id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(merchant_id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT,                           -- 'admin', 'staff', etc.
  permissions JSONB,
  UNIQUE(merchant_id, user_id)
);
```

**orders** (订单表):
```sql
CREATE TABLE orders (
  order_id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(merchant_id),
  redemption_code TEXT UNIQUE,
  merchant_latitude_snapshot DECIMAL,
  merchant_longitude_snapshot DECIMAL,
  -- ... 其他字段
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**account_transactions** (记账交易表):
```sql
CREATE TABLE account_transactions (
  transaction_id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(merchant_id),
  category_id UUID REFERENCES account_categories(category_id),
  type TEXT,                           -- 'income', 'expense'
  amount DECIMAL(10,2),
  source TEXT,                         -- 'platform_order', 'platform_fee', 'cash_order', 'manual'
  order_id UUID REFERENCES orders(order_id),
  cash_order_id UUID REFERENCES cash_orders(cash_order_id),
  merchant_transaction_id UUID REFERENCES merchant_transactions(id),
  transaction_date TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 新增数据库设计

### 1. subscription_plans 表

订阅方案主表，存储所有订阅等级的配置。

```sql
CREATE TABLE subscription_plans (
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
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX idx_subscription_plans_name ON subscription_plans(name);

-- 注释
COMMENT ON TABLE subscription_plans IS '订阅方案配置表';
COMMENT ON COLUMN subscription_plans.name IS '方案标识（用于代码引用）';
COMMENT ON COLUMN subscription_plans.display_name IS '方案显示名称（多语言）';
COMMENT ON COLUMN subscription_plans.price IS '月费（泰铢）';
COMMENT ON COLUMN subscription_plans.product_limit IS '产品上限';
COMMENT ON COLUMN subscription_plans.coupon_type_limit IS '优惠券券种上限';
COMMENT ON COLUMN subscription_plans.features IS '功能特性JSON：{"pos_system": true, "accounting": true, ...}';
```

**features JSONB 结构**：
```json
{
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
}
```

---

### 2. merchant_subscriptions 表

商户订阅记录表，每个商户一条记录。

```sql
CREATE TABLE merchant_subscriptions (
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
CREATE INDEX idx_merchant_subscriptions_merchant ON merchant_subscriptions(merchant_id);
CREATE INDEX idx_merchant_subscriptions_status ON merchant_subscriptions(status);
CREATE INDEX idx_merchant_subscriptions_trial_end ON merchant_subscriptions(trial_end_date) WHERE status = 'trial';
CREATE INDEX idx_merchant_subscriptions_period_end ON merchant_subscriptions(current_period_end) WHERE status IN ('active', 'past_due');
CREATE INDEX idx_merchant_subscriptions_retention ON merchant_subscriptions(data_retention_until) WHERE status = 'locked';

-- 注释
COMMENT ON TABLE merchant_subscriptions IS '商户订阅记录表';
COMMENT ON COLUMN merchant_subscriptions.status IS '订阅状态：trial(试用中), active(活跃), past_due(欠费), canceled(已取消), locked(已锁定)';
COMMENT ON COLUMN merchant_subscriptions.trial_start_date IS '试用期开始时间';
COMMENT ON COLUMN merchant_subscriptions.trial_end_date IS '试用期结束时间';
COMMENT ON COLUMN merchant_subscriptions.locked_at IS '账号锁定时间（试用期结束未订阅或欠费超时）';
COMMENT ON COLUMN merchant_subscriptions.data_retention_until IS '数据保留截止时间（锁定后90天删除数据）';
```

**status 状态说明**：
- `trial`: 试用期中
- `active`: 付费订阅激活
- `past_due`: 欠费（余额不足续费）
- `canceled`: 已取消（期末生效）
- `locked`: 已锁定（无法使用平台）

---

### 3. subscription_invoices 表

订阅账单表，记录每次订阅扣款。

```sql
CREATE TABLE subscription_invoices (
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
  merchant_transaction_id UUID REFERENCES merchant_transactions(id),  -- 关联钱包交易
  failure_reason TEXT,                      -- 失败原因
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_subscription_invoices_merchant ON subscription_invoices(merchant_id, created_at DESC);
CREATE INDEX idx_subscription_invoices_status ON subscription_invoices(status);
CREATE INDEX idx_subscription_invoices_subscription ON subscription_invoices(subscription_id);

-- 注释
COMMENT ON TABLE subscription_invoices IS '订阅账单表';
COMMENT ON COLUMN subscription_invoices.status IS '账单状态：pending(待支付), paid(已支付), failed(支付失败), refunded(已退款)';
COMMENT ON COLUMN subscription_invoices.payment_method IS '支付方式：wallet(钱包余额), promptpay(PromptPay)';
```

---

### 4. referral_rewards 表

推荐奖励表，记录推荐关系和奖励发放。

```sql
CREATE TABLE referral_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,  -- 推荐人
  referee_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,   -- 被推荐人
  reward_type TEXT NOT NULL,                -- 'signup', '3month_milestone'
  reward_amount DECIMAL(10,2) NOT NULL,     -- 奖励金额
  status TEXT NOT NULL,                     -- 'pending', 'completed', 'expired'
  merchant_transaction_id UUID REFERENCES merchant_transactions(id),  -- 关联奖励发放交易
  completed_at TIMESTAMPTZ,                 -- 完成时间
  expires_at TIMESTAMPTZ,                   -- 过期时间
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(referrer_id, referee_id, reward_type)
);

-- 索引
CREATE INDEX idx_referral_rewards_referrer ON referral_rewards(referrer_id, status);
CREATE INDEX idx_referral_rewards_referee ON referral_rewards(referee_id);
CREATE INDEX idx_referral_rewards_pending ON referral_rewards(status) WHERE status = 'pending';

-- 注释
COMMENT ON TABLE referral_rewards IS '推荐奖励表';
COMMENT ON COLUMN referral_rewards.reward_type IS '奖励类型：signup(首次订阅), 3month_milestone(使用满3个月)';
COMMENT ON COLUMN referral_rewards.status IS '奖励状态：pending(待发放), completed(已发放), expired(已过期)';
```

---

## 数据库函数设计

### 1. 订阅状态检查函数

```sql
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
```

**返回示例**：
```json
{
  "is_active": true,
  "plan_name": "standard",
  "status": "active",
  "features": {...},
  "product_limit": 50,
  "coupon_type_limit": 15
}
```

---

### 2. 余额检查函数

```sql
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
```

---

### 3. 产品数量限制检查函数

```sql
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
  -- 获取当前产品数（排除软删除）
  SELECT COUNT(*) INTO product_count
  FROM products
  WHERE merchant_id = p_merchant_id AND deleted_at IS NULL;

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
```

**返回示例**：
```json
{
  "current_count": 45,
  "limit_count": 50,
  "can_create": true
}
```

---

### 4. 优惠券券种限制检查函数

```sql
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
  -- 获取当前优惠券券种数（排除软删除）
  SELECT COUNT(*) INTO coupon_count
  FROM coupons
  WHERE merchant_id = p_merchant_id AND deleted_at IS NULL;

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
```

---

### 5. 自动生成推荐码触发器

```sql
-- 生成推荐码函数
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- 如果已有推荐码，不重新生成
  IF NEW.referral_code IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 生成6位随机推荐码
  LOOP
    new_code := upper(substring(md5(random()::text) from 1 for 6));

    -- 检查是否已存在
    SELECT EXISTS(SELECT 1 FROM merchants WHERE referral_code = new_code)
    INTO code_exists;

    EXIT WHEN NOT code_exists;
  END LOOP;

  NEW.referral_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trg_generate_referral_code
BEFORE INSERT ON merchants
FOR EACH ROW
WHEN (NEW.referral_code IS NULL)
EXECUTE FUNCTION generate_referral_code();

COMMENT ON FUNCTION generate_referral_code IS '自动生成6位推荐码（商户注册时）';
```

---

### 6. 推荐奖励发放函数

```sql
CREATE OR REPLACE FUNCTION process_referral_reward(
  p_referrer_id UUID,
  p_referee_id UUID,
  p_reward_type TEXT,
  p_reward_amount DECIMAL(10,2)
)
RETURNS UUID AS $$
DECLARE
  v_reward_id UUID;
  v_transaction_id UUID;
BEGIN
  -- 检查是否已发放
  SELECT id INTO v_reward_id
  FROM referral_rewards
  WHERE referrer_id = p_referrer_id
    AND referee_id = p_referee_id
    AND reward_type = p_reward_type;

  IF v_reward_id IS NOT NULL THEN
    RAISE EXCEPTION 'Reward already exists';
  END IF;

  -- 创建钱包交易（充值）
  INSERT INTO merchant_transactions (
    merchant_id,
    amount,
    type,
    status,
    description
  ) VALUES (
    p_referrer_id,
    p_reward_amount,
    'deposit',
    'completed',
    'Referral reward: ' || p_reward_type
  ) RETURNING id INTO v_transaction_id;

  -- 创建奖励记录
  INSERT INTO referral_rewards (
    referrer_id,
    referee_id,
    reward_type,
    reward_amount,
    status,
    merchant_transaction_id,
    completed_at
  ) VALUES (
    p_referrer_id,
    p_referee_id,
    p_reward_type,
    p_reward_amount,
    'completed',
    v_transaction_id,
    NOW()
  ) RETURNING id INTO v_reward_id;

  RETURN v_reward_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_referral_reward IS '处理推荐奖励发放（创建钱包交易并记录）';
```

---

## API 端点设计

所有 Server Actions 放在 `app/actions/subscriptions/` 目录。

### 订阅管理 Actions

| 文件 | 函数名 | 描述 |
|-----|--------|------|
| `get-plans.ts` | `getSubscriptionPlans()` | 获取所有订阅方案 |
| `get-current.ts` | `getCurrentSubscription(merchantId)` | 获取商户当前订阅信息 |
| `start-trial.ts` | `startTrial(merchantId, referralCode?)` | 开始试用期 |
| `subscribe.ts` | `subscribeToPlan(merchantId, planId, paymentMethod)` | 订阅付费方案 |
| `cancel.ts` | `cancelSubscription(merchantId)` | 取消订阅 |
| `reactivate.ts` | `reactivateSubscription(merchantId, planId)` | 重新激活订阅 |

### 权限检查 Actions

| 文件 | 函数名 | 描述 |
|-----|--------|------|
| `check-feature.ts` | `checkFeatureAccess(merchantId, feature)` | 检查功能权限 |
| `check-balance-unlock.ts` | `checkBalanceUnlock(merchantId)` | 检查余额解锁 |
| `check-product-limit.ts` | `checkProductLimit(merchantId)` | 检查产品限制 |
| `check-coupon-limit.ts` | `checkCouponTypeLimit(merchantId)` | 检查优惠券限制 |

### 推荐系统 Actions

| 文件 | 函数名 | 描述 |
|-----|--------|------|
| `validate-code.ts` | `validateReferralCode(code)` | 验证推荐码 |
| `apply-code.ts` | `applyReferralCode(merchantId, code)` | 应用推荐码 |
| `process-rewards.ts` | `processReferralRewards(refereeId)` | 处理推荐奖励 |
| `get-my-referrals.ts` | `getMyReferrals(merchantId)` | 获取推荐列表 |

### 账单管理 Actions

| 文件 | 函数名 | 描述 |
|-----|--------|------|
| `create-invoice.ts` | `createSubscriptionInvoice(...)` | 创建订阅账单 |
| `pay-invoice.ts` | `paySubscriptionInvoice(invoiceId)` | 支付账单 |
| `get-invoices.ts` | `getSubscriptionInvoices(merchantId)` | 获取账单历史 |

---

## 前端组件架构

### 组件目录结构

```
components/
├── subscription/
│   ├── PricingTable.tsx          # 订阅方案对比表
│   ├── PlanCard.tsx              # 单个方案卡片
│   ├── TrialCountdown.tsx        # 试用期倒计时
│   ├── TrialBanner.tsx           # 试用期横幅提醒
│   ├── CurrentPlanCard.tsx       # 当前订阅方案卡片
│   ├── UsageProgress.tsx         # 使用进度条（产品/券种）
│   ├── UpgradePrompt.tsx         # 升级提示弹窗
│   ├── BalanceLockPrompt.tsx    # 余额不足提示
│   ├── FeatureLockedBadge.tsx   # 功能锁定标记
│   ├── InvoiceList.tsx          # 账单列表
│   └── InvoiceCard.tsx          # 账单卡片
├── referrals/
│   ├── ReferralCodeCard.tsx     # 推荐码展示卡片
│   └── ReferralList.tsx         # 推荐列表
```

### 页面路由

```
app/[locale]/merchant/
├── subscription/
│   └── page.tsx                 # 订阅管理页面
├── referrals/
│   └── page.tsx                 # 推荐系统页面
├── onboarding/
│   └── page.tsx                 # 注册流程（需修改）
```

### 组件Props设计

#### PricingTable.tsx

```typescript
interface PricingTableProps {
  currentPlanId?: string;
  onSelectPlan: (planId: string) => void;
  showTrialNotice?: boolean;
}
```

#### TrialCountdown.tsx

```typescript
interface TrialCountdownProps {
  trialEndDate: Date;
  variant?: 'banner' | 'card' | 'compact';
}
```

#### UsageProgress.tsx

```typescript
interface UsageProgressProps {
  current: number;
  limit: number;
  type: 'products' | 'coupons';
  showUpgradeButton?: boolean;
}
```

---

## 权限控制逻辑

### 权限检查流程

```typescript
// 权限检查中间件伪代码
async function checkPermission(merchantId: string, action: string) {
  // 1. 获取订阅状态
  const subscription = await getCurrentSubscription(merchantId);

  // 2. 检查账号状态
  if (subscription.status === 'locked') {
    throw new Error('Account is locked. Please subscribe to continue.');
  }

  // 3. 检查功能权限
  if (action === 'create_product') {
    const { can_create } = await checkProductLimit(merchantId);
    if (!can_create) {
      throw new Error('Product limit reached. Please upgrade your plan.');
    }
  }

  // 4. 检查余额（Slip2Go、优惠券发行、核销）
  if (['slip2go_verify', 'issue_coupon', 'redeem_coupon'].includes(action)) {
    const hasBalance = await checkBalanceUnlock(merchantId);
    if (!hasBalance) {
      throw new Error('Balance too low (< ฿200). Please recharge.');
    }
  }

  // 5. 检查高级功能权限
  if (action === 'data_export') {
    if (subscription.plan_name === 'basic' || subscription.plan_name === 'standard') {
      throw new Error('Data export is available in Professional plan and above.');
    }
  }

  return { allowed: true };
}
```

### 权限矩阵

| 功能 | 基础版 | 标准版 | 专业版 | 企业版 | 余额要求 |
|-----|-------|-------|-------|-------|---------|
| POS点餐 | ✅ | ✅ | ✅ | ✅ | - |
| 基础记账 | ✅ | ✅ | ✅ | ✅ | - |
| 完整记账 | ❌ | ✅ | ✅ | ✅ | - |
| 高级看板 | ❌ | ✅ | ✅ | ✅ | - |
| Slip2Go验证 | ✅ | ✅ | ✅ | ✅ | ≥ ฿200 |
| 优惠券发行 | ✅ | ✅ | ✅ | ✅ | ≥ ฿200 |
| 核销中心 | ✅ | ✅ | ✅ | ✅ | ≥ ฿200 |
| 数据导出 | ❌ | ❌ | ✅ | ✅ | - |
| Expo APP | ❌ | ❌ | ✅ | ✅ | - |
| 推送通知 | ❌ | ❌ | ✅ | ✅ | - |
| 员工管理 | ❌ | ❌ | ❌ | ✅ | - |
| API访问 | ❌ | ❌ | ❌ | ✅ | - |
| 营销工具 | ❌ | ❌ | ❌ | ✅ | - |

---

## 自动化任务设计

使用 **Vercel Cron Jobs** 或 **Supabase Edge Functions** 实现定时任务。

### 任务列表

#### 1. 试用期提醒任务

**执行频率**: 每天早上 9:00 (UTC+7)

**逻辑**:
```sql
-- 查找试用期即将结束的商户
SELECT
  ms.merchant_id,
  ms.trial_end_date,
  EXTRACT(DAY FROM ms.trial_end_date - NOW()) as days_remaining,
  m.email
FROM merchant_subscriptions ms
JOIN merchants m ON ms.merchant_id = m.merchant_id
WHERE ms.status = 'trial'
  AND ms.trial_end_date > NOW()
  AND ms.trial_end_date <= NOW() + INTERVAL '7 days';
```

**提醒时间点**:
- 7天前
- 3天前
- 1天前
- 到期当天

---

#### 2. 账号锁定任务

**执行频率**: 每天凌晨 1:00 (UTC+7)

**逻辑**:
```sql
-- 锁定试用期结束但未订阅的商户
UPDATE merchant_subscriptions
SET
  status = 'locked',
  locked_at = NOW(),
  data_retention_until = NOW() + INTERVAL '90 days'
WHERE status = 'trial'
  AND trial_end_date <= NOW();
```

---

#### 3. 订阅续费任务

**执行频率**: 每天凌晨 2:00 (UTC+7)

**逻辑**:
```sql
-- 查找需要续费的订阅
SELECT
  ms.id as subscription_id,
  ms.merchant_id,
  ms.plan_id,
  sp.price
FROM merchant_subscriptions ms
JOIN subscription_plans sp ON ms.plan_id = sp.id
WHERE ms.status = 'active'
  AND ms.current_period_end <= NOW();
```

**续费流程**:
1. 创建账单
2. 从钱包扣款
3. 扣款成功 → 更新计费周期
4. 扣款失败 → 标记为 `past_due`，3天后锁定

---

#### 4. 推荐奖励检查任务

**执行频率**: 每天凌晨 3:00 (UTC+7)

**逻辑**:
```sql
-- 首次订阅奖励
SELECT
  m.referred_by as referrer_id,
  m.merchant_id as referee_id
FROM merchants m
JOIN merchant_subscriptions ms ON m.merchant_id = ms.merchant_id
WHERE m.referred_by IS NOT NULL
  AND ms.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM referral_rewards rr
    WHERE rr.referrer_id = m.referred_by
      AND rr.referee_id = m.merchant_id
      AND rr.reward_type = 'signup'
  );

-- 3个月里程碑奖励
SELECT
  m.referred_by as referrer_id,
  m.merchant_id as referee_id
FROM merchants m
JOIN merchant_subscriptions ms ON m.merchant_id = ms.merchant_id
WHERE m.referred_by IS NOT NULL
  AND ms.status = 'active'
  AND ms.current_period_start <= NOW() - INTERVAL '90 days'
  AND NOT EXISTS (
    SELECT 1 FROM referral_rewards rr
    WHERE rr.referrer_id = m.referred_by
      AND rr.referee_id = m.merchant_id
      AND rr.reward_type = '3month_milestone'
  );
```

---

#### 5. 数据清理任务

**执行频率**: 每天凌晨 4:00 (UTC+7)

**逻辑**:
```sql
-- 查找数据保留期已过的商户
SELECT merchant_id
FROM merchant_subscriptions
WHERE status = 'locked'
  AND data_retention_until <= NOW();
```

**清理内容**:
- 删除产品（products）
- 删除订单（orders, order_items）
- 删除优惠券（coupons）
- 删除记账记录（account_transactions）
- 保留商户基本信息（防止推荐码重复）

---

## 实施检查清单

### 阶段 0 完成标准

- [x] 分析现有数据库表结构
- [x] 识别需要修改的表
- [x] 设计新增表结构
- [x] 设计数据库函数
- [x] 规划 API 端点
- [x] 规划前端组件
- [x] 规划权限控制逻辑
- [x] 规划自动化任务

### 下一步

完成本技术设计文档后，进入 **阶段 1：数据库设计与迁移**。

---

## 附录

### A. 数据库 ER 图（简化）

```
merchants (商户)
  ├── referral_code (新增)
  ├── referred_by (新增)
  └── trial_extended (新增)

merchant_subscriptions (商户订阅) [新表]
  ├── merchant_id → merchants
  └── plan_id → subscription_plans

subscription_plans (订阅方案) [新表]
  └── features (JSONB)

subscription_invoices (订阅账单) [新表]
  ├── merchant_id → merchants
  ├── subscription_id → merchant_subscriptions
  ├── plan_id → subscription_plans
  └── merchant_transaction_id → merchant_transactions

referral_rewards (推荐奖励) [新表]
  ├── referrer_id → merchants
  ├── referee_id → merchants
  └── merchant_transaction_id → merchant_transactions

products (产品)
  ├── merchant_id → merchants
  └── deleted_at (软删除)

coupons (优惠券)
  ├── merchant_id → merchants
  └── deleted_at (软删除)

merchant_transactions (钱包交易)
  └── merchant_id → merchants
```

### B. 技术栈

- **数据库**: Supabase (PostgreSQL)
- **后端**: Next.js Server Actions
- **前端**: React + TypeScript
- **定时任务**: Vercel Cron Jobs / Supabase Edge Functions
- **支付**: PromptPay + Slip2Go API

---

**文档状态**: ✅ 阶段 0 完成
**下一阶段**: 阶段 1 - 数据库设计与迁移
