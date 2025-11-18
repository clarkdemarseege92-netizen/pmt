// 文件: /lib/supabaseClient.ts
"use client"; // 确保这个文件只在客户端运行

import { createClient } from "@supabase/supabase-js";

// 【重要】从您的 Supabase 项目仪表板中获取这些值
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 创建一个可以在我们所有 "use client" 组件中使用的 Supabase 客户端
export const supabase = createClient(supabaseUrl, supabaseKey);