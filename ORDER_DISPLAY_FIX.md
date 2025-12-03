# 订单显示问题修复报告

## 问题描述

用户在测试付款功能时发现：
- ✅ 点击购买按钮后，可以正常弹出支付二维码
- ✅ 扫描付款后，Supabase `orders` 表中有新数据插入
- ❌ 但在 `/app/client/orders/page.tsx` 页面无法看到订单

## 根本原因分析

通过代码审查发现了 **2 个关键问题**：

---

### ❌ 问题 1: 订单项插入到错误的表

**位置**: [app/api/checkout/route.ts:264-268](app/api/checkout/route.ts:264)

**错误代码**:
```typescript
// 5. 创建订单项
if (orderItems.length > 0) {
  await supabaseAdmin
    .from('orders')  // ❌ 错误！应该是 'order_items'
    .insert(orderItems.map(item => ({ order_id: orderId, ...item })));
}
```

**问题分析**:
- 订单项（order items）被错误地插入到 `orders` 表
- 应该插入到 `order_items` 表
- 结果：`orders` 表有数据，但 `order_items` 表为空

**影响**:
1. 查询订单时联表 `order_items` 返回空数组
2. [OrderTabs.tsx:74](components/OrderTabs.tsx:74) 检测到没有 `order_items` 和 `coupons`，直接 `return null`
3. 订单被跳过，不在页面显示

**修复**:
```typescript
// 5. 创建订单项（插入到 order_items 表）
if (orderItems.length > 0) {
  const { error: orderItemsError } = await supabaseAdmin
    .from('order_items')  // ✅ 正确的表名
    .insert(orderItems.map(item => ({ order_id: orderId, ...item })));

  if (orderItemsError) {
    console.error('创建订单项错误:', orderItemsError);
    return NextResponse.json({
      success: false,
      message: '创建订单项失败: ' + orderItemsError.message
    }, { status: 500 });
  }
}
```

---

### ❌ 问题 2: 缺少支付确认流程

**位置**: [components/BuyButton.tsx:187-192](components/BuyButton.tsx:187)

**问题描述**:
- 用户点击"已付款"按钮后，直接跳转到订单页面
- **没有** 更新订单状态（仍为 `pending`）
- 订单查询页面只显示 `paid`/`used`/`expired` 状态的订单

**流程分析**:

**当前流程** (错误):
```
用户点击购买
  ↓
创建订单 (status = 'pending')
  ↓
显示二维码
  ↓
用户扫码支付
  ↓
点击"已付款" → 直接跳转 → 订单仍为 'pending'
  ↓
❌ 订单页面过滤条件: status IN ('paid', 'used', 'expired')
  ↓
❌ pending 状态的订单不显示
```

**正确流程** (修复后):
```
用户点击购买
  ↓
创建订单 (status = 'pending')
  ↓
显示二维码
  ↓
用户扫码支付
  ↓
点击"已付款" → 调用 /api/confirm-payment
  ↓
✅ 订单状态更新为 'paid'
  ↓
跳转到订单页面
  ↓
✅ 订单显示在"待使用"标签下
```

**修复内容**:

1. **修改 BuyButton.tsx "已付款"按钮**:
```typescript
<button
  className="btn btn-primary flex-1 btn-sm text-white"
  onClick={async () => {
    // 更新订单状态为 paid (测试模式)
    try {
      const response = await fetch('/api/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: paymentInfo.orderId }),
      });

      if (!response.ok) {
        console.error('更新订单状态失败');
      }
    } catch (error) {
      console.error('确认支付错误:', error);
    } finally {
      setPaymentInfo(null);
      setError(null);
      document.body.style.overflow = 'unset';
      router.push('/client/orders');
      router.refresh();  // ✅ 刷新页面数据
    }
  }}
>
  已付款
</button>
```

2. **新增 API 路由** `/api/confirm-payment/route.ts`:
```typescript
export async function POST(request: Request) {
  const { orderId } = await request.json();

  // 验证用户和订单
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 验证订单属于当前用户且状态为 pending
  const { data: order } = await supabase
    .from('orders')
    .select('order_id, customer_id, status')
    .eq('order_id', orderId)
    .eq('customer_id', user.id)
    .single();

  if (order.status !== 'pending') {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  // 更新订单状态为 paid
  await supabase
    .from('orders')
    .update({ status: 'paid' })
    .eq('order_id', orderId);

  return NextResponse.json({ success: true });
}
```

---

## 数据库状态对比

### 修复前

**orders 表**:
| order_id | customer_id | status | purchase_price | redemption_code |
|----------|-------------|---------|----------------|-----------------|
| uuid-123 | user-abc | pending | 100.00 | ABC123XYZ |

