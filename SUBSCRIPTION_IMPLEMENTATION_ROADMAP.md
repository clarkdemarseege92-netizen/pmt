# 订阅系统实施路线图

基于 [SUBSCRIPTION_PLAN_V8_FINAL.md](SUBSCRIPTION_PLAN_V8_FINAL.md) 方案的完整实施计划

---

## 📋 项目概览

### 目标
实现强制订阅模型，包含：
- 4个订阅等级（基础版/标准版/专业版/企业版）
- 30天免费试用期
- 余额控制核心服务（Slip2Go、优惠券发行、核销）
- 产品/优惠券数量限制
- 推荐奖励系统

### 定价表

| 等级 | 月费 | 产品上限 | 券种上限 | 核心功能 |
|-----|------|---------|---------|---------|
| 试用期 | ฿0 | 50 | 15 | 30天全功能（标准版） |
| 基础版 | ฿89 | 25 | 8 | POS + 基础记账 |
| 标准版 | ฿169 | 50 | 15 | 完整记账 + 高级看板 |
| 专业版 | ฿269 | 100 | 20 | + APP + 导出 + 推送 |
| 企业版 | ฿399 | 200 | 30 | + 员工 + API + 营销 |

**余额控制**：≥ ฿200 解锁 Slip2Go、优惠券发行、核销中心

---

## 🎯 实施阶段

### 阶段 0：准备工作（1-2天）

**目标**：梳理现有代码，了解当前系统架构

#### 任务清单

- [ ] **0.1 数据库架构分析**
  - [ ] 查看现有 `merchants` 表结构
  - [ ] 查看现有 `products` 表结构
  - [ ] 查看现有 `coupons` 表结构
  - [ ] 查看现有 `merchant_wallets` 表结构
  - [ ] 记录需要新增/修改的字段

- [ ] **0.2 代码库分析**
  - [ ] 查看商户注册流程代码
  - [ ] 查看产品管理相关代码
  - [ ] 查看优惠券管理相关代码
  - [ ] 查看钱包/余额相关代码
  - [ ] 识别需要修改的文件路径

- [ ] **0.3 创建技术设计文档**
  - [ ] 数据库表设计
  - [ ] API 端点设计
  - [ ] 前端组件规划
  - [ ] 状态管理方案

**交付物**：
- `SUBSCRIPTION_TECHNICAL_DESIGN.md`（技术设计文档）

**预估时间**：1-2天

---

### 阶段 1：数据库设计与迁移（2-3天）

**目标**：建立订阅系统的数据基础

#### 1.1 新建数据库表

- [ ] **1.1.1 创建 `subscription_plans` 表**
  ```sql
  -- 订阅方案表
  CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,                    -- 'trial', 'basic', 'standard', 'professional', 'enterprise'
    display_name JSONB NOT NULL,           -- {"en": "Trial", "th": "ทดลองใช้", "zh": "试用期"}
    price DECIMAL(10,2) NOT NULL,          -- 月费（泰铢）
    product_limit INTEGER NOT NULL,        -- 产品上限
    coupon_type_limit INTEGER NOT NULL,    -- 优惠券券种上限
    features JSONB NOT NULL,               -- 功能列表
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- [ ] **1.1.2 创建 `merchant_subscriptions` 表**
  ```sql
  -- 商户订阅记录表
  CREATE TABLE merchant_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status TEXT NOT NULL,                  -- 'trial', 'active', 'past_due', 'canceled', 'locked'
    trial_start_date TIMESTAMPTZ,          -- 试用期开始时间
    trial_end_date TIMESTAMPTZ,            -- 试用期结束时间
    current_period_start TIMESTAMPTZ,      -- 当前计费周期开始
    current_period_end TIMESTAMPTZ,        -- 当前计费周期结束
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,                 -- 账号锁定时间
    data_retention_until TIMESTAMPTZ,      -- 数据保留截止时间（锁定后90天）
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(merchant_id)
  );
  ```

- [ ] **1.1.3 创建 `subscription_invoices` 表**
  ```sql
  -- 订阅账单表
  CREATE TABLE subscription_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES merchant_subscriptions(id),
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL,                  -- 'pending', 'paid', 'failed', 'refunded'
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    payment_method TEXT,                   -- 'wallet', 'promptpay', etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- [ ] **1.1.4 创建 `referral_rewards` 表**
  ```sql
  -- 推荐奖励表
  CREATE TABLE referral_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    referee_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    reward_type TEXT NOT NULL,             -- 'signup', '3month_milestone'
    reward_amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL,                  -- 'pending', 'completed', 'expired'
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(referrer_id, referee_id, reward_type)
  );
  ```

