# 🧾 零售记账模块实施进度方案

**项目名称：** PMT 多商户记账系统
**创建时间：** 2025-12-15
**技术栈：** Next.js 16 + TypeScript + Supabase + next-intl
**国际化支持：** 泰语(th) / 中文(zh) / 英文(en)

---

## 📊 整体进度

- **总进度：** 0% (0/6 阶段完成)
- **当前阶段：** 待开始
- **预计总用时：** 约 15 小时
- **状态：** 方案设计中

---

## 🎯 项目目标

构建一个国际化的零售记账模块，满足以下需求：

1. ✅ **自动记账** - 平台订单完成 & 钱包扣款自动生成记录
2. ✅ **手动记账** - 商户录入现金交易
3. ✅ **财务分析** - 收入/支出汇总、图表展示
4. ✅ **多语言支持** - 完整的 th/zh/en 国际化
5. ✅ **权限控制** - 系统记录只读，手动记录可编辑
6. ✅ **数据隔离** - RLS 策略确保商户数据安全

---

## 🔒 业务规则确认（Phase 0）

### ✅ 核心规则

1. **商户钱包 ≠ 用户钱包**
   - 钱包仅用于支付平台服务费
   - 不涉及客户交易资金

2. **自动记账规则**
   - 平台订单完成 → 自动生成"收入"记录
   - 钱包扣款 → 自动生成"支出"记录
   - 系统生成的记录不可编辑、不可删除

3. **手动记账规则**
   - 仅用于非平台交易（如现金销售）
   - 不影响平台订单
   - 不影响商户钱包余额
   - 商户可编辑、可删除

4. **数据隔离**
   - 使用 Supabase RLS 策略
   - 商户仅能查看自己的记账数据

### ✅ 权限矩阵

| 记录来源 | 可查看 | 可编辑 | 可删除 |
|---------|--------|--------|--------|
| 平台订单 | ✅ | ❌ | ❌ |
| 钱包扣款 | ✅ | ❌ | ❌ |
| 手动记账 | ✅ | ✅ | ✅ |

---

## 📐 数据库设计（Phase 1）

**状态：** ⏳ 待开始
**预计用时：** 2 小时

### 目标

- 设计符合国际化的数据库 Schema
- 创建数据库迁移脚本
- 配置 RLS 策略

### 核心表设计

#### 1. `account_categories` - 记账类目表

```sql
CREATE TABLE account_categories (
  category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(merchant_id),

  -- 国际化名称
  name JSONB NOT NULL,  -- {th: "...", zh: "...", en: "..."}

  -- 类型
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),

  -- 系统预设标记
  is_system BOOLEAN DEFAULT false,

  -- 图标
  icon TEXT,

  -- 排序
  sort_order INTEGER DEFAULT 0,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. `account_transactions` - 记账记录表（核心）

```sql
CREATE TABLE account_transactions (
  transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(merchant_id),

  -- 类型与金额
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),

  -- 分类
  category_id UUID REFERENCES account_categories(category_id),

  -- 来源标识（关键字段）
  source TEXT NOT NULL CHECK (source IN ('manual', 'platform_order', 'platform_fee')),

  -- 关联数据
  order_id UUID REFERENCES orders(order_id),
  wallet_transaction_id UUID REFERENCES wallet_transactions(transaction_id),
  product_id UUID REFERENCES products(product_id),  -- 可选关联商品

  -- 备注（国际化）
  note TEXT,

  -- 扩展元数据
  metadata JSONB DEFAULT '{}',

  -- 权限控制标记
  is_editable BOOLEAN DEFAULT true,
  is_deletable BOOLEAN DEFAULT true,

  -- 交易日期（可自定义，默认今天）
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,  -- 软删除

  -- 索引
  CONSTRAINT fk_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(merchant_id) ON DELETE CASCADE
);

-- 性能索引
CREATE INDEX idx_account_transactions_merchant_date ON account_transactions(merchant_id, transaction_date DESC);
CREATE INDEX idx_account_transactions_type ON account_transactions(merchant_id, type);
CREATE INDEX idx_account_transactions_source ON account_transactions(source);
CREATE INDEX idx_account_transactions_category ON account_transactions(category_id);
```

#### 3. 财务汇总视图（Materialized View）

```sql
CREATE MATERIALIZED VIEW merchant_financial_summary AS
SELECT
  merchant_id,
  DATE_TRUNC('day', transaction_date) as date,
  type,
  SUM(amount) as total_amount,
  COUNT(*) as transaction_count
