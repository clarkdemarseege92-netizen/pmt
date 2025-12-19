// app/[locale]/merchant/product-categories/components/DeleteCategoryModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { HiXMark, HiExclamationTriangle } from 'react-icons/hi2';
import { checkCanDeleteCategory, deleteMerchantCategory, disableMerchantCategory } from '@/app/actions/merchant-categories/merchant-categories';
import type { CategoryStats } from '@/app/actions/merchant-categories/merchant-categories';
import { getLocalizedValue } from '@/lib/i18nUtils';
import type { MultiLangName } from '@/app/types/accounting';

type DeleteCategoryModalProps = {
  category: CategoryStats;
  onClose: () => void;
  onSuccess: () => void;
};

export function DeleteCategoryModal({ category, onClose, onSuccess }: DeleteCategoryModalProps) {
  const t = useTranslations('productCategories');
  const locale = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canDelete, setCanDelete] = useState(false);
  const [productCount, setProductCount] = useState(0);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteAction, setDeleteAction] = useState<'delete' | 'disable'>('disable');

  // Helper function to get category name (supports both string and MultiLangName)
  const getCategoryName = (name: string | MultiLangName): string => {
    if (typeof name === 'string') {
      return name; // Old TEXT format
    }
    return getLocalizedValue(name, locale as 'th' | 'zh' | 'en'); // New JSONB format
  };

  useEffect(() => {
    const checkDelete = async () => {
      const result = await checkCanDeleteCategory(category.category_id);

      if (result.success) {
        setCanDelete(result.canDelete);
        setProductCount(result.productCount);
        setDeleteMessage(result.message);
        // 默认操作：如果有商品，建议禁用；否则可以删除
        setDeleteAction(result.canDelete ? 'delete' : 'disable');
      } else {
        setError(result.error || t('error.unknown'));
      }

      setLoading(false);
    };

    checkDelete();
  }, [category.category_id, t]);

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      let result;

      if (deleteAction === 'delete') {
        result = await deleteMerchantCategory(category.category_id);
      } else {
        result = await disableMerchantCategory(category.category_id);
      }

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || t('error.unknown'));
      }
    } catch (err) {
      console.error('Error deleting/disabling category:', err);
      setError(t('error.unknown'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <HiExclamationTriangle className="w-6 h-6 text-warning" />
            {deleteAction === 'delete' ? t('deleteCategory') : t('disableCategory')}
          </h3>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        {loading ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 错误提示 */}
            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            {/* 分类信息 */}
            <div className="flex items-center gap-3 p-4 bg-base-200 rounded-lg">
              <div className="text-3xl">{category.icon || '📦'}</div>
              <div>
                <p className="font-semibold">{getCategoryName(category.category_name)}</p>
                <p className="text-sm text-base-content/60">
                  {t('productCount', { count: productCount })}
                </p>
              </div>
            </div>

            {/* 删除信息提示 */}
            <div className={`alert ${canDelete ? 'alert-info' : 'alert-warning'}`}>
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
                />
              </svg>
              <span>{deleteMessage}</span>
            </div>

            {/* 操作选择 */}
            {!canDelete && (
              <div className="form-control space-y-2">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="radio"
                    name="deleteAction"
                    className="radio radio-primary"
                    checked={deleteAction === 'disable'}
                    onChange={() => setDeleteAction('disable')}
                    disabled={isSubmitting}
                  />
                  <div>
                    <span className="label-text font-semibold">
                      {t('delete.optionDisable')}
                    </span>
                    <p className="text-sm text-base-content/60">
                      {t('delete.optionDisableDesc')}
                    </p>
                  </div>
                </label>

                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="radio"
                    name="deleteAction"
                    className="radio radio-error"
                    checked={deleteAction === 'delete'}
                    onChange={() => setDeleteAction('delete')}
                    disabled={isSubmitting}
                  />
                  <div>
                    <span className="label-text font-semibold text-error">
                      {t('delete.optionDelete')}
                    </span>
                    <p className="text-sm text-base-content/60">
                      {t('delete.optionDeleteDesc')}
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* 最终确认提示 */}
            {deleteAction === 'delete' && (
              <div className="alert alert-error">
                <HiExclamationTriangle className="w-6 h-6" />
                <span>{t('delete.finalWarning')}</span>
              </div>
            )}
          </div>
        )}

        {/* 按钮 */}
        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isSubmitting || loading}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            className={`btn ${deleteAction === 'delete' ? 'btn-error' : 'btn-warning'}`}
            onClick={handleConfirm}
            disabled={isSubmitting || loading}
          >
            {isSubmitting && <span className="loading loading-spinner"></span>}
            {deleteAction === 'delete' ? t('confirmDelete') : t('confirmDisable')}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
