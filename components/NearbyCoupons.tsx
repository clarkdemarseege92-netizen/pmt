// 文件: components/NearbyCoupons.tsx
// 附近优惠券组件

'use client';

import { useState, useEffect } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { formatDistance } from '@/lib/distance';
import Link from 'next/link';
import Image from 'next/image';
import { HiLocationMarker, HiRefresh } from 'react-icons/hi';

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

// 辅助函数：获取多语言名称
const getLangName = (name: string | MultiLangName, lang = 'th'): string => {
  if (typeof name === 'string') return name;
  return name[lang] || name['en'] || 'N/A';
};

export default function NearbyCoupons() {
  const { coordinates, error, loading, permissionDenied, requestLocation } = useGeolocation();
  const [coupons, setCoupons] = useState<NearbyCoupon[]>([]);
  const [fetchingCoupons, setFetchingCoupons] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);

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
        setFetchError(result.message || '获取失败');
      }
    } catch (error) {
      console.error('获取附近优惠券错误:', error);
      setFetchError('网络错误，请稍后重试');
    } finally {
      setFetchingCoupons(false);
    }
  };

  // 处理用户点击"查看附近优惠"
  const handleRequestLocation = () => {
    setShowLocationPrompt(false);
    requestLocation();
  };

  // 如果用户还没有请求位置，显示提示
  if (showLocationPrompt && !coordinates) {
    return (
      <section className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-8 text-center">
        <div className="max-w-md mx-auto">
          <HiLocationMarker className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">发现附近优惠</h2>
          <p className="text-base-content/70 mb-6">
            开启位置权限，为您推荐附近的优惠券
          </p>
          <button
            onClick={handleRequestLocation}
            className="btn btn-primary btn-lg text-white"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                获取位置中...
              </>
            ) : (
              <>
                <HiLocationMarker className="w-5 h-5" />
                查看附近优惠
              </>
            )}
          </button>
        </div>
      </section>
    );
  }

  // 如果用户拒绝了位置权限
  if (permissionDenied) {
    return (
      <section className="bg-warning/10 rounded-2xl p-8 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-3 text-warning">位置权限被拒绝</h2>
          <p className="text-base-content/70 mb-4">
            请在浏览器设置中允许位置权限，以查看附近优惠
          </p>
          <button onClick={handleRequestLocation} className="btn btn-outline btn-sm">
            <HiRefresh className="w-4 h-4" />
            重新请求
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
          <h2 className="text-xl font-bold mb-3 text-error">获取位置失败</h2>
          <p className="text-base-content/70 mb-4">{error}</p>
          <button onClick={handleRequestLocation} className="btn btn-outline btn-sm">
            <HiRefresh className="w-4 h-4" />
            重试
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
          附近优惠
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
          附近优惠
        </h2>
        <div className="bg-base-200 rounded-2xl p-8 text-center">
          <p className="text-base-content/70 mb-4">
            附近 10 公里内暂无优惠券
          </p>
          <button onClick={fetchNearbyCoupons} className="btn btn-outline btn-sm">
            <HiRefresh className="w-4 h-4" />
            刷新
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
          附近优惠
        </h2>
        <button
          onClick={fetchNearbyCoupons}
          className="btn btn-ghost btn-sm"
          disabled={fetchingCoupons}
        >
          <HiRefresh className={`w-4 h-4 ${fetchingCoupons ? 'animate-spin' : ''}`} />
          刷新
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
                alt={getLangName(coupon.name)}
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
                {getLangName(coupon.name)}
              </h3>

              {/* 商户名称 */}
              <p className="text-sm text-base-content/60 line-clamp-1">
                {getLangName(coupon.merchant.shop_name)}
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
                剩余 {coupon.stock_quantity} 张
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
