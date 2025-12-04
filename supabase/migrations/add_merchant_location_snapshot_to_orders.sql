-- 为 orders 表添加商户地址快照字段
-- 用途：保存下单时商户的地址信息，即使商户后来搬家也不影响历史订单

-- 1. 添加商户地址快照字段
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS merchant_address_snapshot TEXT,
ADD COLUMN IF NOT EXISTS merchant_latitude_snapshot NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS merchant_longitude_snapshot NUMERIC(11, 8),
ADD COLUMN IF NOT EXISTS merchant_shop_name_snapshot TEXT;

-- 2. 添加注释说明
COMMENT ON COLUMN public.orders.merchant_address_snapshot IS '商户地址快照（下单时）';
COMMENT ON COLUMN public.orders.merchant_latitude_snapshot IS '商户纬度快照（下单时）';
COMMENT ON COLUMN public.orders.merchant_longitude_snapshot IS '商户经度快照（下单时）';
COMMENT ON COLUMN public.orders.merchant_shop_name_snapshot IS '商户名称快照（下单时）';

-- 3. 为现有订单填充快照数据（如果可能）
-- 从关联的优惠券中获取商户信息
UPDATE public.orders o
SET
  merchant_shop_name_snapshot = m.shop_name,
  merchant_address_snapshot = m.address,
  merchant_latitude_snapshot = m.latitude,
  merchant_longitude_snapshot = m.longitude
FROM public.coupons c
JOIN public.merchants m ON c.merchant_id = m.merchant_id
WHERE o.coupon_id = c.coupon_id
  AND o.merchant_shop_name_snapshot IS NULL;

-- 4. 创建索引（可选，用于快速查询某个区域的历史订单）
CREATE INDEX IF NOT EXISTS idx_orders_merchant_location_snapshot
ON public.orders (merchant_latitude_snapshot, merchant_longitude_snapshot)
WHERE merchant_latitude_snapshot IS NOT NULL AND merchant_longitude_snapshot IS NOT NULL;
