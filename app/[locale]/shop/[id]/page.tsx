// app/[locale]/shop/[id]/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Image from "next/image";
import { notFound } from "next/navigation";
import { HiBuildingStorefront, HiCheckCircle } from "react-icons/hi2";
import { getMerchantCustomization } from "@/app/actions/merchantDesign";
import { type ExtendedMerchantCustomization } from "@/app/types/merchantDesign";
import { CartProvider } from "@/context/CartContext";
import CartFooter from '@/components/CartFooter';
import BackButton from "@/components/BackButton";
import FavoriteButton from "@/components/FavoriteButton";
import { recordBrowsingHistory } from "@/lib/recordBrowsingHistory";
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import ProductGrid from './components/ProductGrid';
import ShopInfoModal from './components/ShopInfoModal';
import type { MultiLangName } from '@/app/types/accounting';
import { getMerchantBySlug } from '@/app/actions/merchant-slug';

// --- 类型定义 ---
type ProductDetail = {
  product_id: string;
  name: MultiLangName;
  original_price: number;
  image_urls: string[];
  sales_count?: number;
  description?: MultiLangName;
};

type MerchantDetail = {
  merchant_id: string;
  shop_name: string;
  logo_url?: string;
  address?: string;
  google_maps_link?: string;
  contact_phone?: string;
  description?: string;
  social_links?: {
    facebook?: string;
    line?: string;
    instagram?: string;
    tiktok?: string;
  };
};

// 商户商品分类
type MerchantCategory = {
  category_id: string;
  merchant_id: string;
  name: MultiLangName;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  product_count?: number;
};

// 组合数据结构
interface ShopData {
  merchant: MerchantDetail;
  customization: ExtendedMerchantCustomization;
  products: ProductDetail[];
  categories: MerchantCategory[];
  coupons: Array<unknown>;
}


// --- 店铺内容组件 ---
async function ShopContent({
  merchantId,
  shopData
}: {
  merchantId: string;
  shopData: ShopData;
  locale: string;
}) {
  const t = await getTranslations('shop');
  const { merchant, customization: config, products, categories } = shopData;

  // 动态样式变量
  const themeColor = config.theme_primary_color || '#3b82f6';

  // 动态样式注入
  const shopStyles = {
    '--theme-primary': themeColor,
    '--theme-button-radius': config.button_style === 'pill' ? '9999px' : config.button_style === 'square' ? '0px' : '0.5rem',
    backgroundImage: config.background_image_url ? `url(${config.background_image_url})` : 'none',
    backgroundSize: 'cover' as const,
    backgroundPosition: 'center',
    backgroundAttachment: config.background_image_url ? 'fixed' as const : 'scroll' as const,
    backgroundColor: config.background_image_url ? 'transparent' : '#f3f4f6',
    minHeight: '100vh',
    fontFamily: config.font_family === 'serif' ? 'serif' : config.font_family === 'mono' ? 'monospace' : 'sans-serif'
  } as React.CSSProperties;

  return (
    <CartProvider merchantId={merchantId}>
      <main className="min-h-screen pb-32" style={shopStyles}>

        {/* 悬浮返回按钮 */}
        <div className="fixed bottom-30 left-4 z-50">
          <BackButton />
        </div>

        <div className="max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto relative z-10">
          {/* 1. 店铺头部信息 (封面图, Logo, 名称) */}
          <div className="relative bg-white shadow-xl">
            {/* 封面图 - 响应式高度 */}
            <div className="h-40 sm:h-48 md:h-56 lg:h-64 w-full bg-gray-300 relative overflow-hidden">
              {config.cover_image_url ? (
                <Image src={config.cover_image_url} alt="Cover Image" fill className="object-cover" priority />
              ) : (
                <div className="w-full h-full bg-linear-to-r from-gray-200 to-gray-300 grid place-items-center text-gray-500">
                  {t('coverImagePlaceholder')}
                </div>
              )}
            </div>

            {/* Logo 和信息 - 响应式布局 */}
            <div className="p-4 md:p-6 lg:p-8 -mt-12 md:-mt-16 relative z-20">
              <div className="flex justify-between items-end">
                {/* Logo - 响应式大小 */}
                <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden relative shrink-0">
                  {merchant.logo_url ? (
                    <Image src={merchant.logo_url} alt="Shop Logo" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-base-200 grid place-items-center text-xl text-base-content/30">
                      <HiBuildingStorefront />
                    </div>
                  )}
                </div>

                {/* 关注/收藏按钮 和 信息按钮 */}
                <div className="flex items-center gap-2">
                  <ShopInfoModal
                    merchant={merchant}
                    announcementText={config.announcement_text || undefined}
                    themeColor={themeColor}
                  />
                  <FavoriteButton
                    itemId={merchant.merchant_id}
                    itemType="merchant"
                    variant="button"
                    themeColor={themeColor}
                    className="rounded-[--theme-button-radius]"
                  />
                </div>
              </div>

              {/* 名称和描述 - 响应式文字 */}
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mt-2 text-base-content">{merchant.shop_name}</h1>
              <p className="text-sm md:text-base text-base-content/60 mt-1">{merchant.description || t('welcomeMessage')}</p>

              {/* 评分和公告 - 响应式 */}
              <div className="flex items-center gap-3 mt-3 text-sm md:text-base text-success">
                <HiCheckCircle className="w-5 h-5" /> {t('verifiedMerchant')}
              </div>
            </div>
          </div>

          {/* 2. 商户分类导航 + 商品展示区 (使用客户端组件实现筛选) */}
          <ProductGrid
            products={products}
            categories={categories}
            config={config}
            themeColor={themeColor}
          />
        </div>

        {/* 3. 底部购物车栏 */}
        <CartFooter />
      </main>
    </CartProvider>
  );
}

