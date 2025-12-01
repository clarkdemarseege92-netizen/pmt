-- ========================================
-- 完整修复脚本
-- 包含：数据库字段 + Storage 配置
-- ========================================

-- ========================================
-- 第一部分：修复 categories 表
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

-- ========================================
-- 第二部分：配置 Supabase Storage
-- ========================================

-- 1. 创建 public-assets bucket（如果不存在）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets',
  'public-assets',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- 2. 删除可能存在的旧策略
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload to public-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete from public-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to public-assets" ON storage.objects;

-- 3. 创建新的 Storage 策略

-- 允许所有人读取 public-assets bucket 中的文件
CREATE POLICY "Public read access to public-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-assets');

-- 允许管理员上传文件到 public-assets bucket
CREATE POLICY "Admin can upload to public-assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'public-assets'
  AND auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);

-- 允许管理员更新文件
CREATE POLICY "Admin can update public-assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'public-assets'
  AND auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);

-- 允许管理员删除文件
CREATE POLICY "Admin can delete from public-assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'public-assets'
  AND auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);

-- ========================================
-- 第三部分：验证配置
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

-- 查看 Storage buckets
SELECT id, name, public, file_size_limit, allowed_mime_types, created_at
FROM storage.buckets
WHERE id = 'public-assets';

-- 查看 Storage 策略
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
