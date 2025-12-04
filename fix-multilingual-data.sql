-- 修复多语言数据的 SQL 脚本
-- 此脚本将更新 categories 和 coupons 表中的 name 字段，使其符合多语言格式

-- ==========================================
-- 1. 修复 categories 表
-- ==========================================
-- 对于 name 字段是纯字符串的分类，将其转换为 JSONB 对象

-- 示例：将 "美食" 转换为 {"th": "อาหาร", "zh": "美食", "en": "Food"}
-- 请根据实际情况调整翻译

-- 查看当前有问题的分类数据
SELECT category_id, name,
       jsonb_typeof(name::jsonb) as name_type
FROM categories
WHERE jsonb_typeof(name::jsonb) = 'string';

-- 更新分类数据（示例）
-- 注意：您需要根据实际的分类名称调整翻译
UPDATE categories
SET name = jsonb_build_object(
  'th', CASE
    WHEN name::text = '"美食"' THEN 'อาหาร'
    WHEN name::text = '"购物"' THEN 'ช้อปปิ้ง'
    WHEN name::text = '"娱乐"' THEN 'บันเทิง'
    WHEN name::text = '"旅游"' THEN 'ท่องเที่ยว'
    ELSE 'หมวดหมู่' -- 默认泰语
  END,
  'zh', CASE
    WHEN name::text LIKE '"%"' THEN trim(both '"' from name::text)
    ELSE name::text
  END,
  'en', CASE
    WHEN name::text = '"美食"' THEN 'Food'
    WHEN name::text = '"购物"' THEN 'Shopping'
    WHEN name::text = '"娱乐"' THEN 'Entertainment'
    WHEN name::text = '"旅游"' THEN 'Travel'
    ELSE 'Category' -- 默认英语
  END
)
WHERE jsonb_typeof(name::jsonb) = 'string';


-- ==========================================
-- 2. 修复 coupons 表
-- ==========================================
-- 对于 name 对象中有空字符串的优惠券，补充翻译

-- 查看当前有问题的优惠券数据
SELECT coupon_id, name
FROM coupons
WHERE (name->>'zh' = '' OR name->>'zh' IS NULL)
   OR (name->>'en' = '' OR name->>'en' IS NULL);

-- 更新优惠券数据 - 将泰语翻译为中文和英文
-- 注意：这是一个示例，实际使用时需要人工翻译或使用翻译 API

-- 方案 1：临时使用泰语作为所有语言的值（应急方案）
UPDATE coupons
SET name = jsonb_set(
  jsonb_set(
    name,
    '{zh}',
    COALESCE(name->'zh', name->'th', '"优惠券"'::jsonb)
  ),
  '{en}',
  COALESCE(name->'en', name->'th', '"Coupon"'::jsonb)
)
WHERE (name->>'zh' = '' OR name->>'zh' IS NULL)
   OR (name->>'en' = '' OR name->>'en' IS NULL);

-- 方案 2：为特定的优惠券添加准确的翻译（推荐）
-- 示例：为 "แพ็คเกจ A" 添加翻译
UPDATE coupons
SET name = jsonb_build_object(
  'th', name->>'th',
  'zh', '套餐 A',
  'en', 'Package A'
)
WHERE name->>'th' = 'แพ็คเกจ A';


-- ==========================================
-- 3. 验证修复结果
-- ==========================================

-- 检查 categories 是否都是多语言对象
SELECT
  category_id,
  name,
  name->>'th' as name_th,
  name->>'zh' as name_zh,
  name->>'en' as name_en
FROM categories
LIMIT 10;

-- 检查 coupons 是否都有完整的翻译
SELECT
  coupon_id,
  name,
  name->>'th' as name_th,
  name->>'zh' as name_zh,
  name->>'en' as name_en
FROM coupons
WHERE (name->>'zh' = '' OR name->>'zh' IS NULL)
   OR (name->>'en' = '' OR name->>'en' IS NULL)
LIMIT 10;


-- ==========================================
-- 4. 后续维护建议
-- ==========================================

-- 创建触发器确保新插入的数据符合多语言格式
CREATE OR REPLACE FUNCTION validate_multilingual_name()
RETURNS TRIGGER AS $$
BEGIN
  -- 确保 name 是一个对象
  IF jsonb_typeof(NEW.name) != 'object' THEN
    RAISE EXCEPTION 'name must be a JSON object with th, zh, and en keys';
  END IF;

  -- 确保至少有一种语言的值不为空
  IF COALESCE(NEW.name->>'th', '') = ''
     AND COALESCE(NEW.name->>'zh', '') = ''
     AND COALESCE(NEW.name->>'en', '') = '' THEN
    RAISE EXCEPTION 'name must have at least one non-empty language value';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 应用到 categories 表
DROP TRIGGER IF EXISTS validate_category_name ON categories;
CREATE TRIGGER validate_category_name
  BEFORE INSERT OR UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION validate_multilingual_name();

-- 应用到 coupons 表
DROP TRIGGER IF EXISTS validate_coupon_name ON coupons;
CREATE TRIGGER validate_coupon_name
  BEFORE INSERT OR UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION validate_multilingual_name();
