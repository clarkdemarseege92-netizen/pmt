// 文件: /lib/supabaseClient.ts (使用 @supabase/ssr 修复)
"use client";

// 【关键修改】从 '@supabase/ssr' 导入 createBrowserClient
import { createBrowserClient } from "@supabase/ssr";

// 【重要】从您的 Supabase 项目仪表板中获取这些值
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 【关键修改】使用 createBrowserClient 并配置 cookie 选项和自动刷新
// 这将创建一个与服务器端 @supabase/ssr helpers 兼容的客户端
export const supabase = createBrowserClient(supabaseUrl, supabaseKey, {
  auth: {
    // 【关键】启用自动刷新 token
    autoRefreshToken: true,
    // 【关键】持久化 session
    persistSession: true,
    // 【关键】检测会话从其他标签页或窗口的变化
    detectSessionInUrl: true,
  },
  cookies: {
    get(name: string) {
      // 从 document.cookie 中读取
      const value = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`))
        ?.split('=')[1];
      return value ? decodeURIComponent(value) : undefined;
    },
    set(name: string, value: string, options) {
      // 写入 document.cookie
      let cookie = `${name}=${encodeURIComponent(value)}`;
      if (options?.maxAge) {
        cookie += `; max-age=${options.maxAge}`;
      }
      if (options?.domain) {
        cookie += `; domain=${options.domain}`;
      }
      if (options?.path) {
        cookie += `; path=${options.path}`;
      }
      if (options?.sameSite) {
        cookie += `; samesite=${options.sameSite}`;
      }
      if (options?.secure) {
        cookie += '; secure';
      }
      document.cookie = cookie;
    },
    remove(name: string, options) {
      // 删除 cookie（设置过期时间为过去）
      let cookie = `${name}=; max-age=0`;
      if (options?.domain) {
        cookie += `; domain=${options.domain}`;
      }
      if (options?.path) {
        cookie += `; path=${options.path}`;
      }
      document.cookie = cookie;
    },
  },
});