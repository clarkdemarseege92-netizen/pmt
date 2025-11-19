// 文件: /app/merchant/redeem/page.tsx (Server Component)

import RedeemScanner from "@/components/RedeemScanner";

export const metadata = {
    title: '订单核销 - 商家控制台',
    description: '使用摄像头扫描并核销客户的优惠券订单。',
};


export default async function MerchantRedeemPage() {
    
    return (
        <div className="flex flex-col gap-6 p-4 md:p-8">
            <h1 className="text-3xl font-bold text-base-content">
                订单核销中心
            </h1>
            <p className="text-lg text-base-content/70">
                扫描客户的核销二维码，确认服务并完成交易。
            </p>
            
            {/* 渲染 RedeemScanner 客户端组件，它处理摄像头和 API 调用 */}
            <RedeemScanner />
        </div>
    );
}