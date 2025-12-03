// 文件: components/UploadSlipModal.tsx
"use client";

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { HiXMark } from 'react-icons/hi2';
import { useRouter } from 'next/navigation';

interface UploadSlipModalProps {
  orderId: string;
  orderAmount: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadSlipModal({ orderId, orderAmount, isOpen, onClose }: UploadSlipModalProps) {
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [selectedSlipFile, setSelectedSlipFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        setError('请上传图片文件');
        return;
      }
      // 验证文件大小（最大 5MB）
      if (file.size > 5 * 1024 * 1024) {
        setError('图片大小不能超过 5MB');
        return;
      }
      setSelectedSlipFile(file);
      setError(null);
    }
  };

  // 上传并验证付款凭证
  const handleUploadSlip = async () => {
    if (!selectedSlipFile) {
      setError('请先选择付款凭证图片');
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
            orderId: orderId,
            slipImage: base64Image,
          }),
        });

        const result = await response.json();
        console.log('📥 验证结果:', result);

        if (!response.ok || !result.success) {
          setError(result.message || '付款凭证验证失败');
          setUploadingSlip(false);
          return;
        }

        console.log('✅ 付款凭证验证成功！');

        // 关闭模态框
        setSelectedSlipFile(null);
        setUploadingSlip(false);
        onClose();

        // 等待状态更新
        await new Promise(resolve => setTimeout(resolve, 500));

        // 刷新页面
        router.refresh();
      };

      reader.onerror = () => {
        setError('读取图片失败，请重试');
        setUploadingSlip(false);
      };

    } catch (error) {
      console.error('❌ 上传付款凭证异常:', error);
      setError('上传失败，请稍后重试');
      setUploadingSlip(false);
    }
  };

  const handleClose = () => {
    if (!uploadingSlip) {
      setSelectedSlipFile(null);
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => !uploadingSlip && handleClose()}
      />

      {/* 模态框内容 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto p-6 z-10000 transform transition-all animate-in fade-in zoom-in duration-200">
        {/* 关闭按钮 */}
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 z-10 hover:bg-base-200"
          onClick={handleClose}
          disabled={uploadingSlip}
        >
          <HiXMark className="w-5 h-5" />
        </button>

        <div className="text-center pt-2">
          <h3 className="font-bold text-2xl text-primary mb-3">上传付款凭证</h3>
          <p className="text-sm text-base-content/70 mb-2">
            请上传您的 PromptPay 转账截图
          </p>
          <p className="text-xs text-warning mb-6">
            ⏰ 订单将在 30 分钟后自动取消
          </p>

          {/* 订单信息 */}
          <div className="bg-base-100 p-4 rounded-lg mb-6 text-left">
            <p className="text-sm mb-2">
              <span className="font-semibold">订单金额:</span>{' '}
              <span className="text-lg font-bold text-error">
                ฿{orderAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </p>
            <p className="text-xs text-base-content/60 truncate">
              <span className="font-semibold">订单号:</span> {orderId.slice(0, 20)}...
            </p>
          </div>

          {/* 文件选择区域 */}
          <div className="mb-6">
            <label
              htmlFor={`slip-upload-${orderId}`}
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
                  <p className="text-sm font-medium text-success">已选择文件</p>
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
                  <p className="text-sm font-medium text-base-content/70">点击选择图片</p>
                  <p className="text-xs text-base-content/50 mt-1">或拖放图片到此处</p>
                  <p className="text-xs text-base-content/40 mt-2">支持 JPG, PNG（最大 5MB）</p>
                </div>
              )}
              <input
                id={`slip-upload-${orderId}`}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploadingSlip}
              />
            </label>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="alert alert-error mb-4">
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* 按钮组 */}
          <div className="flex gap-3">
            <button
              className="btn btn-outline flex-1"
              onClick={handleClose}
              disabled={uploadingSlip}
            >
              取消
            </button>
            <button
              className="btn btn-primary flex-1 text-white"
              onClick={handleUploadSlip}
              disabled={!selectedSlipFile || uploadingSlip}
            >
              {uploadingSlip ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  验证中...
                </>
              ) : (
                '提交验证'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}
