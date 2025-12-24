-- 清理旧的 products bucket storage 策略
-- 删除过于宽松的认证用户上传策略

-- 删除旧的"所有认证用户都可以上传"策略（安全风险）
DROP POLICY IF EXISTS "Authenticated users can upload images 1ifhysk_0" ON storage.objects;

-- 保留以下策略：
-- 1. "Merchants can upload product images 1ifhysk_0" - 商户可以上传自己的商品图片
-- 2. "Anyone can view product images 1ifhysk_0" - 所有人可以查看商品图片
-- 3. "Merchants can update own product images 1ifhysk_0" - 商户可以更新自己的商品图片
-- 4. "Merchants can delete own product images 1ifhysk_0" - 商户可以删除自己的商品图片
