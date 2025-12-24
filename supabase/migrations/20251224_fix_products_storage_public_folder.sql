-- 修复 products storage RLS 策略以支持 public/ 文件夹
-- 问题：文件路径为 public/xxx.jpg 时，RLS 策略无法正确验证商户权限
-- 解决：允许所有认证的商户上传到 public/ 文件夹

-- 删除旧的策略
DROP POLICY IF EXISTS "Merchants can upload product images 1ifhysk_0" ON storage.objects;

-- 创建新的上传策略：允许认证用户上传到 public/ 文件夹
CREATE POLICY "Authenticated users can upload to products public folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'products'
  AND (storage.foldername(name))[1] = 'public'
  AND auth.role() = 'authenticated'
);

-- 添加注释
COMMENT ON POLICY "Authenticated users can upload to products public folder" ON storage.objects
IS '认证用户可以上传商品图片到 products/public/ 文件夹';
