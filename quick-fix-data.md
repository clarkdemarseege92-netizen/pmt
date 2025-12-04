# 快速修复多语言数据问题

> **注意：** 本修复方案基于 i18n 迁移计划（`I18N_MIGRATION_PLAN.md`）阶段 2，确保数据库多语言字段符合项目规范。

## 问题诊断

从日志中发现：
1. **分类（categories）** 的 `name` 字段存储为纯字符串：`"美食"` 而不是 JSONB 对象 `{"th":"อาหาร","zh":"美食","en":"Food"}`
2. **优惠券（coupons）** 的 `name` 字段虽然是 JSONB 对象，但中文和英文字段为空：`{"en":"","th":"แพ็คเกจ A"}`

### 数据库规范（来自迁移计划）
根据 `I18N_MIGRATION_PLAN.md` 第 190-196 行：
- 数据库多语言字段格式保持不变：`{th: "...", zh: "...", en: "..."}`
- 继续使用 `getLocalizedValue` 辅助函数（已改进以跳过空字符串）

## 解决方案

### 方案 1：临时应急方案（立即生效）

如果您想快速看到效果，可以暂时让所有语言都显示相同的内容：

#### 修复优惠券数据
在 Supabase SQL Editor 中执行：

```sql
-- 将空的中文和英文字段填充为泰语内容（临时方案）
UPDATE coupons
SET name = jsonb_set(
  jsonb_set(
    name,
    '{zh}', name->'th'
  ),
  '{en}', name->'th'
)
WHERE (name->>'zh' = '' OR name->>'zh' IS NULL)
   OR (name->>'en' = '' OR name->>'en' IS NULL);
```

#### 修复分类数据
```sql
-- 检查哪些分类的 name 是字符串格式
SELECT category_id, name FROM categories WHERE jsonb_typeof(name::jsonb) = 'string';

-- 将字符串格式的 name 转换为对象格式（所有语言暂时显示相同）
UPDATE categories
SET name = jsonb_build_object(
  'th', trim(both '"' from name::text),
  'zh', trim(both '"' from name::text),
  'en', trim(both '"' from name::text)
)
WHERE jsonb_typeof(name::jsonb) = 'string';
```

### 方案 2：完整方案（需要人工翻译）

#### 步骤 1：导出需要翻译的数据

```sql
-- 导出分类列表
SELECT category_id, name FROM categories;

-- 导出优惠券列表
SELECT coupon_id, name->>'th' as thai_name FROM coupons;
```

#### 步骤 2：准备翻译

将导出的数据交给翻译人员，或使用 Google Translate API 批量翻译。

#### 步骤 3：批量更新（示例）

```sql
-- 更新特定分类的翻译
UPDATE categories
SET name = jsonb_build_object(
  'th', 'อาหาร',
  'zh', '美食',
  'en', 'Food'
)
WHERE category_id = '您的分类ID';

-- 更新特定优惠券的翻译
UPDATE coupons
SET name = jsonb_build_object(
  'th', 'แพ็คเกจ A',
  'zh', '套餐 A',
  'en', 'Package A'
)
WHERE coupon_id = '1584705e-a27c-4ae0-b290-540b8fbd155b';
```

## 验证修复

执行以下 SQL 检查修复效果：

```sql
-- 检查分类
SELECT
  category_id,
  name->>'th' as thai,
  name->>'zh' as chinese,
  name->>'en' as english
FROM categories;

-- 检查优惠券
SELECT
  coupon_id,
  name->>'th' as thai,
  name->>'zh' as chinese,
  name->>'en' as english
FROM coupons
LIMIT 10;
```

## 预防未来问题

为了确保将来插入的数据符合多语言格式，建议在 Supabase 中：

1. 在商家后台添加优惠券时，强制要求填写所有三种语言
2. 或者至少填写一种语言，其他语言自动复制或标记为待翻译
3. 添加数据库约束或触发器验证数据格式

## 代码改进

我已经改进了 `lib/i18nUtils.ts` 中的 `getLocalizedValue` 函数：
- 现在会跳过空字符串
- 会尝试所有语言，找到第一个有效的值
- 如果都没有，才返回空字符串

这样即使数据库中某些语言缺失，也能降级显示其他语言，而不是显示空白。
