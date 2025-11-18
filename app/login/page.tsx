// 文件: /app/login/page.tsx
"use client"; 

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient"; 

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // ----- 状态管理 -----
  // 'phone' 或 'email' (daisyUI 选项卡)
  const [authMethod, setAuthMethod] = useState<"phone" | "email">("phone");
  
  // 手机 OTP 状态
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpView, setOtpView] = useState(false); // 是否显示 OTP 输入框

  // 邮箱/密码状态
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ----- 手机 OTP 处理函数 -----
  const handleSendOtp = async () => {
    setLoading(true);
    setError(null);
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = `+66${formattedPhone.substring(1)}`;
    }
    
    console.log("正在尝试发送 OTP 到:", formattedPhone);
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      setError(error.message);
      console.error("OTP 发送失败:", error);
    } else {
      setOtpView(true); // 切换到 OTP 输入视图
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError(null);
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = `+66${formattedPhone.substring(1)}`;
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otp,
      type: "sms",
    });

    if (verifyError) {
      setError(verifyError.message);
    } else {
      // 登录成功! 
      router.push(`/merchant/dashboard`);
    }
    setLoading(false);
  };

  // ----- 邮箱/密码处理函数 (新!) -----
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
    router.push(`/merchant/dashboard`);
    }
    setLoading(false);
  };



  // 注册函数 (仅限开发模式!)
  const handleEmailSignUp = async () => {
    setLoading(true);
    setError(null);

    // 1. 尝试注册用户 (这在 auth.users 中创建记录)
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // --- 【关键步骤】调用 RPC 升级角色 ---
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
    // ----------------------------------------

    // 2. 升级成功后，重定向到入驻表单
    router.push(`/merchant/register`); 
    setLoading(false);
  };
  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content w-full max-w-md">
        <div className="card w-full shadow-2xl bg-base-100">
          <div className="card-body">
            
            {/* ----- daisyUI 选项卡 ----- */}
            <div role="tablist" className="tabs tabs-lifted">
              <a 
                role="tab" 
                className={`tab ${authMethod === 'phone' ? 'tab-active' : ''}`}
                onClick={() => { setAuthMethod('phone'); setError(null); }}
              >
                手机号登录
              </a>
              <a 
                role="tab" 
                className={`tab ${authMethod === 'email' ? 'tab-active' : ''}`}
                onClick={() => { setAuthMethod('email'); setError(null); }}
              >
                邮箱/密码 (开发)
              </a>
            </div>

            {/* ----- 选项卡内容 ----- */}
            {authMethod === 'phone' ? (
              // ----- 手机号登录面板 -----
              <div className="p-4">
                {!otpView ? (
                  // ----- 手机号输入视图 -----
                  <>
                    <h1 className="card-title text-2xl">OTP 登录</h1>
                    <div className="form-control">
                      <label className="label"><span className="label-text">手机号</span></label>
                      <input
                        type="tel"
                        placeholder="099 072 5889"
                        className="input input-bordered input-primary"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div className="form-control mt-6">
                      <button 
                        className="btn btn-primary" 
                        onClick={handleSendOtp} 
                        disabled={loading}
                      >
                        {loading && <span className="loading loading-spinner"></span>}
                        发送验证码
                      </button>
                    </div>
                  </>
                ) : (
                  // ----- OTP 输入视图 -----
                  <>
                    <h1 className="card-title text-2xl">输入验证码</h1>
                    <p className="mb-4 text-sm">已发送验证码至 {phone}</p>
                    <div className="form-control">
                      <label className="label"><span className="label-text">6位验证码</span></label>
                      <input
                        type="text"
                        placeholder="123456"
                        className="input input-bordered input-primary"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                      />
                    </div>
                    <div className="form-control mt-6">
                      <button 
                        className="btn btn-primary" 
                        onClick={handleVerifyOtp} 
                        disabled={loading}
                      >
                        {loading && <span className="loading loading-spinner"></span>}
                        验证并登录
                      </button>
                    </div>
                    <button 
                      className="btn btn-link btn-sm mt-2" 
                      onClick={() => setOtpView(false)}
                    >
                      返回并更改手机号
                    </button>
                  </>
                )}
              </div>
            ) : (
              // ----- 邮箱/密码登录面板 (新!) -----
              <div className="p-4">
                <h1 className="card-title text-2xl">开发者登录</h1>
                
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
              </div>
            )}

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