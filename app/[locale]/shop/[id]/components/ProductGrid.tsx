// app/[locale]/shop/[id]/components/ProductGrid.tsx
'use client';

import { useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { HiTag } from 'react-icons/hi2';
import { useTranslations, useLocale } from 'next-intl';
import { getLocalizedValue } from '@/lib/i18nUtils';
import type { ExtendedMerchantCustomization } from '@/app/types/merchantDesign';
import type { MultiLangName } from '@/app/types/accounting';

type ProductDetail = {
  product_id: string;
  name: MultiLangName;
  original_price: number;
  image_urls: string[];
  sales_count?: number;
  description?: MultiLangName;
  merchant_category_id?: string | null;
};

type MerchantCategory = {
  category_id: string;
  merchant_id: string;
  name: MultiLangName | string; // 支持两种格式：JSONB对象或TEXT字符串
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  product_count?: number;
};

interface ProductGridProps {
  products: ProductDetail[];
  categories: MerchantCategory[];
  config: ExtendedMerchantCustomization;
  themeColor: string;
}

export default function ProductGrid({ products, categories, config, themeColor }: ProductGridProps) {
  const t = useTranslations('shop');
  const locale = useLocale();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // 根据分类筛选商品
  const filteredProducts = selectedCategoryId
    ? products.filter(p => p.merchant_category_id === selectedCategoryId)
    : products;

  // 动态样式变量
  const displayGridCols = config.display_config?.grid_cols === 1 ? 'grid-cols-1' : 'grid-cols-2';

  // 获取分类名称（兼容TEXT和JSONB两种格式）
  const getCategoryName = (name: MultiLangName | string): string => {
    if (typeof name === 'string') {
      return name; // TEXT格式，直接返回
    }
    return getLocalizedValue(name, locale as 'th' | 'zh' | 'en'); // JSONB格式，使用localization
  };

  return (
    <>
      {/* 商户分类导航 - 响应式 */}
      {categories && categories.length > 0 && (
        <div className="bg-white border-t border-base-200 p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-base-content">
            {t('categories')}
          </h3>

          {/* 移动端：水平滚动 */}
          <div className="lg:hidden overflow-x-auto">
            <div className="flex gap-2 md:gap-3 pb-2">
              {/* "全部"选项 */}
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`flex flex-col items-center gap-1 p-2 md:p-3 rounded-lg border transition-colors min-w-20 md:min-w-[100px] ${
                  selectedCategoryId === null
                    ? 'border-primary bg-primary/10'
                    : 'bg-base-100 border-base-300 hover:border-primary hover:bg-primary/5'
                }`}
              >
                <div className="text-2xl md:text-3xl">🏪</div>
                <span className="text-xs md:text-sm text-center line-clamp-2 font-medium">
                  {t('allProducts', { count: products.length })}
                </span>
              </button>

              {/* 分类选项 */}
              {categories.map(category => (
                <button
                  key={category.category_id}
                  onClick={() => setSelectedCategoryId(category.category_id)}
                  className={`flex flex-col items-center gap-1 p-2 md:p-3 rounded-lg border transition-colors min-w-20 md:min-w-[100px] ${
                    selectedCategoryId === category.category_id
                      ? 'border-primary bg-primary/10'
                      : 'bg-base-100 border-base-300 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  <div className="text-2xl md:text-3xl">{category.icon || '📦'}</div>
                  <span className="text-xs md:text-sm text-center line-clamp-2 font-medium">
                    {getCategoryName(category.name)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 桌面端：网格布局 */}
          <div className="hidden lg:grid grid-cols-6 xl:grid-cols-8 gap-4">
            {/* "全部"选项 */}
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${
                selectedCategoryId === null
                  ? 'border-primary bg-primary/10'
                  : 'bg-base-100 border-base-300 hover:border-primary hover:bg-primary/5'
              }`}
            >
              <div className="text-4xl">🏪</div>
              <span className="text-sm text-center line-clamp-2 font-medium">
                {t('allProducts', { count: products.length })}
              </span>
            </button>

            {/* 分类选项 */}
            {categories.map(category => (
              <button
                key={category.category_id}
                onClick={() => setSelectedCategoryId(category.category_id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${
                  selectedCategoryId === category.category_id
                    ? 'border-primary bg-primary/10'
                    : 'bg-base-100 border-base-300 hover:border-primary hover:bg-primary/5'
                }`}
              >
                <div className="text-4xl">{category.icon || '📦'}</div>
                <span className="text-sm text-center line-clamp-2 font-medium">
                  {getCategoryName(category.name)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 商品展示区 */}
      <div className="p-4 md:p-6 mt-4">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-6 text-base-content">
          {selectedCategoryId
            ? `${getCategoryName(categories.find(c => c.category_id === selectedCategoryId)?.name || '')} (${filteredProducts.length})`
            : t('allProducts', { count: filteredProducts.length })}
        </h2>

        {filteredProducts.length === 0 ? (
          <div className="text-center p-10 bg-base-100 rounded-xl shadow-md text-base-content/50">
            <HiTag className="w-8 h-8 mx-auto mb-2" />
            <p>{t('noProducts')}</p>
          </div>
        ) : (
          <div className={`grid gap-3 md:gap-4 lg:gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`}>
            {filteredProducts.map(product => (
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
    </>
  );
}
