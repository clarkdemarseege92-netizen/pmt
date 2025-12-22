# KUMMAK 推荐系统实现文档

## 📋 项目概述

### 目标
实现商户推荐返利系统，通过现有商户推荐新商户注册并付费订阅，给予推荐人现金返利奖励。

### 核心价值
- 降低获客成本（相比广告投放）
- 利用口碑传播扩大用户基础
- 激励现有商户参与推广

---

## 📊 方案详情

### 订阅方案

| 方案 | 月费 (THB) | 产品数 | 优惠券数 |
|------|-----------|--------|----------|
| 免费版 | 0 | 10 | 2 |
| 标准版 | 169 | 50 | 10 |
| 专业版 | 269 | 200 | 30 |
| 企业版 | 399 | 无限 | 无限 |

### 推荐返利规则

| 被推荐人订阅 | 推荐人返利 (THB) | 返利比例 |
|-------------|-----------------|---------|
| 标准版 (169) | 50 | 29.6% |
| 专业版 (269) | 100 | 37.2% |
| 企业版 (399) | 200 | 50.1% |

### 限制条件

1. **触发条件**: 仅限新用户首次付费订阅
2. **发放时间**: 订阅成功后 1 天（防止退款欺诈）
3. **提现门槛**: 最低 100 THB
4. **推荐方式**: 超链接形式，自动记录推荐人

---

## 🔗 推荐链接设计

### 链接格式
```
https://kummak.com/register?ref=ABC123
https://kummak.com/r/ABC123  (短链接，可选)
```

### 推荐码规则
- 格式: 6位大写字母+数字
- 示例: `A1B2C3`, `XYZ789`
- 每个商户唯一

### 工作流程
```
1. 商户 A 分享链接: kummak.com/register?ref=ABC123
          ↓
2. 新用户 B 点击链接
          ↓
3. 系统读取 ref 参数，存入 cookie（30天有效）
          ↓
4. 用户 B 完成注册
          ↓
5. 系统在 profiles 表记录推荐关系
          ↓
6. 用户 B 首次付费订阅
          ↓
7. 系统创建待发放返利记录（1天后生效）
          ↓
8. 定时任务检查，将返利计入推荐人余额
          ↓
9. 推荐人申请提现（满100 THB）
```

---

## 🗄️ 数据库设计