#### 1.2 修改现有表

- [ ] **1.2.1 扩展 `merchants` 表**
  ```sql
  ALTER TABLE merchants
  ADD COLUMN referral_code TEXT UNIQUE,           -- 推荐码（6位随机）
  ADD COLUMN referred_by UUID REFERENCES merchants(id),  -- 被谁推荐
  ADD COLUMN trial_extended BOOLEAN DEFAULT false;       -- 试用期是否延长

  -- 创建索引
  CREATE INDEX idx_merchants_referral_code ON merchants(referral_code);
  CREATE INDEX idx_merchants_referred_by ON merchants(referred_by);
  ```

- [ ] **1.2.2 确认 `products` 表支持计数查询**
  ```sql
  -- 确认存在 merchant_id 和索引
  CREATE INDEX IF NOT EXISTS idx_products_merchant_id ON products(merchant_id);
  ```

- [ ] **1.2.3 确认 `coupons` 表支持计数查询**
  ```sql
  -- 确认存在 merchant_id 和索引
  CREATE INDEX IF NOT EXISTS idx_coupons_merchant_id ON coupons(merchant_id);
  ```

#### 1.3 创建数据库函数和触发器

- [ ] **1.3.1 创建订阅状态检查函数**
  ```sql
  CREATE OR REPLACE FUNCTION check_subscription_status(p_merchant_id UUID)
  RETURNS TABLE (
    is_active BOOLEAN,
    plan_name TEXT,
    status TEXT,
    features JSONB
  ) AS $$
  BEGIN
    RETURN QUERY
    SELECT
      ms.status IN ('trial', 'active') as is_active,
      sp.name as plan_name,
      ms.status,
      sp.features
    FROM merchant_subscriptions ms
    JOIN subscription_plans sp ON ms.plan_id = sp.id
    WHERE ms.merchant_id = p_merchant_id;
  END;
  $$ LANGUAGE plpgsql;
  ```

- [ ] **1.3.2 创建余额检查函数**
  ```sql
  CREATE OR REPLACE FUNCTION check_balance_unlock(p_merchant_id UUID)
  RETURNS BOOLEAN AS $$
  DECLARE
    current_balance DECIMAL(10,2);
  BEGIN
    SELECT balance INTO current_balance
    FROM merchant_wallets
    WHERE merchant_id = p_merchant_id;

    RETURN COALESCE(current_balance, 0) >= 200;
  END;
  $$ LANGUAGE plpgsql;
  ```

- [ ] **1.3.3 创建产品数量限制检查函数**
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
    -- 获取当前产品数
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
      product_limit,
      product_count < product_limit;
  END;
  $$ LANGUAGE plpgsql;
  ```

- [ ] **1.3.4 创建优惠券券种限制检查函数**
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
    -- 获取当前优惠券券种数
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
      coupon_limit,
      coupon_count < coupon_limit;
  END;
  $$ LANGUAGE plpgsql;
  ```

- [ ] **1.3.5 创建自动生成推荐码触发器**
  ```sql
  CREATE OR REPLACE FUNCTION generate_referral_code()
  RETURNS TRIGGER AS $$
  DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
  BEGIN
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

  CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON merchants
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION generate_referral_code();
  ```

#### 1.4 初始化订阅方案数据

- [ ] **1.4.1 插入订阅方案数据**
  ```sql
  INSERT INTO subscription_plans (name, display_name, price, product_limit, coupon_type_limit, features) VALUES

  -- 试用期
  ('trial',
   '{"en": "Trial", "th": "ทดลองใช้", "zh": "试用期"}',
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
   '{"en": "Basic", "th": "พื้นฐาน", "zh": "基础版"}',
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
   '{"en": "Standard", "th": "มาตรฐาน", "zh": "标准版"}',
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
   '{"en": "Professional", "th": "มืออาชีพ", "zh": "专业版"}',
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
   '{"en": "Enterprise", "th": "องค์กร", "zh": "企业版"}',
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
   }'::jsonb);
  ```

#### 1.5 创建迁移文件

- [ ] **1.5.1 创建 Supabase 迁移文件**
  - 文件名：`supabase/migrations/YYYYMMDD_create_subscription_system.sql`
  - 包含以上所有 SQL 语句

