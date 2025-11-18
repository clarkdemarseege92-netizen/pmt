// 文件: /app/merchant/layout.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import MerchantSidebar from "@/components/MerchantSidebar"; // 引入新组件

export default async function MerchantLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const supabase = await createSupabaseServerClient(); 

  // --- 服务器端守卫逻辑 (保持不变) ---

  // 1. 检查会话
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // 2. 检查角色
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== 'merchant') {
    redirect("/");
  }
  // ----------------------------------

  return (
    // 使用 Flex 布局：左侧是侧边栏，右侧是主内容区
    <div className="flex h-screen bg-base-100 overflow-hidden">
      
      {/* 左侧：可收缩的侧边栏 (客户端组件) */}
      <MerchantSidebar />

      {/* 右侧：主要内容区域 (可滚动) */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-base-100 p-4 lg:p-8 relative">
         {/* 这里的 children 就是 dashboard, products 等页面 */}
         {children}
      </main>
      
    </div>
  );
}