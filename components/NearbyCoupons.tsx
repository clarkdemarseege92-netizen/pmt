// 文件: components/NearbyCoupons.tsx
// 附近优惠券组件

'use client';

import { useState, useEffect } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { formatDistance } from '@/lib/distance';
import {Link} from '@/i18n/routing';
import Image from 'next/image';
import { HiLocationMarker, HiRefresh } from 'react-icons/hi';
import {useTranslations, useLocale} from 'next-intl';
import { getLocalizedValue } from '@/lib/i18nUtils';

// 优惠券数据类型
type MultiLangName = {
  th?: string;
  en?: string;
  [key: string]: string | undefined;
};

type NearbyCoupon = {
  coupon_id: string;
  name: MultiLangName;
  image_urls: string[];
  selling_price: number;
  original_value: number;
  stock_quantity: number;
  merchant: {
    merchant_id: string;
    shop_name: MultiLangName;
    address: string;
    latitude: number;
    longitude: number;
  };
  distance: number; // 距离（公里）
};

export default function NearbyCoupons() {
  // 自动请求位置权限（首次加载时）
  const { coordinates, error, loading, permissionDenied, requestLocation } = useGeolocation(true);
  const [coupons, setCoupons] = useState<NearbyCoupon[]>([]);
  const [fetchingCoupons, setFetchingCoupons] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // 国际化
  const t = useTranslations('nearby');
  const locale = useLocale();

  // 当获取到位置后，自动请求附近优惠券
  useEffect(() => {
    if (coordinates) {
      fetchNearbyCoupons();
    }
  }, [coordinates]);

  // 请求附近优惠券
  const fetchNearbyCoupons = async () => {
    if (!coordinates) return;

    setFetchingCoupons(true);
    setFetchError(null);

    try {
      const response = await fetch(
        `/api/nearby-coupons?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&radius=10&limit=12`
      );

      const result = await response.json();

      if (result.success) {
        setCoupons(result.data || []);
      } else {
        setFetchError(result.message || t('locationFailed'));
      }
    } catch (error) {
      console.error('Error fetching nearby coupons:', error);
      setFetchError(t('locationFailed'));
    } finally {
      setFetchingCoupons(false);
    }
  };

  // 正在首次加载位置
  if (loading && !coordinates) {
    return (
      <section className="bg-linear-to-r from-primary/10 to-secondary/10 rounded-2xl p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-center mb-4">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
          <h2 className="text-2xl font-bold mb-3">{t('gettingLocation')}</h2>
          <p className="text-base-content/70">
            {t('allowLocation')}
          </p>
        </div>
      </section>
    );
  }

  // 如果用户拒绝了位置权限
  if (permissionDenied) {
    return (
      <section className="bg-warning/10 rounded-2xl p-8 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-3 text-warning">{t('permissionDenied')}</h2>
          <p className="text-base-content/70 mb-4">
            {t('permissionDeniedDesc')}
          </p>
          <button onClick={requestLocation} className="btn btn-outline btn-sm">
            <HiRefresh className="w-4 h-4" />
            {t('retry')}
          </button>
        </div>
      </section>
    );
  }

  // 如果获取位置失败
  if (error) {
    return (
      <section className="bg-error/10 rounded-2xl p-8 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-3 text-error">{t('locationFailed')}</h2>
          <p className="text-base-content/70 mb-4">{error}</p>
          <button onClick={requestLocation} className="btn btn-outline btn-sm">
            <HiRefresh className="w-4 h-4" />
            {t('retry')}
          </button>
        </div>
      </section>
    );
  }

  // 正在加载
  if (loading || fetchingCoupons) {
    return (
      <section className="py-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <HiLocationMarker className="text-primary" />
          {t('title')}
        </h2>
        <div className="flex items-center justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      </section>
    );
  }

  // 没有找到附近的优惠券
  if (coordinates && coupons.length === 0) {
    return (
      <section className="py-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <HiLocationMarker className="text-primary" />
          {t('title')}
        </h2>
        <div className="bg-base-200 rounded-2xl p-8 text-center">
          <p className="text-base-content/70 mb-4">
            {t('noNearbyCoupons')}
          </p>
          <button onClick={fetchNearbyCoupons} className="btn btn-outline btn-sm">
            <HiRefresh className="w-4 h-4" />
            {t('refresh')}
          </button>
        </div>
      </section>
    );
  }

  // 显示附近优惠券列表
  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <HiLocationMarker className="text-primary" />
          {t('title')}
        </h2>
        <button
          onClick={fetchNearbyCoupons}
          className="btn btn-ghost btn-sm"
          disabled={fetchingCoupons}
        >
          <HiRefresh className={`w-4 h-4 ${fetchingCoupons ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </button>
      </div>

      {fetchError && (
        <div className="alert alert-error mb-4">
          <span>{fetchError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {coupons.map((coupon) => (
          <Link
            key={coupon.coupon_id}
            href={`/coupon/${coupon.coupon_id}`}
            className="card bg-base-100 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
          >
            {/* 优惠券图片 */}
            <figure className="relative h-48 bg-base-200">
              <Image
                src={coupon.image_urls[0] || '/placeholder-coupon.png'}
                alt={getLocalizedValue(coupon.name, locale as 'th' | 'zh' | 'en') || ''}
                fill
                className="object-cover"
              />
              {/* 距离标签 */}
              <div className="absolute top-2 right-2 badge badge-primary text-white font-semibold">
                <HiLocationMarker className="w-3 h-3 mr-1" />
                {formatDistance(coupon.distance)}
              </div>
            </figure>

            <div className="card-body p-4">
              {/* 优惠券名称 */}
              <h3 className="card-title text-base line-clamp-2">
                {getLocalizedValue(coupon.name, locale as 'th' | 'zh' | 'en')}
              </h3>

              {/* 商户名称 */}
              <p className="text-sm text-base-content/60 line-clamp-1">
                {getLocalizedValue(coupon.merchant.shop_name, locale as 'th' | 'zh' | 'en')}
              </p>

              {/* 价格 */}
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-error">
                  ฿{coupon.selling_price.toFixed(0)}
                </span>
                <span className="text-sm text-base-content/50 line-through">
                  ฿{coupon.original_value.toFixed(0)}
                </span>
              </div>

              {/* 库存 */}
              <div className="text-xs text-base-content/60 mt-1">
                {t('stockRemaining')} {coupon.stock_quantity} {t('pieces')}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