- [ ] **1.5.2 测试迁移**
  - 在本地开发环境运行迁移
  - 验证所有表和函数正确创建
  - 验证初始数据正确插入

**交付物**：
- `supabase/migrations/YYYYMMDD_create_subscription_system.sql`
- 迁移测试报告

**预估时间**：2-3天

---

### 阶段 2：Server Actions 开发（3-4天）

**目标**：创建订阅系统的后端逻辑

#### 2.1 订阅管理 Actions

- [ ] **2.1.1 创建 `app/actions/subscriptions/get-plans.ts`**
  ```typescript
  /**
   * 获取所有订阅方案
   */
  export async function getSubscriptionPlans()
  ```

- [ ] **2.1.2 创建 `app/actions/subscriptions/get-current.ts`**
  ```typescript
  /**
   * 获取商户当前订阅信息
   */
  export async function getCurrentSubscription(merchantId: string)
  ```

- [ ] **2.1.3 创建 `app/actions/subscriptions/start-trial.ts`**
  ```typescript
  /**
   * 开始试用期（商户注册时自动调用）
   */
  export async function startTrial(merchantId: string, referralCode?: string)
  ```

- [ ] **2.1.4 创建 `app/actions/subscriptions/subscribe.ts`**
  ```typescript
  /**
   * 订阅付费方案
   */
  export async function subscribeToPlan(
    merchantId: string,
    planId: string,
    paymentMethod: 'wallet' | 'promptpay'
  )
  ```

- [ ] **2.1.5 创建 `app/actions/subscriptions/cancel.ts`**
  ```typescript
  /**
   * 取消订阅（期末生效）
   */
  export async function cancelSubscription(merchantId: string)
  ```

- [ ] **2.1.6 创建 `app/actions/subscriptions/reactivate.ts`**
  ```typescript
  /**
   * 重新激活订阅（锁定状态下订阅）
   */
  export async function reactivateSubscription(merchantId: string, planId: string)
  ```

#### 2.2 权限检查 Actions

- [ ] **2.2.1 创建 `app/actions/subscriptions/check-feature.ts`**
  ```typescript
  /**
   * 检查商户是否有权限使用某功能
   */
  export async function checkFeatureAccess(
    merchantId: string,
    feature: string
  ): Promise<{ hasAccess: boolean; reason?: string }>
  ```

- [ ] **2.2.2 创建 `app/actions/subscriptions/check-balance-unlock.ts`**
  ```typescript
  /**
   * 检查余额是否足够解锁核心服务
   */
  export async function checkBalanceUnlock(merchantId: string)
  ```

- [ ] **2.2.3 创建 `app/actions/subscriptions/check-product-limit.ts`**
  ```typescript
  /**
   * 检查产品数量是否达到上限
   */
  export async function checkProductLimit(merchantId: string)
  ```

- [ ] **2.2.4 创建 `app/actions/subscriptions/check-coupon-limit.ts`**
  ```typescript
  /**
   * 检查优惠券券种是否达到上限
   */
  export async function checkCouponTypeLimit(merchantId: string)
  ```

#### 2.3 推荐奖励 Actions

- [ ] **2.3.1 创建 `app/actions/referrals/validate-code.ts`**
  ```typescript
  /**
   * 验证推荐码是否有效
   */
  export async function validateReferralCode(code: string)
  ```

- [ ] **2.3.2 创建 `app/actions/referrals/apply-code.ts`**
  ```typescript
  /**
   * 应用推荐码（注册时）
   */
  export async function applyReferralCode(merchantId: string, code: string)
  ```

- [ ] **2.3.3 创建 `app/actions/referrals/process-rewards.ts`**
  ```typescript
  /**
   * 处理推荐奖励
   * - 被推荐人首次订阅 → 推荐人获得 ฿50
   * - 被推荐人使用满3个月 → 推荐人再获得 ฿50
   */
  export async function processReferralRewards(refereeId: string)
  ```

- [ ] **2.3.4 创建 `app/actions/referrals/get-my-referrals.ts`**
  ```typescript
  /**
   * 获取我的推荐列表
   */
  export async function getMyReferrals(merchantId: string)
  ```

#### 2.4 订阅账单 Actions

