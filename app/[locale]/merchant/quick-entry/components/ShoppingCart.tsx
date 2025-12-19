// app/[locale]/merchant/quick-entry/components/ShoppingCart.tsx
'use client';

import { useTranslations, useLocale } from 'next-intl';
import { HiTrash, HiPlus, HiMinus } from 'react-icons/hi2';
import type { CashOrderItem } from '@/app/types/accounting';

type ShoppingCartProps = {
  items: CashOrderItem[];
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
  onCheckout: () => void;
  onClear: () => void;
};

export function ShoppingCart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onClear,
}: ShoppingCartProps) {
  const t = useTranslations('quickEntry');
  const locale = useLocale();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleQuantityChange = (index: number, delta: number) => {
    const currentQuantity = items[index].quantity;
    const newQuantity = Math.max(1, currentQuantity + delta);
    onUpdateQuantity(index, newQuantity);
  };

  if (items.length === 0) {
    return (
      <div className="card bg-base-100 shadow-md h-full">
        <div className="card-body">
          <h3 className="card-title text-lg">{t('income.cart.title')}</h3>
          <div className="flex-1 flex items-center justify-center text-base-content/40">
            <div className="text-center">
              <p className="text-6xl mb-4">🛒</p>
              <p>{t('income.cart.empty')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-md h-full flex flex-col">
      <div className="card-body flex flex-col">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-title text-lg">
            {t('income.cart.title')} ({totalItems})
          </h3>
          <button
            type="button"
            onClick={onClear}
            className="btn btn-ghost btn-sm"
          >
            {t('income.cart.clear')}
          </button>
        </div>

        {/* 购物车项目列表 */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {items.map((item, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${
                item.type === 'coupon'
                  ? 'border-accent/30 bg-accent/5'
                  : 'border-base-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                {/* 商品信息 */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-xs text-base-content/60 mt-1">
                    {formatCurrency(item.price)} × {item.quantity}
                  </p>
                </div>

                {/* 小计 */}
                <div className="text-right">
                  <p className={`font-semibold ${
                    item.subtotal < 0 ? 'text-accent' : 'text-primary'
                  }`}>
                    {formatCurrency(item.subtotal)}
                  </p>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-2 mt-2">
                {item.type === 'product' && (
                  <div className="join">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(index, -1)}
                      className="btn btn-xs join-item"
                      disabled={item.quantity <= 1}
                    >
                      <HiMinus className="w-3 h-3" />
                    </button>
                    <span className="btn btn-xs join-item no-animation">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(index, 1)}
                      className="btn btn-xs join-item"
                    >
                      <HiPlus className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveItem(index)}
                  className="btn btn-xs btn-ghost text-error"
                >
                  <HiTrash className="w-3 h-3" />
                  {t('income.cart.remove')}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 总计 */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xl font-semibold">{t('income.cart.total')}</span>
            <span className={`text-2xl font-bold ${
              total < 0 ? 'text-error' : 'text-primary'
            }`}>
              {formatCurrency(total)}
            </span>
          </div>

          {/* 结算按钮 */}
          <button
            type="button"
            onClick={onCheckout}
            className="btn btn-primary btn-lg w-full"
            disabled={total <= 0}
          >
            {t('income.cart.checkout')}
          </button>

          {total <= 0 && (
            <p className="text-xs text-error text-center mt-2">
              {t('income.cart.invalidTotal')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
