-- =====================================================
-- 更新基础版订阅方案
-- 文件: 20251223_update_basic_plan.sql
-- 版本: v1.0
-- 日期: 2025-12-23
-- 更改: 基础版改为免费，10个产品，2个优惠券
-- =====================================================

-- 更新基础版订阅方案
UPDATE subscription_plans
SET
  display_name = '{"en": "Basic (Free)", "th": "พื้นฐาน (ฟรี)", "zh": "基础版（免费）"}'::jsonb,
  price = 0,
  product_limit = 10,
  coupon_type_limit = 2,
  updated_at = NOW()
WHERE name = 'basic';

-- 验证更新
DO $$
DECLARE
  basic_plan RECORD;
BEGIN
  SELECT * INTO basic_plan FROM subscription_plans WHERE name = 'basic';

  IF basic_plan.price = 0 AND basic_plan.product_limit = 10 AND basic_plan.coupon_type_limit = 2 THEN
    RAISE NOTICE '基础版订阅方案更新成功！';
    RAISE NOTICE '  - 价格: 免费 (฿0)';
    RAISE NOTICE '  - 产品上限: 10';
    RAISE NOTICE '  - 优惠券上限: 2';
  ELSE
    RAISE WARNING '基础版订阅方案更新可能失败，请检查！';
  END IF;
END $$;
