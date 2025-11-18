// 文件: /app/merchant/layout.tsx (极简服务器守卫)

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import Link from "next/link";


export default async function MerchantLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const supabase = await createSupabaseServerClient(); 

  // --- 极简守卫 ---

  // 1. 检查会话
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // 2. 检查角色 (这是我们 RPC 设置的)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== 'merchant') {
    // 如果他们不是商家 (例如，是 'customer')，踢回首页
    redirect("/");
  }



  return (
    <div className="drawer lg:drawer-open">
      <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex flex-col items-center p-4 lg:p-8">
        <label 
          htmlFor="my-drawer-2" 
          className="btn btn-primary drawer-button lg:hidden mb-4"
        >
          打开菜单
        </label>
        {children} {/* children 将是 dashboard 页面 */}
      </div> 

      <div className="drawer-side">
        <label htmlFor="my-drawer-2" aria-label="close sidebar" className="drawer-overlay"></label> 
        <ul className="menu p-4 w-80 min-h-full bg-base-200 text-base-content">
          <li className="menu-title"><span>商家控制台</span></li>
          <li><Link href="/merchant/dashboard">仪表板</Link></li>
          <li><Link href="/merchant/products">商品目录</Link></li>
          <li><Link href="/merchant/coupons">优惠券管理</Link></li>
          <li><Link href="/merchant/reviews">评价管理</Link></li>
          <div className="divider"></div> 
          <li><Link href="/">返回主站</Link></li>
        </ul>
      </div>
    </div>
  );
}