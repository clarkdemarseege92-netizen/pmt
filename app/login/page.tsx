// 文件: /app/login/page.tsx
"use client"; 

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient"; 
import { Provider } from '@supabase/supabase-js'; 

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 状态
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ----- 社交账号登录处理 -----
  const handleOAuthLogin = async (provider: Provider) => {
    setLoading(true);
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback`;
    
    console.log("LOGIN PAGE: 正在启动 OAuth 登录, Provider:", provider, "RedirectTo:", redirectTo);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: redirectTo,
      },
    });

    if (error) {
      console.error("LOGIN PAGE: OAuth 启动失败:", error);
      setError(error.message);
      setLoading(false);
    }
    console.log("LOGIN PAGE: 等待 OAuth 重定向...");
  };

  // ----- 邮箱/密码登录 -----
  const handleEmailLogin = async () => {
    console.log('🟢 LOGIN PAGE: 开始邮箱登录');
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    console.log('🟢 LOGIN PAGE: 登录结果:', {
      hasData: !!data,
      hasUser: !!data?.user,
      userId: data?.user?.id,
      hasSession: !!data?.session,
      sessionToken: data?.session?.access_token?.substring(0, 20),
      error: error?.message
    });

    if (error) {
      console.error('🔴 LOGIN PAGE: 登录失败:', error.message);
      setError(error.message);
      setLoading(false);
    } else {
      console.log('🟢 LOGIN PAGE: 登录成功，等待 500ms 确保 cookies 写入');

      // 等待一下确保 cookies 写入完成
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('🟢 LOGIN PAGE: 准备跳转到首页');
      // 【关键修复】使用 window.location.href 强制刷新，确保服务器端获取新的 cookies
      window.location.href = '/';
    }
  };

  // ----- 邮箱/密码注册 -----
  const handleEmailSignUp = async () => {
    console.log('🟢 LOGIN PAGE: 开始邮箱注册');
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    console.log('🟢 LOGIN PAGE: 注册结果:', {
      hasData: !!data,
      hasUser: !!data?.user,
      userId: data?.user?.id,
      hasSession: !!data?.session,
      error: error?.message
    });

    if (error) {
      console.error('🔴 LOGIN PAGE: 注册失败:', error.message);
      setError(error.message);
      setLoading(false);
      return;
    }

    console.log('🟢 LOGIN PAGE: 注册成功，准备跳转到首页');
    // 【关键修复】使用 window.location.href 强制刷新，确保服务器端获取新的 cookies
    window.location.href = '/';
  };

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content w-full max-w-md">
        <div className="card w-full shadow-2xl bg-base-100">
          <div className="card-body">
            
            <h1 className="card-title text-2xl text-center">欢迎来到 PMT</h1>
            
            {/* ----- 社交登录按钮 ----- */}
            <div className="space-y-2 my-4">
              <button 
                className="btn btn-outline w-full" 
                onClick={() => handleOAuthLogin('google')}
                disabled={loading}
              >
                使用 Google 登录
              </button>
            </div>

            <div className="divider">或使用邮箱</div>

            {/* ----- 邮箱/密码 ----- */}
            <div className="form-control">
              <label className="label"><span className="label-text">邮箱</span></label>
              <input
                type="email"
                placeholder="test@example.com"
                className="input input-bordered"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="form-control mt-4">
              <label className="label"><span className="label-text">密码</span></label>
              <input
                type="password"
                placeholder="••••••••"
                className="input input-bordered"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <div className="form-control mt-6 grid grid-cols-2 gap-4">
              <button 
                className="btn btn-primary" 
                onClick={handleEmailLogin} 
                disabled={loading}
              >
                登录
              </button>
              <button 
                className="btn btn-outline" 
                onClick={handleEmailSignUp} 
                disabled={loading}
              >
                注册
              </button>
            </div>

            {/* 统一的错误显示 */}
            {error && (
              <div className="alert alert-error mt-4">
                <span>{error}</span>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}