// 文件: /app/client/layout.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import ClientSidebar from "@/components/ClientSidebar";
import Link from "next/link";
import { HiHome, HiTicket, HiUser } from "react-icons/hi2";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col h-screen bg-base-200">
      <div className="flex flex-1 overflow-hidden">
        {/* 桌面端：侧边栏 */}
        <ClientSidebar />

        {/* 主内容区域 */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 pb-24 md:pb-8 relative">
           {children}
        </main>
      </div>

      {/* 移动端：底部导航栏 
         【修复点】：添加了 `flex flex-row` 强制横向排列
         同时将 z-30 提升为 z-50，确保在最上层
      */}
      <div className="md:hidden btm-nav btm-nav-sm border-t border-base-200 bg-base-100 z-50 flex flex-row justify-evenly p-2">
        <Link href="/" className="text-base-content/60 active:text-primary active:bg-base-200">
          <HiHome className="w-5 h-5" />
          <span className="btm-nav-label text-xs">首页</span>
        </Link>
        <Link href="/client/orders" className="text-base-content/60 active:text-primary active:bg-base-200">
          <HiTicket className="w-5 h-5" />
          <span className="btm-nav-label text-xs">订单</span>
        </Link>
        <Link href="/client/profile" className="text-base-content/60 active:text-primary active:bg-base-200">
          <HiUser className="w-5 h-5" />
          <span className="btm-nav-label text-xs">我的</span>
        </Link>
      </div>
    </div>
  );
}