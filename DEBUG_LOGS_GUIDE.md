# 订单显示调试日志指南

## 📝 已添加的日志位置

为了诊断订单页面无数据显示的问题，我在以下 3 个关键位置添加了详细的调试日志：

---

## 1️⃣ Server Component 日志

**文件**: [app/client/orders/page.tsx](app/client/orders/page.tsx:49)

**日志内容**:
```
=== 订单页面调试日志 ===
1. 用户信息: { id: '...', email: '...' }
2. 开始查询订单，customer_id: ...
3. 查询结果:
   - Error: null
   - Data 数量: X
   - 订单详情:
      订单 1: {
        order_id: 'xxx...',
        status: 'paid',
        purchase_price: 100.00,
        has_coupons: true/false,
        coupons_count: 1,
        has_order_items: true/false,
        order_items_count: 2
      }
4. 最终传递给 OrderTabs 的订单数量: X
=== 订单页面调试日志结束 ===
```

**如何查看**:
1. 打开 Vercel Dashboard
2. 进入您的项目
3. 点击 **"Functions"** 标签
4. 找到 `/client/orders` 路由的日志
5. 查看最近的函数执行记录

**关键检查点**:
- ✅ `用户信息` 不为 null
- ✅ `Data 数量` > 0
- ✅ 每个订单的 `status` 是否为 `paid`/`used`/`expired`
- ✅ 至少 `has_coupons` 或 `has_order_items` 有一个为 `true`

---

## 2️⃣ Client Component 日志

**文件**: [components/OrderTabs.tsx](components/OrderTabs.tsx:40)

**日志内容**:
```
=== OrderTabs 组件调试 ===
接收到的订单数量: X
订单状态分布: {
  paid: 2,
  used: 0,
  expired: 0,
  other: 0
}
订单 1: {
  status: 'paid',
  has_coupons: true,
  has_order_items: false,
  will_display: true
}
renderOrders(paid): 筛选后数量 = 2
  处理订单 abc12345: {
    has_coupons: true,
    coupons_length: 1,
    has_order_items: false,
    order_items_length: 0
  }
    ✅ 使用优惠券数据: 优惠券名称
```

**如何查看**:
1. 访问 https://pmt-blush.vercel.app/client/orders
2. 打开浏览器开发者工具 (F12)
3. 切换到 **"Console"** 标签
4. 查看日志输出

**关键检查点**:
- ✅ `接收到的订单数量` > 0
- ✅ `订单状态分布` 中对应标签的数量 > 0
- ✅ `will_display` 为 `true`
- ✅ 看到 `✅ 使用优惠券数据` 或 `✅ 使用商品数据`
- ❌ 如果看到 `❌ 订单既无优惠券也无商品，跳过显示` 说明数据不完整

---

## 3️⃣ API 日志

**文件**: [app/api/confirm-payment/route.ts](app/api/confirm-payment/route.ts:12)

**日志内容**:
```
=== Confirm Payment API ===
1. 收到订单 ID: xxx-xxx-xxx
2. 用户信息: { id: '...', email: '...' }
3. 查询订单结果: {
  found: true,
  error: 'null',
  order_status: 'pending'
}
4. 开始更新订单状态为 paid...
✅ 订单状态已更新为 paid
=== Confirm Payment API 完成 ===
```

**如何查看**:
1. 打开 Vercel Dashboard
2. 进入您的项目
3. 点击 **"Functions"** 标签
4. 找到 `/api/confirm-payment` 路由的日志
5. 查看点击"已付款"按钮后的函数执行记录

**关键检查点**:
- ✅ `收到订单 ID` 有值
- ✅ `用户信息` 不为 null
- ✅ `found` 为 `true`
- ✅ `order_status` 为 `pending`
- ✅ 看到 `✅ 订单状态已更新为 paid`

---

## 🔍 常见问题诊断

### 问题 1: 订单页面完全无数据

**日志检查**:
```
Server 日志:
   - Data 数量: 0
   ⚠️ 没有查询到任何订单数据
```

**可能原因**:
1. 数据库中没有该用户的订单记录
2. `customer_id` 不匹配
3. RLS 策略阻止了查询

**解决方案**:
```sql
-- 在 Supabase SQL Editor 中检查
SELECT order_id, customer_id, status, created_at
FROM orders
WHERE customer_id = '<用户ID>'
ORDER BY created_at DESC;
```

---

### 问题 2: 有订单但不显示在页面

