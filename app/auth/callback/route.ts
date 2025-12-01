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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      console.log("AUTH CALLBACK: 交换 code 成功！用户ID:", data.user.id);

      // 【修改 2】如果是管理员登录流程，验证管理员权限
      if (nextUrl === '/admin') {
        console.log("AUTH CALLBACK: 检测到管理员登录流程，验证权限...");

        // 检查用户是否为管理员
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error("AUTH CALLBACK: 获取 profile 失败:", profileError.message);
        }

        // 如果用户还没有 profile，创建一个默认的 user 角色
        if (!profile) {
          console.log("AUTH CALLBACK: 用户没有 profile，创建默认 user 角色");
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              role: 'user',
            });

          if (insertError) {
            console.error("AUTH CALLBACK: 创建 profile 失败:", insertError.message);
          }

          // 非管理员用户，退出登录并重定向
          await supabase.auth.signOut();
          console.log("AUTH CALLBACK: 非管理员用户，已退出登录");
          return NextResponse.redirect(new URL("/admin-login?error=not_admin", request.url));
        }

        // 验证是否为管理员
        if (profile.role !== 'admin') {
          console.log("AUTH CALLBACK: 用户不是管理员，角色为:", profile.role);
          // 非管理员用户，退出登录并重定向
          await supabase.auth.signOut();
          return NextResponse.redirect(new URL("/admin-login?error=not_admin", request.url));
        }

        console.log("AUTH CALLBACK: 管理员权限验证通过");
      } else {
        // 普通用户登录，确保有 profile 记录（如果没有则创建）
        console.log("AUTH CALLBACK: 普通用户登录流程");
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // PGRST116 = 没有找到记录
          console.log("AUTH CALLBACK: 用户首次登录，创建 profile");
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              role: 'user',
            });

          if (insertError) {
            console.error("AUTH CALLBACK: 创建 profile 失败:", insertError.message);
            // 不阻止登录，继续执行
          } else {
            console.log("AUTH CALLBACK: Profile 创建成功");
          }
        }
      }

      console.log("AUTH CALLBACK: 操作完成，重定向到:", nextUrl);
      return redirect(nextUrl);
    }

    console.error("AUTH CALLBACK: 交换 code 失败。Supabase 错误:", error);
    console.error("AUTH CALLBACK: 失败详情 (Message):", error?.message || "未知错误");

  } else {
     console.warn("AUTH CALLBACK: 访问 /auth/callback，但 URL 中没有 code");
  }

  console.log("AUTH CALLBACK: 重定向到登录页并显示 AUTH_ERROR");
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent('AUTH_ERROR')}`, request.url));
}