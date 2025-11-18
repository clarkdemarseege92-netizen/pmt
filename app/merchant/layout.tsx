// 文件: /app/merchant/layout.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import MerchantLayoutWrapper from "@/components/MerchantLayoutWrapper"; // 引入包装器

export default async function MerchantLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const supabase = await createSupabaseServerClient(); 

  // 1. 检查会话 (这依然是必须的，未登录不能进 merchant 目录)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // 2. 获取角色
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // 判断是否为商家
  const isMerchant = profile?.role === 'merchant';

  // 3. 将判断结果交给客户端包装器处理
  return (
    <MerchantLayoutWrapper isMerchant={isMerchant}>
      {children}
    </MerchantLayoutWrapper>
  );
}