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
    setMounted(true);

    // 防止重复获取 profile
    let currentFetchingUserId: string | null = null;

    // 定义 profile 获取函数（复用逻辑）
    const fetchProfile = async (userId: string) => {
      // 如果正在获取相同用户的 profile，跳过
      if (currentFetchingUserId === userId) {
        console.log('🟡 NAVBAR: 跳过重复的 profile 查询，userId=', userId);
        return;
      }

      currentFetchingUserId = userId;
      console.log('🔵 NAVBAR: 开始获取 profile，user.id=', userId);
      try {
        const profileStartTime = Date.now();

        // 添加超时保护，并保存定时器 ID 以便清理
        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            console.error('🔴 NAVBAR: Profile 查询超时！');
            reject(new Error('Profile query timeout'));
          }, 5000); // 增加到 5 秒，给网络更多时间
        });

        const queryPromise = supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', userId)
          .maybeSingle();

        const result = await Promise.race([queryPromise, timeoutPromise]);

        // 查询完成，清除超时定时器
        clearTimeout(timeoutId!);

        const { data: profileData, error } = result;

        const profileEndTime = Date.now();
        console.log(`🔵 NAVBAR: profile 查询完成，耗时 ${profileEndTime - profileStartTime}ms`);

        if (error) {
          console.error('🔴 NAVBAR: Error fetching profile:', error.message);
          setProfile(null);
        } else if (profileData) {
          console.log('🟢 NAVBAR: Profile 设置成功，avatar_url=', profileData.avatar_url);
          setProfile(profileData);
        } else {
          console.log('🟡 NAVBAR: Profile 不存在，使用默认头像');
          setProfile(null);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('🔴 NAVBAR: Profile 查询异常:', errorMessage);
        setProfile(null);
      } finally {
        // 查询完成后重置标志
        currentFetchingUserId = null;
      }
    };

    // 【关键修复】立即检查当前 session
    console.log('🔵 NAVBAR: 立即检查当前 auth 状态...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔵 NAVBAR: 初始 session 检查:', {
        hasSession: !!session,
        userId: session?.user?.id
      });

      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    }).catch(err => {
      console.error('🔴 NAVBAR: getSession 失败:', err);
      // 即使失败也继续，依赖监听器
    });

    // 设置 auth 状态监听器（监听后续变化）
    console.log('🔵 NAVBAR: 设置 auth 状态监听器');
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔵 NAVBAR: Auth 状态变化:', {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
        timestamp: new Date().toISOString()
      });

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        console.log('🟡 NAVBAR: 用户未登录');
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
    console.log('🔵 NAVBAR: 开始退出登录');
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
