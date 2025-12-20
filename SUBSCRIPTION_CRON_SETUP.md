# 订阅系统定时任务配置指南

## 概述

订阅系统包含以下自动化任务：

| 任务 | 端点 | 建议频率 | 功能 |
|------|------|---------|------|
| 试用期提醒 | `/api/cron/subscriptions/trial-reminder` | 每天 1 次 | 提醒即将到期的试用期用户 |
| 账户锁定 | `/api/cron/subscriptions/lock-expired` | 每天 1 次 | 锁定过期账户 |
| 自动续费 | `/api/cron/subscriptions/auto-renew` | 每天 1 次 | 自动续费订阅 |
| 统一触发 | `/api/cron/subscriptions` | 每天 1 次 | 一次性运行所有任务 |

---

## 环境变量配置

在 `.env.local` 或生产环境中添加：

```env
# Cron 任务密钥（用于保护 API 端点）
CRON_SECRET=your-secure-random-string

# Supabase Service Role Key（用于管理员操作）
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Base URL（用于内部 API 调用）
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

---

## 数据库迁移

在运行定时任务前，需要先执行数据库迁移：

```sql
-- 在 Supabase SQL Editor 中执行
-- 文件: supabase/migrations/20251221_create_cron_support_tables.sql
```

该迁移会创建：
- `notifications` 表 - 系统通知
- `cron_logs` 表 - 任务执行日志
- 相关的数据库函数

---

## 配置定时任务

### 方式 1: Vercel Cron Jobs

在 `vercel.json` 中添加：

```json
{
  "crons": [
    {
      "path": "/api/cron/subscriptions",
      "schedule": "0 0 * * *"
    }
  ]
}
```

> 注意: Vercel Cron 会自动添加 `CRON_SECRET` 验证

### 方式 2: GitHub Actions

创建 `.github/workflows/subscription-cron.yml`：

```yaml
name: Subscription Cron Jobs

on:
  schedule:
    # 每天 UTC 时间 00:00 运行 (泰国时间 07:00)
    - cron: '0 0 * * *'
  workflow_dispatch: # 允许手动触发

jobs:
  run-cron:
    runs-on: ubuntu-latest
    steps:
      - name: Run subscription cron jobs
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "${{ secrets.BASE_URL }}/api/cron/subscriptions"
```

在 GitHub Repository Settings > Secrets 中添加：
- `CRON_SECRET` - 与环境变量相同
- `BASE_URL` - 您的网站 URL

### 方式 3: Supabase Edge Functions + pg_cron

如果使用 Supabase，可以使用 pg_cron 扩展：

```sql
-- 启用 pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 每天运行订阅任务
SELECT cron.schedule(
  'subscription-daily-tasks',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-domain.com/api/cron/subscriptions',
    headers := '{"Authorization": "Bearer your-cron-secret"}'::jsonb
  );
  $$
);
```

### 方式 4: 外部 Cron 服务

使用 [cron-job.org](https://cron-job.org)、[EasyCron](https://www.easycron.com) 等服务：

1. 创建新任务
2. URL: `https://your-domain.com/api/cron/subscriptions`
3. 方法: GET 或 POST
4. Headers: `Authorization: Bearer your-cron-secret`
5. 时间: `0 0 * * *` (每天 00:00)

---

## 手动触发

### 使用 curl

```bash
# 运行所有任务
curl -X POST \
  -H "Authorization: Bearer your-cron-secret" \
  "https://your-domain.com/api/cron/subscriptions"

# 只运行试用期提醒
curl -X POST \
  -H "Authorization: Bearer your-cron-secret" \
  "https://your-domain.com/api/cron/subscriptions/trial-reminder"

# 只运行账户锁定
curl -X POST \
  -H "Authorization: Bearer your-cron-secret" \
  "https://your-domain.com/api/cron/subscriptions/lock-expired"

# 只运行自动续费
curl -X POST \
  -H "Authorization: Bearer your-cron-secret" \
  "https://your-domain.com/api/cron/subscriptions/auto-renew"
```

### 本地开发测试

```bash
# 本地开发时不需要 CRON_SECRET
curl http://localhost:3000/api/cron/subscriptions
```

---

## 任务详细说明

### 1. 试用期提醒 (trial-reminder)

**功能**：
- 查找 7 天后到期的试用期订阅，发送提醒
- 查找 3 天后到期的试用期订阅，发送提醒
- 查找 1 天后到期的试用期订阅，发送提醒

**返回示例**：
```json
{
  "success": true,
  "message": "Trial reminder job completed",
  "results": {
    "reminded_7_days": 5,
    "reminded_3_days": 3,
    "reminded_1_day": 2,
    "errors": []
  }
}
```

### 2. 账户锁定 (lock-expired)

**功能**：
- 锁定试用期已过期的账户
- 锁定订阅期末取消已到期的账户
- 锁定逾期未付超过 7 天的账户
- 设置 30 天数据保留期

**返回示例**：
```json
{
  "success": true,
  "message": "Lock expired accounts job completed",
  "results": {
    "trial_locked": 3,
    "subscription_locked": 1,
    "notifications_sent": 4,
    "errors": []
  }
}
```

### 3. 自动续费 (auto-renew)

**功能**：
- 查找今天到期的活跃订阅
- 检查商户钱包余额
- 余额足够：自动扣款续费
- 余额不足：标记为逾期，发送通知

**返回示例**：
```json
{
  "success": true,
  "message": "Auto renew job completed",
  "results": {
    "renewed": 10,
    "failed_insufficient_balance": 2,
    "failed_other": 0,
    "notifications_sent": 12,
    "errors": []
  }
}
```

---

## 监控和日志

### 查看执行日志

```sql
SELECT * FROM cron_logs
ORDER BY executed_at DESC
LIMIT 20;
```

### 查看失败的任务

```sql
SELECT * FROM cron_logs
WHERE success = FALSE
ORDER BY executed_at DESC;
```

### 查看通知发送情况

```sql
SELECT type, COUNT(*) as count
FROM notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY type;
```

---

## 故障排除

### 问题 1: 任务返回 401 Unauthorized

**原因**：CRON_SECRET 不匹配

**解决方案**：
1. 检查 `.env.local` 中的 `CRON_SECRET`
2. 确保请求头中包含正确的 Authorization

### 问题 2: 任务返回 500 Internal Server Error

**原因**：数据库连接问题或缺少表

**解决方案**：
1. 检查 `SUPABASE_SERVICE_ROLE_KEY` 是否正确
2. 确保已运行数据库迁移
3. 查看服务器日志

### 问题 3: 通知未发送

**原因**：notifications 表不存在或 RLS 策略问题

**解决方案**：
1. 执行迁移脚本创建 notifications 表
2. 检查 RLS 策略是否正确配置

---

## 安全建议

1. **使用强密钥**：CRON_SECRET 应该是随机生成的长字符串
2. **限制 IP**：如果可能，限制只有特定 IP 可以调用 cron 端点
3. **监控异常**：定期检查 cron_logs 表中的错误
4. **日志清理**：定期清理旧的日志记录

```sql
-- 清理 30 天前的日志
DELETE FROM cron_logs
WHERE created_at < NOW() - INTERVAL '30 days';
```

---

## 完成

定时任务配置完成后，订阅系统将自动：
- ✅ 提醒即将到期的试用期用户
- ✅ 锁定过期账户
- ✅ 自动续费活跃订阅
- ✅ 发送相关通知
