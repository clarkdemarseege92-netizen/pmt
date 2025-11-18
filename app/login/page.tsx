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
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setError(error.message);
    } else {
      // 【修改 1】登录成功跳转到首页
      router.push(`/`); 
    }
    setLoading(false);
  };

  // ----- 邮箱/密码注册 -----
  const handleEmailSignUp = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // 【修改 2】移除自动升级 RPC 代码
    // 注册成功直接跳转首页
    router.push(`/`); 
    setLoading(false);
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