-- ==========================================
-- 数据库多语言数据修复脚本
-- 项目：PMT 优惠券平台
-- 迁移阶段：阶段 2 - 首页迁移
-- 日期：2025-12-04
-- ==========================================

-- 说明：
-- 1. 本脚本修复数据库中不符合多语言规范的数据
-- 2. 符合 I18N_MIGRATION_PLAN.md 规定的数据库格式
-- 3. 执行前请先备份数据库！

-- ==========================================
-- 步骤 1：检查当前数据状态
-- ==========================================

-- 检查分类表 - 查看哪些 name 是字符串而不是对象
SELECT
  category_id,
  name,
  jsonb_typeof(name::jsonb) as type
FROM categories
WHERE jsonb_typeof(name::jsonb) = 'string'
LIMIT 5;

-- 检查优惠券表 - 查看哪些 name 缺少中文或英文
SELECT
  coupon_id,
  name->>'th' as thai,
  name->>'zh' as chinese,
  name->>'en' as english,
  CASE
    WHEN name->>'zh' = '' OR name->>'zh' IS NULL THEN '缺少中文'
    WHEN name->>'en' = '' OR name->>'en' IS NULL THEN '缺少英文'
    ELSE '完整'
  END as status
FROM coupons
WHERE (name->>'zh' = '' OR name->>'zh' IS NULL)
   OR (name->>'en' = '' OR name->>'en' IS NULL)
LIMIT 5;


-- ==========================================
-- 步骤 2：修复分类表（categories）
-- ==========================================

-- 方案 A：应急修复 - 所有语言显示相同内容
-- 适用于：快速上线，之后再逐个翻译

UPDATE categories
SET name = jsonb_build_object(
  'th', trim(both '"' from name::text),
  'zh', trim(both '"' from name::text),
  'en', trim(both '"' from name::text)
)
WHERE jsonb_typeof(name::jsonb) = 'string';

-- 方案 B：准确翻译 - 根据已知的分类名称提供翻译
-- 适用于：分类数量少，可以手动翻译
-- 请根据实际情况取消注释并调整：

/*
UPDATE categories
SET name = CASE
  -- 美食
  WHEN name::text = '"美食"' THEN jsonb_build_object(
    'th', 'อาหาร',
    'zh', '美食',
    'en', 'Food'
  )
  -- 购物
  WHEN name::text = '"购物"' THEN jsonb_build_object(
    'th', 'ช้อปปิ้ง',
    'zh', '购物',
    'en', 'Shopping'
  )
  -- 娱乐
  WHEN name::text = '"娱乐"' THEN jsonb_build_object(
    'th', 'บันเทิง',
    'zh', '娱乐',
    'en', 'Entertainment'
  )
  -- 旅游
  WHEN name::text = '"旅游"' THEN jsonb_build_object(
    'th', 'ท่องเที่ยว',
    'zh', '旅游',
    'en', 'Travel'
  )
  -- 美容
  WHEN name::text = '"美容"' THEN jsonb_build_object(
    'th', 'ความงาม',
    'zh', '美容',
    'en', 'Beauty'
  )
  -- 健身
  WHEN name::text = '"健身"' THEN jsonb_build_object(
    'th', 'ฟิตเนส',
    'zh', '健身',
    'en', 'Fitness'
  )
  ELSE name
END
WHERE jsonb_typeof(name::jsonb) = 'string';
*/


-- ==========================================
-- 步骤 3：修复优惠券表（coupons）
-- ==========================================

-- 方案 A：应急修复 - 使用泰语填充空的中文和英文
-- 适用于：快速上线，之后再逐个翻译

UPDATE coupons
SET name = jsonb_set(
  jsonb_set(
    name,
    '{zh}',
    CASE
      WHEN name->>'zh' = '' OR name->>'zh' IS NULL
      THEN name->'th'
      ELSE name->'zh'
    END
  ),
  '{en}',
  CASE
    WHEN name->>'en' = '' OR name->>'en' IS NULL
    THEN name->'th'
    ELSE name->'en'
  END
)
WHERE (name->>'zh' = '' OR name->>'zh' IS NULL)
   OR (name->>'en' = '' OR name->>'en' IS NULL);

-- 方案 B：特定优惠券的准确翻译
-- 根据日志显示的 "แพ็คเกจ A" 进行翻译
-- 请根据实际情况取消注释并调整：

