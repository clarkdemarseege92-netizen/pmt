-- 文件: /database/fix_admin_rls_recursion.sql
-- 修复 RLS 策略的无限递归问题

-- 1. 删除所有现有策略
DROP POLICY IF EXISTS "管理员可以查看所有用户" ON public.profiles;
DROP POLICY IF EXISTS "管理员可以更新所有用户" ON public.profiles;
DROP POLICY IF EXISTS "管理员可以删除所有用户" ON public.profiles;
DROP POLICY IF EXISTS "用户可以查看自己的 profile" ON public.profiles;
DROP POLICY IF EXISTS "用户可以更新自己的 profile" ON public.profiles;
DROP POLICY IF EXISTS "允许插入新用户 profile" ON public.profiles;

-- 2. 创建一个辅助函数来检查管理员身份（避免递归）
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- 3. 创建新的 RLS 策略（使用辅助函数避免递归）

-- SELECT 策略：管理员可以查看所有用户，普通用户只能看自己
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id  -- 用户可以看自己
  OR
  public.is_admin()  -- 或者是管理员可以看所有人
);

-- INSERT 策略：允许创建自己的 profile
CREATE POLICY "profiles_insert_policy"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- UPDATE 策略：管理员可以更新所有用户，普通用户只能更新自己
CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id  -- 用户可以更新自己
  OR
  public.is_admin()  -- 或者是管理员可以更新所有人
)
WITH CHECK (
  auth.uid() = id  -- 用户可以更新自己
  OR
  public.is_admin()  -- 或者是管理员可以更新所有人
);

-- DELETE 策略：只有管理员可以删除
CREATE POLICY "profiles_delete_policy"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.is_admin());

-- 4. 验证设置
DO $$
BEGIN
  RAISE NOTICE '===== RLS 策略修复完成 =====';
  RAISE NOTICE '使用 is_admin() 函数避免递归';
  RAISE NOTICE '管理员可以查看、更新、删除所有用户';
  RAISE NOTICE '普通用户只能查看和更新自己的 profile';
END $$;

-- 5. 显示当前策略
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
