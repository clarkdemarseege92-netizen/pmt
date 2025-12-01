-- 文件: /database/add_user_management_fields.sql
-- 为用户管理添加必要的字段

-- 1. 添加 is_active 字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN is_active boolean DEFAULT true;

        -- 更新现有记录为激活状态
        UPDATE public.profiles SET is_active = true WHERE is_active IS NULL;

        RAISE NOTICE 'Added is_active column to profiles table';
    ELSE
        RAISE NOTICE 'is_active column already exists';
    END IF;
END $$;

-- 2. 确保 role 字段存在并有默认值
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN role text DEFAULT 'user';

        -- 更新现有记录为普通用户
        UPDATE public.profiles SET role = 'user' WHERE role IS NULL;

        RAISE NOTICE 'Added role column to profiles table';
    ELSE
        RAISE NOTICE 'role column already exists';
    END IF;
END $$;

-- 3. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 4. 添加约束确保 role 只能是指定的值
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_role_check'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_role_check
        CHECK (role IN ('user', 'merchant', 'admin'));

        RAISE NOTICE 'Added role check constraint';
    ELSE
        RAISE NOTICE 'role check constraint already exists';
    END IF;
END $$;

RAISE NOTICE 'User management fields setup completed!';
