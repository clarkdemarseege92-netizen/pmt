// app/[locale]/merchant/quick-entry/components/IncomePOSTab.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ProductGrid } from './ProductGrid';
import { ShoppingCart } from './ShoppingCart';
import { CheckoutModal } from './CheckoutModal';
import { createCashOrder } from '@/app/actions/accounting/cash-orders';
import type { CashOrderItem } from '@/app/types/accounting';

type IncomePOSTabProps = {
  merchantId: string;
  onSuccess?: () => void;
};

export function IncomePOSTab({ merchantId, onSuccess }: IncomePOSTabProps) {
  const t = useTranslations('quickEntry');
  const [cartItems, setCartItems] = useState<CashOrderItem[]>([]);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // 打开结算弹窗
  const handleCheckout = () => {
    setIsCheckoutModalOpen(true);
  };

  // 确认结算
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
            onClear={handleClearCart}
          />
        </div>
      </div>

      {/* 结算弹窗 */}
      <CheckoutModal
        items={cartItems}
        total={total}
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        onConfirm={handleConfirmCheckout}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
