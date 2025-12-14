// 文件: components/BuyButton.tsx
"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom"; // 1. 引入 createPortal
import QRCode from 'react-qr-code';
import { HiXMark, HiMinus, HiPlus } from 'react-icons/hi2';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

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
  buttonText,
  className = ""
}: BuyButtonProps) {
  const t = useTranslations('buyButton');
  const [loading, setLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUploadSlip, setShowUploadSlip] = useState(false);
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [selectedSlipFile, setSelectedSlipFile] = useState<File | null>(null);

  // 内部数量状态 (当未提供外部控制时使用)
  const [internalQuantity, setInternalQuantity] = useState(1);
  const quantity = externalQuantity !== undefined ? externalQuantity : internalQuantity;

  const router = useRouter();

  // 使用翻译的默认按钮文本
  const displayButtonText = buttonText || t('buyNow');

  // 2. 防止背景滚动 (当模态框打开时)
  useEffect(() => {
    if (paymentInfo || showUploadSlip) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [paymentInfo, showUploadSlip]);

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

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        setError(t('errors.invalidFileType'));
        return;
      }
      // 验证文件大小（最大 5MB）
      if (file.size > 5 * 1024 * 1024) {
        setError(t('errors.fileTooLarge'));
        return;
      }
      setSelectedSlipFile(file);
      setError(null);
    }
  };

  // 上传并验证付款凭证
  const handleUploadSlip = async () => {
    if (!selectedSlipFile || !paymentInfo) {
      setError(t('errors.selectSlipFirst'));
      return;
    }

    setUploadingSlip(true);
    setError(null);

    try {
      // 将图片转换为 base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedSlipFile);

      reader.onload = async () => {
        const base64Image = reader.result as string;

        console.log('📤 开始上传付款凭证...');

        const response = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: paymentInfo.orderId,
            slipImage: base64Image,
          }),
        });

        const result = await response.json();
        console.log('📥 验证结果:', result);

        if (!response.ok || !result.success) {
          setError(result.message || t('errors.verificationFailed'));
          setUploadingSlip(false);
          return;
        }

        console.log('✅ 付款凭证验证成功！');

        // 关闭所有模态框
        setShowUploadSlip(false);
        setPaymentInfo(null);
        setSelectedSlipFile(null);
        setUploadingSlip(false);
        document.body.style.overflow = 'unset';

        // 等待状态更新
        await new Promise(resolve => setTimeout(resolve, 500));

        // 跳转到订单页面
        router.push('/client/orders');
        router.refresh();
      };

      reader.onerror = () => {
        setError(t('errors.readFileFailed'));
        setUploadingSlip(false);
      };

    } catch (error) {
      console.error('❌ 上传付款凭证异常:', error);
      setError(t('errors.uploadFailed'));
      setUploadingSlip(false);
    }
  };

  const handleCheckout = async () => {
    if (!merchantPromptPayId) {
        setError(t('errors.merchantNotConfigured'));
        return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // 购物车模式 vs 单商品模式
      const payload = productIds 
        ? { productIds, quantity } 
        : { couponId, quantity };

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
        setError(data.message || t('errors.purchaseFailed'));
      }

    } catch (e) {
      setError(t('errors.networkError'));
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isOutOfStock = couponId ? stockQuantity <= 0 : false;
  const isQuantityExceeded = couponId ? quantity >= stockQuantity : false;

  // 3. 将模态框内容提取为变量，并使用 createPortal 渲染到 body
  // 这样可以确保它位于所有页面内容之上 (z-index 战争的终极解决方案)

  // 上传凭证模态框
  const uploadSlipModal = showUploadSlip && paymentInfo ? (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => !uploadingSlip && setShowUploadSlip(false)}
      />

      {/* 模态框内容 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto p-6 z-10000 transform transition-all animate-in fade-in zoom-in duration-200">
        {/* 关闭按钮 */}
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 z-10 hover:bg-base-200"
          onClick={() => {
            if (!uploadingSlip) {
              setShowUploadSlip(false);
              setSelectedSlipFile(null);
            }
          }}
          disabled={uploadingSlip}
        >
          <HiXMark className="w-5 h-5" />
        </button>

        <div className="text-center pt-2">
          <h3 className="font-bold text-2xl text-primary mb-3">{t('upload.title')}</h3>
          <p className="text-sm text-base-content/70 mb-2">
            {t('upload.subtitle')}
          </p>
          <p className="text-xs text-warning mb-6">
            ⏰ {t('upload.timeout')}
          </p>

          {/* 订单信息 */}
          <div className="bg-base-100 p-4 rounded-lg mb-6 text-left">
            <p className="text-sm mb-2">
              <span className="font-semibold">{t('upload.orderAmount')}:</span>{' '}
              <span className="text-lg font-bold text-error">
                ฿{paymentInfo.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </p>
            <p className="text-xs text-base-content/60 truncate">
              <span className="font-semibold">{t('upload.orderId')}:</span> {paymentInfo.orderId.slice(0, 20)}...
            </p>
          </div>

          {/* 文件选择区域 */}
          <div className="mb-6">
            <label
              htmlFor="slip-upload"
              className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                selectedSlipFile
                  ? 'border-success bg-success/10'
                  : 'border-base-300 bg-base-100 hover:bg-base-200'
              } ${uploadingSlip ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {selectedSlipFile ? (
                <div className="flex flex-col items-center">
                  <svg className="w-12 h-12 text-success mb-2" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm font-medium text-success">{t('upload.fileSelected')}</p>
                  <p className="text-xs text-base-content/60 mt-1 truncate max-w-[200px]">
                    {selectedSlipFile.name}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <svg className="w-12 h-12 text-base-content/40 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-sm font-medium text-base-content/70">{t('upload.clickToSelect')}</p>
                  <p className="text-xs text-base-content/50 mt-1">{t('upload.orDragDrop')}</p>
                  <p className="text-xs text-base-content/40 mt-2">{t('upload.supportedFormats')}</p>
                </div>
              )}
              <input
                id="slip-upload"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploadingSlip}
              />
            </label>
          </div>

          {/* 按钮组 */}
          <div className="flex gap-3">
            <button
              className="btn btn-outline flex-1"
              onClick={() => {
                setShowUploadSlip(false);
                setSelectedSlipFile(null);
              }}
              disabled={uploadingSlip}
            >
              {t('upload.back')}
            </button>
            <button
              className="btn btn-primary flex-1 text-white"
              onClick={handleUploadSlip}
              disabled={!selectedSlipFile || uploadingSlip}
            >
              {uploadingSlip ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {t('upload.verifying')}
                </>
              ) : (
                t('upload.submitVerify')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const paymentModal = paymentInfo && !showUploadSlip ? (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => setPaymentInfo(null)}
      />
      
      {/* 模态框内容 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-auto p-6 z-10000 transform transition-all animate-in fade-in zoom-in duration-200">
        {/* 关闭按钮 */}
        <button 
          className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 z-10 hover:bg-base-200"
          onClick={() => setPaymentInfo(null)}
        >
          <HiXMark className="w-5 h-5" />
        </button>

        <div className="text-center pt-2">
          <h3 className="font-bold text-2xl text-primary mb-3">{t('payment.title')}</h3>
          <p className="text-sm text-base-content/80 mb-1">{t('payment.amount')}</p>
          <p className="text-sm text-base-content/60 mb-3">({quantity} {t('payment.items')})</p>
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
          
          <div className="text-xs text-base-content/50 space-y-1 mb-6 bg-base-100 p-3 rounded-lg text-left">
            <p className="truncate"><span className="font-semibold">{t('payment.merchant')}:</span> {paymentInfo.promptPayId}</p>
            <p className="truncate"><span className="font-semibold">{t('payment.order')}:</span> {paymentInfo.orderId.slice(0, 12)}...</p>
          </div>

          <div className="flex gap-3">
            <button
              className="btn btn-outline flex-1 btn-sm"
              onClick={() => setPaymentInfo(null)}
            >
              {t('payment.cancel')}
            </button>
            <button
              className="btn btn-primary flex-1 btn-sm text-white"
              onClick={() => {
                console.log('🔵 点击"已付款"按钮，打开上传凭证界面');
                setShowUploadSlip(true);
              }}
            >
              {t('payment.uploadSlip')}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className={`flex items-center gap-3 ${className}`}>
        {showQuantitySelector && (
          <div className="flex items-center border border-base-300 rounded-lg h-12 bg-base-100 shrink-0">
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
            className="btn btn-primary h-12 px-8 text-lg shadow-lg shadow-primary/30 flex-1 min-w-[120px]"
            onClick={handleCheckout}
            disabled={loading || isOutOfStock}
        >
            {loading ? <span className="loading loading-spinner"></span> : (isOutOfStock ? t('outOfStock') : displayButtonText)}
        </button>
      </div>

      {/* 4. 使用 Portal 渲染模态框 */}
      {paymentInfo && typeof document !== 'undefined' && createPortal(paymentModal, document.body)}
      {showUploadSlip && typeof document !== 'undefined' && createPortal(uploadSlipModal, document.body)}

      {/* 错误提示 - 同样使用 Portal 以确保可见性 */}
      {error && typeof document !== 'undefined' && createPortal(
        <div className="toast toast-end z-10001">
          <div className="alert alert-error shadow-lg">
            <HiXMark className="w-5 h-5 cursor-pointer" onClick={() => setError(null)} />
            <span className="flex-1">{error}</span>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}