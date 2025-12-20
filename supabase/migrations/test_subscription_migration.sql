-- =====================================================
-- 订阅系统迁移测试脚本
-- 文件: test_subscription_migration.sql
-- 用途: 验证迁移是否成功
-- =====================================================

-- 开始测试
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '开始测试订阅系统迁移...';
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- 测试 1: 检查表是否存在
-- =====================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '测试 1: 检查表是否存在';
  RAISE NOTICE '-----------------------------------';

  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('subscription_plans', 'merchant_subscriptions', 'subscription_invoices');

  IF table_count = 3 THEN
    RAISE NOTICE '✅ 所有表创建成功 (3/3)';
  ELSE
    RAISE WARNING '❌ 表创建不完整，期望3个，实际%个', table_count;
  END IF;
END $$;

-- =====================================================
-- 测试 2: 检查订阅方案数据
-- =====================================================

DO $$
DECLARE
  plan_count INTEGER;
  plan_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '测试 2: 检查订阅方案数据';
  RAISE NOTICE '-----------------------------------';

  SELECT COUNT(*) INTO plan_count FROM subscription_plans;

  IF plan_count = 5 THEN
    RAISE NOTICE '✅ 订阅方案数据完整 (5/5)';

    FOR plan_record IN
      SELECT
        name,
        display_name->>'zh' as display_name,
        price,
        product_limit,
        coupon_type_limit
      FROM subscription_plans
      ORDER BY price
    LOOP
      RAISE NOTICE '  - %: ฿%, 产品%, 券种%',
        plan_record.display_name,
        plan_record.price,
        plan_record.product_limit,
        plan_record.coupon_type_limit;
    END LOOP;
  ELSE
    RAISE WARNING '❌ 订阅方案数据不完整，期望5个，实际%个', plan_count;
  END IF;
END $$;

-- =====================================================
-- 测试 3: 检查函数是否存在
-- =====================================================

DO $$
DECLARE
  function_count INTEGER;
  func_name TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '测试 3: 检查函数是否存在';
  RAISE NOTICE '-----------------------------------';

  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN (
      'check_subscription_status',
      'check_balance_unlock',
      'check_product_limit',
      'check_coupon_type_limit'
    );

  IF function_count = 4 THEN
    RAISE NOTICE '✅ 所有函数创建成功 (4/4)';

    FOR func_name IN
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN (
          'check_subscription_status',
          'check_balance_unlock',
          'check_product_limit',
          'check_coupon_type_limit'
        )
      ORDER BY routine_name
    LOOP
      RAISE NOTICE '  - %', func_name;
    END LOOP;
  ELSE
    RAISE WARNING '❌ 函数创建不完整，期望4个，实际%个', function_count;
  END IF;
END $$;

-- =====================================================
-- 测试 4: 检查索引是否存在
-- =====================================================

DO $$
DECLARE
  coupons_index_exists BOOLEAN;
  products_index_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '测试 4: 检查索引是否存在';
  RAISE NOTICE '-----------------------------------';

  -- 检查 coupons 表索引
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'coupons'
      AND indexname = 'idx_coupons_merchant_id'
  ) INTO coupons_index_exists;

  -- 检查 products 表索引
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'products'
      AND indexname = 'idx_products_merchant_id'
  ) INTO products_index_exists;

  IF coupons_index_exists THEN
    RAISE NOTICE '✅ idx_coupons_merchant_id 索引存在';
  ELSE
    RAISE WARNING '❌ idx_coupons_merchant_id 索引不存在';
  END IF;

  IF products_index_exists THEN
    RAISE NOTICE '✅ idx_products_merchant_id 索引存在';
  ELSE
    RAISE WARNING '❌ idx_products_merchant_id 索引不存在';
  END IF;
END $$;

-- =====================================================
-- 测试 5: 测试函数功能（如果有商户）
-- =====================================================