- [ ] **2.4.1 创建 `app/actions/subscriptions/create-invoice.ts`**
  ```typescript
  /**
   * 创建订阅账单（自动/手动）
   */
  export async function createSubscriptionInvoice(
    merchantId: string,
    planId: string,
    periodStart: Date,
    periodEnd: Date
  )
  ```

- [ ] **2.4.2 创建 `app/actions/subscriptions/pay-invoice.ts`**
  ```typescript
  /**
   * 支付订阅账单（从钱包扣款）
   */
  export async function paySubscriptionInvoice(invoiceId: string)
  ```

- [ ] **2.4.3 创建 `app/actions/subscriptions/get-invoices.ts`**
  ```typescript
  /**
   * 获取订阅账单历史
   */
  export async function getSubscriptionInvoices(merchantId: string)
  ```

**交付物**：
- `app/actions/subscriptions/` 目录下所有文件
- `app/actions/referrals/` 目录下所有文件
- 单元测试（可选）

**预估时间**：3-4天

---

### 阶段 3：前端组件开发（4-5天）

**目标**：创建订阅系统的用户界面

#### 3.1 订阅方案展示

- [ ] **3.1.1 创建 `components/subscription/PricingTable.tsx`**
  - 订阅方案对比表
  - 4个方案卡片（基础版/标准版/专业版/企业版）
  - 功能列表对比
  - "选择方案"按钮

- [ ] **3.1.2 创建 `components/subscription/PlanCard.tsx`**
  - 单个方案卡片
  - 价格显示
  - 功能列表
  - "当前方案"标记

#### 3.2 试用期相关

- [ ] **3.2.1 创建 `components/subscription/TrialCountdown.tsx`**
  - 试用期倒计时显示
  - 剩余天数提醒
  - 紧急状态样式（≤7天、≤3天、≤1天）

- [ ] **3.2.2 创建 `components/subscription/TrialBanner.tsx`**
  - 全局横幅（试用期提醒）
  - 一键跳转订阅页面

#### 3.3 订阅管理页面

- [ ] **3.3.1 创建 `app/[locale]/merchant/subscription/page.tsx`**
  - 当前订阅状态展示
  - 订阅方案选择
  - 升级/降级操作
  - 取消订阅操作
  - 账单历史

- [ ] **3.3.2 创建 `components/subscription/CurrentPlanCard.tsx`**
  - 当前方案信息
  - 到期时间
  - 使用情况（产品数/券种数）
  - 升级建议

- [ ] **3.3.3 创建 `components/subscription/UsageProgress.tsx`**
  - 产品数量进度条（X/50）
  - 券种数量进度条（X/15）
  - 接近上限警告（≥80%）

#### 3.4 权限限制提示

- [ ] **3.4.1 创建 `components/subscription/UpgradePrompt.tsx`**
  - 达到上限时弹窗提示
  - "您的产品已达到上限（25/25），升级到标准版可获得50个产品额度"
  - 升级按钮

- [ ] **3.4.2 创建 `components/subscription/BalanceLockPrompt.tsx`**
  - 余额不足时弹窗提示
  - "余额不足 ฿200，Slip2Go验证功能已锁定"
  - 充值按钮

- [ ] **3.4.3 创建 `components/subscription/FeatureLockedBadge.tsx`**
  - 功能锁定标记
  - 显示在未订阅功能上（如数据导出、Expo APP等）

#### 3.5 推荐系统界面

- [ ] **3.5.1 创建 `app/[locale]/merchant/referrals/page.tsx`**
  - 我的推荐码显示
  - 推荐链接生成和复制
  - 推荐列表（邀请了谁、状态、奖励）
  - 推荐统计（总邀请数、获得奖励）

- [ ] **3.5.2 创建 `components/referrals/ReferralCodeCard.tsx`**
  - 推荐码大字显示
  - 一键复制按钮
  - 分享链接
  - 二维码生成

- [ ] **3.5.3 创建 `components/referrals/ReferralList.tsx`**
  - 推荐列表表格
  - 状态显示（试用中、已订阅、已获得奖励）

#### 3.6 账单管理界面

- [ ] **3.6.1 创建 `components/subscription/InvoiceList.tsx`**
  - 账单列表表格
  - 日期、方案、金额、状态
  - 支付/下载按钮

- [ ] **3.6.2 创建 `components/subscription/InvoiceCard.tsx`**
  - 单个账单卡片
  - 详细信息展示

#### 3.7 注册流程修改

