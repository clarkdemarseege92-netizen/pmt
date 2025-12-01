-- ========================================
-- 修复并增强 categories 表
-- ========================================

-- 1. 添加 description 字段（如果还没有）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'description'
    ) THEN
        ALTER TABLE categories ADD COLUMN description text;
    END IF;
END $$;

-- 2. 添加 icon_url 字段用于保存图标图片 URL
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'icon_url'
    ) THEN
        ALTER TABLE categories ADD COLUMN icon_url text;
    END IF;
END $$;

-- 3. 添加 is_active 字段控制分类是否在平台显示
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE categories ADD COLUMN is_active boolean DEFAULT true;
    END IF;
END $$;

-- 4. 添加 sort_order 字段用于排序
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE categories ADD COLUMN sort_order integer DEFAULT 0;
    END IF;
END $$;

-- 5. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);

-- 6. 更新现有分类数据，设置默认值
UPDATE categories
SET is_active = true
WHERE is_active IS NULL;

-- 7. 为已有分类设置排序顺序（可选）
-- 一级分类按创建时间排序
WITH ranked AS (
  SELECT
    category_id,
    ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM categories
  WHERE parent_id IS NULL
)
UPDATE categories
SET sort_order = ranked.rn * 10
FROM ranked
WHERE categories.category_id = ranked.category_id;

-- 二级分类按创建时间排序
WITH ranked AS (
  SELECT
    category_id,
    parent_id,
    ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY created_at) as rn
  FROM categories
  WHERE parent_id IS NOT NULL
)
UPDATE categories
SET sort_order = ranked.rn * 10
FROM ranked
WHERE categories.category_id = ranked.category_id;

-- ========================================
-- 验证修改
-- ========================================

-- 查看 categories 表结构
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;
