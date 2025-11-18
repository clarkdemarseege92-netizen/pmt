// 文件: /lib/supabaseServer.ts (最终、稳定的版本)

// 【注意】使用 createServerClient，它允许我们明确定义 cookies getter/setter
import { createServerClient } from "@supabase/ssr"; 
import { cookies } from "next/headers";

// 必须是 async 函数，且不接收任何参数
export const createSupabaseServerClient = async () => { 
  // 1. 获取 Next.js 的 Cookie Store 对象 (必须 await)
  const cookieStore = await cookies();

  // 2. 返回明确配置了 Cookie 读写方法的 Supabase 客户端
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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