- [ ] **3.7.1 修改 `app/[locale]/merchant/onboarding/page.tsx`**
  - 添加推荐码输入框（可选）
  - 推荐码验证
  - 显示试用期说明（30天免费试用标准版）

**交付物**：
- 所有前端组件文件
- 订阅管理页面
- 推荐系统页面
- 注册流程更新

**预估时间**：4-5天

---

### 阶段 4：权限控制集成（3-4天）

**目标**：在现有功能中集成订阅权限检查

#### 4.1 产品管理权限控制

- [ ] **4.1.1 修改产品创建逻辑**
  - 文件：`app/actions/products/create.ts`（或相关文件）
  - 创建前检查产品数量限制
  - 达到上限返回错误并提示升级

- [ ] **4.1.2 修改产品列表页面**
  - 文件：`app/[locale]/merchant/products/page.tsx`
  - 显示使用进度（X/50）
  - 接近上限时显示升级提示

- [ ] **4.1.3 添加产品创建按钮禁用逻辑**
  - 达到上限时禁用"添加产品"按钮
  - 显示 Tooltip："产品已达上限，请升级订阅"

#### 4.2 优惠券管理权限控制

- [ ] **4.2.1 修改优惠券创建逻辑**
  - 文件：`app/actions/coupons/create.ts`（或相关文件）
  - 创建前检查券种数量限制
  - 达到上限返回错误并提示升级

- [ ] **4.2.2 修改优惠券列表页面**
  - 文件：`app/[locale]/merchant/coupons/page.tsx`（如果存在）
  - 显示使用进度（X/15）
  - 接近上限时显示升级提示

- [ ] **4.2.3 优惠券发行权限控制**
  - 检查余额 ≥ ฿200
  - 余额不足时禁用"发行优惠券"按钮
  - 显示充值提示

#### 4.3 Slip2Go 验证权限控制

- [ ] **4.3.1 修改 Slip2Go 验证逻辑**
  - 文件：验证支付凭证的相关代码
  - 验证前检查余额 ≥ ฿200
  - 余额不足返回错误

- [ ] **4.3.2 修改店铺结算按钮显示**
  - 文件：店铺页面相关代码
  - 余额 < ฿200 时隐藏结算按钮
  - 显示"商户余额不足，暂时无法使用扫码支付"

#### 4.4 核销中心权限控制

- [ ] **4.4.1 修改核销中心访问权限**
  - 文件：`app/[locale]/merchant/redeem/page.tsx`（如果存在）
  - 检查余额 ≥ ฿200 和订阅等级 ≥ 2 级
  - 权限不足显示锁定页面

- [ ] **4.4.2 修改核销操作逻辑**
  - 核销前检查余额和订阅状态
  - 权限不足返回错误

#### 4.5 高级功能权限控制

- [ ] **4.5.1 数据导出功能（专业版+）**
  - 文件：数据导出相关代码
  - 检查订阅等级 ≥ professional
  - 权限不足显示升级提示

- [ ] **4.5.2 员工管理功能（企业版）**
  - 文件：`app/[locale]/merchant/staff/page.tsx`
  - 检查订阅等级 = enterprise
  - 权限不足显示升级提示

- [ ] **4.5.3 API 访问（企业版）**
  - 检查订阅等级 = enterprise
  - 生成 API Key 前验证权限

#### 4.6 侧边栏菜单权限控制

- [ ] **4.6.1 修改 `components/MerchantSidebar.tsx`**
  - 根据订阅等级显示/隐藏菜单项
  - 锁定功能显示🔒图标
  - 点击锁定功能跳转订阅页面

**交付物**：
- 所有功能的权限控制更新
- 前端提示组件集成
- 测试报告

**预估时间**：3-4天

---

### 阶段 5：自动化任务和提醒（2-3天）

**目标**：实现订阅相关的自动化流程

#### 5.1 试用期提醒

- [ ] **5.1.1 创建试用期提醒定时任务**
  - 使用 Vercel Cron Jobs 或 Supabase Edge Functions
  - 每天检查试用期即将结束的商户

- [ ] **5.1.2 实现邮件提醒**
  - 提前 7 天发送邮件
  - 提前 3 天发送邮件
  - 提前 1 天发送邮件
  - 到期当天发送邮件

- [ ] **5.1.3 实现站内通知**
  - 使用全局横幅组件
  - 根据剩余天数调整提醒样式

#### 5.2 账号锁定自动化

