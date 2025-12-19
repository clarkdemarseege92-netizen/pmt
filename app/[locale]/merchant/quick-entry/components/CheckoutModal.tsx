// app/[locale]/merchant/quick-entry/components/CheckoutModal.tsx
'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { CashOrderItem } from '@/app/types/accounting';

type CheckoutModalProps = {
  items: CashOrderItem[];
  total: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { note?: string }) => void;
  isSubmitting: boolean;
};

export function CheckoutModal({
  items,
  total,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
}: CheckoutModalProps) {
  const t = useTranslations('quickEntry');
  const locale = useLocale();
  const [note, setNote] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onConfirm({
      note: note.trim() || undefined,
    });
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setNote('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">{t('income.checkout.title')}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 订单摘要 */}
          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">{t('income.checkout.orderSummary')}</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <span className={item.subtotal < 0 ? 'text-accent' : ''}>
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-base-300 mt-3 pt-3 flex justify-between font-bold text-lg">
              <span>{t('income.checkout.total')}</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* 备注（可选） */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('income.checkout.note')}</span>
              <span className="label-text-alt text-base-content/60">
                {t('income.checkout.optional')}
              </span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              placeholder={t('income.checkout.notePlaceholder')}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* 操作按钮 */}
          <div className="modal-action">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-ghost"
              disabled={isSubmitting}
            >
              {t('income.checkout.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {t('income.checkout.confirming')}
                </>
              ) : (
                t('income.checkout.confirm')
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={handleClose}></div>
    </div>
  );
}
