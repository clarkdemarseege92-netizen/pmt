// app/[locale]/checkout/CheckoutClient.tsx
'use client';

import { useCart } from '@/context/CartContext';
import { useState } from 'react';
import LoginModal from '@/components/LoginModal';
import { CartItem, MultiLangName } from '@/types/cart';
import {useTranslations} from 'next-intl';
import {useParams} from 'next/navigation';

// 修复 getLangName 函数的类型
const getLangName = (name: MultiLangName | null | undefined, lang = 'th'): string => {
  if (!name) return "N/A";
  return name[lang] || name['en'] || "N/A";
};

// 添加 processOrder 函数
const processOrder = async (): Promise<{ success: boolean; orderId?: string }> => {
  console.log('Processing order...');
  return { success: true, orderId: '123' };
};

export default function CheckoutClient() {
  const { cart, isTempUser } = useCart();
  const [showLoginModal, setShowLoginModal] = useState(isTempUser);
  const t = useTranslations('checkout');
  const params = useParams();
  const locale = params.locale as string;

  const handleCheckout = async (): Promise<void> => {
    if (isTempUser) {
      setShowLoginModal(true);
      return;
    }

    const result = await processOrder();
    if (result.success) {
      console.log('Order created:', result.orderId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>

        {/* 订单商品列表 */}
        <div className="bg-white rounded-lg p-4 mb-4">
          {cart.items.map((item: CartItem) => (
            <div key={item.product_id} className="flex justify-between items-center py-2">
              <div>
                <h3 className="font-medium">{getLangName(item.name, locale)}</h3>
                <p className="text-gray-600">฿{item.original_price} x {item.quantity}</p>
              </div>
              <span className="font-bold">฿{(item.original_price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* 总计 */}
        <div className="bg-white rounded-lg p-4 mb-6">
          <div className="flex justify-between text-xl font-bold">
            <span>{t('total')}:</span>
            <span>฿{cart.total.toFixed(2)}</span>
          </div>
        </div>

        {/* 结算按钮 */}
        <button
          onClick={handleCheckout}
          disabled={cart.items.length === 0}
          className="w-full bg-blue-600 text-white py-4 rounded-lg text-lg font-bold disabled:bg-gray-400"
        >
          {isTempUser ? t('registerAndPay') : t('payNow')}
        </button>

        {isTempUser && (
          <p className="text-center text-sm text-gray-600 mt-4">
            {t('registerBenefits')}
          </p>
        )}
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}
