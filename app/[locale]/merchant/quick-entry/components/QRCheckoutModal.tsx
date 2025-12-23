// app/[locale]/merchant/quick-entry/components/QRCheckoutModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import QRCode from 'react-qr-code';
import { HiXMark, HiCheckCircle } from 'react-icons/hi2';
import type { CashOrderItem } from '@/app/types/accounting';
import { generatePromptPayPayload } from '@/lib/promptpay';

type QRCheckoutModalProps = {
  items: CashOrderItem[];
  total: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { note?: string }) => void;
  isSubmitting: boolean;
  merchantId: string;
  promptpayId: string; // 商户的 PromptPay ID
};

export function QRCheckoutModal({
  items,
  total,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  promptpayId,
}: QRCheckoutModalProps) {
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

  // 生成符合 PromptPay EMVCo 标准的二维码数据
  const qrPayload = useMemo(() => {
    if (!promptpayId || total <= 0) {
      return '';
    }
    try {
      return generatePromptPayPayload(promptpayId, total);
    } catch (error) {
      console.error('生成 PromptPay QR 失败:', error);
      return '';
    }
  }, [promptpayId, total]);

  const handleConfirmPayment = () => {
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

  // 防止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{t('income.qrCheckout.title')}</h3>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-sm btn-circle btn-ghost"
            disabled={isSubmitting}
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* 二维码区域 */}
        <div className="bg-white p-6 rounded-lg flex flex-col items-center mb-4">
          {qrPayload ? (
            <QRCode
              value={qrPayload}
              size={200}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
            />
          ) : (
            <div className="w-[200px] h-[200px] flex items-center justify-center bg-base-200 rounded-lg">
              <p className="text-error text-center text-sm">
                {t('income.qrCheckout.generateError')}
              </p>
            </div>
          )}
          <p className="text-sm text-base-content/60 mt-4 text-center">
            {t('income.qrCheckout.scanHint')}
          </p>
          {/* 显示 PromptPay ID */}
          <p className="text-xs text-base-content/40 mt-2">
            PromptPay: {promptpayId}
          </p>
        </div>

        {/* 订单摘要 */}
        <div className="bg-base-200 p-4 rounded-lg mb-4">
          <h4 className="font-semibold mb-3">{t('income.checkout.orderSummary')}</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
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

        {/* 备注 */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">{t('income.checkout.note')}</span>
            <span className="label-text-alt text-base-content/60">
              {t('income.checkout.optional')}
            </span>
          </label>
          <textarea
            className="textarea textarea-bordered"
            placeholder={t('income.checkout.notePlaceholder')}
            rows={2}
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
            type="button"
            onClick={handleConfirmPayment}
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                {t('income.checkout.confirming')}
              </>
            ) : (
              <>
                <HiCheckCircle className="w-5 h-5" />
                {t('income.qrCheckout.confirmPaid')}
              </>
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={handleClose}></div>
    </div>
  );
}
