// app/(admin-auth)/admin-login/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import AdminLoginForm from "./AdminLoginForm";
import { routing } from "@/i18n/routing";

export default async function AdminLoginPage() {
  const supabase = await createSupabaseServerClient();

  // 检查用户是否已登录
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // 检查是否为管理员
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // 获取默认语言
    const defaultLocale = routing.defaultLocale;

    // 如果已经是管理员，直接跳转到管理后台
    if (profile?.role === 'admin') {
      redirect(`/${defaultLocale}/admin`);
    } else {
      // 如果不是管理员，跳转到首页
      redirect(`/${defaultLocale}`);
    }
  }

  return <AdminLoginForm />;
}
