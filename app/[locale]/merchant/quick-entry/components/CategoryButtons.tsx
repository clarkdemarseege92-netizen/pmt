// app/[locale]/merchant/quick-entry/components/CategoryButtons.tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { getLocalizedValue } from '@/lib/i18nUtils';
import type { AccountCategory } from '@/app/types/accounting';

type CategoryButtonsProps = {
  categories: AccountCategory[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
};

export function CategoryButtons({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategoryButtonsProps) {
  const locale = useLocale();
  const t = useTranslations('quickEntry.expense');

  // 获取类目显示名称
  const getCategoryName = (category: AccountCategory) => {
    // 优先使用自定义名称
    if (category.custom_name) {
      return category.custom_name;
    }
    // 否则使用国际化名称
    if (category.name) {
      return getLocalizedValue(category.name, locale as 'th' | 'zh' | 'en');
    }
    return 'Unknown';
  };

  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-base-content/60">
        <p>{t('noCategories')}</p>
        <p className="text-sm mt-2">{t('noCategoriesHint')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {categories.map((category) => (
        <button
          key={category.category_id}
          type="button"
          onClick={() => onSelectCategory(category.category_id)}
          className={`btn btn-lg h-auto py-4 flex flex-col gap-2 ${
            selectedCategoryId === category.category_id
              ? 'btn-primary'
              : 'btn-outline'
          }`}
        >
          {category.icon && (
            <span className="text-3xl">{category.icon}</span>
          )}
          <span className="text-base font-medium">
            {getCategoryName(category)}
          </span>
        </button>
      ))}
    </div>
  );
}
