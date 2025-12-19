// File: /app/[locale]/merchant/onboarding/page.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';

export default function OnboardingPage() {
  const t = useTranslations('merchantOnboarding');
  const router = useRouter();
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('errors.notLoggedIn'));

      // 1. Insert merchant record and get merchant_id
      const { data: newMerchant, error: insertError } = await supabase
        .from("merchants")
        .insert({
          owner_id: user.id,
          shop_name: formData.shopName,
          address: formData.address,
          contact_phone: formData.phone,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Create bonus transaction record
      const { error: transError } = await supabase.from("merchant_transactions").insert({
        merchant_id: newMerchant.merchant_id,
        type: 'bonus',
        amount: 2000,
        balance_after: 2000,
        description: t('bonusDescription')
      });

      if (transError) {
        console.error("Failed to create bonus transaction:", transError);
      }

      // 3. Upgrade user role to merchant via RPC
      const { error: rpcError } = await supabase.rpc('set_role_to_merchant', {
        user_uuid: user.id
      });

      if (rpcError) {
         console.error("Failed to upgrade user role:", rpcError);
      }

      // 4. Success! Redirect to dashboard
      router.push("/merchant/dashboard");

    } catch (err: unknown) {
      let errorMessage = t('errors.submitFailed');
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "object" && err !== null && "message" in err) {
         errorMessage = (err as { message: string }).message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="card w-full max-w-lg bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl justify-center mb-2">{t('title')}</h2>
          <p className="text-center text-base-content/60 mb-2">
            {t('subtitle')}
          </p>
          <div className="alert alert-success py-2 mb-4 text-sm">
             {t('bonusPromotion')}
          </div>

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
