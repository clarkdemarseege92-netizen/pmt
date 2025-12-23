// 文件: /app/[locale]/coupon/[id]/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Image from "next/image";
import { notFound } from "next/navigation";
import { HiShoppingCart, HiCheckCircle, HiClock, HiBuildingStorefront } from "react-icons/hi2";
import BuyButton from "@/components/BuyButton";
import BackButton from "@/components/BackButton";
import FavoriteButton from "@/components/FavoriteButton";
import {Link} from '@/i18n/routing';
import { recordBrowsingHistory } from "@/lib/recordBrowsingHistory";
import {getTranslations, setRequestLocale} from 'next-intl/server';
import {getLocalizedValue} from '@/lib/i18nUtils';

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

// 提取商户信息类型，方便复用
type MerchantInfo = {
  merchant_id: string;
  shop_name: string;
  promptpay_id?: string;
};

// 更新 CouponDetail 类型
type CouponDetail = {
  coupon_id: string;
  name: MultiLangName;
  selling_price: number;
  original_value: number;
  stock_quantity: number;
  image_urls: string[];
  rules: MultiLangName;
  description?: MultiLangName;
  usage_instructions?: string;
  coupon_products: CouponProductRelation[];
  merchants: MerchantInfo | MerchantInfo[] | null;
};

export default async function CouponDetailPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params;

  // 设置请求的 locale
  setRequestLocale(locale);

  const t = await getTranslations('couponDetail');
  const supabase = await createSupabaseServerClient();

  // 1. 核心查询
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

  if (error || !couponRaw) {
    console.error("Error fetching coupon:", error);
    notFound();
  }

  // 记录浏览历史
  await recordBrowsingHistory('coupon', id);

  const coupon = couponRaw as unknown as CouponDetail;

  const merchantData = Array.isArray(coupon.merchants)
    ? coupon.merchants[0]
    : coupon.merchants;

  const paymentIdentifier = merchantData?.promptpay_id || merchantData?.merchant_id || '';

  const discountPercentage = coupon.original_value > 0
    ? Math.round(((coupon.original_value - coupon.selling_price) / coupon.original_value) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-base-200 pb-24">
      {/* 悬浮返回按钮 */}
      <div className="fixed bottom-30 left-4 z-50">
        <BackButton />
      </div>

      {/* 1. 顶部轮播图 */}
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
              {t('noImage')}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* 2. 核心信息卡片 */}
        <div className="bg-base-100 p-6 shadow-sm md:rounded-b-xl mb-4">
          <div className="flex justify-between items-start gap-4">
             <div className="flex-1">
                <div className="flex justify-between items-start">
                    <h1 className="text-2xl font-bold text-base-content mr-2">
                        {getLocalizedValue(coupon.name, locale as 'th' | 'zh' | 'en')}
                    </h1>
                    {/* 收藏按钮：浮在标题右侧 */}
                    <FavoriteButton
                        itemId={coupon.coupon_id}
                        itemType="coupon"
                        variant="button"
                        className="btn-neutral btn-outline btn-xs sm:btn-sm"
                    />
                </div>

                {merchantData ? (
                  <Link href={`/shop/${merchantData.merchant_id}`} className="group inline-block">
                    <p className="text-sm text-base-content/60 mt-1 group-hover:text-primary transition-colors flex items-center gap-1 cursor-pointer">
                        <HiBuildingStorefront className="w-4 h-4" />
                        {t('shop')}: {merchantData.shop_name}
                        <span className="text-xs opacity-50 group-hover:underline">({t('visitShop')})</span>
                    </p>
                  </Link>
                ) : (
                  <p className="text-sm text-base-content/60 mt-1">
                      {t('shop')}: {t('unknownMerchant')}
                  </p>
                )}
             </div>
             <div className="badge badge-outline badge-sm shrink-0 mt-1">
               {t('stock')}: {coupon.stock_quantity}
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
             <HiCheckCircle /> {t('soldCount', {count: 100})}
          </p>
        </div>

        {/* 3. 详情与须知 (Tabs) */}
        <div className="bg-base-100 shadow-sm md:rounded-xl overflow-hidden">
          <div role="tablist" className="tabs tabs-bordered tabs-lg grid grid-cols-2">
            <input type="radio" name="coupon_tabs" role="tab" className="tab" aria-label={t('tabs.details')} defaultChecked />
            <div role="tabpanel" className="tab-content p-6 bg-base-100 border-base-300 min-h-[200px]">

              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                 <HiShoppingCart className="text-primary"/> {t('packageContents')}
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
                            {getLocalizedValue(item.products.name, locale as 'th' | 'zh' | 'en')}
                         </div>
                         <div className="text-sm text-base-content/60">
                            {t('originalPrice')}: ฿{item.products.original_price}
                         </div>
                      </div>
                      <div className="font-bold text-lg text-base-content/80">
                         x{item.quantity}
                      </div>
                    </li>
                  ))
                ) : (
                  <p className="text-base-content/50">{t('noProductInfo')}</p>
                )}
              </ul>

            </div>

            <input type="radio" name="coupon_tabs" role="tab" className="tab" aria-label={t('tabs.rules')} />
            <div role="tabpanel" className="tab-content p-6 bg-base-100 border-base-300 min-h-[200px]">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                 <HiClock className="text-primary"/> {t('usageRules')}
              </h3>
              <div className="prose text-base-content/80 whitespace-pre-wrap">
                {getLocalizedValue(coupon.rules, locale as 'th' | 'zh' | 'en') || t('noRules')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-200 p-4 md:p-6 z-50">
         <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
            <div className="flex flex-col">
               <span className="text-xs text-base-content/60">{t('totalPrice')}</span>
               <span className="text-2xl font-bold text-primary">฿{coupon.selling_price}</span>
            </div>

            <BuyButton
              couponId={coupon.coupon_id}
              merchantId={merchantData?.merchant_id || ''}
              merchantPromptPayId={paymentIdentifier}
              stockQuantity={coupon.stock_quantity}
            />
         </div>
      </div>

    </main>
  );
}
