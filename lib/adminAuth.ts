// lib/adminAuth.ts
import { createSupabaseServerClient } from "./supabaseServer";

/**
 * 验证用户是否为管理员
 * @returns 包含验证结果、Supabase 客户端和错误信息的对象
 */
export async function verifyAdminAuth() {
  const supabase = await createSupabaseServerClient();

  // 获取当前用户
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      isAdmin: false,
      error: 'Unauthorized',
      supabase: null,
      user: null
    };
  }

  // 查询用户角色
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    return {
      isAdmin: false,
      error: 'Forbidden',
      supabase,
      user
    };
  }

  return {
    isAdmin: true,
    error: null,
    supabase,
    user
  };
}
