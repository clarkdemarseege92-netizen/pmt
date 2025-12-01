-- ========================================
-- 为 products 和 coupons 表添加 category_id 字段
-- ========================================

-- 1. 为 products 表添加 category_id 字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'category_id'
    ) THEN
        ALTER TABLE products ADD COLUMN category_id uuid;
        RAISE NOTICE '✅ 已为 products 表添加 category_id 字段';
    ELSE
        RAISE NOTICE 'ℹ️ products.category_id 字段已存在';
    END IF;
END $$;

-- 2. 为 coupons 表添加 category_id 字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'coupons' AND column_name = 'category_id'
    ) THEN
        ALTER TABLE coupons ADD COLUMN category_id uuid;
        RAISE NOTICE '✅ 已为 coupons 表添加 category_id 字段';
    ELSE
        RAISE NOTICE 'ℹ️ coupons.category_id 字段已存在';
    END IF;
END $$;

-- 3. 添加外键约束 (products -> categories)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'products_category_id_fkey'
    ) THEN
        ALTER TABLE products
        ADD CONSTRAINT products_category_id_fkey
        FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL;
        RAISE NOTICE '✅ 已为 products 表添加外键约束';
    ELSE
        RAISE NOTICE 'ℹ️ products 外键约束已存在';
    END IF;
END $$;

-- 4. 添加外键约束 (coupons -> categories)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'coupons_category_id_fkey'
    ) THEN
        ALTER TABLE coupons
        ADD CONSTRAINT coupons_category_id_fkey
        FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL;
        RAISE NOTICE '✅ 已为 coupons 表添加外键约束';
    ELSE
        RAISE NOTICE 'ℹ️ coupons 外键约束已存在';
    END IF;
END $$;

-- 5. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_coupons_category_id ON coupons(category_id);

-- 6. 验证修改
SELECT
    'products' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'category_id'

UNION ALL

SELECT
    'coupons' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'coupons' AND column_name = 'category_id';
