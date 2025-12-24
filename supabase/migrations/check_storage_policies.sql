-- 检查 products bucket 的所有 RLS 策略

-- 1. 检查 storage.objects 表的所有策略
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- 2. 检查 products bucket 的配置
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'products';

-- 3. 检查是否启用了 RLS
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'storage'
  AND tablename = 'objects';
