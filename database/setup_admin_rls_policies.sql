-- 文件: /database/setup_admin_rls_policies.sql
-- 设置管理员对 profiles 表的完整访问权限

-- 1. 首先检查并启用 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. 删除可能冲突的旧策略（如果存在）
DROP POLICY IF EXISTS "管理员可以查看所有用户" ON public.profiles;
DROP POLICY IF EXISTS "管理员可以更新所有用户" ON public.profiles;
DROP POLICY IF EXISTS "管理员可以删除所有用户" ON public.profiles;
DROP POLICY IF EXISTS "用户可以查看自己的 profile" ON public.profiles;
DROP POLICY IF EXISTS "用户可以更新自己的 profile" ON public.profiles;

-- 3. 创建管理员访问策略
-- 管理员可以查看所有用户
CREATE POLICY "管理员可以查看所有用户"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 管理员可以更新所有用户
CREATE POLICY "管理员可以更新所有用户"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 管理员可以删除所有用户
CREATE POLICY "管理员可以删除所有用户"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 4. 创建普通用户访问策略
-- 用户可以查看自己的 profile
CREATE POLICY "用户可以查看自己的 profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 用户可以更新自己的 profile
CREATE POLICY "用户可以更新自己的 profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. 允许插入新用户 profile（用于注册）
DROP POLICY IF EXISTS "允许插入新用户 profile" ON public.profiles;

CREATE POLICY "允许插入新用户 profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 6. 验证策略
DO $$
BEGIN
  RAISE NOTICE '===== RLS 策略设置完成 =====';
  RAISE NOTICE '管理员权限：查看、更新、删除所有用户';
  RAISE NOTICE '普通用户权限：查看和更新自己的 profile';
  RAISE NOTICE '请确保当前登录用户的 role 为 admin';
END $$;

-- 7. 显示当前所有策略
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
WHERE tablename = 'profiles'
ORDER BY policyname;