/*
UPDATE coupons
SET name = jsonb_build_object(
  'th', 'แพ็คเกจ A',
  'zh', '套餐 A',
  'en', 'Package A'
)
WHERE coupon_id = '1584705e-a27c-4ae0-b290-540b8fbd155b';

-- 如果有更多优惠券需要翻译，可以继续添加：
UPDATE coupons
SET name = jsonb_build_object(
  'th', '优惠券泰语名称',
  'zh', '优惠券中文名称',
  'en', 'Coupon English Name'
)
WHERE coupon_id = '另一个优惠券ID';
*/


-- ==========================================
-- 步骤 4：验证修复结果
-- ==========================================

-- 验证分类表
SELECT
  category_id,
  name->>'th' as thai,
  name->>'zh' as chinese,
  name->>'en' as english,
  CASE
    WHEN jsonb_typeof(name) != 'object' THEN '❌ 不是对象'
    WHEN name->>'th' = '' OR name->>'th' IS NULL THEN '❌ 缺少泰语'
    WHEN name->>'zh' = '' OR name->>'zh' IS NULL THEN '⚠️ 缺少中文'
    WHEN name->>'en' = '' OR name->>'en' IS NULL THEN '⚠️ 缺少英文'
    ELSE '✅ 完整'
  END as status
FROM categories
ORDER BY created_at DESC
LIMIT 10;

-- 验证优惠券表
SELECT
  coupon_id,
  name->>'th' as thai,
  name->>'zh' as chinese,
  name->>'en' as english,
  CASE
    WHEN jsonb_typeof(name) != 'object' THEN '❌ 不是对象'
    WHEN name->>'th' = '' OR name->>'th' IS NULL THEN '❌ 缺少泰语'
    WHEN name->>'zh' = '' OR name->>'zh' IS NULL THEN '⚠️ 缺少中文'
    WHEN name->>'en' = '' OR name->>'en' IS NULL THEN '⚠️ 缺少英文'
    ELSE '✅ 完整'
  END as status
FROM coupons
ORDER BY created_at DESC
LIMIT 10;


-- ==========================================
-- 步骤 5：创建数据验证函数（可选）
-- ==========================================

-- 创建一个函数来验证多语言字段的完整性
CREATE OR REPLACE FUNCTION check_multilingual_completeness()
RETURNS TABLE(
  table_name text,
  record_id uuid,
  missing_languages text[]
) AS $$
BEGIN
  -- 检查分类表
  RETURN QUERY
  SELECT
    'categories'::text,
    c.category_id,
    ARRAY(
      SELECT lang FROM unnest(ARRAY['th', 'zh', 'en']) AS lang
      WHERE c.name->>lang = '' OR c.name->>lang IS NULL
    ) as missing_languages
  FROM categories c
  WHERE jsonb_typeof(c.name) = 'object'
    AND (c.name->>'th' = '' OR c.name->>'th' IS NULL
         OR c.name->>'zh' = '' OR c.name->>'zh' IS NULL
         OR c.name->>'en' = '' OR c.name->>'en' IS NULL);

  -- 检查优惠券表
  RETURN QUERY
  SELECT
    'coupons'::text,
    co.coupon_id,
    ARRAY(
      SELECT lang FROM unnest(ARRAY['th', 'zh', 'en']) AS lang
      WHERE co.name->>lang = '' OR co.name->>lang IS NULL
    ) as missing_languages
  FROM coupons co
  WHERE jsonb_typeof(co.name) = 'object'
    AND (co.name->>'th' = '' OR co.name->>'th' IS NULL
         OR co.name->>'zh' = '' OR co.name->>'zh' IS NULL
         OR co.name->>'en' = '' OR co.name->>'en' IS NULL);
END;
$$ LANGUAGE plpgsql;

-- 使用验证函数
-- SELECT * FROM check_multilingual_completeness();


-- ==========================================
-- 完成！
-- ==========================================

-- 执行完成后：
-- 1. 检查验证结果
-- 2. 在本地测试：npm run dev
-- 3. 访问 /zh, /th, /en 查看不同语言的显示效果
-- 4. 确认所有内容都能正确显示后，逐步添加准确的翻译

-- 注意事项：
-- - 方案 A（应急修复）让所有语言显示相同内容，适合快速上线
-- - 方案 B（准确翻译）提供正确的多语言支持，需要人工翻译
-- - 建议先使用方案 A，然后逐步完善翻译
