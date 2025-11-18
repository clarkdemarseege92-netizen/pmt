// 文件: /app/auth/callback/route.ts
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  console.log("AUTH CALLBACK: 路由处理器被命中");

  // --- 【新日志】 打印完整的 URL ---
  console.log("AUTH CALLBACK: 完整的请求 URL:", request.url);
  // ---------------------------------

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const errorFromGoogle = searchParams.get("error"); // <-- 新增检查
  const nextUrl = searchParams.get("next") || "/merchant/dashboard";

  // --- 【新增】 检查来自 Google 的错误 ---
  if (errorFromGoogle) {
    console.error("AUTH CALLBACK: Google/OAuth 提供商返回了一个错误:", errorFromGoogle, "错误描述:", searchParams.get("error_description"));
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorFromGoogle)}`, request.url));
  }
  // -----------------------------------

  if (code) {
    // 为了日志整洁，我们只打印 code 的前 10 个字符
    console.log("AUTH CALLBACK: 发现授权码(code):", code.substring(0, 10) + "..."); 
    
    // 这是我们上一轮修复的 (移除了 cookieStore)
    const supabase = await createSupabaseServerClient();

    console.log("AUTH CALLBACK: ----------------------------------------------------");
    console.log("AUTH CALLBACK: 关键步骤：正在尝试交换 code 获取 session...");
    console.log("AUTH CALLBACK: ----------------------------------------------------");
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      console.log("AUTH CALLBACK: 交换 code 成功！正在检查用户角色...");

      // 检查角色
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!profile || profile.role !== 'merchant') {
          console.log(`AUTH CALLBACK: 用户 ${user.id} 缺少商家角色，正在通过 RPC 升级...`);
          const { error: rpcError } = await supabase.rpc('set_role_to_merchant', { 
            user_uuid: user.id 
          });

          if (rpcError) {
             console.error("AUTH CALLBACK: RPC 角色升级失败:", rpcError);
          }
        }
      }
      
      console.log("AUTH CALLBACK: 操作完成，重定向到:", nextUrl);
      return redirect(nextUrl);
    }

    // --- 【这是最关键的日志】 ---
    console.error("AUTH CALLBACK: 交换 code 失败。Supabase 错误:", error);
    console.error("AUTH CALLBACK: 失败详情 (Message):", error.message); // <-- 打印更详细的错误
  
  } else {
     console.warn("AUTH CALLBACK: 访问 /auth/callback，但 URL 中没有 code (也没有 errorFromGoogle)");
  }

  // 4. 如果没有 code 或发生错误，重定向回登录页
  console.log("AUTH CALLBACK: 重定向到登录页并显示 AUTH_ERROR");
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent('AUTH_ERROR')}`, request.url));
}