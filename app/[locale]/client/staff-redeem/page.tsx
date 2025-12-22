// 文件: /app/[locale]/client/staff-redeem/page.tsx
// 员工核销页面 - 仅对有员工权限的用户可见

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";
import RedeemScanner from "@/components/RedeemScanner";
import { getTranslations, setRequestLocale } from 'next-intl/server';

// 创建 Admin 客户端 (绕过 RLS)
function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase admin credentials');
    }

    return createClient(supabaseUrl, serviceRoleKey);
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'staffRedeem' });

    return {
        title: t('metaTitle'),
        description: t('metaDescription'),
    };
}

export default async function StaffRedeemPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);

    // 验证用户是否登录
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/${locale}/login`);
    }

    // 使用 Admin 客户端检查用户是否是员工 (绕过 RLS)
    const supabaseAdmin = createAdminClient();
    const { data: staffRecord } = await supabaseAdmin
        .from('merchant_staff')
        .select(`
            merchant_id,
            merchants (
                shop_name
            )
        `)
        .eq('user_id', user.id)
        .single();

    if (!staffRecord) {
        // 没有员工权限，重定向到客户中心
        redirect(`/${locale}/client/profile`);
    }

    const t = await getTranslations('staffRedeem');
    const shopName = (staffRecord.merchants as { shop_name: string } | null)?.shop_name || t('unknownShop');

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8">
            {/* 标题区域 */}
            <div>
                <h1 className="text-3xl font-bold text-base-content">
                    {t('title')}
                </h1>
                <p className="text-lg text-base-content/70 mt-2">
                    {t('subtitle')}
                </p>
            </div>

            {/* 店铺信息卡片 */}
            <div className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                    <div className="font-bold">{t('workingFor')}</div>
                    <div className="text-sm">{shopName}</div>
                </div>
            </div>

            {/* 核销扫描器 */}
            <RedeemScanner />
        </div>
    );
}
