# 部署清单 - 2025-12-04

## ✅ 已完成的更新

### 1. 修复附近优惠券 API 错误
- **问题**: API 返回 500 错误，字段名不匹配
- **修复**: 将 `business_name` 改为 `shop_name`
- **影响文件**:
  - [app/api/nearby-coupons/route.ts](app/api/nearby-coupons/route.ts)
  - [components/NearbyCoupons.tsx](components/NearbyCoupons.tsx)
- **状态**: ✅ 已修复，本地测试通过

### 2. 添加管理员工具导航
- **功能**: 在管理员后台侧边栏添加"管理员工具"菜单项
- **文件**: [app/admin/layout.tsx](app/admin/layout.tsx)
- **状态**: ✅ 已完成

### 3. 修复管理员登录 TypeScript 错误
- **问题**: Vercel 部署失败，`profileError?.code` 类型错误
- **修复**: 简化条件判断逻辑
- **文件**: [app/auth/callback/route.ts](app/auth/callback/route.ts)
- **状态**: ✅ 已修复

### 4. 实现商户地址快照功能
- **功能**: 订单表保存下单时商户的地址信息
- **目的**: 商户搬家后，历史订单仍显示下单时的地址
- **影响文件**:
  - [app/api/checkout/route.ts](app/api/checkout/route.ts) - 创建订单时保存快照
  - [supabase/migrations/add_merchant_location_snapshot_to_orders.sql](supabase/migrations/add_merchant_location_snapshot_to_orders.sql) - SQL 迁移
  - [MERCHANT_LOCATION_SNAPSHOT_SETUP.md](MERCHANT_LOCATION_SNAPSHOT_SETUP.md) - 详细文档
- **新增字段**:
  - `merchant_shop_name_snapshot` (商户名称快照)
  - `merchant_address_snapshot` (地址快照)
  - `merchant_latitude_snapshot` (纬度快照)
  - `merchant_longitude_snapshot` (经度快照)
- **状态**: ✅ 代码已完成，需要执行数据库迁移

### 5. 更新 Next.js 版本
- **原版本**: 16.0.3 (有安全漏洞)
- **新版本**: 16.0.7 (最新稳定版)
- **状态**: ✅ 已更新，npm audit 显示 0 vulnerabilities

---

## 📋 部署前必须执行的操作

### ⚠️ 重要：数据库迁移

在部署代码到 Vercel 之前，**必须先执行以下 SQL**：

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 左侧菜单 → **SQL Editor**
4. 点击 **New query**
5. 粘贴以下 SQL 并执行：

```sql
-- 为 orders 表添加商户地址快照字段
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS merchant_address_snapshot TEXT,
ADD COLUMN IF NOT EXISTS merchant_latitude_snapshot NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS merchant_longitude_snapshot NUMERIC(11, 8),
ADD COLUMN IF NOT EXISTS merchant_shop_name_snapshot TEXT;

-- 添加注释说明
COMMENT ON COLUMN public.orders.merchant_address_snapshot IS '商户地址快照（下单时）';
COMMENT ON COLUMN public.orders.merchant_latitude_snapshot IS '商户纬度快照（下单时）';
COMMENT ON COLUMN public.orders.merchant_longitude_snapshot IS '商户经度快照（下单时）';
COMMENT ON COLUMN public.orders.merchant_shop_name_snapshot IS '商户名称快照（下单时）';

-- 为现有订单填充快照数据（如果可能）
UPDATE public.orders o
SET
  merchant_shop_name_snapshot = m.shop_name,
  merchant_address_snapshot = m.address,
  merchant_latitude_snapshot = m.latitude,
  merchant_longitude_snapshot = m.longitude
FROM public.coupons c
JOIN public.merchants m ON c.merchant_id = m.merchant_id
WHERE o.coupon_id = c.coupon_id
  AND o.merchant_shop_name_snapshot IS NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_orders_merchant_location_snapshot
ON public.orders (merchant_latitude_snapshot, merchant_longitude_snapshot)
WHERE merchant_latitude_snapshot IS NOT NULL AND merchant_longitude_snapshot IS NOT NULL;
```

6. 点击 **Run** 执行
7. 确认执行成功（应显示 "Success" 或受影响的行数）

---

## 🚀 部署步骤

### 1. 提交代码到 Git

```bash
git add .
git commit -m "Fix: 修复附近优惠券API、添加管理员工具导航、实现商户地址快照、更新Next.js 16.0.7

- 修复附近优惠券 API 字段名错误 (business_name -> shop_name)
- 添加 /admin/tools 到管理员导航菜单
- 修复管理员登录 TypeScript 类型错误
- 实现订单表商户地址快照功能（防止商户搬家影响历史订单）
- 更新 Next.js 从 16.0.3 到 16.0.7（修复安全漏洞）
"
```

### 2. 推送到 GitHub

```bash
git push origin main
```

### 3. Vercel 自动部署

推送后，Vercel 会自动触发部署。

---

## ✅ 部署后验证

### 1. 验证附近优惠券功能

访问首页：`https://your-domain.com`
- 点击"附近的优惠券"
- 授权位置权限
- 确认优惠券列表正常显示

### 2. 验证管理员工具导航

访问管理员后台：`https://your-domain.com/admin`
- 确认左侧菜单有"管理员工具"选项
- 点击进入 `/admin/tools`
- 确认页面正常加载

### 3. 验证商户地址快照

创建一个测试订单，然后在 Supabase 中查询：

```sql
SELECT
  order_id,
  merchant_shop_name_snapshot,
  merchant_address_snapshot,
  merchant_latitude_snapshot,
  merchant_longitude_snapshot,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 5;
```

确认新订单的快照字段已填充。

### 4. 验证 Next.js 版本

访问任意页面，在浏览器控制台中不应看到安全警告。

Vercel Dashboard 不应再显示安全漏洞警告。

---

## 📚 相关文档

- [MERCHANT_LOCATION_SNAPSHOT_SETUP.md](MERCHANT_LOCATION_SNAPSHOT_SETUP.md) - 商户地址快照功能详细说明
- [ADMIN_SETUP.md](ADMIN_SETUP.md) - 管理员账号设置指南

---

## 🎯 下一步（可选）

如果需要使用管理员工具批量更新商户位置：

1. 访问 `/admin/tools`
2. 点击"批量更新商户位置"按钮
3. 系统会自动从 Google Maps 链接中提取经纬度并更新数据库

---

## 🔧 回滚方案（如果出现问题）

### 回滚代码
```bash
git revert HEAD
git push origin main
```

### 回滚数据库（删除快照字段）
```sql
ALTER TABLE public.orders
DROP COLUMN IF EXISTS merchant_address_snapshot,
DROP COLUMN IF EXISTS merchant_latitude_snapshot,
DROP COLUMN IF EXISTS merchant_longitude_snapshot,
DROP COLUMN IF EXISTS merchant_shop_name_snapshot;

DROP INDEX IF EXISTS idx_orders_merchant_location_snapshot;
```

---

**生成时间**: 2025-12-04
**状态**: 所有功能已完成，待部署验证
