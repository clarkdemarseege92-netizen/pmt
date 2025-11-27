// 文件: app/shop/[id]/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Image from "next/image";
import { notFound } from "next/navigation";
import { HiMapPin, HiPhone, HiBuildingStorefront, HiShoppingBag, HiTag, HiClock, HiCheckCircle } from "react-icons/hi2";
import { getMerchantCustomization, type MerchantCustomization } from "@/app/actions/merchantDesign";

// 添加日志函数 - 修复 any 类型
const log = {
  info: (message: string, data?: unknown) => {
    console.log(`[SHOP_PAGE_INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error?: unknown) => {
    console.error(`[SHOP_PAGE_ERROR] ${message}`, error ? JSON.stringify(error, null, 2) : '');
  },
  warn: (message: string, data?: unknown) => {
    console.warn(`[SHOP_PAGE_WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

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
};

// 扩展 MerchantCustomization 类型以包含公告文本
interface ExtendedMerchantCustomization extends MerchantCustomization {
  announcement_text?: string;
}

// 组合数据结构
interface ShopData {
  merchant: MerchantDetail;
  customization: ExtendedMerchantCustomization;
  products: ProductDetail[];
  coupons: Array<unknown>;
}

// 辅助函数
const getLangName = (name: MultiLangName | null | undefined, lang = 'th') => {
  if (!name) return "N/A";
  return name[lang] || name['en'] || "N/A";
};

// --- 商品卡片组件 (用于动态渲染) ---
const ProductCard = ({ product, config, themeColor }: { product: ProductDetail, config: ExtendedMerchantCustomization, themeColor: string }) => {
    
  // 根据装修配置设置按钮圆角
  const getButtonRadius = () => {
    switch (config.button_style) {
      case 'pill': return '9999px';
      case 'square': return '0px';
      default: return '0.5rem';
    }
  };

  const isGridCols2 = config.display_config.grid_cols === 2;

  return (
    <div 
      className={`card bg-base-100 shadow-sm transition-all hover:shadow-lg ${isGridCols2 ? '' : 'flex-row'}`} 
      style={{ 
        borderRadius: isGridCols2 ? '0.5rem' : '1rem',
        overflow: 'hidden'
      }}
    >
      <figure className={`bg-gray-100 relative ${isGridCols2 ? 'aspect-square w-full' : 'w-28 h-28 shrink-0'}`}>
        {product.image_urls?.[0] ? (
          <Image src={product.image_urls[0]} alt={getLangName(product.name)} fill className="object-cover" />
        ) : (
          <div className="w-full h-full bg-base-200 grid place-items-center text-base-content/30">
            <HiTag className="w-8 h-8" />
          </div>
        )}
      </figure>
      
      <div className="card-body p-3 flex flex-col justify-between">
        <h3 className={`font-bold ${isGridCols2 ? 'text-sm' : 'text-base'}`}>{getLangName(product.name)}</h3>
        
        {/* 价格显示 - 只有 original_price */}
        <div className={`flex ${isGridCols2 ? 'flex-col' : 'items-center justify-between'} gap-1 mt-1`}>
          <span className={`font-extrabold`} style={{ color: themeColor, fontSize: isGridCols2 ? '1.125rem' : '1.5rem' }}>
            ฿{product.original_price}
          </span>
        </div>

        {/* 商品描述 */}
        {product.description && (
          <p className="text-xs text-base-content/60 mt-1">
            {getLangName(product.description)}
          </p>
        )}

        {/* 辅助信息 - 根据表结构，这些字段可能不存在 */}
        {(config.display_config.show_stock || config.display_config.show_sales_count) && (
          <div className={`flex gap-3 text-xs text-base-content/60 ${isGridCols2 ? 'mt-1' : ''}`}>
            {config.display_config.show_stock && (
              <span>库存: {product.stock_quantity !== undefined ? product.stock_quantity : 'N/A'}</span>
            )}
            {config.display_config.show_sales_count && (
              <span>已售: {product.sales_count !== undefined ? product.sales_count : 'N/A'}</span>
            )}
          </div>
        )}

        {/* 点单按钮 */}
        <button 
          className={`btn btn-sm text-white border-0 mt-2 ${isGridCols2 ? 'w-full' : 'w-auto self-end'}`} 
          style={{ 
            backgroundColor: themeColor,
            borderRadius: getButtonRadius() 
          }}
        >
          {isGridCols2 ? '加入购物车' : <HiShoppingBag className="w-5 h-5"/>}
        </button>
      </div>
    </div>
  );
}

export default async function ShopPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id: merchantId } = await params;
  
  log.info('开始处理店铺页面请求', { merchantId, timestamp: new Date().toISOString() });

  try {
    const supabase = await createSupabaseServerClient();
    log.info('Supabase客户端创建成功');

    // 1. 查询商户信息 - 根据实际表结构调整查询字段
    log.info('开始查询商户信息', { merchantId });
    
    const { data: merchantData, error } = await supabase
      .from('merchants')
      .select(`
        merchant_id, shop_name, logo_url, address, google_maps_link, contact_phone, description,
        products (
          product_id, name, original_price, image_urls, description
        )
      `)
      .eq('merchant_id', merchantId)
      .single();

    log.info('商户查询完成', { 
      hasData: !!merchantData, 
      hasError: !!error,
      error: error,
      merchantData: merchantData ? {
        merchant_id: merchantData.merchant_id,
        shop_name: merchantData.shop_name,
        productsCount: merchantData.products?.length || 0
      } : null
    });

    if (error) {
      log.error('查询商户信息时发生错误', {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        merchantId
      });
    }

    if (error || !merchantData) {
      log.warn('商户不存在或查询失败，触发404', { merchantId, error });
      notFound();
    }

    // 2. 查询商户装修配置
    log.info('开始查询商户装修配置', { merchantId });
    
    const customizationRes = await getMerchantCustomization(merchantId);
    log.info('装修配置查询完成', { 
      success: customizationRes.success,
      hasData: !!customizationRes.data,
      error: customizationRes.error
    });
    
    // 使用默认配置作为后备
    const defaultConfig: ExtendedMerchantCustomization = {
      merchant_id: merchantId,
      plan_level: 'free',
      template_id: 'default',
      theme_primary_color: '#3b82f6',
      theme_secondary_color: '#ffffff',
      button_style: 'rounded',
      font_family: 'sans',
      display_config: {
        show_stock: true,
        show_sales_count: true,
        grid_cols: 2
      },
      announcement_text: undefined
    };

    const customization = customizationRes.success && customizationRes.data 
      ? { ...defaultConfig, ...customizationRes.data }
      : defaultConfig;

    log.info('最终使用的装修配置', {
      themeColor: customization.theme_primary_color,
      buttonStyle: customization.button_style,
      gridCols: customization.display_config.grid_cols,
      hasCoverImage: !!customization.cover_image_url,
      hasBackgroundImage: !!customization.background_image_url
    });

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
      },
      customization: customization,
      products: (merchantData.products || []) as ProductDetail[],
      coupons: [],
    };

    const { merchant, customization: config, products } = shopData;
    
    // 动态样式变量
    const themeColor = config.theme_primary_color || '#3b82f6';
    const displayGridCols = config.display_config?.grid_cols === 1 ? 'grid-cols-1' : 'grid-cols-2';

    // [动态样式注入]
    const shopStyles = {
      '--theme-primary': themeColor,
      '--theme-button-radius': config.button_style === 'pill' ? '9999px' : config.button_style === 'square' ? '0px' : '0.5rem',
      backgroundImage: config.background_image_url ? `url(${config.background_image_url})` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
    } as React.CSSProperties;

    log.info('页面渲染准备完成', {
      merchantName: merchant.shop_name,
      productsCount: products.length,
      themeColor,
      displayGridCols
    });

    return (
      <main 
        className="min-h-screen pb-20"
        style={shopStyles}
      >
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
                
                {/* 关注/收藏按钮 (动态颜色) */}
                <button 
                  className="btn btn-sm text-white border-0 shadow-md"
                  style={{ 
                    backgroundColor: themeColor,
                    borderRadius: config.button_style === 'pill' ? '9999px' : config.button_style === 'square' ? '0px' : '0.5rem'
                  }}
                >
                  + 关注
                </button>
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

            {/* 店铺公告栏 (如果商户设置了) */}
            {config.announcement_text && (
              <div className="p-2 bg-yellow-100 text-yellow-800 text-xs flex items-center gap-2">
                <HiClock /> {config.announcement_text}
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
                  <ProductCard 
                    key={product.product_id} 
                    product={product} 
                    config={config} 
                    themeColor={themeColor}
                  />
                ))}
              </div>
            )}
          </div>

        </div>

        {/* 3. 底部购物车栏 (点单系统核心) */}
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 shadow-2xl bg-base-100/95 backdrop-blur-sm">
          <div className="max-w-md mx-auto flex justify-between items-center gap-4">
            {/* 购物车图标和数量 */}
            <div className="flex items-center gap-2 text-primary font-bold">
              <HiShoppingBag className="w-7 h-7" />
              <span className="text-2xl">฿0.00</span>
              <span className="badge badge-sm badge-outline">0 件</span>
            </div>
            
            {/* 结算按钮 */}
            <button 
              className="btn text-white shadow-xl"
              style={{ 
                backgroundColor: themeColor,
                borderRadius: config.button_style === 'pill' ? '9999px' : config.button_style === 'square' ? '0px' : '0.5rem'
              }}
              disabled // 暂时禁用，等待购物车逻辑实现
            >
              去结算
            </button>
          </div>
        </div>
      </main>
    );

  } catch (error) {
    log.error('处理店铺页面时发生未预期的错误', {
      merchantId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    notFound();
  }
}