// 文件: /app/auth/callback/route.ts
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  console.log("AUTH CALLBACK: 路由处理器被命中");
  console.log("AUTH CALLBACK: 完整的请求 URL:", request.url);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const errorFromGoogle = searchParams.get("error");
  
  // 【修改 1】默认跳转到首页 "/"，而不是商家后台
  const nextUrl = searchParams.get("next") || "/";

  if (errorFromGoogle) {
    console.error("AUTH CALLBACK: Google/OAuth 提供商返回了一个错误:", errorFromGoogle, "错误描述:", searchParams.get("error_description"));
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorFromGoogle)}`, request.url));
  }

  if (code) {
    console.log("AUTH CALLBACK: 发现授权码(code):", code.substring(0, 10) + "...");
    
    const supabase = await createSupabaseServerClient();

    console.log("AUTH CALLBACK: 正在尝试交换 code 获取 session...");
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      console.log("AUTH CALLBACK: 交换 code 成功！");
      
      // 【修改 2】移除自动升级商家的逻辑
      // 我们不再在这里检查或升级用户角色。
      // 新用户将保持默认角色（通常是 'customer' 或 'authenticated'），
      // 直到他们主动申请成为商家。

      console.log("AUTH CALLBACK: 操作完成，重定向到:", nextUrl);
      return redirect(nextUrl);
    }

    console.error("AUTH CALLBACK: 交换 code 失败。Supabase 错误:", error);
    console.error("AUTH CALLBACK: 失败详情 (Message):", error.message);
  
  } else {
     console.warn("AUTH CALLBACK: 访问 /auth/callback，但 URL 中没有 code");
  }

  console.log("AUTH CALLBACK: 重定向到登录页并显示 AUTH_ERROR");
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent('AUTH_ERROR')}`, request.url));
}