### 1. profiles 表扩展

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10) UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_at TIMESTAMPTZ;
```

### 2. referral_rewards 表（返利记录）

```sql
CREATE TABLE referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id),      -- 推荐人
  referee_id UUID NOT NULL REFERENCES profiles(id),       -- 被推荐人
  subscription_plan VARCHAR(20) NOT NULL,                  -- 订阅方案
  subscription_amount DECIMAL(10,2) NOT NULL,              -- 订阅金额
  reward_amount DECIMAL(10,2) NOT NULL,                    -- 返利金额
  status VARCHAR(20) DEFAULT 'pending',                    -- pending/approved/paid/cancelled
  eligible_at TIMESTAMPTZ NOT NULL,                        -- 可发放时间（订阅后1天）
  approved_at TIMESTAMPTZ,                                 -- 实际发放时间
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_referee_reward UNIQUE (referee_id)     -- 每个被推荐人只能触发一次返利
);
```

### 3. referral_withdrawals 表（提现记录）

```sql
CREATE TABLE referral_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  bank_account VARCHAR(50),                                -- 银行账户（加密存储）
  bank_name VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',                    -- pending/processing/completed/rejected
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  admin_note TEXT
);
```

### 4. 索引优化

```sql
CREATE INDEX idx_referral_rewards_referrer ON referral_rewards(referrer_id);
CREATE INDEX idx_referral_rewards_status ON referral_rewards(status, eligible_at);
CREATE INDEX idx_referral_withdrawals_user ON referral_withdrawals(user_id);
CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);
```

---

## 🔧 实现步骤

### Phase 1: 数据库和基础设施 ✅

- [x] 创建数据库迁移文件
- [ ] 执行迁移（需要在 Supabase 控制台运行）
- [x] 为现有商户生成推荐码（迁移脚本中包含）
- [x] 创建推荐码生成函数

### Phase 2: 网页端 - 注册流程 ✅

- [x] 修改登录页面，读取 ref 参数
- [x] 存储推荐码到 cookie（30天有效）
- [x] 注册时关联推荐关系（在 auth callback 中处理）
- [x] 显示推荐码提示

### Phase 3: 网页端 - 商户推荐中心 ✅

- [x] 创建推荐中心页面 `/merchant/referral`
- [x] 显示推荐链接和分享按钮
- [x] 显示推荐统计（总推荐数、成功订阅数、累计收益）
- [x] 显示推荐记录列表
- [x] 显示当前余额和提现按钮

### Phase 4: 网页端 - 返利处理 ✅

- [x] 创建订阅成功后的返利触发逻辑
- [x] 创建返利发放函数（在数据库迁移中）
- [x] 创建提现申请 API
- [x] 创建管理员审核提现页面

### Phase 5: 手机端 ⬜

- [ ] 创建推荐中心页面
- [ ] 实现分享功能（复制链接、分享到社交媒体）
- [ ] 显示推荐统计和记录
- [ ] 实现提现申请功能

---

## 📁 文件结构

### 网页端 (pmt)

```
app/
├── [locale]/
│   ├── login/
│   │   └── page.tsx              # 修改：读取 ref 参数并存储 Cookie
│   ├── merchant/
│   │   └── referral/
│   │       └── page.tsx          # 新建：推荐中心
│   └── admin/
│       └── withdrawals/
│           ├── page.tsx          # 新建：提现审核列表
│           └── WithdrawalManagement.tsx  # 新建：提现管理组件
├── auth/
│   └── callback/
│       └── route.ts              # 修改：处理推荐关系绑定
├── api/
│   ├── referral/
│   │   ├── stats/route.ts        # 新建：获取推荐统计
│   │   ├── rewards/route.ts      # 新建：获取返利记录
│   │   └── withdraw/route.ts     # 新建：申请提现
│   └── admin/
│       └── withdrawals/
│           ├── [id]/route.ts     # 新建：单个提现审核
│           └── batch/route.ts    # 新建：批量提现审核

messages/
├── en.json                       # 添加 referral 翻译
├── zh.json
└── th.json

components/
└── referral/
    ├── ReferralLink.tsx          # 推荐链接组件
    ├── ReferralStats.tsx         # 统计展示组件
    └── WithdrawModal.tsx         # 提现弹窗

supabase/migrations/
└── 20251222_create_referral_system.sql
```

### 手机端 (kummak-merchant)

```
app/
└── referral/
    └── index.tsx                 # 推荐中心页面

i18n/locales/
├── en.json                       # 添加 referral 翻译
├── zh.json
└── th.json
```

---

## 🔐 安全考虑

1. **推荐码验证**: 服务端验证推荐码有效性
2. **防刷机制**:
   - 同一 IP 24小时内只能使用同一推荐码注册一次
   - 同一设备指纹限制
3. **返利延迟**: 1天延迟发放，防止即时退款欺诈
4. **提现验证**: 需要绑定银行账户，管理员审核
5. **自我推荐防护**: 禁止使用自己的推荐码

---

## 📈 监控指标

1. **推荐转化率**: 点击推荐链接 → 完成注册 → 付费订阅
2. **人均推荐数**: 活跃推荐人的平均推荐成功数
3. **返利成本率**: 总返利金额 / 总订阅收入
4. **提现频率**: 监控异常提现行为

---

## ⏰ 时间线

| 阶段 | 内容 |
|------|------|
| Phase 1 | 数据库设计和迁移 |
| Phase 2 | 网页端注册流程改造 |
| Phase 3 | 网页端推荐中心 |
| Phase 4 | 返利和提现系统 |
| Phase 5 | 手机端实现 |

---

## 📝 更新日志

- **2024-12-22**: 创建初始文档，确定方案细节
