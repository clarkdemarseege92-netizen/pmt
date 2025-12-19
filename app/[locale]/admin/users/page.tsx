// 文件: app/[locale]/admin/users/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import UserManagement from "./UserManagement";

export default async function UsersPage() {
  const supabase = await createSupabaseServerClient();

  // 验证当前用户
  const { data: { user } } = await supabase.auth.getUser();
  console.log("ADMIN USERS PAGE: 当前用户ID:", user?.id);

  if (user) {
    // 检查当前用户的角色
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log("ADMIN USERS PAGE: 当前用户角色:", currentProfile?.role);
  }

  // 获取所有用户
  const { data: users, error, count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  console.log("ADMIN USERS PAGE: 查询结果:", {
    usersCount: users?.length,
    totalCount: count,
    error: error?.message,
    hasUsers: !!users
  });

  if (error) {
    console.error("ADMIN USERS PAGE: 查询错误详情:", error);
  }

  return <UserManagement initialUsers={users || []} />;
}
