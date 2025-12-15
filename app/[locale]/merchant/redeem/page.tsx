// 文件: /app/[locale]/merchant/redeem/page.tsx (Server Component)

import RedeemScanner from "@/components/RedeemScanner";
import { getTranslations, setRequestLocale } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'merchantRedeem' });

    return {
        title: t('metaTitle'),
        description: t('metaDescription'),
    };
}

export default async function MerchantRedeemPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);

    const t = await getTranslations('merchantRedeem');

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8">
            <h1 className="text-3xl font-bold text-base-content">
                {t('title')}
            </h1>
            <p className="text-lg text-base-content/70">
                {t('subtitle')}
            </p>

            {/* 渲染 RedeemScanner 客户端组件，它处理摄像头和 API 调用 */}
            <RedeemScanner />
        </div>
    );
}