FROM account_transactions
WHERE deleted_at IS NULL
GROUP BY merchant_id, DATE_TRUNC('day', transaction_date), type;

-- 刷新策略：每日凌晨或触发刷新
CREATE UNIQUE INDEX ON merchant_financial_summary(merchant_id, date, type);
```

### RLS 策略

```sql
-- 启用 RLS
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_categories ENABLE ROW LEVEL SECURITY;

-- 商户只能查看自己的记录
CREATE POLICY merchant_view_own_transactions ON account_transactions
  FOR SELECT USING (
    merchant_id IN (
      SELECT merchant_id FROM merchants WHERE owner_id = auth.uid()
    )
  );

-- 商户只能修改手动记账且可编辑的记录
CREATE POLICY merchant_update_manual_transactions ON account_transactions
  FOR UPDATE USING (
    merchant_id IN (
      SELECT merchant_id FROM merchants WHERE owner_id = auth.uid()
    )
    AND source = 'manual'
    AND is_editable = true
  );
```

### 预设数据（系统类目）

```sql
-- 插入系统预设类目（国际化）
INSERT INTO account_categories (merchant_id, name, type, is_system, icon, sort_order)
SELECT
  m.merchant_id,
  jsonb_build_object(
    'th', 'ยอดขายจากแพลตฟอร์ม',
    'zh', '平台销售收入',
    'en', 'Platform Sales'
  ),
  'income',
  true,
  'shopping-cart',
  1
FROM merchants m;

INSERT INTO account_categories (merchant_id, name, type, is_system, icon, sort_order)
SELECT
  m.merchant_id,
  jsonb_build_object(
    'th', 'ค่าบริการแพลตฟอร์ม',
    'zh', '平台服务费',
    'en', 'Platform Service Fee'
  ),
  'expense',
  true,
  'credit-card',
  1
FROM merchants m;
```

### 产出物

- [x] `supabase/migrations/YYYYMMDDHHMMSS_create_accounting_tables.sql`
- [x] RLS 策略配置
- [x] 索引优化脚本
- [x] 预设数据脚本

---

## ⚙️ 自动记账逻辑（Phase 2）

**状态：** ⏳ 待开始
**预计用时：** 3 小时

### 目标

- 实现订单完成自动记账
- 实现钱包扣款自动记账
- 使用数据库触发器确保一致性

### 场景 1：平台订单完成自动记账

#### 触发器设计

```sql
CREATE OR REPLACE FUNCTION auto_create_order_income()
RETURNS TRIGGER AS $$
DECLARE
  v_category_id UUID;
