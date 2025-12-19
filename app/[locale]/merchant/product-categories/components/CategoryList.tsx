// app/[locale]/merchant/product-categories/components/CategoryList.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { HiPencil, HiTrash, HiEye, HiEyeSlash, HiChevronUp, HiChevronDown } from 'react-icons/hi2';
import { batchUpdateCategoryOrder, disableMerchantCategory, enableMerchantCategory } from '@/app/actions/merchant-categories/merchant-categories';
import type { CategoryStats } from '@/app/actions/merchant-categories/merchant-categories';
import { getLocalizedValue } from '@/lib/i18nUtils';
import type { MultiLangName } from '@/app/types/accounting';

type CategoryListProps = {
  categories: CategoryStats[];
  onEdit: (category: CategoryStats) => void;
  onDelete: (category: CategoryStats) => void;
  onReorder: () => void;
  merchantId: string;
};

export function CategoryList({ categories, onEdit, onDelete, onReorder, merchantId }: CategoryListProps) {
  const t = useTranslations('productCategories');
  const locale = useLocale();
  const [isReordering, setIsReordering] = useState(false);
  // 本地分类列表状态，用于乐观更新
  const [localCategories, setLocalCategories] = useState<CategoryStats[]>(categories);

  // 当父组件传入的 categories 变化时，更新本地状态
  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  // Helper function to get category name (supports both string and MultiLangName)
  const getCategoryName = (name: string | MultiLangName): string => {
    if (typeof name === 'string') {
      return name; // Old TEXT format
    }
    return getLocalizedValue(name, locale as 'th' | 'zh' | 'en'); // New JSONB format
  };

  // 向上移动分类（乐观更新版本）
  const handleMoveUp = async (index: number) => {
    if (index === 0 || isReordering) return; // 已经在最上面，无法上移

    // 立即更新本地UI（乐观更新）
    const reorderedCategories = [...localCategories];
    [reorderedCategories[index - 1], reorderedCategories[index]] =
    [reorderedCategories[index], reorderedCategories[index - 1]];

    // 立即更新UI，无需等待
    setLocalCategories(reorderedCategories);

    // 短暂锁定按钮，防止快速连击
    setIsReordering(true);
    setTimeout(() => setIsReordering(false), 150);

    // 后台异步保存到数据库（不阻塞UI）
    const newOrders = reorderedCategories.map((cat, idx) => ({
      category_id: cat.category_id,
      sort_order: idx
    }));

    batchUpdateCategoryOrder(merchantId, newOrders).then(result => {
      if (!result.success) {
        // 如果保存失败，恢复原来的顺序
        console.error('Failed to update category order:', result.error);
        setLocalCategories(categories);
        alert(t('reorderError'));
      }
    });
  };

  // 向下移动分类（乐观更新版本）
  const handleMoveDown = async (index: number) => {
    if (index === localCategories.length - 1 || isReordering) return; // 已经在最下面，无法下移

    // 立即更新本地UI（乐观更新）
    const reorderedCategories = [...localCategories];
    [reorderedCategories[index], reorderedCategories[index + 1]] =
    [reorderedCategories[index + 1], reorderedCategories[index]];

    // 立即更新UI，无需等待
    setLocalCategories(reorderedCategories);

    // 短暂锁定按钮，防止快速连击
    setIsReordering(true);
    setTimeout(() => setIsReordering(false), 150);

    // 后台异步保存到数据库（不阻塞UI）
    const newOrders = reorderedCategories.map((cat, idx) => ({
      category_id: cat.category_id,
      sort_order: idx
    }));

    batchUpdateCategoryOrder(merchantId, newOrders).then(result => {
      if (!result.success) {
        // 如果保存失败，恢复原来的顺序
        console.error('Failed to update category order:', result.error);
        setLocalCategories(categories);
        alert(t('reorderError'));
      }
    });
  };

  const handleToggleActive = async (category: CategoryStats) => {
    const action = category.is_active ? disableMerchantCategory : enableMerchantCategory;
    const result = await action(category.category_id);

    if (result.success) {
      onReorder(); // 刷新列表
    } else {
      console.error('Failed to toggle category status:', result.error);
      alert(t('toggleError'));
    }
  };

  if (localCategories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {localCategories.map((category, index) => {
        const isFirst = index === 0;
        const isLast = index === localCategories.length - 1;

        return (
          <div
            key={category.category_id}
            className={`
              card bg-base-100 shadow-md
              ${!category.is_active ? 'opacity-60' : ''}
              transition-all duration-200
            `}
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between gap-4">
                {/* 左侧：排序按钮 + 分类信息 */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* 排序按钮（上下箭头） */}
                  {categories.length > 1 && (
                    <div className="flex flex-col gap-0.5">
                      <button
                        className={`btn btn-ghost btn-xs p-0 h-5 min-h-0 ${
                          isFirst || isReordering ? 'opacity-30 cursor-not-allowed' : 'hover:text-primary'
                        }`}
                        onClick={() => handleMoveUp(index)}
                        disabled={isFirst || isReordering}
                        title={t('moveUp')}
                      >
                        <HiChevronUp className="w-5 h-5" />
                      </button>
                      <button
                        className={`btn btn-ghost btn-xs p-0 h-5 min-h-0 ${
                          isLast || isReordering ? 'opacity-30 cursor-not-allowed' : 'hover:text-primary'
                        }`}
                        onClick={() => handleMoveDown(index)}
                        disabled={isLast || isReordering}
                        title={t('moveDown')}
                      >
                        <HiChevronDown className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {/* 图标 */}
                  <div className="text-3xl">{category.icon || '📦'}</div>

                  {/* 分类名称和商品数量 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg truncate">
                        {getCategoryName(category.category_name)}
                      </h3>
                      {!category.is_active && (
                        <span className="badge badge-ghost badge-sm">
                          {t('disabled')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-base-content/60">
                      {t('productCount', { count: category.product_count })}
                    </p>
                  </div>
                </div>

                {/* 右侧：操作按钮 */}
                <div className="flex items-center gap-2">
                  {/* 启用/禁用按钮 */}
                  <button
                    className="btn btn-ghost btn-sm btn-circle"
                    onClick={() => handleToggleActive(category)}
                    title={category.is_active ? t('disable') : t('enable')}
                  >
                    {category.is_active ? (
                      <HiEye className="w-5 h-5" />
                    ) : (
                      <HiEyeSlash className="w-5 h-5" />
                    )}
                  </button>

                  {/* 编辑按钮 */}
                  <button
                    className="btn btn-ghost btn-sm btn-circle"
                    onClick={() => onEdit(category)}
                    title={t('edit')}
                  >
                    <HiPencil className="w-5 h-5" />
                  </button>

                  {/* 删除按钮 */}
                  <button
                    className="btn btn-ghost btn-sm btn-circle text-error hover:bg-error hover:text-error-content"
                    onClick={() => onDelete(category)}
                    title={t('deleteButton')}
                  >
                    <HiTrash className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* 排序提示 */}
      {localCategories.length > 1 && (
        <div className="alert alert-info">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-current shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <span>{t('arrowHint')}</span>
        </div>
      )}
    </div>
  );
}
