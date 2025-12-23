// app/[locale]/merchant/quick-entry/components/IncomePOSTab.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ProductGrid } from './ProductGrid';
import { ShoppingCart } from './ShoppingCart';
import { CheckoutModal } from './CheckoutModal';
import { QRCheckoutModal } from './QRCheckoutModal';
import { createCashOrder } from '@/app/actions/accounting/cash-orders';
import { getMerchantBalanceForQR } from '@/app/actions/accounting/get-balance';
import type { CashOrderItem } from '@/app/types/accounting';

type IncomePOSTabProps = {
  merchantId: string;
  onSuccess?: () => void;
};

export function IncomePOSTab({ merchantId, onSuccess }: IncomePOSTabProps) {
  const t = useTranslations('quickEntry');
  const [cartItems, setCartItems] = useState<CashOrderItem[]>([]);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isQRCheckoutModalOpen, setIsQRCheckoutModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [promptpayId, setPromptpayId] = useState<string>('');

  // 添加商品到购物车
  const handleAddItem = (item: CashOrderItem) => {
    setCartItems((prev) => {
      // 检查是否已存在相同商品
      const existingIndex = prev.findIndex(
        (i) => i.id === item.id && i.type === item.type
      );

      if (existingIndex >= 0) {
        // 已存在，增加数量 - 创建新对象而不是修改现有对象
        const newItems = [...prev];
        const existingItem = newItems[existingIndex];
        const newQuantity = existingItem.quantity + 1;
        newItems[existingIndex] = {
          ...existingItem,
          quantity: newQuantity,
          subtotal: existingItem.price * newQuantity,
        };
        return newItems;
      } else {
        // 不存在，添加新项
        return [...prev, item];
      }
    });
  };

  // 更新商品数量
  const handleUpdateQuantity = (index: number, quantity: number) => {
    setCartItems((prev) => {
      const newItems = [...prev];
      const item = newItems[index];
      newItems[index] = {
        ...item,
        quantity: quantity,
        subtotal: item.price * quantity,
      };
      return newItems;
    });
  };

  // 移除商品
  const handleRemoveItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  // 清空购物车
  const handleClearCart = () => {
    if (confirm(t('income.cart.confirmClear'))) {
      setCartItems([]);
    }
  };

  // 打开现金结算弹窗
  const handleCheckout = () => {
    setIsCheckoutModalOpen(true);
  };

  // 打开二维码结算弹窗（需先检查KYC和余额）
  const handleQRCheckout = async () => {
    setIsCheckingBalance(true);

    const balanceResult = await getMerchantBalanceForQR(merchantId);

    setIsCheckingBalance(false);

    if (!balanceResult.success) {
      alert(t('income.qrCheckout.balanceCheckError'));
      return;
    }

    // 检查KYC状态
    if (!balanceResult.data?.hasKYC) {
      alert(t('income.qrCheckout.kycRequired'));
      return;
    }

    // 检查余额
    if (!balanceResult.data?.hasEnoughForQR) {
      const balance = balanceResult.data?.balance || 0;
      alert(
        t('income.qrCheckout.insufficientBalance') + '\n' +
        t('income.qrCheckout.currentBalance') + ': ฿' + balance.toFixed(2) + '\n' +
        t('income.qrCheckout.requiredBalance') + ': ฿3.00'
      );
      return;
    }

    // 保存 promptpayId 用于生成 QR 码
    setPromptpayId(balanceResult.data.promptpayId || '');

    // KYC已验证且余额足够，打开二维码结算弹窗
    setIsQRCheckoutModalOpen(true);
  };

  // 确认二维码结算
  const handleConfirmQRCheckout = async (data: {
    note?: string;
  }) => {
    setIsSubmitting(true);

    const result = await createCashOrder({
      merchant_id: merchantId,
      items: cartItems,
      note: data.note,
      payment_method: 'qr_code',
    });

    setIsSubmitting(false);

    if (result.success) {
      alert(t('income.success') + '\n' + t('income.orderNumber') + ': ' + result.data?.order_number);
      setCartItems([]);
      setIsQRCheckoutModalOpen(false);
      onSuccess?.();
    } else {
      alert(t('income.error') + ': ' + (result.error || 'Unknown error'));
    }
  };

  // 确认现金结算
  const handleConfirmCheckout = async (data: {
    note?: string;
  }) => {
    setIsSubmitting(true);

    const result = await createCashOrder({
      merchant_id: merchantId,
      items: cartItems,
      note: data.note,
    });

    setIsSubmitting(false);

    if (result.success) {
      // 成功提示
      alert(t('income.success') + '\n' + t('income.orderNumber') + ': ' + result.data?.order_number);

      // 清空购物车
      setCartItems([]);

      // 关闭弹窗
      setIsCheckoutModalOpen(false);

      // 触发刷新回调
      onSuccess?.();
    } else {
      alert(t('income.error') + ': ' + (result.error || 'Unknown error'));
    }
  };

  const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 左侧：商品选择区 */}
      <div className="lg:col-span-2">
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">{t('income.selectProducts')}</h3>
            <ProductGrid merchantId={merchantId} onAddItem={handleAddItem} />
          </div>
        </div>
      </div>

      {/* 右侧：购物车 */}
      <div className="lg:col-span-1">
        <div className="sticky top-4">
          <ShoppingCart
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onCheckout={handleCheckout}
            onQRCheckout={handleQRCheckout}
            onClear={handleClearCart}
            isCheckingBalance={isCheckingBalance}
          />
        </div>
      </div>

      {/* 现金结算弹窗 */}
      <CheckoutModal
        items={cartItems}
        total={total}
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        onConfirm={handleConfirmCheckout}
        isSubmitting={isSubmitting}
      />

      {/* 二维码结算弹窗 */}
      <QRCheckoutModal
        items={cartItems}
        total={total}
        isOpen={isQRCheckoutModalOpen}
        onClose={() => setIsQRCheckoutModalOpen(false)}
        onConfirm={handleConfirmQRCheckout}
        isSubmitting={isSubmitting}
        merchantId={merchantId}
        promptpayId={promptpayId}
      />
    </div>
  );
}
