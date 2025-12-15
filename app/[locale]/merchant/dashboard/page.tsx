// 文件: /app/[locale]/merchant/dashboard/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { useTranslations } from 'next-intl';

type Merchant = {
  merchant_id: string;
  owner_id: string;
  shop_name: string;
  address: string;
  contact_phone: string;
  status: 'pending' | 'approved' | 'rejected';
  logo_url?: string;
  cover_image_urls?: string[];
  social_links?: Record<string, string>;
  created_at?: string;
};

// 入驻表单组件
const OnboardingForm = ({ user }: { user: User }) => {
  const t = useTranslations('merchantDashboard.onboarding');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [shopPhone, setShopPhone] = useState("");

  const handleSubmitApplication = async () => {
    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase.from("merchants").insert({
      owner_id: user.id,
      shop_name: shopName,
      address: address,
      contact_phone: shopPhone,
      status: 'pending'
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      window.location.reload();
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-2xl p-8 space-y-4 bg-base-100 rounded-lg shadow-xl">
      <h1 className="text-3xl font-bold text-center">{t('title')}</h1>
      <p className="text-center text-base-content/70">
        {t('subtitle')}
      </p>

      <div className="form-control">
        <label className="label"><span className="label-text">{t('shopName')}</span></label>
        <input
          type="text"
          placeholder={t('shopNamePlaceholder')}
          className="input input-bordered"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
        />
      </div>
      <div className="form-control">
        <label className="label"><span className="label-text">{t('address')}</span></label>
        <textarea
          className="textarea textarea-bordered h-24"
          placeholder={t('addressPlaceholder')}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        ></textarea>
      </div>
      <div className="form-control">
        <label className="label"><span className="label-text">{t('phone')}</span></label>
        <input
          type="tel"
          placeholder={t('phonePlaceholder')}
          className="input input-bordered"
          value={shopPhone}
          onChange={(e) => setShopPhone(e.target.value)}
        />
      </div>
      {error && (<div className="alert alert-error"><span>{error}</span></div>)}
      <div className="form-control pt-4">
        <button
          className="btn btn-primary"
          onClick={handleSubmitApplication}
          disabled={loading}
        >
          {loading && <span className="loading loading-spinner"></span>}
          {t('submit')}
        </button>
      </div>
    </div>
  );
};

// 仪表板统计组件
const StatsDashboard = ({ merchant }: { merchant: Merchant }) => {
  const t = useTranslations('merchantDashboard.stats');

  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold mb-4">{t('title')}</h1>
      {merchant.status === 'pending' && (
         <div className="alert alert-warning mb-4">
            <span>{t('trialNotice')}</span>
         </div>
      )}

      <div className="stats shadow w-full">
        <div className="stat">
          <div className="stat-title">{t('todaySales')}</div>
          <div className="stat-value">฿ 0</div>
        </div>
        <div className="stat">
          <div className="stat-title">{t('todayRedemptions')}</div>
          <div className="stat-value">{t('ordersCount', { count: 0 })}</div>
        </div>
      </div>
    </div>
  );
};

// 主页面
export default function DashboardPage() {
  const t = useTranslations('merchantDashboard');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);

  useEffect(() => {
    const checkMerchantStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUser(user);

      const { data } = await supabase
        .from('merchants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      setMerchant(data);
      setLoading(false);
    };

    checkMerchantStatus();
  }, []);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (merchant) {
    return <StatsDashboard merchant={merchant} />;
  } else {
    return <OnboardingForm user={user} />;
  }
}