DO $$
DECLARE
  test_merchant_id UUID;
  subscription_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '测试 5: 测试函数功能';
  RAISE NOTICE '-----------------------------------';

  -- 获取一个测试商户ID
  SELECT merchant_id INTO test_merchant_id
  FROM merchants
  LIMIT 1;

  IF test_merchant_id IS NULL THEN
    RAISE NOTICE '⚠️  没有找到测试商户，跳过函数测试';
    RETURN;
  END IF;

  RAISE NOTICE '使用测试商户ID: %', test_merchant_id;

  -- 检查该商户是否已有订阅
  SELECT EXISTS (
    SELECT 1 FROM merchant_subscriptions WHERE merchant_id = test_merchant_id
  ) INTO subscription_exists;

  IF NOT subscription_exists THEN
    RAISE NOTICE '⚠️  商户暂无订阅记录';
    RAISE NOTICE '提示: 可以运行以下 SQL 创建测试订阅：';
    RAISE NOTICE '';
    RAISE NOTICE 'INSERT INTO merchant_subscriptions (';
    RAISE NOTICE '  merchant_id, plan_id, status, trial_start_date, trial_end_date';
    RAISE NOTICE ') SELECT';
    RAISE NOTICE '  ''%''::uuid, id, ''trial'', NOW(), NOW() + INTERVAL ''30 days''', test_merchant_id;
    RAISE NOTICE 'FROM subscription_plans WHERE name = ''trial'';';
  ELSE
    RAISE NOTICE '✅ 商户已有订阅记录';

    -- 测试 check_subscription_status
    DECLARE
      sub_status RECORD;
    BEGIN
      SELECT * INTO sub_status
      FROM check_subscription_status(test_merchant_id);

      IF sub_status IS NOT NULL THEN
        RAISE NOTICE '✅ check_subscription_status() 测试通过';
        RAISE NOTICE '  - 激活状态: %', sub_status.is_active;
        RAISE NOTICE '  - 方案名称: %', sub_status.plan_name;
        RAISE NOTICE '  - 产品上限: %', sub_status.product_limit;
        RAISE NOTICE '  - 券种上限: %', sub_status.coupon_type_limit;
      END IF;
    END;

    -- 测试 check_product_limit
    DECLARE
      prod_limit RECORD;
    BEGIN
      SELECT * INTO prod_limit
      FROM check_product_limit(test_merchant_id);

      IF prod_limit IS NOT NULL THEN
        RAISE NOTICE '✅ check_product_limit() 测试通过';
        RAISE NOTICE '  - 当前产品数: %', prod_limit.current_count;
        RAISE NOTICE '  - 产品上限: %', prod_limit.limit_count;
        RAISE NOTICE '  - 可创建: %', prod_limit.can_create;
      END IF;
    END;

    -- 测试 check_coupon_type_limit
    DECLARE
      coupon_limit RECORD;
    BEGIN
      SELECT * INTO coupon_limit
      FROM check_coupon_type_limit(test_merchant_id);

      IF coupon_limit IS NOT NULL THEN
        RAISE NOTICE '✅ check_coupon_type_limit() 测试通过';
        RAISE NOTICE '  - 当前券种数: %', coupon_limit.current_count;
        RAISE NOTICE '  - 券种上限: %', coupon_limit.limit_count;
        RAISE NOTICE '  - 可创建: %', coupon_limit.can_create;
      END IF;
    END;

    -- 测试 check_balance_unlock
    DECLARE
      balance_unlocked BOOLEAN;
    BEGIN
      SELECT check_balance_unlock(test_merchant_id) INTO balance_unlocked;

      RAISE NOTICE '✅ check_balance_unlock() 测试通过';
      RAISE NOTICE '  - 余额已解锁 (≥ ฿200): %', balance_unlocked;
    END;
  END IF;
END $$;

-- =====================================================
-- 测试总结
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '测试完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '如果所有测试都显示 ✅，则迁移成功！';
  RAISE NOTICE '';
  RAISE NOTICE '下一步：';
  RAISE NOTICE '1. 查看 SUBSCRIPTION_MIGRATION_GUIDE.md';
  RAISE NOTICE '2. 为现有商户创建试用期订阅';
  RAISE NOTICE '3. 开始开发 Server Actions';
  RAISE NOTICE '';
END $$;