- [ ] **5.2.1 创建账号锁定定时任务**
  - 每天检查试用期结束但未订阅的商户
  - 自动设置 status = 'locked'
  - 设置 data_retention_until = 锁定时间 + 90天

- [ ] **5.2.2 实现锁定状态拦截**
  - Middleware 检查商户状态
  - 锁定状态重定向到订阅页面
  - 显示"账号已锁定"提示

#### 5.3 订阅续费自动化

- [ ] **5.3.1 创建续费定时任务**
  - 每天检查计费周期即将结束的订阅
  - 自动创建下一期账单
  - 自动从钱包扣款

- [ ] **5.3.2 实现扣款失败处理**
  - 余额不足时设置 status = 'past_due'
  - 发送催款通知
  - 3天后仍未支付，锁定账号

#### 5.4 推荐奖励自动化

- [ ] **5.4.1 创建推荐奖励检查任务**
  - 被推荐人首次订阅时触发
  - 给推荐人发放 ฿50 奖励
  - 记录到 referral_rewards 表

- [ ] **5.4.2 实现3个月里程碑奖励**
  - 检查被推荐人使用满3个月
  - 给推荐人再发放 ฿50 奖励

#### 5.5 数据清理自动化

- [ ] **5.5.1 创建过期数据清理任务**
  - 每天检查 data_retention_until 过期的商户
  - 删除商户数据（产品、订单、优惠券等）
  - 保留商户账号和基本信息（用于防止推荐码重复）

**交付物**：
- 定时任务脚本（Vercel Cron 或 Supabase Functions）
- 邮件模板
- 自动化测试

**预估时间**：2-3天

---

### 阶段 6：国际化和用户体验优化（2天）

**目标**：完善多语言支持和用户体验

#### 6.1 国际化文本

- [ ] **6.1.1 添加订阅相关翻译**
  - 文件：`messages/en.json`, `messages/th.json`, `messages/zh.json`
  - 订阅方案名称
  - 功能列表
  - 提示文本
  - 错误信息

- [ ] **6.1.2 订阅相关翻译示例**
  ```json
  {
    "subscription": {
      "plans": {
        "trial": "试用期 | Trial | ทดลองใช้",
        "basic": "基础版 | Basic | พื้นฐาน",
        "standard": "标准版 | Standard | มาตรฐาน",
        "professional": "专业版 | Professional | มืออาชีพ",
        "enterprise": "企业版 | Enterprise | องค์กร"
      },
      "features": {
        "pos_system": "POS点餐系统 | POS System | ระบบ POS",
        "accounting": "记账功能 | Accounting | บัญชี",
        "data_export": "数据导出 | Data Export | ส่งออกข้อมูล"
      },
      "prompts": {
        "trial_ending": "试用期还剩{days}天 | Trial ends in {days} days | ทดลองใช้เหลือ {days} วัน",
        "upgrade_now": "立即升级 | Upgrade Now | อัพเกรดเลย",
        "product_limit_reached": "产品数量已达上限 | Product limit reached | ถึงขีดจำกัดสินค้า"
      }
    }
  }
  ```

#### 6.2 用户体验优化

- [ ] **6.2.1 添加加载状态**
  - 订阅操作时显示 Loading
  - 支付处理中禁用按钮

- [ ] **6.2.2 添加成功/错误提示**
  - 使用 Toast 通知
  - 订阅成功、升级成功、支付成功等

- [ ] **6.2.3 添加确认对话框**
  - 取消订阅确认
  - 降级订阅确认（数据可能丢失）

- [ ] **6.2.4 添加帮助文档**
  - 订阅方案对比详细说明
  - 常见问题解答
  - 联系客服入口

**交付物**：
- 完整的国际化翻译文件
- 优化后的用户体验
- 帮助文档

**预估时间**：2天

---

### 阶段 7：测试和修复（3-4天）

**目标**：全面测试订阅系统，修复 Bug

#### 7.1 功能测试

- [ ] **7.1.1 注册流程测试**
  - [ ] 无推荐码注册
  - [ ] 有推荐码注册
  - [ ] 推荐码验证（有效/无效）
  - [ ] 自动生成推荐码
  - [ ] 自动开始试用期

- [ ] **7.1.2 试用期测试**
  - [ ] 试用期功能访问
  - [ ] 试用期倒计时显示
  - [ ] 试用期提醒（7天、3天、1天）
  - [ ] 试用期结束自动锁定

