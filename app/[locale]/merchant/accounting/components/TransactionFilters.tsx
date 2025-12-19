// app/[locale]/merchant/accounting/components/TransactionFilters.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { getCategories } from '@/app/actions/accounting/categories';
import type { TransactionFiltersType } from '../AccountingPageClient';
import type { AccountCategory } from '@/app/types/accounting';

type TransactionFiltersProps = {
  merchantId: string;
  onFilterChange: (filters: TransactionFiltersType) => void;
};

export function TransactionFilters({ merchantId, onFilterChange }: TransactionFiltersProps) {
  const t = useTranslations('accounting');
  const locale = useLocale();
  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [filters, setFilters] = useState<TransactionFiltersType>({});

  // 获取类目显示名称
  const getCategoryName = (category: AccountCategory) => {
    // 优先使用 custom_name（自定义类目）
    if (category.custom_name) {
      return category.custom_name;
    }
    // 使用 name 的国际化版本（系统类目）
    if (category.name && typeof category.name === 'object') {
      return (category.name as any)[locale] || (category.name as any).en || (category.name as any).th;
    }
    return 'Unknown';
  };

  useEffect(() => {
    const loadCategories = async () => {
      const result = await getCategories(merchantId);
      if (result.success && result.data) {
        setCategories(result.data);
      }
    };
    loadCategories();
  }, [merchantId]);

  const handleFilterChange = (key: keyof TransactionFiltersType, value: string) => {
    const newFilters = {
      ...filters,
      [key]: value || undefined,
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    setFilters({});
    onFilterChange({});
  };

  const hasFilters = Object.keys(filters).some(key => filters[key as keyof TransactionFiltersType]);

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <h2 className="card-title text-lg">{t('filters.title')}</h2>
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={handleReset}>
              {t('filters.reset')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 类型筛选 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('filters.type')}</span>
            </label>
            <select
              className="select select-bordered select-sm"
              value={filters.type || ''}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="">{t('filters.allTypes')}</option>
              <option value="income">{t('income')}</option>
              <option value="expense">{t('expense')}</option>
            </select>
          </div>

          {/* 来源筛选 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('filters.source')}</span>
            </label>
            <select
              className="select select-bordered select-sm"
              value={filters.source || ''}
              onChange={(e) => handleFilterChange('source', e.target.value)}
            >
              <option value="">{t('filters.allSources')}</option>
              <option value="manual">{t('source.manual')}</option>
              <option value="platform_order">{t('source.platform_order')}</option>
              <option value="platform_fee">{t('source.platform_fee')}</option>
            </select>
          </div>

          {/* 类目筛选 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('filters.category')}</span>
            </label>
            <select
              className="select select-bordered select-sm"
              value={filters.category_id || ''}
              onChange={(e) => handleFilterChange('category_id', e.target.value)}
            >
              <option value="">{t('filters.allCategories')}</option>
              {categories.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>
                  {getCategoryName(cat)}
                </option>
              ))}
            </select>
          </div>

          {/* 开始日期 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('filters.startDate')}</span>
            </label>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={filters.start_date || ''}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
            />
          </div>

          {/* 结束日期 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('filters.endDate')}</span>
            </label>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={filters.end_date || ''}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
