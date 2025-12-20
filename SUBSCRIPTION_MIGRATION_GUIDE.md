# 订阅系统数据库迁移指南

**版本**: v1.0 (简化版 - 无推荐系统)
**日期**: 2025-12-21

---

## 📋 迁移内容概述

### 创建的数据库对象

#### 新表（3个）
1. **subscription_plans** - 订阅方案配置表
2. **merchant_subscriptions** - 商户订阅记录表
3. **subscription_invoices** - 订阅账单表

#### 新函数（4个）
1. **check_subscription_status()** - 订阅状态检查
2. **check_balance_unlock()** - 余额解锁检查（≥ ฿200）
3. **check_product_limit()** - 产品数量限制检查
4. **check_coupon_type_limit()** - 优惠券券种限制检查

#### 新索引（2个）
1. **idx_coupons_merchant_id** - 优惠券商户ID索引
2. **idx_products_merchant_id** - 产品商户ID索引（如果不存在）

#### 初始化数据（5个订阅方案）
- Trial（试用期）: ฿0, 50产品, 15券种
- Basic（基础版）: ฿89, 25产品, 8券种
- Standard（标准版）: ฿169, 50产品, 15券种
- Professional（专业版）: ฿269, 100产品, 20券种
- Enterprise（企业版）: ฿399, 200产品, 30券种

---

## 🚀 执行迁移

### 方法 1：使用 Supabase CLI（推荐）

```bash
# 1. 确保在项目根目录
cd /Users/jasonbear/pmt

# 2. 检查迁移文件
ls -la supabase/migrations/20251221_create_subscription_system.sql

# 3. 应用迁移到本地数据库
supabase db reset

# 或者只应用新迁移
supabase migration up

# 4. 验证迁移结果
supabase db diff
```

### 方法 2：使用 Supabase Studio

1. 打开 Supabase Studio: https://supabase.com/dashboard
2. 选择你的项目
3. 进入 **SQL Editor**
4. 复制 `supabase/migrations/20251221_create_subscription_system.sql` 的全部内容
5. 粘贴并点击 **Run**

### 方法 3：使用 psql（直接连接）

```bash
# 1. 获取数据库连接字符串（从 Supabase Dashboard）
# 格式：postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

# 2. 执行迁移
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  -f supabase/migrations/20251221_create_subscription_system.sql
```

---

## ✅ 验证迁移结果

### 1. 检查表是否创建成功

```sql
-- 查询所有新表
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('subscription_plans', 'merchant_subscriptions', 'subscription_invoices')
ORDER BY table_name;

-- 期望输出：
-- merchant_subscriptions
-- subscription_invoices
-- subscription_plans
```

### 2. 检查订阅方案数据

```sql
-- 查询所有订阅方案
SELECT
  name,
  display_name->>'zh' as display_name_zh,
  price,
  product_limit,
  coupon_type_limit
FROM subscription_plans
ORDER BY price;

-- 期望输出：
-- trial        | 试用期    | 0    | 50  | 15
-- basic        | 基础版    | 89   | 25  | 8
-- standard     | 标准版    | 169  | 50  | 15
-- professional | 专业版    | 269  | 100 | 20
-- enterprise   | 企业版    | 399  | 200 | 30
```

### 3. 检查函数是否创建成功

```sql
-- 查询所有新函数
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'check_subscription_status',
    'check_balance_unlock',
    'check_product_limit',
    'check_coupon_type_limit'
  )
ORDER BY routine_name;

-- 期望输出：
-- check_balance_unlock       | FUNCTION
-- check_coupon_type_limit    | FUNCTION
-- check_product_limit        | FUNCTION
-- check_subscription_status  | FUNCTION
```

### 4. 测试函数功能

