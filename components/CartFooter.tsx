// components/CartFooter.tsx
"use client";

import { useCart } from "@/context/CartContext";
import BuyButton from "./BuyButton";

export default function CartFooter() {
  const { 
    cart, 
    clearCart 
  } = useCart();

  const { items, merchantId, itemCount: totalItems, total: totalPrice } = cart;
  
  // 获取所有商品ID
  const productIds = items.map(item => item.product_id);
  
  // 计算总数量
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  if (totalItems === 0) {
    return null;
  }

  console.log('购物车商户ID:', merchantId);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm text-gray-600">共 {totalItems} 件商品</div>
            <div className="font-bold text-lg">
              ฿{totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          
          <div className="flex-1 max-w-xs ml-4">
            <BuyButton
              productIds={productIds}
              merchantPromptPayId={merchantId} // 这里传递的是 merchant_id，但API需要promptpay_id
              quantity={totalQuantity}
              showQuantitySelector={false}
              buttonText={`结算 (฿${totalPrice.toFixed(2)})`}
              stockQuantity={999}
              onQuantityChange={() => {}}
            />
          </div>
        </div>
        
        <button 
          className="btn btn-ghost btn-sm w-full mt-2"
          onClick={clearCart}
        >
          清空购物车
        </button>
      </div>
    </div>
  );
}