// 文件: /app/coupon/[id]/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Image from "next/image";
import { notFound } from "next/navigation";
import { HiShoppingCart, HiCheckCircle, HiClock, HiBuildingStorefront } from "react-icons/hi2";
import BuyButton from "@/components/BuyButton";
import BackButton from "@/components/BackButton";
import Link from "next/link";
// ----- 类型定义 -----

type MultiLangName = {
  th: string;
  en: string;
  [key: string]: string;
};

// 关联的商品详情
type ProductDetail = {
  name: MultiLangName;
  original_price: number;
  image_urls: string[];
};

// 中间表关联数据
type CouponProductRelation = {
  quantity: number;
  products: ProductDetail;
};

// 【修改 1】: 更新类型定义，添加 merchants 关联信息
type CouponDetail = {
  coupon_id: string;
  name: MultiLangName;
  selling_price: number;
  original_value: number;
  stock_quantity: number;
  image_urls: string[];
  rules: MultiLangName;
  description?: MultiLangName;
  usage_instructions?: string; // 兼容旧字段名
  coupon_products: CouponProductRelation[];
  // 新增商户信息
  merchants: {
    merchant_id: string;
    shop_name: string;
    promptpay_id: string;
  } | null;
};

// 辅助函数
const getLangName = (name: MultiLangName | null | undefined, lang = 'th') => {
  if (!name) return "";
  return name[lang] || name['en'] || "N/A";
};

