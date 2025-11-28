// 文件: /components/BuyButton.tsx 未修改的版本
"use client";

import { useState } from "react";
import QRCode from 'react-qr-code'; 
import { HiXMark, HiMinus, HiPlus } from 'react-icons/hi2'; // 引入加减图标
import { useRouter } from 'next/navigation';

interface BuyButtonProps {
  couponId: string;
  sellingPrice: number;
  merchantPromptPayId: string;
  stockQuantity: number; // 新增：接收库存数量，用于限制购买上限
}

interface PaymentInfo {
    orderId: string;
    amount: number;
    promptPayId: string;
    promptpayPayload: string;
}

export default function BuyButton({ couponId, merchantPromptPayId, stockQuantity }: BuyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 新增：购买数量状态，默认为 1
  const [quantity, setQuantity] = useState(1);
  
  const router = useRouter();

  // 增加数量
  const handleIncrease = () => {
    if (quantity < stockQuantity) {
      setQuantity(prev => prev + 1);
    }
  };

  // 减少数量
  const handleDecrease = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  // 1. 购买/生成订单函数
  const handleCheckout = async () => {
    if (!merchantPromptPayId) {
        setError('商户收款设置不完整，暂时无法购买。');
        return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 传递动态选择的数量
        body: JSON.stringify({ couponId, quantity: quantity }), 
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setPaymentInfo({
            orderId: data.orderId,
            amount: data.amount, // 使用后端计算的总价
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
  
  // 2. 完成支付流程
  const goToOrderPage = () => {
      setPaymentInfo(null);
      setError(null);
      router.push('/client/orders'); // 确保路径正确，通常是 /client/orders 或 /my/orders
  };
  
  // 3. 关闭弹窗
  const closePaymentModal = () => {
      setPaymentInfo(null);
      setError(null);
  };

  return (
    <>
      <div className="flex items-center gap-3">
        {/* 数量选择器 */}
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
                disabled={quantity >= stockQuantity || loading}
            >
                <HiPlus className="w-4 h-4" />
            </button>
        </div>

        {/* 购买按钮 */}
        <button 
            className="btn btn-primary h-12 px-8 text-lg shadow-lg shadow-primary/30"
            onClick={handleCheckout} 
            disabled={loading || stockQuantity <= 0}
        >
            {loading ? <span className="loading loading-spinner"></span> : (stockQuantity > 0 ? "立即购买" : "缺货")}
        </button>
      </div>

      {/* 购买成功后的支付模态框 */}
      {paymentInfo && (
        <dialog className="modal modal-open">
          <div className="modal-box w-11/12 max-w-sm text-center relative p-6">
            
            {/* 新增：关闭按钮 */}
            <button 
                className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                onClick={closePaymentModal}
            >
                <HiXMark className="w-6 h-6" />
            </button>

            <h3 className="font-bold text-2xl text-primary mb-4 mt-2">
               扫码支付
            </h3>
            <p className="text-sm text-base-content/80 mb-2">
                订单金额 ({quantity} 张)
            </p>
            <p className="font-bold text-2xl text-error mb-6">
                ฿{paymentInfo.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>

            {/* PromptPay 二维码区域 */}
            <div className="flex justify-center mb-6 p-4 bg-white rounded-xl shadow-inner border border-base-200">
                <QRCode 
                    value={paymentInfo.promptpayPayload} 
                    size={200}
                    level="M" // 调整为 M 级别通常更易扫码
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
            </div>
            
            <div className="text-xs text-base-content/50 space-y-1 mb-6">
                <p>商户ID: {paymentInfo.promptPayId}</p>
                <p>订单号: {paymentInfo.orderId.slice(0, 8)}...</p>
            </div>

            <div className="modal-action justify-center w-full">
              <button className="btn btn-primary w-full" onClick={goToOrderPage}>
                  已付款，去上传凭证
              </button>
            </div>
          </div>
          {/* 点击背景关闭 */}
          <form method="dialog" className="modal-backdrop">
            <button onClick={closePaymentModal}>close</button>
          </form>
        </dialog>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="toast toast-end z-100">
          <div className="alert alert-error shadow-lg">
            <HiXMark className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </>
  );
}