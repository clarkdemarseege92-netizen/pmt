// components/BuyButton.tsx
"use client";

import { useState, useEffect } from "react";
import QRCode from 'react-qr-code'; 
import { HiXMark, HiMinus, HiPlus } from 'react-icons/hi2';
import { useRouter } from 'next/navigation';

interface BuyButtonProps {
  couponId?: string;
  productIds?: string[];
  merchantPromptPayId: string;
  stockQuantity?: number;
  quantity?: number;
  onQuantityChange?: (quantity: number) => void;
  showQuantitySelector?: boolean;
  buttonText?: string;
  className?: string;
}

interface PaymentInfo {
    orderId: string;
    amount: number;
    promptPayId: string;
    promptpayPayload: string;
}

export default function BuyButton({ 
  couponId, 
  productIds,
  merchantPromptPayId, 
  stockQuantity = 999,
  quantity: externalQuantity,
  onQuantityChange,
  showQuantitySelector = true,
  buttonText = "立即购买",
  className = ""
}: BuyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [internalQuantity, setInternalQuantity] = useState(1);
  const quantity = externalQuantity !== undefined ? externalQuantity : internalQuantity;
  
  const router = useRouter();

  // 防止背景滚动
  useEffect(() => {
    if (paymentInfo) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [paymentInfo]);

  const handleIncrease = () => {
    const newQuantity = quantity + 1;
    if (couponId && newQuantity > stockQuantity) {
      return;
    }
    if (onQuantityChange) {
      onQuantityChange(newQuantity);
    } else {
      setInternalQuantity(newQuantity);
    }
  };

  const handleDecrease = () => {
    const newQuantity = quantity - 1;
    if (newQuantity >= 1) {
      if (onQuantityChange) {
        onQuantityChange(newQuantity);
      } else {
        setInternalQuantity(newQuantity);
      }
    }
  };

  const handleCheckout = async () => {
    if (!merchantPromptPayId) {
        setError('商户收款设置不完整，暂时无法购买。');
        return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const payload = productIds 
        ? { productIds, quantity } // 购物车模式
        : { couponId, quantity };  // 单商品模式

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), 
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setPaymentInfo({
            orderId: data.orderId,
            amount: data.amount,
            promptPayId: merchantPromptPayId,
            promptpayPayload: data.promptpayPayload,
        });
      } else {
        setError(data.message || '购买失败，请检查登录状态或重试。');
      }

    } catch (e) {
      setError('网络或服务器错误，请稍后重试。');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isOutOfStock = couponId ? stockQuantity <= 0 : false;
  const isQuantityExceeded = couponId ? quantity >= stockQuantity : false;

  return (
    <>
      <div className={`flex items-center gap-3 ${className}`}>
        {showQuantitySelector && (
          <div className="flex items-center border border-base-300 rounded-lg h-12 bg-base-100">
            <button 
                className="btn btn-ghost btn-sm h-full px-3 rounded-l-lg rounded-r-none text-base-content/70"
                onClick={handleDecrease}
                disabled={quantity <= 1 || loading}
            >
                <HiMinus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold text-base-content">{quantity}</span>
            <button 
                className="btn btn-ghost btn-sm h-full px-3 rounded-r-lg rounded-l-none text-base-content/70"
                onClick={handleIncrease}
                disabled={isQuantityExceeded || loading}
            >
                <HiPlus className="w-4 h-4" />
            </button>
          </div>
        )}

        <button 
            className="btn btn-primary h-12 px-8 text-lg shadow-lg shadow-primary/30 flex-1"
            onClick={handleCheckout} 
            disabled={loading || isOutOfStock}
        >
            {loading ? <span className="loading loading-spinner"></span> : (isOutOfStock ? "缺货" : buttonText)}
        </button>
      </div>

      {/* 支付模态框 - 修复遮挡问题 */}
      {paymentInfo && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
          {/* 背景遮罩 - 只覆盖可见区域，不影响页面背景 */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={() => setPaymentInfo(null)}
          />
          
          {/* 模态框内容 */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-auto p-6 z-10000 transform transition-all">
            {/* 关闭按钮 */}
            <button 
              className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 z-10 hover:bg-base-200"
              onClick={() => setPaymentInfo(null)}
            >
              <HiXMark className="w-5 h-5" />
            </button>

            <div className="text-center pt-2">
              <h3 className="font-bold text-2xl text-primary mb-3">扫码支付</h3>
              <p className="text-sm text-base-content/80 mb-1">订单金额</p>
              <p className="text-sm text-base-content/60 mb-3">({quantity} 件商品)</p>
              <p className="font-bold text-3xl text-error mb-6">
                ฿{paymentInfo.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>

              {/* 二维码区域 */}
              <div className="flex justify-center mb-6 p-4 bg-white rounded-xl shadow-inner border border-base-300">
                <QRCode 
                  value={paymentInfo.promptpayPayload} 
                  size={200}
                  level="M"
                  style={{ 
                    height: "auto", 
                    maxWidth: "100%", 
                    width: "100%",
                    borderRadius: '8px'
                  }}
                />
              </div>
              
              <div className="text-xs text-base-content/50 space-y-1 mb-6 bg-base-100 p-3 rounded-lg">
                <p className="truncate">商户: {paymentInfo.promptPayId}</p>
                <p className="truncate">订单: {paymentInfo.orderId.slice(0, 12)}...</p>
              </div>

              <div className="flex gap-3">
                <button 
                  className="btn btn-outline flex-1 btn-sm"
                  onClick={() => setPaymentInfo(null)}
                >
                  取消
                </button>
                <button 
                  className="btn btn-primary flex-1 btn-sm"
                  onClick={() => {
                    setPaymentInfo(null);
                    setError(null);
                    document.body.style.overflow = 'unset';
                    router.push('/client/orders');
                  }}
                >
                  已付款
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="toast toast-end z-10001">
          <div className="alert alert-error shadow-lg">
            <HiXMark className="w-5 h-5" />
            <span className="flex-1">{error}</span>
            <button 
              className="btn btn-ghost btn-xs" 
              onClick={() => setError(null)}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </>
  );
}