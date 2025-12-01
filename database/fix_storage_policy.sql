-- ========================================
-- 修复 Storage 上传策略
-- ========================================

-- 删除有问题的 INSERT 策略
DROP POLICY IF EXISTS "Admin can upload to public-assets" ON storage.objects;

-- 重新创建正确的 INSERT 策略
CREATE POLICY "Admin can upload to public-assets"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'public-assets'
  AND auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);

-- 验证策略
SELECT
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND policyname = 'Admin can upload to public-assets';

-- 同时验证当前用户是否为管理员
SELECT
    auth.uid() as current_user_id,
    p.email,
    p.role,
    CASE
        WHEN p.role = 'admin' THEN '✅ 是管理员，可以上传'
        ELSE '❌ 不是管理员，无法上传'
    END as upload_permission
FROM public.profiles p
WHERE p.id = auth.uid();
