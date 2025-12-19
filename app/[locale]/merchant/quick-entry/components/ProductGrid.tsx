// app/[locale]/merchant/quick-entry/components/ProductGrid.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { CashOrderItem } from '@/app/types/accounting';
import { getProductsForQuickEntry, getCouponsForQuickEntry } from '@/app/actions/products/get-products';
import type { Product, Coupon } from '@/app/actions/products/get-products';
import { CategoryFilter } from './CategoryFilter';
import { getUncategorizedProductsCount, getMerchantCategories } from '@/app/actions/merchant-categories/merchant-categories';
import type { MerchantCategory } from '@/app/actions/merchant-categories/merchant-categories';

type ProductGridProps = {
  merchantId: string;
  onAddItem: (item: CashOrderItem) => void;
};

export function ProductGrid({ merchantId, onAddItem }: ProductGridProps) {
  const t = useTranslations('quickEntry');
  const locale = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [categories, setCategories] = useState<MerchantCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null | undefined>(undefined);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);

  // 加载未分类商品数量
  useEffect(() => {
    const loadUncategorizedCount = async () => {
      const result = await getUncategorizedProductsCount(merchantId);
      if (result.success) {
        setUncategorizedCount(result.count);
      }
    };

    loadUncategorizedCount();
  }, [merchantId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 并行获取产品、优惠券和商户分类（产品支持分类筛选）
        const [productsResult, couponsResult, categoriesResult] = await Promise.all([
          getProductsForQuickEntry(merchantId, selectedCategoryId),
          getCouponsForQuickEntry(merchantId),
          getMerchantCategories(merchantId)
        ]);

        if (productsResult.success) {
          setProducts(productsResult.data);
        } else {
          console.error('Failed to load products:', productsResult.error);
        }

        if (couponsResult.success) {
          setCoupons(couponsResult.data);
        } else {
          console.error('Failed to load coupons:', couponsResult.error);
        }

        if (categoriesResult.success) {
          setCategories(categoriesResult.data);
        } else {
          console.error('Failed to load categories:', categoriesResult.error);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [merchantId, selectedCategoryId]);

  // 获取本地化名称
  const getLocalizedName = (nameObj: Record<string, string>): string => {
    return nameObj[locale] || nameObj['th'] || nameObj['en'] || Object.values(nameObj)[0] || 'Unnamed';
  };

  const handleAddProduct = (product: Product) => {
    const orderItem: CashOrderItem = {
      type: 'product',
      id: product.product_id,
      name: getLocalizedName(product.name),
      price: Number(product.original_price),
      quantity: 1,
      subtotal: Number(product.original_price),
    };

    onAddItem(orderItem);
  };

  const handleAddCoupon = (coupon: Coupon) => {
    // 优惠券以正数形式添加到购物车
    const orderItem: CashOrderItem = {
      type: 'coupon',
      id: coupon.coupon_id,
      name: getLocalizedName(coupon.name),
      price: Number(coupon.selling_price),
      quantity: 1,
      subtotal: Number(coupon.selling_price),
    };

    onAddItem(orderItem);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>{t('income.loadError')}: {error}</span>
      </div>
    );
  }

  const hasProducts = products.length > 0;
  const hasCoupons = coupons.length > 0;
  const hasNoData = !hasProducts && !hasCoupons;

  if (hasNoData) {
    return (
      <>
        {/* 分类筛选器 */}
        <CategoryFilter
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={setSelectedCategoryId}
          uncategorizedCount={uncategorizedCount}
        />

        <div className="text-center py-12">
          <p className="text-base-content/60">{t('income.noProducts')}</p>
          <p className="text-sm text-base-content/40 mt-2">{t('income.addProductsHint')}</p>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* 分类筛选器 */}
      <CategoryFilter
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onCategoryChange={setSelectedCategoryId}
        uncategorizedCount={uncategorizedCount}
      />

      {/* 筛选结果提示 */}
      {selectedCategoryId !== undefined && (
        <div className="text-sm text-base-content/60 px-2">
          {selectedCategoryId === null
            ? t('categoryFilter.showingUncategorized', { count: products.length })
            : t('categoryFilter.showingFiltered', { count: products.length })}
        </div>
      )}

      {/* 产品列表 */}
      {hasProducts && (
        <div>
          <h4 className="text-sm font-semibold text-base-content/70 mb-3">
            {t('income.products')}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((product) => (
              <button
                key={product.product_id}
                type="button"
                onClick={() => handleAddProduct(product)}
                className="btn btn-lg h-auto py-4 flex flex-col gap-2 btn-primary btn-outline"
              >
                <span className="text-sm font-medium text-center line-clamp-2">
                  {getLocalizedName(product.name)}
                </span>
                <span className="text-lg font-bold text-primary">
                  ฿{Number(product.original_price).toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 优惠券列表 */}
      {hasCoupons && (
        <div>
          <h4 className="text-sm font-semibold text-base-content/70 mb-3">
            {t('income.coupons')}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {coupons.map((coupon) => (
              <button
                key={coupon.coupon_id}
                type="button"
                onClick={() => handleAddCoupon(coupon)}
                className="btn btn-lg h-auto py-4 flex flex-col gap-2 btn-accent btn-outline"
              >
                <span className="text-2xl">🎟️</span>
                <span className="text-sm font-medium text-center line-clamp-2">
                  {getLocalizedName(coupon.name)}
                </span>
                <span className="text-lg font-bold text-accent">
                  ฿{Number(coupon.selling_price).toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
