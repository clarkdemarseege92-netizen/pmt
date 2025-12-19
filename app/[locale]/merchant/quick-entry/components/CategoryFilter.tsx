// app/[locale]/merchant/quick-entry/components/CategoryFilter.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { HiCog6Tooth } from 'react-icons/hi2';
import { Link } from '@/i18n/routing';
import { getMerchantCategories } from '@/app/actions/merchant-categories/merchant-categories';
import type { MerchantCategory } from '@/app/actions/merchant-categories/merchant-categories';
import { getLocalizedValue } from '@/lib/i18nUtils';
import type { MultiLangName } from '@/app/types/accounting';

type CategoryFilterProps = {
  merchantId: string;
  selectedCategoryId: string | null | undefined;
  onCategoryChange: (categoryId: string | null | undefined) => void;
  uncategorizedCount?: number;
};

export function CategoryFilter({
  merchantId,
  selectedCategoryId,
  onCategoryChange,
  uncategorizedCount = 0
}: CategoryFilterProps) {
  const t = useTranslations('quickEntry');
  const locale = useLocale();
  const [categories, setCategories] = useState<MerchantCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to get category name (supports both string and MultiLangName)
  const getCategoryName = (name: string | MultiLangName): string => {
    if (typeof name === 'string') {
      return name; // Old TEXT format
    }
    return getLocalizedValue(name, locale as 'th' | 'zh' | 'en'); // New JSONB format
  };

  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      const result = await getMerchantCategories(merchantId);

      if (result.success) {
        setCategories(result.data);
      } else {
        console.error('Failed to load categories:', result.error);
      }

      setLoading(false);
    };

    loadCategories();
  }, [merchantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <span className="loading loading-spinner loading-sm"></span>
      </div>
    );
  }

  // 如果没有分类，不显示筛选器
  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-base-100 border-b border-base-200 sticky top-0 z-10">
      <div className="flex items-center gap-2 p-3 overflow-x-auto hide-scrollbar">
        {/* 全部 */}
        <button
          type="button"
          className={`
            btn btn-sm shrink-0
            ${selectedCategoryId === undefined ? 'btn-primary' : 'btn-ghost'}
          `}
          onClick={() => onCategoryChange(undefined)}
        >
          {t('categoryFilter.all')}
        </button>

        {/* 分类列表 */}
        {categories.map((category) => (
          <button
            key={category.category_id}
            type="button"
            className={`
              btn btn-sm shrink-0 gap-1
              ${selectedCategoryId === category.category_id ? 'btn-primary' : 'btn-ghost'}
            `}
            onClick={() => onCategoryChange(category.category_id)}
          >
            <span className="text-lg">{category.icon || '📦'}</span>
            <span>{getCategoryName(category.name)}</span>
          </button>
        ))}

        {/* 未分类 */}
        {uncategorizedCount > 0 && (
          <button
            type="button"
            className={`
              btn btn-sm shrink-0 gap-1
              ${selectedCategoryId === null ? 'btn-primary' : 'btn-ghost'}
            `}
            onClick={() => onCategoryChange(null)}
          >
            <span>{t('categoryFilter.uncategorized')}</span>
            <span className="badge badge-sm">{uncategorizedCount}</span>
          </button>
        )}

        {/* 分隔线 */}
        <div className="divider divider-horizontal mx-1"></div>

        {/* 管理分类入口 */}
        <Link
          href="/merchant/product-categories"
          className="btn btn-ghost btn-sm btn-square shrink-0"
          title={t('categoryFilter.manageCategories')}
        >
          <HiCog6Tooth className="w-5 h-5" />
        </Link>
      </div>

      {/* 自定义样式：隐藏滚动条但保持滚动功能 */}
      <style jsx>{`
        .hide-scrollbar {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
      `}</style>
    </div>
  );
}
