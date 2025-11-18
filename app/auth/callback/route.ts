// 文件: /app/auth/callback/route.ts
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// 这个路由处理器用于处理客户端的登录/注册成功后的重定向
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // 我们需要一个目标 URL 来重定向用户
  const nextUrl = searchParams.get("next") || "/merchant/dashboard";

  if (code) {
    // 1. 创建服务器端客户端 (确保它能读取到当前请求的 Cookie)
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(cookieStore);

    // 2. 交换 Auth Code 获取会话
    // 虽然 signInWithPassword/OTP 已经设置了会话，但这一步是确保会话在服务器上正确同步的最安全方式
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 3. 成功交换代码后，重定向到目标页面
      return redirect(nextUrl);
    }
  }

  // 4. 如果没有 code 或发生错误，重定向回登录页
  // 这里我们使用 next/server 的 NextResponse 重定向，因为这是 route.ts (API 路由)
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent('AUTH_ERROR')}`, request.url));
}