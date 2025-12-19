// app/[locale]/merchant/product-categories/components/CategoryList.tsx
'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { HiPencil, HiTrash, HiEye, HiEyeSlash } from 'react-icons/hi2';
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Helper function to get category name (supports both string and MultiLangName)
  const getCategoryName = (name: string | MultiLangName): string => {
    if (typeof name === 'string') {
      return name; // Old TEXT format
    }
    return getLocalizedValue(name, locale as 'th' | 'zh' | 'en'); // New JSONB format
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    setIsReordering(true);

    // 重新计算排序
    const reorderedCategories = [...categories];
    const [draggedItem] = reorderedCategories.splice(draggedIndex, 1);
    reorderedCategories.splice(dropIndex, 0, draggedItem);

    // 生成新的排序数据
    const newOrders = reorderedCategories.map((cat, index) => ({
      category_id: cat.category_id,
      sort_order: index
    }));

    // 批量更新排序
    const result = await batchUpdateCategoryOrder(merchantId, newOrders);

    if (result.success) {
      onReorder();
    } else {
      console.error('Failed to update category order:', result.error);
      alert(t('reorderError'));
    }

    setDraggedIndex(null);
    setIsReordering(false);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
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

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {categories.map((category, index) => {
        const isDragging = draggedIndex === index;
        const isDragOver = dragOverIndex === index;

        return (
          <div
            key={category.category_id}
            draggable={!isReordering}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`
              card bg-base-100 shadow-md
              ${isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-grab'}
              ${isDragOver ? 'border-2 border-primary' : ''}
              ${!category.is_active ? 'opacity-60' : ''}
              transition-all duration-200
            `}
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between gap-4">
                {/* 左侧：拖拽手柄 + 分类信息 */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* 拖拽手柄 */}
                  <div className="cursor-grab active:cursor-grabbing text-base-content/40 hover:text-base-content/60">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 8h16M4 16h16"
                      />
                    </svg>
                  </div>

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

      {/* 拖拽提示 */}
      {categories.length > 1 && (
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
          <span>{t('dragHint')}</span>
        </div>
      )}
    </div>
  );
}
