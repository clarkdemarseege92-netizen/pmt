// app/[locale]/merchant/accounting/components/AddTransactionModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { createManualTransaction } from '@/app/actions/accounting/transactions';
import { getCategories } from '@/app/actions/accounting/categories';
import type { AccountCategory } from '@/app/types/accounting';
import { HiXMark } from 'react-icons/hi2';

type AddTransactionModalProps = {
  merchantId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function AddTransactionModal({ merchantId, onClose, onSuccess }: AddTransactionModalProps) {
  const t = useTranslations('accounting');
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    amount: '',
    category_id: '',
    note: '',
    transaction_date: new Date().toISOString().split('T')[0],
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

    if (!formData.category_id) {
      newErrors.category_id = t('validation.categoryRequired');
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
    const result = await createManualTransaction({
      merchant_id: merchantId,
      type: formData.type,
      amount: parseFloat(formData.amount),
      category_id: formData.category_id,
      note: formData.note || undefined,
      transaction_date: formData.transaction_date,
    });

    setLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      alert(result.error || t('createError'));
    }
  };

  const handleTypeChange = (type: 'income' | 'expense') => {
    setFormData({
      ...formData,
      type,
      category_id: '', // 重置类目选择
    });
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{t('addTransaction')}</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 类型选择 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('type')}</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  className="radio radio-success"
                  checked={formData.type === 'income'}
                  onChange={() => handleTypeChange('income')}
                />
                <span>{t('income')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  className="radio radio-error"
                  checked={formData.type === 'expense'}
                  onChange={() => handleTypeChange('expense')}
                />
                <span>{t('expense')}</span>
              </label>
            </div>
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
              className={`select select-bordered ${errors.category_id ? 'select-error' : ''}`}
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
            {errors.category_id && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.category_id}</span>
              </label>
            )}
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
              className={`btn ${formData.type === 'income' ? 'btn-success' : 'btn-error'}`}
              disabled={loading}
            >
              {loading && <span className="loading loading-spinner loading-sm"></span>}
              {t('confirm')}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
