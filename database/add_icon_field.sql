-- ========================================
-- 添加 icon 字段到 categories 表
-- ========================================

-- 1. 添加 icon 字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'icon'
    ) THEN
        ALTER TABLE categories ADD COLUMN icon text;
        RAISE NOTICE '✅ 已添加 icon 字段';
    ELSE
        RAISE NOTICE 'ℹ️ icon 字段已存在';
    END IF;
END $$;

-- 2. 验证所有必需的字段是否存在
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'categories'
AND column_name IN ('category_id', 'name', 'parent_id', 'icon', 'description', 'icon_url', 'is_active', 'sort_order', 'created_at')
ORDER BY
    CASE column_name
        WHEN 'category_id' THEN 1
        WHEN 'name' THEN 2
        WHEN 'parent_id' THEN 3
        WHEN 'icon' THEN 4
        WHEN 'description' THEN 5
        WHEN 'icon_url' THEN 6
        WHEN 'is_active' THEN 7
        WHEN 'sort_order' THEN 8
        WHEN 'created_at' THEN 9
    END;

-- 3. 统计字段数量（应该是9个）
SELECT
    COUNT(*) as total_fields,
    CASE
        WHEN COUNT(*) = 9 THEN '✅ 所有字段都已添加'
        ELSE '❌ 缺少' || (9 - COUNT(*))::text || '个字段'
    END as status
FROM information_schema.columns
WHERE table_name = 'categories'
AND column_name IN ('category_id', 'name', 'parent_id', 'icon', 'description', 'icon_url', 'is_active', 'sort_order', 'created_at');
