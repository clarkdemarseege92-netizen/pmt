-- 为商品图片存储桶添加 RLS 策略
-- 用于商户在手机端和网页端上传商品图片
-- 使用已存在的 'products' bucket

-- 删除旧的 storage policies（如果存在）
DROP POLICY IF EXISTS "Merchants can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Merchants can update own product images" ON storage.objects;
DROP POLICY IF EXISTS "Merchants can delete own product images" ON storage.objects;

-- 1. 商户可以上传自己的商品图片
CREATE POLICY "Merchants can upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'products'
  AND auth.uid() IN (
    SELECT owner_id FROM merchants WHERE merchant_id::text = (storage.foldername(name))[1]
  )
);

-- 2. 所有人可以查看商品图片（因为 bucket 是 public）
CREATE POLICY "Anyone can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'products');

-- 3. 商户可以更新自己的商品图片
CREATE POLICY "Merchants can update own product images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'products'
  AND auth.uid() IN (
    SELECT owner_id FROM merchants WHERE merchant_id::text = (storage.foldername(name))[1]
  )
);

-- 4. 商户可以删除自己的商品图片
CREATE POLICY "Merchants can delete own product images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'products'
  AND auth.uid() IN (
    SELECT owner_id FROM merchants WHERE merchant_id::text = (storage.foldername(name))[1]
  )
);

-- 添加注释
COMMENT ON POLICY "Merchants can upload product images" ON storage.objects IS '商户可以上传自己店铺的商品图片到 products bucket';
COMMENT ON POLICY "Anyone can view product images" ON storage.objects IS '所有人可以查看商品图片（公开访问）';
COMMENT ON POLICY "Merchants can update own product images" ON storage.objects IS '商户可以更新自己店铺的商品图片';
COMMENT ON POLICY "Merchants can delete own product images" ON storage.objects IS '商户可以删除自己店铺的商品图片';