```sql
-- 测试订阅状态检查函数（使用一个存在的 merchant_id）
-- 注意：此时应该返回空，因为还没有订阅记录
SELECT * FROM check_subscription_status('YOUR_MERCHANT_ID');

-- 测试余额检查函数（使用一个存在的 merchant_id）
SELECT check_balance_unlock('YOUR_MERCHANT_ID');

-- 测试产品限制检查函数
SELECT * FROM check_product_limit('YOUR_MERCHANT_ID');

-- 测试优惠券限制检查函数
SELECT * FROM check_coupon_type_limit('YOUR_MERCHANT_ID');
```

---

## 🧪 手动测试订阅流程

### 1. 为现有商户创建试用期订阅

```sql
-- 获取一个测试商户ID
SELECT merchant_id, owner_id
FROM merchants
LIMIT 1;

-- 创建试用期订阅
INSERT INTO merchant_subscriptions (
  merchant_id,
  plan_id,
  status,
  trial_start_date,
  trial_end_date
)
SELECT
  'YOUR_MERCHANT_ID'::uuid,
  id,
  'trial',
  NOW(),
  NOW() + INTERVAL '30 days'
FROM subscription_plans
WHERE name = 'trial';

-- 验证创建成功
SELECT
  ms.merchant_id,
  sp.name as plan_name,
  ms.status,
  ms.trial_end_date
FROM merchant_subscriptions ms
JOIN subscription_plans sp ON ms.plan_id = sp.id
WHERE ms.merchant_id = 'YOUR_MERCHANT_ID';
```

### 2. 测试订阅状态检查

```sql
-- 检查订阅状态
SELECT * FROM check_subscription_status('YOUR_MERCHANT_ID');

-- 期望输出：
-- is_active | plan_name | status | features | product_limit | coupon_type_limit
-- true      | trial     | trial  | {...}    | 50            | 15
```

### 3. 测试产品限制检查

```sql
-- 检查产品限制
SELECT * FROM check_product_limit('YOUR_MERCHANT_ID');

-- 期望输出示例（假设商户有10个产品）：
-- current_count | limit_count | can_create
-- 10            | 50          | true
```

### 4. 测试余额解锁检查

```sql
-- 检查余额是否足够解锁
SELECT check_balance_unlock('YOUR_MERCHANT_ID');

-- 期望输出：
-- true 或 false（取决于商户实际余额）
```

---

## 🔄 回滚迁移（如需要）

如果迁移出现问题，可以执行以下回滚操作：

```sql
-- 警告：这将删除所有订阅相关数据！

-- 1. 删除表（按依赖顺序）
DROP TABLE IF EXISTS subscription_invoices CASCADE;
DROP TABLE IF EXISTS merchant_subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;

-- 2. 删除函数
DROP FUNCTION IF EXISTS check_subscription_status(UUID);
DROP FUNCTION IF EXISTS check_balance_unlock(UUID);
DROP FUNCTION IF EXISTS check_product_limit(UUID);
DROP FUNCTION IF EXISTS check_coupon_type_limit(UUID);

-- 3. 删除索引（可选，如果表已删除则不需要）
DROP INDEX IF EXISTS idx_coupons_merchant_id;
DROP INDEX IF EXISTS idx_products_merchant_id;

-- 完成
SELECT 'Rollback completed' as status;
```

---

## 📊 数据库表结构参考

### subscription_plans 表

| 列名 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键 |
| name | TEXT | 方案标识（trial, basic, standard, professional, enterprise） |
| display_name | JSONB | 多语言显示名称 |
| price | DECIMAL(10,2) | 月费（泰铢） |
| product_limit | INTEGER | 产品上限 |
| coupon_type_limit | INTEGER | 优惠券券种上限 |
| features | JSONB | 功能特性JSON |
| is_active | BOOLEAN | 是否启用 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

### merchant_subscriptions 表

