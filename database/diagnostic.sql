-- ========================================
-- 诊断脚本 - 检查配置是否正确
-- ========================================

-- 1. 检查 categories 表是否有所有必需字段
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'categories'
AND column_name IN ('description', 'icon_url', 'is_active', 'sort_order')
ORDER BY column_name;

-- 2. 检查 Storage bucket 是否存在
SELECT
    id,
    name,
    public,
    file_size_limit,
    created_at
FROM storage.buckets
WHERE id = 'public-assets';

-- 3. 检查当前登录用户是否为管理员
SELECT
    auth.uid() as current_user_id,
    p.email,
    p.role
FROM public.profiles p
WHERE p.id = auth.uid();

-- 4. 检查 Storage 策略
SELECT
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
ORDER BY policyname;

-- 5. 测试管理员权限检查
SELECT
    auth.uid() as current_user_id,
    auth.uid() IN (
        SELECT id FROM public.profiles WHERE role = 'admin'
    ) as is_admin;