BEGIN
  -- 只处理订单状态从非完成变为完成的情况
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- 获取系统预设的"平台销售收入"类目
    SELECT category_id INTO v_category_id
    FROM account_categories
    WHERE merchant_id = NEW.merchant_id
      AND is_system = true
      AND type = 'income'
    LIMIT 1;

    -- 创建收入记录
    INSERT INTO account_transactions (
      merchant_id,
      type,
      amount,
      category_id,
      source,
      order_id,
      is_editable,
      is_deletable,
      transaction_date,
      note
    ) VALUES (
      NEW.merchant_id,
      'income',
      NEW.total_price,
      v_category_id,
      'platform_order',
      NEW.order_id,
      false,  -- 不可编辑
      false,  -- 不可删除
      CURRENT_DATE,
      'Order #' || NEW.order_id
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_order_complete_accounting
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION auto_create_order_income();
```

### 场景 2：钱包扣款自动记账

#### 触发器设计

```sql
CREATE OR REPLACE FUNCTION auto_create_wallet_expense()
RETURNS TRIGGER AS $$
DECLARE
  v_category_id UUID;
  v_merchant_id UUID;
BEGIN
  -- 只处理扣款类型（type = 'deduct'）
  IF NEW.type = 'deduct' THEN

    -- 从 wallet_transactions 获取 merchant_id
    SELECT merchant_id INTO v_merchant_id
    FROM merchant_wallets
    WHERE wallet_id = NEW.wallet_id;

    -- 获取系统预设的"平台服务费"类目
    SELECT category_id INTO v_category_id
    FROM account_categories
    WHERE merchant_id = v_merchant_id
      AND is_system = true
      AND type = 'expense'
    LIMIT 1;

    -- 创建支出记录
    INSERT INTO account_transactions (
      merchant_id,
      type,
      amount,
      category_id,
      source,
      wallet_transaction_id,
      is_editable,
      is_deletable,
      transaction_date,
      note
    ) VALUES (
      v_merchant_id,
      'expense',
      NEW.amount,
      v_category_id,
      'platform_fee',
      NEW.transaction_id,
      false,
      false,
      CURRENT_DATE,
      NEW.description
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_wallet_deduct_accounting
AFTER INSERT ON wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION auto_create_wallet_expense();
```

### 测试方案

```sql
-- 测试 1: 订单完成自动记账
UPDATE orders SET status = 'completed' WHERE order_id = 'test-order-id';

-- 验证记录创建
SELECT * FROM account_transactions
WHERE order_id = 'test-order-id'
  AND source = 'platform_order';

-- 测试 2: 钱包扣款自动记账
INSERT INTO wallet_transactions (wallet_id, type, amount, description)
VALUES ('test-wallet-id', 'deduct', 100.00, 'Service fee');

-- 验证记录创建
SELECT * FROM account_transactions
WHERE source = 'platform_fee';
```

### 产出物

- [x] `supabase/migrations/YYYYMMDDHHMMSS_create_accounting_triggers.sql`
- [x] 触发器函数
- [x] 测试 SQL 脚本

---

## ✍️ 手动记账功能（Phase 3）

**状态：** ⏳ 待开始
**预计用时：** 2 小时

### 目标

- 实现商户手动录入记账的 Server Actions
- 支持 CRUD 操作
- 完整的数据验证

### API 设计

#### 1. 创建手动记账

**文件：** `app/actions/accounting.ts`

```typescript
'use server'

import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { revalidatePath } from 'next/cache'

const CreateTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive().max(9999999.99),
  category_id: z.string().uuid(),
  product_id: z.string().uuid().optional(),
  note: z.string().max(500).optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
})

