// 文件: /lib/supabaseServer.ts (最终、稳定的防御性版本)

// 【注意】使用 createServerClient，它允许我们明确定义 cookies getter/setter
import { createServerClient } from "@supabase/ssr"; 
import { cookies } from "next/headers";

// 必须是 async 函数，且不接收任何参数
export const createSupabaseServerClient = async () => { 
  // 1. 获取 Next.js 的 Cookie Store 对象 (必须 await)
  const cookieStore = await cookies();

  // FIX: 读取变量时，不再使用强制断言 '!'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
     // 这行日志将出现在 Vercel Build Logs 中，帮助诊断问题
     console.error("FATAL SUPABASE ERROR: NEXT_PUBLIC_SUPABASE_URL or ANON_KEY is missing during build time.");
  }
  
  return createServerClient(
    // 使用空值合并 (??) 提供一个安全值，避免在变量缺失时 Next.js 预渲染崩溃
    // 注意：这里的 'DUMMY_...' 值仅用于 Build Time 避免崩溃。运行时必须有真实值。
    supabaseUrl ?? 'https://DUMMY_URL.supabase.co', 
    supabaseKey ?? 'DUMMY_ANON_KEY',
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set(name, value, options);
          } catch {}{
            // 忽略在服务器组件中设置 Cookie 导致的错误
          }
        },
        remove(name: string) {
          try {
            cookieStore.delete(name); 
          } catch {}{
            // 忽略错误
          }
        },
      },
    }
  );
};