export default async function CouponDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const lang = 'th'; // 实际项目中可从 cookie 或 header 获取

  // 1. 核心查询
  // 【修改 2】: 在 select 中增加 merchants 的联表查询
  const { data: couponRaw, error } = await supabase
    .from('coupons')
    .select(`
      *,
      coupon_products (
        quantity,
        products (
          name,
          original_price,
          image_urls
        )
      ),
      merchants (
        merchant_id,
        shop_name,
        promptpay_id
      )
    `)
    .eq('coupon_id', id)
    .single();

  // 错误处理：确保 coupon 存在且商户 PromptPay ID 存在
  // 注意：如果商户没设置 PromptPay，可能导致无法购买，这里我们允许页面加载但按钮可能会报错
  if (error || !couponRaw) {
    console.error("Error fetching coupon:", error);
    notFound();
  }

  const coupon = couponRaw as unknown as CouponDetail;
  
  // 计算折扣率
  const discountPercentage = coupon.original_value > 0 
    ? Math.round(((coupon.original_value - coupon.selling_price) / coupon.original_value) * 100)
    : 0;

  // 获取商户收款码 (如果为空则设为空字符串，由 BuyButton 处理错误)
  // const merchantPromptPayId = coupon.merchants?.promptpay_id || '';
  console.log('优惠券页面商户数据:', {
  couponId: coupon.coupon_id,
  merchantPromptPayId: coupon.merchants?.promptpay_id,
  merchants: coupon.merchants
});

  return (
    <main className="min-h-screen bg-base-200 pb-24">
      {/* 1. 顶部轮播图 (保留原样) */}
      <div className="w-full bg-white">
        <div className="carousel w-full h-[300px] md:h-[400px]">
          {coupon.image_urls && coupon.image_urls.length > 0 ? (
            coupon.image_urls.map((url, index) => (
              <div key={index} id={`slide${index}`} className="carousel-item relative w-full">
                <div className="relative w-full h-full">
                   <Image 
                      src={url} 
                      alt="Coupon Image" 
                      fill 
                      className="object-cover"
                      priority={index === 0}
                      sizes="100vw"
                   />
                </div>
                {coupon.image_urls.length > 1 && (
                  <div className="absolute flex justify-between transform -translate-y-1/2 left-5 right-5 top-1/2">
                    <a href={`#slide${index === 0 ? coupon.image_urls.length - 1 : index - 1}`} className="btn btn-circle btn-sm opacity-70">❮</a> 
                    <a href={`#slide${index === coupon.image_urls.length - 1 ? 0 : index + 1}`} className="btn btn-circle btn-sm opacity-70">❯</a>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-base-300 text-base-content/30">
              暂无图片
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* 2. 核心信息卡片 (保留原样) */}
        <div className="bg-base-100 p-6 shadow-sm md:rounded-b-xl mb-4">
          <div className="flex justify-between items-start gap-4">
             <div>
                <h1 className="text-2xl font-bold text-base-content">
                    {getLangName(coupon.name, lang)}
                </h1>
                {/* [修改] 店铺名称改为跳转链接 */}
                {coupon.merchants ? (
                  <Link href={`/shop/${coupon.merchants.merchant_id}`} className="group inline-block">
                    <p className="text-sm text-base-content/60 mt-1 group-hover:text-primary transition-colors flex items-center gap-1 cursor-pointer">
                        <HiBuildingStorefront className="w-4 h-4" />
                        店铺: {coupon.merchants.shop_name} 
                        <span className="text-xs opacity-50 group-hover:underline">(进店逛逛)</span>
                    </p>
                  </Link>
                ) : (
                  <p className="text-sm text-base-content/60 mt-1">
                      店铺: 未知商户
                  </p>
                )}
             </div>
             <div className="badge badge-outline badge-sm shrink-0 mt-1">
               库存: {coupon.stock_quantity}
             </div>
          </div>

          <div className="mt-4 flex items-end gap-3">
            <span className="text-3xl font-bold text-primary">฿{coupon.selling_price}</span>
            <span className="text-lg text-base-content/40 line-through decoration-2">฿{coupon.original_value}</span>
            {discountPercentage > 0 && (
              <span className="badge badge-error text-white font-bold">
                -{discountPercentage}%
              </span>
            )}
          </div>
          <p className="text-xs text-success mt-1 flex items-center gap-1">
             <HiCheckCircle /> 已售出 100+ (模拟数据)
          </p>
        </div>

        {/* 3. 详情与须知 (Tabs) (保留原样) */}
        <div className="bg-base-100 shadow-sm md:rounded-xl overflow-hidden">
          <div role="tablist" className="tabs tabs-bordered tabs-lg grid grid-cols-2">
            <input type="radio" name="coupon_tabs" role="tab" className="tab" aria-label="套餐详情" defaultChecked />
            <div role="tabpanel" className="tab-content p-6 bg-base-100 border-base-300 min-h-[200px]">
              
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                 <HiShoppingCart className="text-primary"/> 套餐包含内容
              </h3>
              <ul className="space-y-4">
                {coupon.coupon_products && coupon.coupon_products.length > 0 ? (
                  coupon.coupon_products.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-4 border-b border-base-100 pb-4 last:border-0">
                      <div className="avatar">
                        <div className="w-16 h-16 rounded-lg relative border border-base-200">
                           {item.products.image_urls?.[0] && (
                              <Image 
                                src={item.products.image_urls[0]} 
                                alt="Product" 
                                fill 
                                className="object-cover" 
                                sizes="64px"
                              />
                           )}
                        </div>
                      </div>
                      <div className="flex-1">
                         <div className="font-bold text-base-content">
                            {getLangName(item.products.name, lang)}
                         </div>
                         <div className="text-sm text-base-content/60">
                            原价: ฿{item.products.original_price}
                         </div>
                      </div>
                      <div className="font-bold text-lg text-base-content/80">
                         x{item.quantity}
                      </div>
                    </li>
                  ))
                ) : (
                  <p className="text-base-content/50">暂无详细商品信息</p>
                )}
              </ul>

            </div>

            <input type="radio" name="coupon_tabs" role="tab" className="tab" aria-label="购买须知" />
            <div role="tabpanel" className="tab-content p-6 bg-base-100 border-base-300 min-h-[200px]">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                 <HiClock className="text-primary"/> 使用规则
              </h3>
              <div className="prose text-base-content/80 whitespace-pre-wrap">
                {getLangName(coupon.rules, lang) || "暂无特殊说明，请遵循商家通用规则。"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-200 p-4 md:p-6 z-50">
         <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
            <div className="flex flex-col">
               <span className="text-xs text-base-content/60">总价</span>
               <span className="text-2xl font-bold text-primary">฿{coupon.selling_price}</span>
            </div>
            {/* 【修改 3】: 传递 sellingPrice 和 merchantPromptPayId */}
            <BackButton />



<BuyButton
  couponId={coupon.coupon_id}
  merchantPromptPayId={coupon.merchants?.promptpay_id || (Array.isArray(coupon.merchants) ? coupon.merchants[0]?.promptpay_id : '')}
  stockQuantity={coupon.stock_quantity}
/>
         </div>
      </div>

    </main>
  );
}