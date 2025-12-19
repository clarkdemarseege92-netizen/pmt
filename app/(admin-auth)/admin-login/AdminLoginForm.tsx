"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { HiShieldCheck } from "react-icons/hi2";
import { FcGoogle } from "react-icons/fc";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLoginForm() {
  const searchParams = useSearchParams();
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  // 使用 useMemo 从 URL 参数中获取错误信息，避免在 effect 中调用 setState
  const urlError = useMemo(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "not_admin") {
      return "您没有管理员权限，无法访问管理后台";
    } else if (errorParam === "auth_failed") {
      return "Google 登录失败，请重试";
    } else if (errorParam === "no_code") {
      return "登录验证失败，请重试";
    }
    return "";
  }, [searchParams]);

  // 合并 URL 错误和登录错误
  const error = urlError || loginError;

  const handleGoogleLogin = async () => {
    setLoginError("");
    setLoading(true);

    try {
      // 获取默认语言（通常是 'zh'）
      const defaultLocale = 'zh';

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/${defaultLocale}/admin`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (authError) {
        console.error("Google login error:", authError);
        setLoginError("Google 登录失败，请重试");
        setLoading(false);
      }
      // 如果没有错误，用户会被重定向到 Google 登录页面
    } catch (err) {
      console.error("Login error:", err);
      setLoginError("登录过程中发生错误，请重试");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-primary/20 via-secondary/20 to-accent/20 flex items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-2xl">
        <div className="card-body">
          {/* Logo 和标题 */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
                <HiShieldCheck className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold">管理员登录</h1>
            <p className="text-base-content/60 mt-2">请使用管理员账户登录</p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="alert alert-error mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Google 登录按钮 */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="btn btn-outline w-full gap-3 hover:bg-base-200"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner"></span>
                  登录中...
                </>
              ) : (
                <>
                  <FcGoogle className="w-6 h-6" />
                  <span>使用 Google 账号登录</span>
                </>
              )}
            </button>
          </div>

          {/* 安全提示 */}
          <div className="divider mt-6"></div>
          <div className="text-center space-y-2">
            <p className="text-xs text-base-content/50">
              🔒 仅限授权管理员访问
            </p>
            <details className="text-left">
              <summary className="text-xs text-primary cursor-pointer hover:underline">
                如何设置管理员权限？
              </summary>
              <div className="mt-2 p-3 bg-base-200 rounded-lg text-xs space-y-2">
                <p className="font-semibold">在 Supabase SQL Editor 中执行：</p>
                <pre className="bg-base-300 p-2 rounded overflow-x-auto">
                  <code>
{`UPDATE profiles
SET role = 'admin'
WHERE email = '你的邮箱@gmail.com';`}
                  </code>
                </pre>
                <p className="text-base-content/60">
                  详细说明请查看项目根目录的 <code className="bg-base-300 px-1 rounded">ADMIN_SETUP.md</code> 文件
                </p>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* 背景装饰 */}
      <div className="fixed top-10 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10"></div>
      <div className="fixed bottom-10 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -z-10"></div>
    </div>
  );
}