export default async function ShopPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params;

  // 设置 locale
  setRequestLocale(locale);

  const supabase = await createSupabaseServerClient();

  // 判断 id 是否为 UUID（如果不是，则作为 slug 处理）
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  let merchantId = id;

  // 如果是 slug，先获取 merchantId
  if (!isUUID) {
    const slugResult = await getMerchantBySlug(id);
    if (!slugResult.success || !slugResult.merchantId) {
      notFound();
    }
    merchantId = slugResult.merchantId;
  }

  // 1. 查询商户信息
  const { data: merchantData, error } = await supabase
    .from('merchants')
    .select(`
      merchant_id, shop_name, logo_url, address, google_maps_link, contact_phone, description,social_links,
      products (
        product_id, name, original_price, image_urls, description, merchant_category_id
      )
    `)
    .eq('merchant_id', merchantId)
    .single();

  if (error || !merchantData) {
    notFound();
  }

  // 2. 查询商户商品分类
  const { data: categories } = await supabase
    .from('merchant_product_categories')
    .select('category_id, merchant_id, name, icon, sort_order, is_active')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  // 记录浏览历史
  await recordBrowsingHistory('merchant', merchantId);

  // 2. 查询商户装修配置
  const customizationRes = await getMerchantCustomization(merchantId);

  // 使用默认配置作为后备
  const defaultConfig: ExtendedMerchantCustomization = {
    merchant_id: merchantId,
    plan_level: 'free',
    template_id: 'default',
    theme_primary_color: '#3b82f6',
    theme_secondary_color: '#ffffff',
    button_style: 'rounded',
    font_family: 'sans',
    cover_image_url: undefined,
    background_image_url: undefined,
    announcement_text: undefined,
    display_config: {
      show_stock: true,
      show_sales_count: true,
      grid_cols: 2
    },
    homepage_styles: {},
    detail_page_styles: {}
  };

  // 深度合并配置
  const customization = customizationRes.success && customizationRes.data
    ? {
        ...defaultConfig,
        ...customizationRes.data,
        display_config: {
          ...defaultConfig.display_config,
          ...(customizationRes.data.display_config || {})
        }
      }
    : defaultConfig;

  // 3. 组织数据
  const shopData: ShopData = {
    merchant: {
      merchant_id: merchantData.merchant_id,
      shop_name: merchantData.shop_name,
      logo_url: merchantData.logo_url,
      address: merchantData.address,
      google_maps_link: merchantData.google_maps_link,
      contact_phone: merchantData.contact_phone,
      description: merchantData.description,
      social_links: merchantData.social_links || {},
    },
    customization: customization,
    products: (merchantData.products || []) as ProductDetail[],
    categories: (categories || []) as MerchantCategory[],
    coupons: [],
  };

  return <ShopContent merchantId={merchantId} shopData={shopData} locale={locale} />;
}
