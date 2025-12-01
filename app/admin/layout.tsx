// app/admin/layout.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import Link from "next/link";
import { HiHome, HiFolder, HiUsers, HiCog, HiArrowRightOnRectangle } from "react-icons/hi2";
import AdminLogoutButton from "./AdminLogoutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  // 验证用户登录
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/admin-login");
  }

  // 验证是否为管理员
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* 顶部导航栏 */}
      <div className="navbar bg-base-100 shadow-lg">
        <div className="flex-1">
          <Link href="/admin" className="btn btn-ghost text-xl">
            🛡️ 管理员后台
          </Link>
        </div>
        <div className="flex-none gap-2">
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-ghost btn-sm gap-2">
              <div className="avatar placeholder">
                <div className="bg-neutral text-neutral-content rounded-full w-8">
                  <span className="text-xs">{user.email?.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              <span className="hidden md:inline">{user.email}</span>
            </label>
            <ul tabIndex={0} className="dropdown-content z-10 menu p-2 shadow bg-base-100 rounded-box w-52 mt-2">
              <li>
                <Link href="/">
                  <HiHome className="w-4 h-4" />
                  返回前台
                </Link>
              </li>
              <li>
                <AdminLogoutButton />
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* 侧边栏 */}
        <div className="w-64 bg-base-100 min-h-screen shadow-lg">
          <ul className="menu p-4 space-y-2">
            <li>
              <Link href="/admin" className="gap-3">
                <HiHome className="w-5 h-5" />
                仪表板
              </Link>
            </li>
            <li>
              <Link href="/admin/categories" className="gap-3">
                <HiFolder className="w-5 h-5" />
                行业分类管理
              </Link>
            </li>
            <li>
              <Link href="/admin/users" className="gap-3">
                <HiUsers className="w-5 h-5" />
                用户管理
              </Link>
            </li>
            <li>
              <Link href="/admin/settings" className="gap-3">
                <HiCog className="w-5 h-5" />
                系统设置
              </Link>
            </li>
          </ul>
        </div>

        {/* 主内容区 */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
