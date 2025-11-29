// 文件: /components/Navbar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { User } from "@supabase/supabase-js";
import { 
  HiUser, 
  HiArrowRightOnRectangle, 
  HiTicket, 
  HiSquares2X2, 
  HiUserCircle
  // HiHeart 已移除，因为目前收藏功能代码被注释了
} from "react-icons/hi2";
import { useRouter } from "next/navigation";

// 定义 Supabase 客户端创建逻辑
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createBrowserClient(supabaseUrl, supabaseKey);

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // 忽略此行警告，这是处理 Hydration 的标准模式
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

  if (!mounted) return <div className="navbar bg-base-100 border-b border-base-200"></div>;

  return (
    <div className="navbar bg-base-100 border-b border-base-200 z-50">
      
      {/* 左侧：Logo */}
      <div className="flex-1">
        <Link href="/" className="btn btn-ghost text-xl font-bold text-primary">
          PMT
        </Link>
      </div>

      {/* 右侧：用户区域 */}
      <div className="flex-none">
        {user ? (
          <div className="dropdown dropdown-end">
            {/* 头像触发器 */}
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                <div className="w-full h-full flex items-center justify-center bg-neutral text-neutral-content">
                   <HiUser className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* 下拉菜单 */}
            <ul 
              tabIndex={0} 
              className="menu menu-sm dropdown-content mt-3 z-1 p-2 shadow-lg bg-base-100 rounded-box w-64 border border-base-200"
            >
              {/* 用户信息头 */}
              <li className="menu-title px-4 py-2 border-b border-base-200 mb-2">
                 <span className="block truncate font-bold text-base-content">{user.email || user.phone || '用户'}</span>
                 <span className="block text-xs font-normal opacity-50">普通用户</span>
              </li>

              {/* === 买家功能区 === */}
              <li>
                <Link href="/client/profile" className="py-3">
                  <HiUserCircle className="w-5 h-5" /> 个人中心 / 资料
                </Link>
              </li>
              <li>
                <Link href="/client/orders" className="py-3">
                  <HiTicket className="w-5 h-5" /> 我的订单
                </Link>
              </li>

              <div className="divider my-1"></div> 

              {/* === 卖家/商家区 === */}
              <li>
                <Link href="/merchant/dashboard" className="py-3 text-secondary">
                   <HiSquares2X2 className="w-5 h-5" /> 商家中心 / 我要开店
                </Link>
              </li>

              <div className="divider my-1"></div> 

              {/* === 退出 === */}
              <li>
                <button onClick={handleLogout} className="text-error py-3">
                  <HiArrowRightOnRectangle className="w-5 h-5" /> 退出登录
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <Link href="/login" className="btn btn-primary btn-sm">
            登录 / 注册
          </Link>
        )}
      </div>
    </div>
  );
}