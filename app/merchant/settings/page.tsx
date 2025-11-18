// 文件: /app/merchant/settings/page.tsx (新文件)
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; //
import { User } from '@supabase/supabase-js';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  
  // 手机验证状态
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpView, setOtpView] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user?.phone) {
        setPhone(user.phone);
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const handleSendOtp = async () => {
    setLoading(true);
    setMessage(null);
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = `+66${formattedPhone.substring(1)}`;
    }

    // 将手机号更新到用户元数据，并发送 OTP
    const { error: updateError } = await supabase.auth.updateUser({ 
      phone: formattedPhone 
    });

    if (updateError) {
       setMessage({ type: 'error', text: `更新手机号失败: ${updateError.message}` });
       setLoading(false);
       return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      setMessage({ type: 'error', text: `OTP 发送失败: ${error.message}` });
    } else {
      setOtpView(true);
      setMessage({ type: 'success', text: '验证码已发送！' });
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setMessage(null);
    
    const { error } = await supabase.auth.verifyOtp({
      phone: phone, // 此时 phone 应该已包含 +66
      token: otp,
      type: "sms",
    });

    if (error) {
      setMessage({ type: 'error', text: `验证失败: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: '手机号验证成功！' });
      setOtpView(false);
      // 刷新用户信息
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    setLoading(false);
  };
  
  if (loading) {
    return <span className="loading loading-spinner loading-lg"></span>;
  }

  if (!user) {
    return <p>无法加载用户信息。</p>;
  }

  return (
    <div className="w-full max-w-3xl p-8 space-y-6 bg-base-100 rounded-lg shadow-xl">
      <h1 className="text-3xl font-bold">账户设置</h1>

      {/* --- 邮箱信息 --- */}
      <div className="form-control">
        <label className="label"><span className="label-text">注册邮箱</span></label>
        <input
          type="email"
          className="input input-bordered"
          value={user.email || ''}
          disabled
        />
        {user.email_confirmed_at ? (
            <span className="text-success text-sm mt-1">已验证</span>
        ) : (
            <span className="text-warning text-sm mt-1">待验证（请检查您的收件箱）</span>
        )}
      </div>

      <div className="divider">手机号验证</div>
      
      {/* --- 手机号验证 --- */}
      {!otpView ? (
        <>
          <div className="form-control">
            <label className="label"><span className="label-text">手机号（用于账户恢复）</span></label>
            <input
              type="tel"
              placeholder="099 072 5889"
              className="input input-bordered"
              value={phone.replace('+66', '0')} // 友好显示
              onChange={(e) => setPhone(e.target.value)}
            />
             {user.phone_confirmed_at && (
                <span className="text-success text-sm mt-1">已验证: {user.phone}</span>
             )}
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleSendOtp} 
            disabled={loading}
          >
            {loading && <span className="loading loading-spinner"></span>}
            {user.phone_confirmed_at ? '更新并重新验证手机号' : '发送验证码'}
          </button>
        </>
      ) : (
        <>
          <p>已发送验证码至 {phone}</p>
          <div className="form-control">
            <label className="label"><span className="label-text">6位验证码</span></label>
            <input
              type="text"
              placeholder="123456"
              className="input input-bordered"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
             <button 
                className="btn btn-primary" 
                onClick={handleVerifyOtp} 
                disabled={loading}
              >
                {loading && <span className="loading loading-spinner"></span>}
                确认验证
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={() => { setOtpView(false); setMessage(null); }}
              >
                返回
              </button>
          </div>
        </>
      )}

      {message && (
        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
}