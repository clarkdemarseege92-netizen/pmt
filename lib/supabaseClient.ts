// 文件: /lib/supabaseClient.ts (使用 @supabase/ssr 修复)
"use client";

// 【关键修改】从 '@supabase/ssr' 导入 createBrowserClient
import { createBrowserClient } from "@supabase/ssr";

// 【重要】从您的 Supabase 项目仪表板中获取这些值
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 【关键修改】使用 createBrowserClient 默认配置（让它自动处理 cookies）
// 不需要手动配置 cookie handlers，@supabase/ssr 会自动处理
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);