- [ ] **7.1.3 订阅流程测试**
  - [ ] 选择订阅方案
  - [ ] 钱包余额支付
  - [ ] 订阅成功后解锁功能
  - [ ] 订阅信息正确显示

- [ ] **7.1.4 权限控制测试**
  - [ ] 产品数量限制
  - [ ] 优惠券券种限制
  - [ ] 余额解锁检查（≥ ฿200）
  - [ ] 高级功能访问控制
  - [ ] 菜单显示/隐藏

- [ ] **7.1.5 升级/降级测试**
  - [ ] 升级到更高方案
  - [ ] 降级到更低方案
  - [ ] 数量超限处理（降级时）

- [ ] **7.1.6 推荐奖励测试**
  - [ ] 推荐码应用
  - [ ] 试用期延长（30天 → 45天）
  - [ ] 首次订阅奖励发放
  - [ ] 3个月奖励发放
  - [ ] 奖励列表显示

- [ ] **7.1.7 账单测试**
  - [ ] 账单自动生成
  - [ ] 账单支付
  - [ ] 支付失败处理
  - [ ] 账单历史显示

#### 7.2 边界情况测试

- [ ] **7.2.1 余额边界测试**
  - [ ] 余额刚好 ฿200
  - [ ] 余额 ฿199.99
  - [ ] 余额为负数

- [ ] **7.2.2 数量边界测试**
  - [ ] 产品数刚好达到上限
  - [ ] 产品数超过上限（降级场景）
  - [ ] 删除产品后重新计数

- [ ] **7.2.3 时间边界测试**
  - [ ] 试用期最后一天
  - [ ] 计费周期最后一天
  - [ ] 跨月处理

#### 7.3 性能测试

- [ ] **7.3.1 数据库查询优化**
  - [ ] 检查订阅状态查询性能
  - [ ] 检查权限检查查询性能
  - [ ] 添加必要的索引

- [ ] **7.3.2 前端性能优化**
  - [ ] 组件懒加载
  - [ ] 数据缓存策略

#### 7.4 Bug 修复

- [ ] **7.4.1 记录发现的 Bug**
  - 创建 Bug 列表文档
  - 标注优先级（P0/P1/P2）

- [ ] **7.4.2 修复 P0 Bug**
  - 阻塞性问题优先修复

- [ ] **7.4.3 修复 P1/P2 Bug**
  - 影响用户体验的问题

**交付物**：
- 测试报告
- Bug 修复记录
- 性能优化报告

**预估时间**：3-4天

---

### 阶段 8：数据迁移和上线（2-3天）

**目标**：迁移现有商户数据，部署到生产环境

#### 8.1 现有商户数据迁移

- [ ] **8.1.1 分析现有商户数据**
  - 统计当前商户数量
  - 统计商户产品数量分布
  - 统计商户优惠券数量分布

- [ ] **8.1.2 制定迁移策略**
  - 所有现有商户自动获得 30 天试用期
  - 试用期从迁移日期开始计算
  - 或：根据注册时间给予合理的试用期

- [ ] **8.1.3 执行数据迁移脚本**
  ```sql
  -- 为所有现有商户创建试用期订阅
  INSERT INTO merchant_subscriptions (merchant_id, plan_id, status, trial_start_date, trial_end_date)
  SELECT
    m.id,
    (SELECT id FROM subscription_plans WHERE name = 'trial'),
    'trial',
    NOW(),
    NOW() + INTERVAL '30 days'
  FROM merchants m
  WHERE NOT EXISTS (
    SELECT 1 FROM merchant_subscriptions WHERE merchant_id = m.id
  );
  ```

- [ ] **8.1.4 验证迁移结果**
  - 检查所有商户都有订阅记录
  - 检查推荐码生成
  - 检查数据完整性

#### 8.2 生产环境部署

- [ ] **8.2.1 运行生产环境迁移**
  - 在 Supabase 生产环境运行迁移 SQL
  - 验证表和函数正确创建

- [ ] **8.2.2 部署应用代码**
  - 合并代码到主分支
  - Vercel 自动部署
  - 验证部署成功

- [ ] **8.2.3 生产环境测试**
  - 测试关键流程
  - 验证订阅功能正常
  - 验证权限控制生效

#### 8.3 监控和告警

- [ ] **8.3.1 设置监控**
  - Vercel Analytics
  - Supabase 监控
  - 错误追踪（Sentry 等）

- [ ] **8.3.2 设置告警**
  - 订阅失败告警
  - 支付失败告警
  - 系统错误告警

