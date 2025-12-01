// 文件: /components/Navbar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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

// 定义 Profile 类型
type Profile = {
  avatar_url?: string;
};

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    console.log('🔵 NAVBAR: useEffect 开始执行');

    // 忽略此行警告，这是处理 Hydration 的标准模式
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    const fetchUser = async () => {
      console.log('🔵 NAVBAR: fetchUser 开始', new Date().toISOString());
      try {
        console.log('🔵 NAVBAR: 检查 cookies...');
        const authCookies = document.cookie.split(';')
          .filter(c => c.trim().startsWith('sb-'));
        console.log('🔵 NAVBAR: Auth cookies 数量:', authCookies.length);

        console.log('🔵 NAVBAR: 调用 getUser...');
        const startTime = Date.now();

        // 添加超时保护
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('getUser timeout after 10s')), 10000)
        );

        const getUserPromise = supabase.auth.getUser();

        const result = await Promise.race([getUserPromise, timeoutPromise]);
        const { data: { user }, error: getUserError } = result;

        const endTime = Date.now();
        console.log(`🔵 NAVBAR: getUser 完成，耗时 ${endTime - startTime}ms`);

        console.log('🔵 NAVBAR: getUser 结果:', {
          hasUser: !!user,
          userId: user?.id,
          error: getUserError?.message
        });

        setUser(user);

        // 如果用户已登录，获取 profile 信息
        if (user) {
          console.log('🔵 NAVBAR: 用户已登录，开始获取 profile');
          // 使用 try-catch 确保 profile 查询失败不会影响认证流程
          try {
            const { data: profileData, error } = await supabase
              .from('profiles')
              .select('avatar_url')
              .eq('id', user.id)
              .maybeSingle(); // 使用 maybeSingle 替代 single，避免抛出异常

            console.log('🔵 NAVBAR: profile 查询结果:', {
              hasProfile: !!profileData,
              avatarUrl: profileData?.avatar_url,
              error: error?.message
            });

            if (error) {
              console.error('🔴 NAVBAR: Error fetching profile:', error.message);
              setProfile(null);
            } else if (profileData) {
              console.log('🟢 NAVBAR: Profile 设置成功');
              setProfile(profileData);
            } else {
              console.log('🟡 NAVBAR: Profile 不存在，使用默认头像');
              setProfile(null);
            }
          } catch (err) {
            console.error('🔴 NAVBAR: Unexpected error fetching profile:', err);
            setProfile(null);
          }
        } else {
          console.log('🟡 NAVBAR: 用户未登录');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('🔴 NAVBAR: fetchUser 发生异常:', errorMessage);
        setUser(null);
        setProfile(null);
      }
    };
    fetchUser();

    console.log('🔵 NAVBAR: 设置 auth 状态监听器');
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔵 NAVBAR: Auth 状态变化:', {
        event,
        hasSession: !!session,
        userId: session?.user?.id
      });

      setUser(session?.user ?? null);

      // 当用户状态变化时，更新 profile
      if (session?.user) {
        console.log('🔵 NAVBAR: Auth change - 用户已登录，获取 profile');
        // 使用 try-catch 确保 profile 查询失败不会影响认证流程
        try {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', session.user.id)
            .maybeSingle(); // 使用 maybeSingle 替代 single，避免抛出异常

          console.log('🔵 NAVBAR: Auth change - profile 查询结果:', {
            hasProfile: !!profileData,
            avatarUrl: profileData?.avatar_url,
            error: error?.message
          });

          if (error) {
            console.error('🔴 NAVBAR: Error fetching profile on auth change:', error.message);
            setProfile(null);
          } else if (profileData) {
            console.log('🟢 NAVBAR: Auth change - Profile 设置成功');
            setProfile(profileData);
          } else {
            console.log('🟡 NAVBAR: Auth change - Profile 不存在');
            setProfile(null);
          }
        } catch (err) {
          console.error('🔴 NAVBAR: Unexpected error fetching profile on auth change:', err);
          setProfile(null);
        }
      } else {
        console.log('🟡 NAVBAR: Auth change - 用户未登录');
        setProfile(null);
      }
    });

    console.log('🔵 NAVBAR: Auth 监听器设置完成');

    return () => {
      console.log('🔵 NAVBAR: 清理 auth 监听器');
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
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt="User Avatar"
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral text-neutral-content">
                    <HiUser className="w-6 h-6" />
                  </div>
                )}
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