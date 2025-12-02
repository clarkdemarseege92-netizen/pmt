-- 数据库检查：确保 contact_phone 字段存在
-- 目的：确保 merchants 表有 contact_phone 字段
-- 日期：2025-12-02
-- 注：shop_phone 字段已被删除，无需迁移

-- 创建 contact_phone 字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'merchants'
        AND column_name = 'contact_phone'
    ) THEN
        ALTER TABLE public.merchants
        ADD COLUMN contact_phone TEXT;

        RAISE NOTICE '✅ contact_phone 字段已创建';
    ELSE
        RAISE NOTICE '✅ contact_phone 字段已存在，无需创建';
    END IF;
END $$;

-- 添加字段注释
COMMENT ON COLUMN public.merchants.contact_phone IS '商户对外客服电话/联系电话';

-- 验证字段状态
DO $$
DECLARE
    has_contact_phone BOOLEAN;
    merchant_count INTEGER;
    filled_count INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'merchants'
        AND column_name = 'contact_phone'
    ) INTO has_contact_phone;

    SELECT COUNT(*) INTO merchant_count FROM public.merchants;
    SELECT COUNT(*) INTO filled_count
    FROM public.merchants
    WHERE contact_phone IS NOT NULL AND contact_phone != '';

    RAISE NOTICE '=== 字段状态检查 ===';
    RAISE NOTICE 'contact_phone 字段存在: %', has_contact_phone;
    RAISE NOTICE '商户总数: %', merchant_count;
    RAISE NOTICE '已填写电话的商户: %', filled_count;
END $$;
