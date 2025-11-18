// 文件: /app/login/page.tsx
"use client"; 

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient"; 
// 假设您已经添加了图标，例如 react-icons
import { FaGoogle } from "react-icons/fa";
import { Provider } from '@supabase/supabase-js'; // 导入 Provider 类型

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 状态
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ----- 新：社交账号登录处理 -----
  const handleOAuthLogin = async (provider: Provider) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        // 确保回调 URL 在您的 Supabase 仪表板中已列入白名单
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // 用户将被重定向，因此无需停止加载
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
      // 登录成功，跳转到控制台
      router.push(`/merchant/dashboard`);
    }
    setLoading(false);
  };

  // ----- 邮箱/密码注册 -----
  const handleEmailSignUp = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: rpcError } = await supabase.rpc('set_role_to_merchant', { 
            user_uuid: data.user.id 
        });

        if (rpcError) {
             console.error("RPC 角色升级失败:", rpcError);
             setError("注册成功，但角色升级失败。请联系管理员。");
             setLoading(false);
             return;
      }
    }

    // 【关键修改】
    // 注册并设置角色后，直接重定向到控制台
    // dashboard 页面已包含 OnboardingForm 逻辑
    router.push(`/merchant/dashboard`); 
    setLoading(false);
  };

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content w-full max-w-md">
        <div className="card w-full shadow-2xl bg-base-100">
          <div className="card-body">
            
            <h1 className="card-title text-2xl text-center">商家控制台登录</h1>
            
            {/* ----- 新：社交登录按钮 ----- */}
            <div className="space-y-2 my-4">
              <button 
                className="btn btn-outline w-full" 
                onClick={() => handleOAuthLogin('google')}
                disabled={loading}
              >
                <FaGoogle />
                使用 Google 登录
              </button>

              {/* 您可以按需添加 Facebook 等 */}
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
                {loading && <span className="loading loading-spinner"></span>}
                登录
              </button>
              <button 
                className="btn btn-outline" 
                onClick={handleEmailSignUp} 
                disabled={loading}
              >
                {loading && <span className="loading loading-spinner"></span>}
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