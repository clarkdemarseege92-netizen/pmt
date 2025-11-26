// 文件: app/shop/[id]/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Image from "next/image";
import { notFound } from "next/navigation";
// 移除未使用的 Link
import { HiMapPin, HiPhone, HiBuildingStorefront } from "react-icons/hi2"; // 移除未使用的 HiChevronLeft
import BackButton from "@/components/BackButton"; 

// 类型定义
type MerchantDetail = {
  merchant_id: string;
  shop_name: string;
  shop_logo_url?: string;
  address?: string;
  google_maps_link?: string;
  contact_phone?: string;
  description?: string;
};

export default async function ShopPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  // 1. 查询商户信息
  // [修复] 在 select 中添加 'description'，确保获取到该字段
  const { data: merchantRaw, error } = await supabase
    .from('merchants')
    .select('merchant_id, shop_name, shop_logo_url, address, google_maps_link, contact_phone, description')
    .eq('merchant_id', id)
    .single();

  if (error || !merchantRaw) {
    notFound();
  }

  // [修复] 使用 'as MerchantDetail' 显式转换类型
  // 既解决了 "MerchantDetail is defined but never used" 警告
  // 也解决了 TypeScript 无法识别 merchant.description 的问题
  const merchant = merchantRaw as MerchantDetail;

  return (
    <main className="min-h-screen bg-base-200 pb-20">
      {/* 顶部导航栏 (简单版) */}
      <div className="bg-base-100 shadow-sm sticky top-0 z-10 px-4 py-3 flex items-center gap-4">
         <BackButton />
         <h1 className="font-bold text-lg flex-1 truncate">{merchant.shop_name}</h1>
      </div>

      <div className="max-w-md mx-auto w-full space-y-4 p-4">
        
        {/* 1. 商户基本信息卡片 */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body items-center text-center p-6">
            <div className="avatar mb-4">
              <div className="w-24 h-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 relative">
                {merchant.shop_logo_url ? (
                   <Image 
                     src={merchant.shop_logo_url} 
                     alt={merchant.shop_name} 
                     fill 
                     className="object-cover" 
                   />
                ) : (
                   <div className="w-full h-full bg-base-200 flex items-center justify-center text-4xl text-base-content/20">
                     <HiBuildingStorefront />
                   </div>
                )}
              </div>
            </div>
            <h2 className="card-title text-2xl">{merchant.shop_name}</h2>
            <p className="text-base-content/60 text-sm">
              {merchant.description || "暂无店铺介绍"}
            </p>
          </div>
        </div>

        {/* 2. 联系方式与地址 (核心需求) */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-0">
            {/* 地址行 */}
            <div className="flex items-start gap-4 p-4 border-b border-base-200">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                    <HiMapPin className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-base-content">店铺地址</h3>
                    <p className="text-sm text-base-content/70 mt-1">
                        {merchant.address || "商家暂未填写详细地址"}
                    </p>
                    {merchant.google_maps_link && (
                        <a 
                          href={merchant.google_maps_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-xs btn-outline btn-secondary mt-2 gap-1"
                        >
                           导航前往
                        </a>
                    )}
                </div>
            </div>

            {/* 电话行 */}
            <div className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <HiPhone className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-base-content">联系电话</h3>
                    <p className="text-sm text-base-content/70 mt-1">
                        {merchant.contact_phone || "暂无联系方式"}
                    </p>
                </div>
                {merchant.contact_phone && (
                    <a href={`tel:${merchant.contact_phone}`} className="btn btn-circle btn-sm btn-primary text-white">
                        <HiPhone />
                    </a>
                )}
            </div>
          </div>
        </div>

        {/* 3. (可选) 该商家的其他优惠券 */}
        <div className="divider text-sm opacity-50">店内热销</div>
        <div className="text-center text-sm text-base-content/50 py-4">
           暂无更多商品 (开发中...)
        </div>

      </div>
    </main>
  );
}