**order_items 表**:
| order_item_id | order_id | coupon_id | quantity |
|---------------|----------|-----------|----------|
| (空) | (空) | (空) | (空) |

**查询结果**:
```sql
SELECT orders.*, order_items.*
FROM orders
LEFT JOIN order_items ON orders.order_id = order_items.order_id
WHERE customer_id = 'user-abc'
```
→ `order_items` 为 `[]`
→ [OrderTabs.tsx:74](components/OrderTabs.tsx:74) 检测到无数据，返回 `null`
→ ❌ 订单不显示

---

### 修复后

**orders 表**:
| order_id | customer_id | status | purchase_price | redemption_code |
|----------|-------------|---------|----------------|-----------------|
| uuid-123 | user-abc | **paid** | 100.00 | ABC123XYZ |

**order_items 表**:
| order_item_id | order_id | coupon_id | quantity |
|---------------|----------|-----------|----------|
| item-001 | uuid-123 | coupon-456 | 2 |

**查询结果**:
```sql
SELECT orders.*, order_items.*
FROM orders
LEFT JOIN order_items ON orders.order_id = order_items.order_id
WHERE customer_id = 'user-abc'
```
→ `order_items` 有数据 ✅
→ `status = 'paid'` ✅
→ ✅ 订单显示在"待使用"标签

---

## 测试步骤

### 1. 清理旧数据（可选）
```sql
-- 删除测试期间创建的错误订单
DELETE FROM orders WHERE status = 'pending' AND created_at > '2025-12-02';
```

### 2. 完整购买流程测试

1. **访问优惠券详情页**
   例如: `/coupon/[id]`

2. **点击"立即购买"按钮**
   - 应该弹出支付二维码模态框
   - 显示订单金额和商户 PromptPay ID

3. **模拟扫码支付**
   - 使用手机银行 APP 扫描二维码
   - 或者直接点击"已付款"按钮（测试模式）

4. **点击"已付款"按钮**
   - 浏览器应该调用 `/api/confirm-payment`
   - 订单状态从 `pending` 更新为 `paid`
   - 自动跳转到 `/client/orders`

5. **验证订单显示**
   - 在"待使用"标签下应该看到刚刚购买的订单
   - 显示优惠券/商品图片、名称、金额
   - 有"立即核销"按钮

### 3. 核销流程测试

1. **点击"立即核销"按钮**
   - 应该弹出核销二维码模态框
   - 显示 `redemption_code`

2. **向商户出示二维码**
   - 商户扫码后订单状态变为 `used`

3. **验证状态变化**
   - 刷新页面，订单应该移到"待评价"标签

---

## 注意事项

### ⚠️ 生产环境部署

当前的 `/api/confirm-payment` 是 **测试模式**，直接将订单标记为 `paid` 而不验证实际支付。

**生产环境应该**:
1. 要求用户上传支付凭证（Screenshot/Slip）
2. 调用 Slip2Go API 验证凭证真实性
3. 验证通过后才更新订单状态

**相关文件**:
- [components/PaymentUploadForm.tsx](components/PaymentUploadForm.tsx) - 支付凭证上传组件（已实现但未使用）
- [app/api/verify-payment/route.ts](app/api/verify-payment/route.ts) - Slip2Go 验证 API（已实现）

**切换到生产模式**:
修改 [BuyButton.tsx:191](components/BuyButton.tsx:191)，将"已付款"按钮改为跳转到上传凭证页面：
```typescript
router.push(`/upload-payment?orderId=${paymentInfo.orderId}`);
```

---

## 相关文件清单

### 修改的文件
- ✅ [app/api/checkout/route.ts](app/api/checkout/route.ts:264) - 修复订单项插入错误
- ✅ [components/BuyButton.tsx](components/BuyButton.tsx:187) - 添加支付确认调用

### 新增的文件
- ✅ [app/api/confirm-payment/route.ts](app/api/confirm-payment/route.ts) - 测试模式支付确认 API

### 相关文件（未修改）
- [app/client/orders/page.tsx](app/client/orders/page.tsx) - 订单列表页面
- [components/OrderTabs.tsx](components/OrderTabs.tsx) - 订单显示组件
- [components/PaymentUploadForm.tsx](components/PaymentUploadForm.tsx) - 支付凭证上传（未使用）
- [app/api/verify-payment/route.ts](app/api/verify-payment/route.ts) - Slip2Go 验证（生产用）

---

## Git Commit

```bash
git commit -m "关键修复：订单显示问题和支付确认流程"
```

**Commit SHA**: `68e8a7c`

---

**修复完成时间**: 2025-12-02
**状态**: ✅ 已修复并提交
