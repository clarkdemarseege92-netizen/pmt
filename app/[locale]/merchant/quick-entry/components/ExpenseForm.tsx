// app/[locale]/merchant/quick-entry/components/ExpenseForm.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type ExpenseFormProps = {
  selectedCategoryId: string | null;
  onSubmit: (data: { amount: number; note: string; date: string }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
};

export function ExpenseForm({
  selectedCategoryId,
  onSubmit,
  onCancel,
  isSubmitting,
}: ExpenseFormProps) {
  const t = useTranslations('quickEntry');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert(t('expense.validation.invalidAmount'));
      return;
    }

    onSubmit({
      amount: numAmount,
      note: note.trim(),
      date,
    });
  };

  const handleReset = () => {
    setAmount('');
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  // 快捷金额按钮
  const quickAmounts = [10, 20, 50, 100, 200, 500, 1000, 2000];

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  // 快捷日期按钮
  const getQuickDate = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  };

  const handleQuickDate = (daysAgo: number) => {
    setDate(getQuickDate(daysAgo));
  };

  if (!selectedCategoryId) {
    return (
      <div className="text-center py-12 text-base-content/60">
        <p className="text-lg">{t('expense.selectCategory')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 金额输入 */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold text-lg">
            {t('expense.amount')}
          </span>
        </label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder={t('expense.amountPlaceholder')}
          className="input input-bordered input-lg text-2xl"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          autoFocus
        />

        {/* 快捷金额按钮 */}
        <div className="mt-3">
          <label className="label">
            <span className="label-text text-sm">{t('expense.quickAmount')}</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handleQuickAmount(value)}
                className="btn btn-sm btn-outline"
              >
                ฿{value}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 备注 */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">{t('expense.note')}</span>
        </label>
        <textarea
          className="textarea textarea-bordered"
          placeholder={t('expense.notePlaceholder')}
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {/* 日期 */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">{t('expense.date')}</span>
        </label>
        <input
          type="date"
          className="input input-bordered"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        {/* 快捷日期按钮 */}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => handleQuickDate(0)}
            className="btn btn-xs btn-ghost"
          >
            {t('expense.today')}
          </button>
          <button
            type="button"
            onClick={() => handleQuickDate(1)}
            className="btn btn-xs btn-ghost"
          >
            {t('expense.yesterday')}
          </button>
          <button
            type="button"
            onClick={() => handleQuickDate(2)}
            className="btn btn-xs btn-ghost"
          >
            {t('expense.dayBeforeYesterday')}
          </button>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          type="submit"
          className="btn btn-primary flex-1"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              {t('expense.submitting')}
            </>
          ) : (
            t('expense.submit')
          )}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="btn btn-ghost"
          disabled={isSubmitting}
        >
          {t('expense.reset')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-ghost"
          disabled={isSubmitting}
        >
          {t('expense.cancel')}
        </button>
      </div>
    </form>
  );
}
