import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import FavoritesClient from "./FavoritesClient";

export default async function FavoritesPage() {
  const supabase = await createSupabaseServerClient();
  
  // 1. 获取当前用户
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // 2. 获取收藏数据
  // 注意：这里假设 'favorites' 是一个包含了 product/coupon/merchant 关联数据的视图
  // 如果是原始表，您可能需要修改查询为: .select('*, product:products(*), coupon:coupons(*), merchant:merchants(*)')
  // 基于您之前的代码，我们保持 select('*')，假设数据源已经处理好了关联
  const { data: favorites, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching favorites:", error);
    return <div className="p-4 text-error">无法加载收藏数据，请稍后重试。</div>;
  }

  // 3. 渲染客户端组件
  return <FavoritesClient initialFavorites={favorites || []} />;
}