| 列名 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键 |
| merchant_id | UUID | 商户ID（唯一） |
| plan_id | UUID | 订阅方案ID |
| status | TEXT | 状态（trial, active, past_due, canceled, locked） |
| trial_start_date | TIMESTAMPTZ | 试用期开始时间 |
| trial_end_date | TIMESTAMPTZ | 试用期结束时间 |
| current_period_start | TIMESTAMPTZ | 当前计费周期开始 |
| current_period_end | TIMESTAMPTZ | 当前计费周期结束 |
| cancel_at_period_end | BOOLEAN | 期末取消标记 |
| canceled_at | TIMESTAMPTZ | 取消时间 |
| locked_at | TIMESTAMPTZ | 锁定时间 |
| data_retention_until | TIMESTAMPTZ | 数据保留截止时间 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

### subscription_invoices 表

| 列名 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键 |
| merchant_id | UUID | 商户ID |
| subscription_id | UUID | 订阅记录ID |
| plan_id | UUID | 订阅方案ID |
| amount | DECIMAL(10,2) | 账单金额 |
| status | TEXT | 状态（pending, paid, failed, refunded） |
| period_start | TIMESTAMPTZ | 计费周期开始 |
| period_end | TIMESTAMPTZ | 计费周期结束 |
| paid_at | TIMESTAMPTZ | 支付时间 |
| payment_method | TEXT | 支付方式（wallet, promptpay） |
| merchant_transaction_id | UUID | 关联钱包交易ID |
| failure_reason | TEXT | 失败原因 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

---

## 🎯 下一步

迁移完成后，可以进入 **阶段 2：Server Actions 开发**：

### 需要创建的 Actions

1. **订阅管理** (6个)
   - `getSubscriptionPlans()`
   - `getCurrentSubscription(merchantId)`
   - `startTrial(merchantId)`
   - `subscribeToPlan(merchantId, planId, paymentMethod)`
   - `cancelSubscription(merchantId)`
   - `reactivateSubscription(merchantId, planId)`

2. **权限检查** (4个)
   - `checkFeatureAccess(merchantId, feature)`
   - `checkBalanceUnlock(merchantId)`
   - `checkProductLimit(merchantId)`
   - `checkCouponTypeLimit(merchantId)`

3. **账单管理** (3个)
   - `createSubscriptionInvoice(...)`
   - `paySubscriptionInvoice(invoiceId)`
   - `getSubscriptionInvoices(merchantId)`

---

## 🐛 常见问题

### Q1: 迁移时提示 "relation already exists"

**原因**: 表或函数已经存在
**解决**: 迁移脚本已使用 `CREATE TABLE IF NOT EXISTS` 和 `CREATE OR REPLACE FUNCTION`，应该不会报错。如果仍有问题，先执行回滚脚本。

### Q2: 初始化数据重复插入

**原因**: 多次运行迁移
**解决**: 迁移脚本已使用 `ON CONFLICT (name) DO NOTHING`，重复运行不会导致数据重复。

### Q3: 函数测试返回 NULL

**原因**: 商户还没有订阅记录
**解决**: 使用上面的"手动测试订阅流程"为商户创建试用期订阅。

### Q4: 如何查看迁移日志

**Supabase CLI**:
```bash
supabase db diff
```

**Supabase Studio**:
进入 Database > Migrations 查看迁移历史

---

## 📝 迁移检查清单

完成以下检查后，可以认为迁移成功：

- [ ] 3个新表创建成功
- [ ] 4个函数创建成功
- [ ] 2个索引创建成功（coupons, products）
- [ ] 5个订阅方案数据插入成功
- [ ] `check_subscription_status()` 函数可以正常调用
- [ ] `check_balance_unlock()` 函数可以正常调用
- [ ] `check_product_limit()` 函数可以正常调用
- [ ] `check_coupon_type_limit()` 函数可以正常调用
- [ ] 为测试商户创建试用期订阅成功
- [ ] 所有函数测试返回预期结果

---

**迁移完成后，请继续阅读**: [SUBSCRIPTION_IMPLEMENTATION_ROADMAP.md](SUBSCRIPTION_IMPLEMENTATION_ROADMAP.md) 的阶段 2