#### 8.4 用户通知

- [ ] **8.4.1 准备通知文案**
  - 订阅系统上线通知
  - 试用期说明
  - 升级引导

- [ ] **8.4.2 发送用户通知**
  - 站内通知
  - 邮件通知（可选）
  - Facebook 群组公告（可选）

**交付物**：
- 数据迁移报告
- 生产环境部署文档
- 监控仪表板

**预估时间**：2-3天

---

## 📊 总体时间表

| 阶段 | 任务 | 预估时间 | 依赖 |
|-----|------|---------|------|
| 阶段 0 | 准备工作 | 1-2 天 | - |
| 阶段 1 | 数据库设计与迁移 | 2-3 天 | 阶段 0 |
| 阶段 2 | Server Actions 开发 | 3-4 天 | 阶段 1 |
| 阶段 3 | 前端组件开发 | 4-5 天 | 阶段 2 |
| 阶段 4 | 权限控制集成 | 3-4 天 | 阶段 2, 3 |
| 阶段 5 | 自动化任务和提醒 | 2-3 天 | 阶段 2 |
| 阶段 6 | 国际化和用户体验优化 | 2 天 | 阶段 3 |
| 阶段 7 | 测试和修复 | 3-4 天 | 阶段 1-6 |
| 阶段 8 | 数据迁移和上线 | 2-3 天 | 阶段 7 |

**总计**：22-30 天（约 1 个月）

---

## 🎯 里程碑

### 里程碑 1：数据库和后端完成（第 1 周）
- ✅ 数据库表创建完成
- ✅ 所有 Server Actions 开发完成
- ✅ 单元测试通过

### 里程碑 2：前端界面完成（第 2-3 周）
- ✅ 所有订阅相关页面开发完成
- ✅ 权限控制集成到现有功能
- ✅ 国际化翻译完成

### 里程碑 3：测试和上线（第 4 周）
- ✅ 全面测试通过
- ✅ Bug 修复完成
- ✅ 生产环境部署成功

---

## 📝 注意事项

### 技术注意事项

1. **数据库迁移**
   - 迁移前务必备份数据
   - 先在开发环境测试迁移脚本
   - 生产环境迁移时选择低峰时段

2. **权限检查性能**
   - 权限检查函数会频繁调用，需优化查询
   - 考虑使用 Redis 缓存订阅状态（可选）
   - 添加必要的数据库索引

3. **钱包余额扣款**
   - 使用数据库事务确保原子性
   - 余额不足时正确回滚
   - 记录扣款日志

4. **时区处理**
   - 统一使用 UTC 时间存储
   - 前端显示时转换为泰国时区（UTC+7）

### 业务注意事项

1. **现有商户迁移**
   - 给予合理的缓冲期（30天试用）
   - 提前通知商户订阅政策变更
   - 准备客服应对商户疑问

2. **推荐奖励成本**
   - 推荐奖励是余额而非现金
   - 实际成本仅为 Slip2Go API 费用（฿0.08/次）
   - 每个推荐商户成本约 ฿8

3. **订阅定价调整**
   - 保留价格调整空间
   - 订阅方案表支持 is_active 字段
   - 新旧方案可共存

---

## 🚀 快速开始

### 第一步：克隆本文档
```bash
cp SUBSCRIPTION_IMPLEMENTATION_ROADMAP.md SUBSCRIPTION_PROGRESS.md
```

### 第二步：开始阶段 0
```bash
# 1. 查看现有数据库结构
# 使用 Supabase Studio 或 SQL 查询

# 2. 分析现有代码
# 重点查看：
# - app/actions/products/
# - app/actions/coupons/
# - app/[locale]/merchant/onboarding/
# - components/MerchantSidebar.tsx
```

### 第三步：创建技术设计文档
在 `SUBSCRIPTION_TECHNICAL_DESIGN.md` 中详细记录：
- 数据库表结构
- API 端点列表
- 前端组件树
- 状态管理方案

---

## 📞 需要帮助？

在实施过程中遇到问题，可以：
1. 查看本文档对应阶段的详细说明
2. 参考 [SUBSCRIPTION_PLAN_V8_FINAL.md](SUBSCRIPTION_PLAN_V8_FINAL.md) 了解业务逻辑
3. 向我提问具体的技术问题

---

**文档版本**：v1.0
**创建日期**：2025-12-21
**最后更新**：2025-12-21
