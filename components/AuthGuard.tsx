// 文件: /components/AuthGuard.tsx (最终、无警告版本)
"use client";

import { User } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState,} from "react";
import { supabase } from "@/lib/supabaseClient"; 

interface AuthGuardProps {
    children: React.ReactNode;
    user: User | null; 
    merchantStatus: string | null; 
}

export default function ClientAuthGuard({ children, user: serverUser, merchantStatus }: AuthGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isChecking, setIsChecking] = useState(true);

    // 【修复 警告 3：exhaustive-deps】
    // 我们将 `checkStatusAndRedirect` 移入 useEffect 内部，
    // 或者将所有依赖（supabase, setIsChecking, merchantStatus, pathname, router）添加到 useCallback。
    // 为了简洁，我们将使用一个更简单的模式。

    // 我们将重构 `useEffect` 来修复所有警告
    useEffect(() => {
        
        const checkAndRedirect = async () => {
            // --- 1. 检查会话 ---
            if (!serverUser) {
                console.log("GUARD: Server user is NULL. Initiating client session check...");
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    console.log("GUARD: Client session also missing. FINAL REDIRECT TO LOGIN.");
                    router.push('/login');
                    return; // 停止执行
                }
                // 如果客户端找到了会话，我们继续（虽然这种情况现在不应该发生）
            }

            // --- 2. 检查商家状态 ---
            
            // 【修复 警告 1：prefer-const】
            // 我们使用 IIFE (立即执行的函数表达式) 来允许 `const`
            const statusToCheck = await (async () => {
                if (merchantStatus) return merchantStatus; // 优先使用服务器状态
                
                console.log("GUARD CHECK: Merchant status missing, querying DB...");
                const { data: merchant } = await supabase
                    .from('merchants')
                    .select('status')
                    .eq('owner_id', serverUser!.id) // 此时 serverUser 必不为 null
                    .maybeSingle(); 
                
                const dbStatus = merchant?.status || null;
                console.log("GUARD CHECK: DB status found:", dbStatus);
                return dbStatus;
            })();

            // --- 3. 执行路由判断 ---
            
            // A. 尚未提交申请 (Null) ➔ 必须去 Register
            if (!statusToCheck && pathname !== '/merchant/register') {
                router.push('/merchant/register');
                return; // 停止执行
            }
            
            // B. 正在审核/被拒绝 (Pending/Rejected) ➔ 必须去 Pending
            if ((statusToCheck === 'pending' || statusToCheck === 'rejected') && pathname !== '/merchant/pending') {
                router.push('/merchant/pending');
                return; // 停止执行
            }
            
            // C. 已批准 (Approved) ➔ 必须去 Dashboard
            if (statusToCheck === 'approved' && pathname !== '/merchant/dashboard') {
                router.push('/merchant/dashboard');
                return; // 停止执行
            }

            // D. 如果用户已在正确的页面 (e.g., pending 状态且在 /pending 页面)
            setIsChecking(false); // 停止加载，渲染页面
        };

        // 【修复 警告 2：set-state-in-effect】
        // 我们不直接调用 checkAndRedirect，而是让 useEffect 异步执行它
        checkAndRedirect();

    }, [serverUser, merchantStatus, pathname, router]); // 依赖数组保持不变

    // --- 渲染逻辑 ---
    if (isChecking) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-base-200">
                <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
        );
    }
    
    return <>{children}</>;
}