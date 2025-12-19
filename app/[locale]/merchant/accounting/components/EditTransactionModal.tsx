// app/[locale]/merchant/accounting/components/EditTransactionModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { updateManualTransaction } from '@/app/actions/accounting/transactions';
import { getCategories } from '@/app/actions/accounting/categories';
import type { AccountCategory, AccountTransactionWithCategory } from '@/app/types/accounting';
import { HiXMark } from 'react-icons/hi2';

type EditTransactionModalProps = {
  merchantId: string;
  transaction: AccountTransactionWithCategory;
  onClose: () => void;
  onSuccess: () => void;
};

export function EditTransactionModal({
  merchantId,
  transaction,
  onClose,
  onSuccess,
}: EditTransactionModalProps) {
  const t = useTranslations('accounting');
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [formData, setFormData] = useState({
    type: transaction.type,
    amount: transaction.amount.toString(),
    category_id: transaction.category_id || '',
    note: transaction.note || '',
    transaction_date: transaction.transaction_date,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const filteredCategories = categories.filter(cat => cat.type === formData.type);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = t('validation.amountRequired');
    }

    if (!formData.transaction_date) {
      newErrors.transaction_date = t('validation.dateRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    const result = await updateManualTransaction({
      transaction_id: transaction.transaction_id,
      type: formData.type,
      amount: parseFloat(formData.amount),
      category_id: formData.category_id || null,
      note: formData.note || null,
      transaction_date: formData.transaction_date,
    });

    setLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      alert(result.error || t('updateError'));
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{t('editTransaction')}</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 类型（只读） */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('type')}</span>
            </label>
            <div className="flex gap-4">
              <span className={`badge ${formData.type === 'income' ? 'badge-success' : 'badge-error'} badge-lg`}>
                {t(formData.type)}
              </span>
            </div>
            <label className="label">
              <span className="label-text-alt">{t('typeCannotChange')}</span>
            </label>
          </div>

          {/* 金额 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('amount')}</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className={`input input-bordered ${errors.amount ? 'input-error' : ''}`}
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
            {errors.amount && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.amount}</span>
              </label>
            )}
          </div>

          {/* 类目 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('category')}</span>
            </label>
            <select
              className="select select-bordered"
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            >
              <option value="">{t('selectCategory')}</option>
              {filteredCategories.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.icon && `${cat.icon} `}
                  {getCategoryName(cat)}
                  {cat.is_system && ` (${t('systemCategory')})`}
                </option>
              ))}
            </select>
          </div>

          {/* 交易日期 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('transactionDate')}</span>
            </label>
            <input
              type="date"
              className={`input input-bordered ${errors.transaction_date ? 'input-error' : ''}`}
              value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
            />
            {errors.transaction_date && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.transaction_date}</span>
              </label>
            )}
          </div>

          {/* 备注 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('note')}</span>
              <span className="label-text-alt">{t('optional')}</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-20"
              placeholder={t('notePlaceholder')}
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              maxLength={500}
            />
          </div>

          {/* 操作按钮 */}
          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={loading}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading && <span className="loading loading-spinner loading-sm"></span>}
              {t('saveChanges')}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