export async function createManualTransaction(
  merchantId: string,
  data: z.infer<typeof CreateTransactionSchema>
) {
  try {
    // 验证数据
    const validated = CreateTransactionSchema.parse(data)

    const supabase = await createSupabaseServerClient()

    // 验证商户权限
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // 验证类目是否属于该商户
    const { data: category } = await supabase
      .from('account_categories')
      .select('category_id')
      .eq('category_id', validated.category_id)
      .eq('merchant_id', merchantId)
      .single()

    if (!category) {
      return { success: false, error: 'Invalid category' }
    }

    // 创建记录
    const { data: transaction, error } = await supabase
      .from('account_transactions')
      .insert({
        merchant_id: merchantId,
        type: validated.type,
        amount: validated.amount,
        category_id: validated.category_id,
        product_id: validated.product_id,
        source: 'manual',
        note: validated.note,
        transaction_date: validated.transaction_date,
        is_editable: true,
        is_deletable: true
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/[locale]/merchant/accounting', 'page')

    return { success: true, data: transaction }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation error', details: error.errors }
    }
    return { success: false, error: 'Failed to create transaction' }
  }
}
```

#### 2. 更新手动记账

```typescript
export async function updateManualTransaction(
  transactionId: string,
  data: Partial<z.infer<typeof CreateTransactionSchema>>
) {
  // 实现逻辑（仅允许修改 source='manual' 且 is_editable=true 的记录）
}
```

#### 3. 删除手动记账

```typescript
export async function deleteManualTransaction(transactionId: string) {
  // 软删除（设置 deleted_at）
}
```

### 产出物

- [x] `app/actions/accounting.ts`
- [x] Zod 验证 Schema
- [x] Server Actions 实现

---

## 📊 财务汇总与分析（Phase 4）

**状态：** ⏳ 待开始
**预计用时：** 3 小时

### 目标

- 实现财务数据汇总查询
- 支持按日/月/年统计
- 提供分类汇总

### 查询 API 设计

#### 1. 获取财务概览

```typescript
export async function getFinancialSummary(
  merchantId: string,
  startDate: string,
  endDate: string
) {
  const supabase = await createSupabaseServerClient()

  // 查询收入总额
  const { data: income } = await supabase
    .from('account_transactions')
    .select('amount')
    .eq('merchant_id', merchantId)
    .eq('type', 'income')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .is('deleted_at', null)

  // 查询支出总额
  const { data: expense } = await supabase
    .from('account_transactions')
    .select('amount')
    .eq('merchant_id', merchantId)
    .eq('type', 'expense')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .is('deleted_at', null)

  const totalIncome = income?.reduce((sum, t) => sum + Number(t.amount), 0) || 0
  const totalExpense = expense?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

  return {
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense
  }
}
```

#### 2. 按类目汇总

```sql
-- Supabase RPC Function
CREATE OR REPLACE FUNCTION get_category_summary(
  p_merchant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  category_name JSONB,
  type TEXT,
  total_amount DECIMAL,
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.name as category_name,
    t.type,
    SUM(t.amount) as total_amount,
    COUNT(*) as transaction_count
  FROM account_transactions t
  JOIN account_categories c ON t.category_id = c.category_id
  WHERE t.merchant_id = p_merchant_id
    AND t.transaction_date BETWEEN p_start_date AND p_end_date
    AND t.deleted_at IS NULL
  GROUP BY c.name, t.type
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;
```

### 产出物

- [x] 财务汇总 Server Actions
- [x] Supabase RPC 函数
- [x] 类目统计接口

---

## 🎨 商户后台 UI（Phase 5）

**状态：** ⏳ 待开始
**预计用时：** 5 小时

### 目标

- 实现国际化的记账管理页面
- 支持手动记账
- 展示财务分析图表

### 页面结构

```
app/[locale]/merchant/accounting/
├── page.tsx                          # 记账列表主页
├── analytics/
│   └── page.tsx                      # 财务分析页面
└── components/
    ├── TransactionList.tsx           # 记账记录列表
    ├── AddTransactionModal.tsx       # 手动记账弹窗
    ├── TransactionFilters.tsx        # 筛选器
    ├── FinancialSummaryCards.tsx     # 财务汇总卡片
    └── CategoryChart.tsx             # 分类图表（Recharts）
```

### 翻译命名空间

**文件：** `messages/zh.json`

```json
{
  "accounting": {
    "title": "记账管理",
    "addTransaction": "添加记账",
    "income": "收入",
    "expense": "支出",
    "amount": "金额",
    "category": "类目",
    "note": "备注",
    "transactionDate": "交易日期",
    "source": {
      "manual": "手动录入",
      "platform_order": "平台订单",
      "platform_fee": "平台服务费"
    },
    "totalIncome": "总收入",
    "totalExpense": "总支出",
    "netProfit": "净利润",
    "noTransactions": "暂无记账记录",
    "confirmDelete": "确定删除这条记账记录吗？",
    "cannotEdit": "系统自动生成的记录无法编辑",
    "createSuccess": "记账创建成功",
    "updateSuccess": "记账更新成功",
    "deleteSuccess": "记账删除成功"
  }
}
```

### UI 组件示例

#### 财务汇总卡片

```typescript
// components/FinancialSummaryCards.tsx
'use client'

import { useTranslations } from 'next-intl'
import { HiArrowTrendingUp, HiArrowTrendingDown, HiChartBar } from 'react-icons/hi2'

export default function FinancialSummaryCards({ summary }) {
  const t = useTranslations('accounting')

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="stat bg-success/10 rounded-lg">
        <div className="stat-figure text-success">
          <HiArrowTrendingUp className="w-8 h-8" />
        </div>
        <div className="stat-title">{t('totalIncome')}</div>
        <div className="stat-value text-success">
          ฿{summary.totalIncome.toLocaleString()}
        </div>
      </div>

      <div className="stat bg-error/10 rounded-lg">
        <div className="stat-figure text-error">
          <HiArrowTrendingDown className="w-8 h-8" />
        </div>
        <div className="stat-title">{t('totalExpense')}</div>
        <div className="stat-value text-error">
          ฿{summary.totalExpense.toLocaleString()}
        </div>
      </div>

      <div className="stat bg-primary/10 rounded-lg">
        <div className="stat-figure text-primary">
          <HiChartBar className="w-8 h-8" />
        </div>
        <div className="stat-title">{t('netProfit')}</div>
        <div className={`stat-value ${summary.netProfit >= 0 ? 'text-success' : 'text-error'}`}>
          ฿{summary.netProfit.toLocaleString()}
        </div>
      </div>
    </div>
  )
}
```

### 产出物

- [x] 记账列表页面（国际化）
- [x] 手动记账弹窗组件
- [x] 财务汇总卡片
- [x] 分类统计图表
- [x] 完整的翻译文件（th/zh/en）

---

## 🧪 测试与部署（Phase 6）

**状态：** ⏳ 待开始
**预计用时：** 2 小时

### 目标

- 完整功能测试
- 数据库迁移验证
- 国际化测试

### 测试清单

#### 1. 数据库测试

- [ ] 创建测试商户
- [ ] 插入预设类目
- [ ] 触发器测试（订单完成、钱包扣款）
- [ ] RLS 策略验证

#### 2. 功能测试

- [ ] 手动记账 CRUD 操作
- [ ] 权限验证（只读记录不可编辑）
- [ ] 财务汇总数据准确性
- [ ] 分类统计正确性

#### 3. 国际化测试

- [ ] 切换到泰语界面测试
- [ ] 切换到中文界面测试
- [ ] 切换到英语界面测试
- [ ] 类目名称多语言显示

#### 4. 性能测试

- [ ] 1000+ 条记录加载速度
- [ ] 财务汇总查询性能
- [ ] 图表渲染性能

### 部署步骤

1. **数据库迁移**
   ```bash
   # 在 Supabase Dashboard 执行迁移
   supabase/migrations/YYYYMMDDHHMMSS_create_accounting_tables.sql
   supabase/migrations/YYYYMMDDHHMMSS_create_accounting_triggers.sql
   ```

2. **代码部署**
   ```bash
   git add .
   git commit -m "feat: 实现零售记账模块"
   git push origin main
   # Vercel 自动部署
   ```

3. **验证**
   - 访问 `/th/merchant/accounting`
   - 创建测试记账记录
   - 验证自动记账功能

---

## 📋 实施检查清单

### Phase 1: 数据库设计
- [ ] 创建 `account_categories` 表
- [ ] 创建 `account_transactions` 表
- [ ] 配置 RLS 策略
- [ ] 创建性能索引
- [ ] 插入预设系统类目
- [ ] 测试数据库迁移

### Phase 2: 自动记账
- [ ] 实现订单完成触发器
- [ ] 实现钱包扣款触发器
- [ ] 测试触发器逻辑
- [ ] 验证数据一致性

### Phase 3: 手动记账
- [ ] 实现创建 Server Action
- [ ] 实现更新 Server Action
- [ ] 实现删除 Server Action
- [ ] 添加数据验证
- [ ] 测试权限控制

### Phase 4: 财务汇总
- [ ] 实现财务概览查询
- [ ] 实现分类汇总 RPC
- [ ] 实现日期范围筛选
- [ ] 测试查询性能

### Phase 5: 商户后台 UI
- [ ] 创建记账列表页面
- [ ] 实现手动记账弹窗
- [ ] 添加财务汇总卡片
- [ ] 集成分类图表
- [ ] 添加翻译文件（th/zh/en）
- [ ] 测试国际化切换

### Phase 6: 测试与部署
- [ ] 完整功能测试
- [ ] 国际化测试
- [ ] 性能测试
- [ ] 生产环境部署

---

## 🎯 成功标准

### 功能完整性
- ✅ 自动记账触发器正常工作
- ✅ 手动记账 CRUD 功能完整
- ✅ 财务汇总数据准确
- ✅ 权限控制正确（系统记录只读）

### 国际化支持
- ✅ 支持 th/zh/en 三种语言
- ✅ 类目名称多语言存储
- ✅ UI 界面完全国际化

### 性能要求
- ✅ 记账列表加载时间 < 1s
- ✅ 财务汇总查询时间 < 500ms
- ✅ 支持 10,000+ 条记录

### 数据安全
- ✅ RLS 策略严格隔离商户数据
- ✅ 系统记录不可编辑/删除
- ✅ 所有操作有审计日志

---

## 📝 变更日志

### 2025-12-15
- 📄 创建实施进度方案
- 🎯 定义 6 个实施阶段
- 📊 设计数据库 Schema
- 🌍 确认国际化要求

---

## 🔗 相关文档

- [accounting-phase.md](accounting-phase.md) - 原始需求文档
- [MIGRATION_PROGRESS.md](MIGRATION_PROGRESS.md) - 国际化迁移进度
- Supabase 数据库文档
- Next.js App Router 文档
- next-intl 国际化文档

---

**最后更新：** 2025-12-15
**创建人：** Claude Code
**状态：** 方案设计完成，待用户确认
