# 商户地址快照功能说明

## 功能概述

为了确保历史订单能够保留下单时的商户地址信息（即使商户后来搬家），我们在 `orders` 表中添加了商户地址快照字段。

## 实现方案

### 数据库层面

在 `orders` 表中新增 4 个字段：

```sql
merchant_shop_name_snapshot   TEXT            -- 商户名称快照
merchant_address_snapshot      TEXT            -- 商户地址快照
merchant_latitude_snapshot     NUMERIC(10, 8)  -- 商户纬度快照
merchant_longitude_snapshot    NUMERIC(11, 8)  -- 商户经度快照
```

### 应用层面

在创建订单时（[app/api/checkout/route.ts](app/api/checkout/route.ts)），自动保存商户的当前地址信息到订单表。

## 部署步骤

### 第 1 步：执行数据库迁移

在 Supabase Dashboard 中执行以下 SQL：

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

-- 创建索引（可选，用于快速查询某个区域的历史订单）
CREATE INDEX IF NOT EXISTS idx_orders_merchant_location_snapshot
ON public.orders (merchant_latitude_snapshot, merchant_longitude_snapshot)
WHERE merchant_latitude_snapshot IS NOT NULL AND merchant_longitude_snapshot IS NOT NULL;
```

**执行路径：**
1. 访问 https://supabase.com/dashboard
2. 选择你的项目
3. 左侧菜单 → **SQL Editor**
4. 点击 **New query**
5. 粘贴上面的 SQL 代码
6. 点击 **Run** 执行

### 第 2 步：部署代码

代码已经更新完成，包含以下修改：

- ✅ [app/api/checkout/route.ts](app/api/checkout/route.ts) - 在创建订单时保存商户地址快照
- ✅ [supabase/migrations/add_merchant_location_snapshot_to_orders.sql](supabase/migrations/add_merchant_location_snapshot_to_orders.sql) - SQL 迁移文件

直接提交代码并部署到 Vercel 即可。

## 工作原理

### 创建订单时

当用户下单时，系统会：

1. 查询优惠券/商品关联的商户信息
2. 获取商户的当前地址信息：
   - `shop_name` (商户名称)
   - `address` (地址)
   - `latitude` (纬度)
   - `longitude` (经度)
3. 将这些信息保存到订单的快照字段中

### 商户搬家后

- **优惠券页面** → 显示商户的**最新地址**（从 `merchants` 表实时读取）
- **历史订单** → 显示**下单时的地址**（从订单快照字段读取）

这样既能保证用户看到最新的商户位置，又能保留历史订单的地址信息用于客诉处理。

## 数据流示例

```
用户下单购买优惠券
  ↓
查询 coupons 表 JOIN merchants 表
  ↓
获取商户当前信息：
  - shop_name: "星巴克咖啡 (Siam Square 店)"
  - address: "曼谷 Rama I 路 XXX 号"
  - latitude: 13.745678
  - longitude: 100.533456
  ↓
保存到 orders 表：
  - merchant_id: xxx (外键，指向商户)
  - merchant_shop_name_snapshot: "星巴克咖啡 (Siam Square 店)"
  - merchant_address_snapshot: "曼谷 Rama I 路 XXX 号"
  - merchant_latitude_snapshot: 13.745678
  - merchant_longitude_snapshot: 100.533456
```

**6 个月后商户搬家：**

```
merchants 表更新：
  - address: "曼谷 Sukhumvit 路 YYY 号" (新地址)
  - latitude: 13.723456
  - longitude: 100.556789

用户查看历史订单：
  → 显示订单快照地址："曼谷 Rama I 路 XXX 号" (下单时的地址)

用户浏览优惠券：
  → 显示最新地址："曼谷 Sukhumvit 路 YYY 号" (当前地址)
```

## 优势

✅ **数据一致性** - 优惠券始终显示商户最新地址（通过外键关联）
✅ **历史记录** - 订单保留下单时的地址快照
✅ **无需同步** - 不需要额外的数据同步逻辑
✅ **查询简单** - 直接读取订单表即可获得历史地址
✅ **易于维护** - 商户搬家只需更新 merchants 表

## 注意事项

1. **仅对新订单生效** - 已有的历史订单在执行迁移 SQL 时会尝试填充快照数据
2. **不影响现有功能** - 快照字段是可选的，不会破坏现有订单查询
3. **存储成本低** - 每个订单只增加 4 个字段，数据量很小

## 验证步骤

部署后，可以通过以下方式验证：

1. 创建一个测试订单
2. 在 Supabase Dashboard 中查看 `orders` 表
3. 确认新订单的快照字段已填充：
   ```sql
   SELECT
     order_id,
     merchant_shop_name_snapshot,
     merchant_address_snapshot,
     merchant_latitude_snapshot,
     merchant_longitude_snapshot
   FROM orders
   ORDER BY created_at DESC
   LIMIT 5;
   ```

## 相关文件

- 数据库迁移脚本：`supabase/migrations/add_merchant_location_snapshot_to_orders.sql`
- 订单创建 API：`app/api/checkout/route.ts`
- 本说明文档：`MERCHANT_LOCATION_SNAPSHOT_SETUP.md`
