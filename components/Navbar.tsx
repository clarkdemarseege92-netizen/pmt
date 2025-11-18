// 文件: /components/Navbar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { HiUser, HiArrowRightOnRectangle, HiTicket, HiSquares2X2 } from "react-icons/hi2";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // 处理 Hydration Mismatch
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  // 防止服务端渲染时的水合不匹配，返回一个占位的 navbar
  if (!mounted) return <div className="navbar bg-base-100 border-b border-base-200"></div>;

  return (
    // 使用 daisyUI 标准 navbar 类
    <div className="navbar bg-base-100 border-b border-base-200 z-50">
      
      {/* 左侧：navbar-start (Logo) */}
      <div className="flex-1">
        <Link href="/" className="btn btn-ghost text-xl font-bold">
          PMT
        </Link>
      </div>

      {/* 右侧：navbar-end (用户区域) */}
      <div className="flex-none">
        {user ? (
          <div className="dropdown dropdown-end">
            {/* 头像触发器 */}
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                {/* 这里您可以判断 user.user_metadata.avatar_url 是否存在，如果存在显示图片 */}
                <div className="w-full h-full flex items-center justify-center bg-neutral text-neutral-content">
                   <HiUser className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* 下拉菜单 */}
            <ul 
              tabIndex={0} 
              className="menu menu-sm dropdown-content mt-3 z-1 p-2 shadow bg-base-100 rounded-box w-52 border border-base-200"
            >
              <li className="menu-title px-4 py-2">
                 {user.email || '用户'}
              </li>
              <li>
                <Link href="/client/orders" className="justify-between">
                  <span className="flex items-center gap-2"><HiTicket className="w-4 h-4" /> 我的订单</span>
                  {/* 可以在这里加个 badge 显示待使用数量 */}
                  {/* <span className="badge">New</span> */}
                </Link>
              </li>
              <li>
                <Link href="/merchant/dashboard" className="flex items-center gap-2">
                   <HiSquares2X2 className="w-4 h-4" /> 商家中心
                </Link>
              </li>
              <div className="divider my-1"></div> 
              <li>
                <button onClick={handleLogout} className="text-error flex items-center gap-2">
                  <HiArrowRightOnRectangle className="w-4 h-4" /> 退出登录
                </button>
              </li>
            </ul>
          </div>
        ) : (
          // 未登录状态
          <Link href="/login" className="btn btn-primary btn-sm">
            登录 / 注册
          </Link>
        )}
      </div>
    </div>
  );
}