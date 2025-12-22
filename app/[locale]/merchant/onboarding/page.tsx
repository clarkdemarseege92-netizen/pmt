// File: /app/[locale]/merchant/onboarding/page.tsx
"use client";

import { useState } from "react";
import { useTranslations } from 'next-intl';

export default function OnboardingPage() {
  const t = useTranslations('merchantOnboarding');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    shopName: "",
    address: "",
    phone: "",
  });

  const handleSubmit = async () => {
    if (!formData.shopName || !formData.address || !formData.phone) {
      setError(t('errors.fillRequired'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 调用 API 端点 (使用 Admin 客户端绕过 RLS)
      const response = await fetch('/api/merchant/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopName: formData.shopName,
          address: formData.address,
          phone: formData.phone,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || t('errors.submitFailed'));
      }

      // Success! 使用 window.location 强制跳转，确保页面完全刷新
      // 这样可以确保用户角色和商户数据在新页面中被正确加载
      window.location.href = "/merchant/dashboard";
      return; // 阻止后续代码执行

    } catch (err: unknown) {
      let errorMessage = t('errors.submitFailed');
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "object" && err !== null && "message" in err) {
         errorMessage = (err as { message: string }).message;
      }
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="card w-full max-w-lg bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl justify-center mb-2">{t('title')}</h2>
          <p className="text-center text-base-content/60 mb-4">
            {t('subtitle')}
          </p>

          {error && <div className="alert alert-error text-sm mb-4">{error}</div>}

          <div className="form-control w-full">
            <label className="label"><span className="label-text">{t('form.shopName')}</span></label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder={t('form.shopNamePlaceholder')}
              value={formData.shopName}
              onChange={(e) => setFormData({...formData, shopName: e.target.value})}
            />
          </div>

          <div className="form-control w-full mt-4">
            <label className="label"><span className="label-text">{t('form.phone')}</span></label>
            <input
              type="tel"
              className="input input-bordered w-full"
              placeholder={t('form.phonePlaceholder')}
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          <div className="form-control w-full mt-4">
            <label className="label"><span className="label-text">{t('form.address')}</span></label>
            <textarea
              className="textarea textarea-bordered h-24"
              placeholder={t('form.addressPlaceholder')}
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
            ></textarea>
          </div>

          <div className="card-actions justify-end mt-8">
            <button
              className="btn btn-primary w-full"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner"></span> : t('submitButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
