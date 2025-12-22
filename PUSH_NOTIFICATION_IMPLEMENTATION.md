# KUMMAK 商户端推送通知系统实施进度

## 项目概述

为 KUMMAK 商户端移动应用实现推送通知功能，包括订单通知、优惠券核销通知、评价通知等。

## 技术栈

- **移动端**: Expo React Native + expo-notifications
- **后端**: Supabase (Database + Edge Functions)
- **推送服务**: Expo Push Service

---

## 实施阶段

### Phase 1: 数据库迁移 + 基础 Hook ✅ 完成

| 任务 | 状态 | 说明 |
|------|------|------|
| 1.1 创建数据库迁移文件 | ✅ | push_tokens, notification_preferences, notification_logs |
| 1.2 创建 usePushNotifications Hook | ✅ | 处理权限请求、令牌获取和存储 |
| 1.3 在 _layout.tsx 初始化通知监听 | ✅ | 前台/后台通知处理 |

### Phase 2: 通知设置页面 ✅ 完成

| 任务 | 状态 | 说明 |
|------|------|------|
| 2.1 创建通知设置页面 | ✅ | app/notifications/index.tsx |
| 2.2 添加路由配置 | ✅ | _layout.tsx 添加 Screen |
| 2.3 更新设置页面入口 | ✅ | settings.tsx 导航到通知设置 |
| 2.4 添加国际化翻译 | ✅ | zh.json, en.json, th.json |

### Phase 3: 后端 Edge Function ✅ 完成

| 任务 | 状态 | 说明 |
|------|------|------|
| 3.1 创建发送通知 Edge Function | ✅ | send-push-notification |
| 3.2 创建数据库触发器 | ✅ | 订单/优惠券/评价触发通知 |
| 3.3 API 路由 (Web 端) | ✅ | /api/notifications/send |
| 3.4 创建待处理通知处理器 | ✅ | process-pending-notifications |

### Phase 4: 订单通知集成 ✅ 完成

| 任务 | 状态 | 说明 |
|------|------|------|
| 4.1 新订单通知 | ✅ | order_new (数据库触发器) |
| 4.2 订单支付通知 | ✅ | order_paid (数据库触发器) |
| 4.3 订单取消通知 | ✅ | order_cancelled (数据库触发器) |

### Phase 5: 其他通知类型 ✅ 完成

| 任务 | 状态 | 说明 |
|------|------|------|
| 5.1 优惠券核销通知 | ✅ | coupon_redeemed (数据库触发器) |
| 5.2 评价通知 | ✅ | review_received (数据库触发器) |
| 5.3 订阅到期通知 | ⬚ | subscription_expiring (需定时任务) |
| 5.4 提现通知 | ⬚ | withdrawal_approved (需添加触发器) |

### Phase 6: 通知历史页面 ⬚ 待开始

| 任务 | 状态 | 说明 |
|------|------|------|
| 6.1 通知列表页面 | ⬚ | 显示历史通知 |
| 6.2 已读/未读状态 | ⬚ | 标记已读功能 |
| 6.3 清除通知 | ⬚ | 批量清除 |

---

## 数据库架构

### push_tokens 表
```sql
- id: UUID (PK)
- user_id: UUID (FK -> auth.users)
- merchant_id: UUID (FK -> merchants)
- token: TEXT (Expo Push Token)
- device_type: TEXT ('ios' | 'android')
- device_name: TEXT
- app_version: TEXT
- is_active: BOOLEAN
- created_at, updated_at, last_used_at: TIMESTAMPTZ
```

### notification_preferences 表
```sql
- id: UUID (PK)
- user_id: UUID (FK -> auth.users)
- merchant_id: UUID (FK -> merchants)
- order_new, order_paid, order_cancelled: BOOLEAN
- coupon_redeemed, review_received: BOOLEAN
- system_alert, marketing: BOOLEAN
- dnd_enabled: BOOLEAN
- dnd_start_time, dnd_end_time: TIME
```

### notification_logs 表
```sql
- id: UUID (PK)
- merchant_id, user_id: UUID
- title, body: TEXT
- data: JSONB
- notification_type: TEXT
- status: TEXT ('pending'|'sent'|'delivered'|'failed')
- reference_type, reference_id: TEXT
```

---

## 通知类型

| 类型 | 触发场景 | 优先级 |
|------|----------|--------|
| order_new | 收到新订单 | 高 |
| order_paid | 订单已支付 | 高 |
| order_cancelled | 订单取消 | 中 |
| coupon_redeemed | 优惠券核销 | 中 |
| review_received | 收到评价 | 中 |
| subscription_expiring | 订阅即将到期 | 高 |
| subscription_expired | 订阅已过期 | 高 |
| balance_low | 余额不足 | 中 |
| withdrawal_approved | 提现已处理 | 高 |
| system_alert | 系统公告 | 低 |

---

## 文件清单

### 移动端 (kummak-merchant)
- [x] `hooks/usePushNotifications.ts` - 推送通知 Hook
- [x] `app/notifications/index.tsx` - 通知设置页面
- [x] `app/_layout.tsx` - 添加通知初始化
- [x] `i18n/locales/*.json` - 国际化翻译

### 数据库 (pmt/supabase)
- [x] `migrations/20251224_create_push_notification_system.sql`

### 后端 (pmt)
- [x] `supabase/functions/send-push-notification/index.ts` - 发送推送通知
- [x] `supabase/functions/process-pending-notifications/index.ts` - 处理待发送通知
- [x] `app/api/notifications/send/route.ts` - Web API 路由
- [x] `migrations/20251224_create_order_notification_triggers.sql` - 通知触发器

---

## 更新日志

### 2025-12-24
- 创建实施进度文档
- ✅ 完成 Phase 1: 数据库迁移 + 基础 Hook
  - 创建 `20251224_create_push_notification_system.sql` 迁移文件
  - 创建 `usePushNotifications.ts` Hook
  - 更新 `_layout.tsx` 初始化通知监听
- ✅ 完成 Phase 2: 通知设置页面
  - 创建 `app/notifications/index.tsx` 页面
  - 添加三语翻译 (zh, en, th)
  - 更新设置页面导航
- ✅ 完成 Phase 3: 后端 Edge Function
  - 创建 `send-push-notification` Edge Function
  - 创建 `process-pending-notifications` Edge Function
  - 创建 `/api/notifications/send` API 路由
- ✅ 完成 Phase 4 & 5: 通知触发器
  - 创建订单通知触发器 (order_new, order_paid, order_cancelled)
  - 创建优惠券核销通知触发器 (coupon_redeemed)
  - 创建评价通知触发器 (review_received)
  - 支持多语言通知内容 (zh, en, th)
- ✅ Edge Function 测试成功
  - 修复数据库触发器：改用 `orders` 表状态变化检测核销
  - 修复表名：`user_profiles` → `profiles`
  - 修复字段名：`nickname` → `full_name`
  - 修复移动端 Hook：`removeNotificationSubscription` → `.remove()` 方法
  - Push Token 注册成功：`ExponentPushToken[f-agVzPrqv3UR0ocX009BP]`
  - 测试结果：`{ "success": true, "sent": 1, "failed": 0 }`

---

## 重要说明

### Expo Go 限制
Expo Go SDK 53+ **不支持远程推送通知**。要实际接收推送通知，需要：
1. 使用 `npx expo run:android` 构建开发版本
2. 或构建生产 APK/AAB

### 测试商户信息
- **商户 ID**: `4846186a-969a-4174-9454-0d900f85c522`
- **Push Token**: `ExponentPushToken[f-agVzPrqv3UR0ocX009BP]`

