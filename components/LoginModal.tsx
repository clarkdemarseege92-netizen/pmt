// components/LoginModal.tsx
'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';

export default function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { convertToRegisteredUser } = useCart();
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async () => {
    setIsLoading(true);
    // 调用发送验证码 API
    try {
      await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });
      setStep('verify');
    } catch (error) {
      console.error('发送验证码失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    setIsLoading(true);
    try {
      await convertToRegisteredUser(phone);
      onClose();
    } catch (error) {
      console.error('验证失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-sm w-full p-6">
        <h2 className="text-xl font-bold mb-4">
          {step === 'phone' ? '输入手机号' : '验证手机号'}
        </h2>
        
        {step === 'phone' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">手机号码</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入您的手机号"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <button
              onClick={handleSendCode}
              disabled={!phone || isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg disabled:bg-gray-400"
            >
              {isLoading ? '发送中...' : '发送验证码'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">验证码</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="请输入验证码"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <button
              onClick={handleVerify}
              disabled={!verificationCode || isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg disabled:bg-gray-400"
            >
              {isLoading ? '验证中...' : '确认并注册'}
            </button>
          </div>
        )}
        
        <button
          onClick={onClose}
          className="w-full mt-4 text-gray-600 py-2 rounded-lg border border-gray-300"
        >
          稍后再说
        </button>
        
        <p className="text-xs text-gray-500 mt-4 text-center">
          注册即表示同意用户协议和隐私政策
        </p>
      </div>
    </div>
  );
}