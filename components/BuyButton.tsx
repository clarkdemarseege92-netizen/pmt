// 文件: /components/BuyButton.tsx
"use client";

import { useState } from "react";
// 引入二维码库，假设 react-qr-code 已安装
import QRCode from 'react-qr-code'; 
import { HiXMark } from 'react-icons/hi2';
import { useRouter } from 'next/navigation';

// 定义组件接收的全部 Props
interface BuyButtonProps {
  couponId: string;
  sellingPrice: number;
  merchantPromptPayId: string;
  // 可以添加 quantity: number = 1; 如果需要数量选择器
}

// 类型定义用于支付信息
interface PaymentInfo {
    orderId: string;
    amount: number;
    promptPayId: string;
    promptpayPayload: string; // 后端生成的用于渲染二维码的字符串
}

export default function BuyButton({ couponId, sellingPrice, merchantPromptPayId }: BuyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 1. 购买/生成订单函数
  const handleCheckout = async () => {
    // 基础检查：确保商户设置了收款 ID
    if (!merchantPromptPayId) {
        setError('商户收款设置不完整，暂时无法购买。');
        return;
    }
    
    setLoading(true);
    setError(null);

    // 1. 调用您的 API 路由，创建待处理 (pending) 订单
    try {
      // 假设您的 /api/checkout 路由接受 couponId 和 quantity (默认为 1)
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ couponId, quantity: 1 }), // 默认购买数量为 1
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // API 路由应返回 orderId, promptpayPayload 等信息
        setPaymentInfo({
            orderId: data.orderId,
            amount: sellingPrice,
            promptPayId: merchantPromptPayId,
            promptpayPayload: data.promptpayPayload, // 后端生成的 EMVCo 字符串
        });
        // 模态框将自动显示，同时用户可以跳转到订单页查看
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
  
  // 2. 完成支付流程，跳转到订单页
  const goToOrderPage = () => {
      setPaymentInfo(null);
      setError(null);
      // 支付流程启动后，引导用户前往订单列表查看状态
      router.push('/my/orders'); 
  };
  

  return (
    <>
      {/* 购买按钮 */}
      <button 
        className="btn btn-primary btn-lg flex-1 text-lg shadow-lg shadow-primary/30"
        onClick={handleCheckout} 
        disabled={loading}
      >
        {loading ? <span className="loading loading-spinner"></span> : "立即购买"}
      </button>

      {/* 购买成功后的支付模态框 */}
      {paymentInfo && (
        <dialog id="payment_modal" className="modal modal-open">
          <div className="modal-box w-11/12 max-w-sm text-center">
            
            <h3 className="font-bold text-2xl text-primary mb-4">
               请扫描二维码完成支付
            </h3>
            <p className="text-sm text-base-content/80 mb-6">
                订单金额：<span className='font-bold text-lg text-error'>{paymentInfo.amount.toFixed(2)} THB</span>
            </p>

            {/* PromptPay 二维码区域 */}
            <div className="flex justify-center mb-6 p-4 bg-white rounded-lg shadow-inner border border-base-200">
                <QRCode 
                    value={paymentInfo.promptpayPayload} // 使用后端生成的 EMVCo Payload
                    size={200}
                    level="H"
                />
            </div>
            
            <p className="text-xs text-base-content/70">
                商户收款 ID: {paymentInfo.promptPayId}
            </p>
            <p className="text-xs text-base-content/70 mb-4">
                订单号: {paymentInfo.orderId.slice(0, 8)}...
            </p>

            <div className="modal-action justify-center">
              <button className="btn btn-primary" onClick={goToOrderPage}>下一步：上传凭证</button>
            </div>
            <div className="text-xs text-base-content/50 mt-4">
                完成银行转账后，请前往“我的订单”上传支付凭证。
            </div>
          </div>
        </dialog>
      )}

      {/* 错误提示 (在底部固定操作栏中可能被遮挡，但保留此逻辑) */}
      {error && (
        <div className="toast toast-end">
          <div className="alert alert-error">
            <HiXMark className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </>
  );
}