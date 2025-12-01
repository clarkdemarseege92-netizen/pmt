// app/admin/categories/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import CategoryManagement from "./CategoryManagement";

export default async function AdminCategoriesPage() {
  const supabase = await createSupabaseServerClient();

  // 1. 验证用户登录
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // 2. 验证是否为管理员（检查 profiles 表中的 role 字段）
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // 如果不是管理员，重定向到首页
  if (profile?.role !== 'admin') {
    redirect("/");
  }

  // 3. 获取所有分类数据
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('parent_id', { ascending: true, nullsFirst: true })
    .order('category_id', { ascending: true });

  return <CategoryManagement initialCategories={categories || []} />;
}