**日志检查**:
```
Server 日志:
   - Data 数量: 2
   订单 1: {
     status: 'pending',  ← 问题！
     has_order_items: true
   }

Client 日志:
订单状态分布: {
  paid: 0,
  used: 0,
  expired: 0,
  other: 2  ← 问题！status 为 'pending'
}
```

**可能原因**:
订单状态仍为 `pending`，但 OrderTabs 只显示 `paid`/`used`/`expired`

**解决方案**:
1. 确保点击"已付款"按钮后调用了 `/api/confirm-payment`
2. 检查 API 日志确认状态更新成功
3. 手动更新数据库：
```sql
UPDATE orders
SET status = 'paid'
WHERE order_id = '<订单ID>';
```

---

### 问题 3: 订单有数据但被跳过显示

**日志检查**:
```
Client 日志:
  处理订单 abc12345: {
    has_coupons: false,
    coupons_length: 0,
    has_order_items: false,  ← 问题！
    order_items_length: 0
  }
    ❌ 订单既无优惠券也无商品，跳过显示
```

**可能原因**:
1. `order_items` 表中没有对应记录
2. 联表查询失败

**解决方案**:
```sql
-- 检查 order_items 表
SELECT oi.*, o.order_id, o.customer_id
FROM orders o
LEFT JOIN order_items oi ON o.order_id = oi.order_id
WHERE o.order_id = '<订单ID>';

-- 如果为空，手动插入
INSERT INTO order_items (order_id, coupon_id, quantity)
VALUES ('<订单ID>', '<优惠券ID>', 1);
```

---

### 问题 4: order_items 有数据但 products 为空

**日志检查**:
```
Client 日志:
  处理订单 abc12345: {
    has_order_items: true,
    order_items_length: 1
  }
    ⚠️ order_items 存在但 products 为空
```

**可能原因**:
`order_items` 中的 `product_id` 或 `coupon_id` 不正确，联表查询失败

**解决方案**:
```sql
-- 检查关联数据
SELECT
  oi.order_item_id,
  oi.order_id,
  oi.coupon_id,
  c.name as coupon_name,
  oi.product_id,
  p.name as product_name
FROM order_items oi
LEFT JOIN coupons c ON oi.coupon_id = c.coupon_id
LEFT JOIN products p ON oi.product_id = p.product_id
WHERE oi.order_id = '<订单ID>';
```

---

## 🧪 测试完整流程

### 步骤 1: 创建新订单

1. 访问 https://pmt-blush.vercel.app/coupon/[优惠券ID]
2. 点击"立即购买"
3. 扫码或点击"已付款"

**预期日志** (Vercel Functions - /api/checkout):
```
Checkout API 收到请求: { couponId: '...', quantity: 1 }
✅ 订单创建成功
✅ 订单项插入成功
```

---

### 步骤 2: 确认支付

1. 点击"已付款"按钮

**预期日志** (Vercel Functions - /api/confirm-payment):
```
=== Confirm Payment API ===
✅ 订单状态已更新为 paid
```

**浏览器 Console**:
```
(来自 BuyButton.tsx)
调用 /api/confirm-payment...
```

---

### 步骤 3: 查看订单

1. 自动跳转到 `/client/orders`
2. 检查"待使用"标签

**预期日志** (Vercel Functions - /client/orders):
```
=== 订单页面调试日志 ===
Data 数量: 1
订单 1: {
  status: 'paid',
  has_coupons: true,
  order_items_count: 1
}
最终传递给 OrderTabs 的订单数量: 1
```

**浏览器 Console**:
```
=== OrderTabs 组件调试 ===
接收到的订单数量: 1
订单状态分布: { paid: 1, used: 0, expired: 0, other: 0 }
renderOrders(paid): 筛选后数量 = 1
  ✅ 使用优惠券数据: ...
```

---

## 📊 Vercel 日志查看步骤

1. 登录 [Vercel Dashboard](https://vercel.com/)
2. 选择您的项目 (pmt)
3. 点击顶部 **"Functions"** 标签
4. 选择您要查看的路由:
   - `/client/orders` - 订单页面日志
   - `/api/confirm-payment` - 支付确认日志
   - `/api/checkout` - 订单创建日志
5. 点击最近的执行记录查看详细日志

**提示**: 日志按时间倒序排列，最新的在最上面

---

## 🚀 下一步

部署这些日志到 Vercel：

```bash
git push origin main
```

然后：
1. 访问订单页面
2. 打开浏览器控制台
3. 查看 Vercel Functions 日志
4. 将日志截图或复制文本发送给我
5. 我将根据日志输出诊断具体问题

---

**创建时间**: 2025-12-02
**Commit**: `ae62726`
