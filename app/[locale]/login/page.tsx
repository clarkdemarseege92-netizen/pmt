// 文件: /app/[locale]/login/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Provider } from '@supabase/supabase-js';
import { useTranslations } from 'next-intl';
import { HiGift } from 'react-icons/hi2';

// 推荐码 Cookie 名称和有效期
const REFERRAL_COOKIE_NAME = 'kummak_referral_code';
const REFERRAL_COOKIE_DAYS = 30;

// 设置推荐码 Cookie
const setReferralCookie = (code: string) => {
  const expires = new Date();
  expires.setDate(expires.getDate() + REFERRAL_COOKIE_DAYS);
  document.cookie = `${REFERRAL_COOKIE_NAME}=${code}; expires=${expires.toUTCString()}; path=/`;
};

// 获取推荐码 Cookie
const getReferralCode = (): string | null => {
  const match = document.cookie.match(new RegExp(`(^| )${REFERRAL_COOKIE_NAME}=([^;]+)`));
  return match ? match[2] : null;
};

// 登录表单组件（使用 useSearchParams）
function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('login');

  // 状态
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 检查并保存推荐码
  useEffect(() => {
    const refFromUrl = searchParams.get('ref');
    if (refFromUrl) {
      console.log('🎁 LOGIN: 检测到推荐码:', refFromUrl);
      setReferralCookie(refFromUrl);
      setReferralCode(refFromUrl);
    } else {
      // 检查是否已有推荐码 Cookie
      const existingRef = getReferralCode();
      if (existingRef) {
        console.log('🎁 LOGIN: 从 Cookie 读取推荐码:', existingRef);
        setReferralCode(existingRef);
      }
    }
  }, [searchParams]);

  // ----- 社交账号登录处理 -----
  const handleOAuthLogin = async (provider: Provider) => {
    setLoading(true);
    setError(null);

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const redirectTo = `${window.location.origin}/auth/callback`;

    console.log("🔵 LOGIN: OAuth 登录开始", {
      provider,
      redirectTo,
      isMobile,
      userAgent: navigator.userAgent.substring(0, 80),
      origin: window.location.origin
    });

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error("🔴 LOGIN: OAuth 启动失败", {
          message: error.message,
          status: error.status,
          name: error.name,
          isMobile
        });
        setError(`${t('loginFailed')}: ${error.message}`);
        setLoading(false);
        return;
      }

      console.log("🟢 LOGIN: OAuth 启动成功，等待 Google 重定向...", {
        hasData: !!data,
        url: data?.url
      });
    } catch (err) {
      console.error("🔴 LOGIN: OAuth 异常", err);
      const errorMessage = err instanceof Error ? err.message : t('unknownError');
      setError(`${t('loginError')}: ${errorMessage}`);
      setLoading(false);
    }
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
      // 使用 next-intl 的路由器跳转
      router.push('/');
      router.refresh();
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
    // 使用 next-intl 的路由器跳转
    router.push('/');
    router.refresh();
  };

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content w-full max-w-md">
        <div className="card w-full shadow-2xl bg-base-100">
          <div className="card-body">
            
            <h1 className="card-title text-2xl text-center">{t('title')}</h1>

            {/* ----- 推荐码提示 ----- */}
            {referralCode && (
              <div className="alert alert-success mt-2">
                <HiGift className="w-5 h-5" />
                <span>🎁 通过推荐链接注册</span>
              </div>
            )}

            {/* ----- 社交登录按钮 ----- */}
            <div className="space-y-2 my-4">
              <button
                className="btn btn-outline w-full"
                onClick={() => handleOAuthLogin('google')}
                disabled={loading}
              >
                {t('googleLogin')}
              </button>
            </div>

            <div className="divider">{t('orUseEmail')}</div>

            {/* ----- 邮箱/密码 ----- */}
            <div className="form-control">
              <label className="label"><span className="label-text">{t('email')}</span></label>
              <input
                type="email"
                placeholder={t('emailPlaceholder')}
                className="input input-bordered"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-control mt-4">
              <label className="label"><span className="label-text">{t('password')}</span></label>
              <input
                type="password"
                placeholder={t('passwordPlaceholder')}
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
                {t('loginButton')}
              </button>
              <button
                className="btn btn-outline"
                onClick={handleEmailSignUp}
                disabled={loading}
              >
                {t('signUpButton')}
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

// 加载骨架屏
function LoginFormSkeleton() {
  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content w-full max-w-md">
        <div className="card w-full shadow-2xl bg-base-100">
          <div className="card-body">
            <div className="skeleton h-8 w-32 mx-auto mb-4"></div>
            <div className="skeleton h-12 w-full mb-4"></div>
            <div className="skeleton h-4 w-16 mx-auto mb-4"></div>
            <div className="skeleton h-10 w-full mb-2"></div>
            <div className="skeleton h-10 w-full mb-4"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="skeleton h-12 w-full"></div>
              <div className="skeleton h-12 w-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 主页面组件（用 Suspense 包裹 LoginForm）
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}