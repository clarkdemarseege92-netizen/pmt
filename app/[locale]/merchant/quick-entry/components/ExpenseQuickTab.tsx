// app/[locale]/merchant/quick-entry/components/ExpenseQuickTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CategoryButtons } from './CategoryButtons';
import { ExpenseForm } from './ExpenseForm';
import { getExpenseCategories } from '@/app/actions/accounting/quick-entry';
import { createQuickExpense } from '@/app/actions/accounting/quick-entry';
import type { AccountCategory } from '@/app/types/accounting';

type ExpenseQuickTabProps = {
  merchantId: string;
  onSuccess?: () => void;
};

export function ExpenseQuickTab({ merchantId, onSuccess }: ExpenseQuickTabProps) {
  const t = useTranslations('quickEntry');
  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 加载支出类目
  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      const result = await getExpenseCategories(merchantId);
      if (result.success && result.data) {
        setCategories(result.data);
      }
      setLoading(false);
    };

    loadCategories();
  }, [merchantId]);

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
  };

  const handleSubmit = async (data: { amount: number; note: string; date: string }) => {
    if (!selectedCategoryId) {
      return;
    }

    setSubmitting(true);

    const result = await createQuickExpense({
      merchant_id: merchantId,
      category_id: selectedCategoryId,
      amount: data.amount,
      note: data.note,
      transaction_date: data.date,
    });

    setSubmitting(false);

    if (result.success) {
      // 成功提示
      alert(t('expense.success'));

      // 重置选择
      setSelectedCategoryId(null);

      // 触发刷新回调
      onSuccess?.();
    } else {
      alert(t('expense.error') + ': ' + (result.error || 'Unknown error'));
    }
  };

  const handleCancel = () => {
    setSelectedCategoryId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 类目选择区域 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">{t('expense.selectCategoryTitle')}</h3>
          <CategoryButtons
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={handleSelectCategory}
          />
        </div>
      </div>

      {/* 表单区域 */}
      {selectedCategoryId && (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">{t('expense.enterDetails')}</h3>
            <ExpenseForm
              selectedCategoryId={selectedCategoryId}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={submitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
