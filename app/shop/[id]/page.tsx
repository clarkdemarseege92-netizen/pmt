// app/shop/[id]/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Image from "next/image";
import { notFound } from "next/navigation";
import { HiMapPin, HiPhone, HiBuildingStorefront, HiTag, HiClock, HiCheckCircle } from "react-icons/hi2";
import { FaFacebook, FaLine, FaInstagram, FaTiktok } from "react-icons/fa";
import { getMerchantCustomization } from "@/app/actions/merchantDesign";
import { type ExtendedMerchantCustomization } from "@/app/types/merchantDesign";
import { CartProvider } from "@/context/CartContext";
import ProductCard from '@/components/ProductCard';
import CartFooter from '@/components/CartFooter';
import BackButton from "@/components/BackButton";
import FavoriteButton from "@/components/FavoriteButton"; // 引入
import { recordBrowsingHistory } from "@/lib/recordBrowsingHistory";

// --- 类型定义 ---
type MultiLangName = {
  th: string;
  en: string;
  [key: string]: string;
};

type ProductDetail = {
  product_id: string;
  name: MultiLangName;
  original_price: number;
  image_urls: string[];
  stock_quantity?: number;
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

// 组合数据结构
interface ShopData {
  merchant: MerchantDetail;
  customization: ExtendedMerchantCustomization;
  products: ProductDetail[];
  coupons: Array<unknown>;
}


// --- 店铺内容组件 ---
function ShopContent({ merchantId, shopData }: { merchantId: string; shopData: ShopData }) {
  const { merchant, customization: config, products } = shopData;
  
  // 动态样式变量
  const themeColor = config.theme_primary_color || '#3b82f6';
  const displayGridCols = config.display_config?.grid_cols === 1 ? 'grid-cols-1' : 'grid-cols-2';

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
        <div className="fixed top-4 left-4 z-50">
          <BackButton />
        </div>

        <div className="max-w-md mx-auto relative z-10">
          {/* 1. 店铺头部信息 (封面图, Logo, 名称) */}
          <div className="relative bg-white shadow-xl">
            {/* 封面图 */}
            <div className="h-40 w-full bg-gray-300 relative overflow-hidden">
              {config.cover_image_url ? (
                <Image src={config.cover_image_url} alt="Cover Image" fill className="object-cover" priority />
              ) : (
                <div className="w-full h-full bg-linear-to-r from-gray-200 to-gray-300 grid place-items-center text-gray-500">
                  店铺封面图
                </div>
              )}
            </div>

            {/* Logo 和信息 */}
            <div className="p-4 -mt-12 relative z-20">
              <div className="flex justify-between items-end">
                {/* Logo */}
                <div className="w-24 h-24 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden relative shrink-0">
                  {merchant.logo_url ? (
                    <Image src={merchant.logo_url} alt="Shop Logo" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-base-200 grid place-items-center text-xl text-base-content/30">
                      <HiBuildingStorefront />
                    </div>
                  )}
                </div>
                
                {/* 关注/收藏按钮 (替换为功能组件) */}
                <FavoriteButton 
                  itemId={merchant.merchant_id} 
                  itemType="merchant" 
                  variant="button"
                  themeColor={themeColor} // 传入店铺主题色
                  className="rounded-[--theme-button-radius]" // 使用 CSS 变量应用圆角
                />
              </div>

              {/* 名称和描述 */}
              <h1 className="text-2xl font-bold mt-2 text-base-content">{merchant.shop_name}</h1>
              <p className="text-sm text-base-content/60 mt-1">{merchant.description || "欢迎光临，请自助点餐"}</p>
              
              {/* 评分和公告 */}
              <div className="flex items-center gap-3 mt-3 text-sm text-success">
                <HiCheckCircle className="w-5 h-5" /> 认证商家 (4.8分)
              </div>
            </div>

            {/* 联系方式 (固定信息卡片) */}
            <div className="bg-white p-4 border-t border-base-200 mt-4">
              <div className="flex justify-between items-center gap-4 text-sm">
                {/* 地址 */}
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity">
                  <HiMapPin className="w-5 h-5 text-secondary" />
                  {merchant.google_maps_link ? (
                    <a href={merchant.google_maps_link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      地址 (导航)
                    </a>
                  ) : (
                    <span>{merchant.address || "暂无地址"}</span>
                  )}
                </div>
                {/* 电话 */}
                {merchant.contact_phone && (
                  <a href={`tel:${merchant.contact_phone}`} className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity">
                    <HiPhone className="w-5 h-5 text-primary" />
                    <span>电话</span>
                  </a>
                )}
              </div>
            </div>

            {/* 社交媒体链接 */}
            {merchant.social_links && (
              <div className="bg-white p-4 border-t border-base-200">
                <div className="flex justify-center gap-4">
                  {merchant.social_links.facebook && (
                    <a 
                      href={merchant.social_links.facebook} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-circle btn-outline btn-sm hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      title="Facebook"
                    >
                      <FaFacebook className="w-4 h-4 text-blue-600" />
                    </a>
                  )}
                  {merchant.social_links.line && (
                    <a 
                      href={merchant.social_links.line.startsWith('http') ? merchant.social_links.line : `https://line.me/ti/p/~${merchant.social_links.line}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-circle btn-outline btn-sm hover:bg-green-50 hover:border-green-300 transition-colors"
                      title="Line"
                    >
                      <FaLine className="w-4 h-4 text-green-600" />
                    </a>
                  )}
                  {merchant.social_links.instagram && (
                    <a 
                      href={merchant.social_links.instagram} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-circle btn-outline btn-sm hover:bg-pink-50 hover:border-pink-300 transition-colors"
                      title="Instagram"
                    >
                      <FaInstagram className="w-4 h-4 text-pink-600" />
                    </a>
                  )}
                  {merchant.social_links.tiktok && (
                    <a 
                      href={merchant.social_links.tiktok} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-circle btn-outline btn-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      title="TikTok"
                    >
                      <FaTiktok className="w-4 h-4 text-black" />
                    </a>
                  )}
                </div>
                {Object.values(merchant.social_links).some(link => link) && (
                  <p className="text-center text-xs text-base-content/60 mt-2">
                    关注我们的社交媒体
                  </p>
                )}
              </div>
            )}

            {/* 店铺公告栏 */}
            {config.announcement_text && (
              <div 
                className="p-3 bg-warning/20 text-warning-content text-sm flex items-center gap-2 border-l-4 border-warning"
                style={{ borderLeftColor: themeColor }}
              >
                <HiClock className="w-4 h-4 shrink-0" /> 
                <span>{config.announcement_text}</span>
              </div>
            )}
          </div>

          {/* 2. 商品/点单区 */}
          <div className="p-4 mt-4">
            <h2 className="text-xl font-bold mb-4 text-base-content">全部商品 ({products.length})</h2>

            {products.length === 0 ? (
              <div className="text-center p-10 bg-base-100 rounded-xl shadow-md text-base-content/50">
                <HiTag className="w-8 h-8 mx-auto mb-2" />
                <p>该店铺暂未发布任何商品。</p>
              </div>
            ) : (
              <div className={`grid gap-4 ${displayGridCols}`}>

{products.map(product => (
  <div key={product.product_id}>
      <ProductCard 
        key={product.product_id} 
        product={product} 
        config={config} 
        themeColor={themeColor}
      />
  </div>
))}
              </div>
            )}
          </div>
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
  params: Promise<{ id: string }>
}) {
  const { id: merchantId } = await params;

  const supabase = await createSupabaseServerClient();

  // 1. 查询商户信息
  const { data: merchantData, error } = await supabase
    .from('merchants')
    .select(`
      merchant_id, shop_name, logo_url, address, google_maps_link, contact_phone, description,social_links,
      products (
        product_id, name, original_price, image_urls, description
      )
    `)
    .eq('merchant_id', merchantId)
    .single();

  if (error || !merchantData) {
    notFound();
  }

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
    coupons: [],
  };

  return <ShopContent merchantId={merchantId} shopData={shopData} />;
}