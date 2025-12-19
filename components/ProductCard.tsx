// components/ProductCard.tsx
'use client';

import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import { HiTag, HiShoppingBag, HiMinus, HiPlus } from "react-icons/hi2";
import { ExtendedMerchantCustomization } from '@/app/types/merchantDesign';
import FavoriteButton from './FavoriteButton'; // 引入收藏按钮
import { useTranslations, useLocale } from 'next-intl';
import { getLocalizedValue } from '@/lib/i18nUtils';
import type { MultiLangName } from '@/app/types/accounting';

type ProductDetail = {
  product_id: string;
  name: MultiLangName;
  original_price: number;
  image_urls: string[];
  sales_count?: number;
  description?: MultiLangName;
};

export default function ProductCard({
  product,
  config,
  themeColor
}: {
  product: ProductDetail;
  config: ExtendedMerchantCustomization;
  themeColor: string;
}) {
  const t = useTranslations('productCard');
  const locale = useLocale();
  const { addItem, updateQuantity, cart } = useCart();
  const cartItem = cart.items.find(item => item.product_id === product.product_id);
  const quantity = cartItem?.quantity || 0;

  const handleAddToCart = () => {
    addItem({
      product_id: product.product_id,
      name: product.name,
      original_price: product.original_price,
      image_urls: product.image_urls,
      quantity: 1
    });
  };

  const handleIncrement = () => {
    updateQuantity(product.product_id, quantity + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      updateQuantity(product.product_id, quantity - 1);
    } else {
      updateQuantity(product.product_id, 0);
    }
  };

  // 根据装修配置设置按钮圆角
  const getButtonRadius = () => {
    switch (config.button_style) {
      case 'pill': return '9999px';
      case 'square': return '0px';
      default: return '0.5rem';
    }
  };

  const isGridCols2 = config.display_config?.grid_cols === 2;

  return (
    <div 
      className={`card bg-base-100 shadow-sm transition-all hover:shadow-lg relative group ${isGridCols2 ? '' : 'flex-row'}`} 
      style={{ 
        borderRadius: isGridCols2 ? '0.5rem' : '1rem',
        overflow: 'hidden'
      }}
    >
      {/* 收藏按钮：绝对定位在图片右上角 */}
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <FavoriteButton itemId={product.product_id} itemType="product" variant="icon" />
      </div>
      {/* 移动端始终显示收藏按钮 (因为没有 hover) */}
      <div className="absolute top-2 right-2 z-10 md:hidden">
        <FavoriteButton itemId={product.product_id} itemType="product" variant="icon" />
      </div>

      <figure className={`bg-gray-100 relative ${isGridCols2 ? 'aspect-square w-full' : 'w-28 h-28 shrink-0'}`}>
        {product.image_urls?.[0] ? (
          <Image
            src={product.image_urls[0]}
            alt={getLocalizedValue(product.name, locale as 'th' | 'zh' | 'en')}
            fill
            className="object-cover"
            sizes={isGridCols2 ? "(max-width: 768px) 50vw, 25vw" : "112px"}
          />
        ) : (
          <div className="w-full h-full bg-base-200 grid place-items-center text-base-content/30">
            <HiTag className="w-8 h-8" />
          </div>
        )}
      </figure>

      <div className="card-body p-3 flex flex-col justify-between">
        <h3 className={`font-bold ${isGridCols2 ? 'text-sm' : 'text-base'} line-clamp-2`}>
          {getLocalizedValue(product.name, locale as 'th' | 'zh' | 'en')}
        </h3>
        
        {/* 价格显示 */}
        <div className={`flex ${isGridCols2 ? 'flex-col' : 'items-center justify-between'} gap-1 mt-1`}>
          <span 
            className={`font-extrabold`} 
            style={{ 
              color: themeColor, 
              fontSize: isGridCols2 ? '1.125rem' : '1.5rem' 
            }}
          >
            ฿{product.original_price}
          </span>
        </div>

        {/* 商品描述 */}
        {product.description && (
          <p className="text-xs text-base-content/60 mt-1 line-clamp-2">
            {getLocalizedValue(product.description, locale as 'th' | 'zh' | 'en')}
          </p>
        )}

        {/* 辅助信息 */}
        {config.display_config?.show_sales_count && (
          <div className={`flex gap-3 text-xs text-base-content/60 ${isGridCols2 ? 'mt-1' : ''}`}>
            <span>{t('sold')}: {product.sales_count !== undefined ? product.sales_count : 0}</span>
          </div>
        )}

        {/* 数量选择器或加入购物车按钮 */}
        {quantity > 0 ? (
          <div className="flex items-center justify-between mt-2">
            <button 
              onClick={handleDecrement}
              className="btn btn-sm btn-circle"
              style={{ 
                backgroundColor: themeColor,
                color: 'white',
                borderRadius: getButtonRadius()
              }}
            >
              <HiMinus className="w-4 h-4" />
            </button>
            
            <span className="font-bold text-lg">{quantity}</span>
            
            <button 
              onClick={handleIncrement}
              className="btn btn-sm btn-circle"
              style={{ 
                backgroundColor: themeColor,
                color: 'white',
                borderRadius: getButtonRadius()
              }}
            >
              <HiPlus className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            className={`btn btn-sm text-white border-0 mt-2 ${isGridCols2 ? 'w-full' : 'w-auto self-end'}`}
            style={{
              backgroundColor: themeColor,
              borderRadius: getButtonRadius()
            }}
          >
            {isGridCols2 ? (
              <>
                <HiShoppingBag className="w-4 h-4 mr-1" />
                {t('addToCart')}
              </>
            ) : (
              <HiShoppingBag className="w-5 h-5"/>
            )}
          </button>
        )}
      </div>
    </div>
  );
}