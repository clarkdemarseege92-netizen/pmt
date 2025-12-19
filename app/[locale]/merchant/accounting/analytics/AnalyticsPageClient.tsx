// app/[locale]/merchant/accounting/analytics/AnalyticsPageClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
// TODO: 这些组件文件需要创建
// import { TrendChart } from './components/TrendChart';
// import { TopCategoriesChart } from './components/TopCategoriesChart';
// import { SourceSummaryChart } from './components/SourceSummaryChart';
// import { PeriodComparisonCard } from './components/PeriodComparisonCard';
import Link from 'next/link';
import { HiArrowLeft } from 'react-icons/hi2';

type Merchant = {
  merchant_id: string;
  shop_name: string;
};

export function AnalyticsPageClient() {
  const t = useTranslations('accounting.analytics');
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const loadMerchant = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('merchants')
        .select('merchant_id, shop_name')
        .eq('owner_id', user.id)
        .maybeSingle();

      setMerchant(data);
      setLoading(false);
    };

    loadMerchant();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="alert alert-warning">
          <span>{t('noMerchant')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <Link
          href="/merchant/accounting"
          className="btn btn-ghost btn-circle"
        >
          <HiArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-base-content/70 mt-1">{merchant.shop_name}</p>
        </div>
      </div>

      {/* 日期范围选择器 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('startDate')}</span>
              </label>
              <input
                type="date"
                className="input input-bordered"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('endDate')}</span>
              </label>
              <input
                type="date"
                className="input input-bordered"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* TODO: 图表组件待创建 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <div className="alert alert-info">
            <div>
              <h3 className="font-bold">📊 高级分析功能开发中</h3>
              <div className="text-sm mt-2">
                <p>以下功能即将上线：</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>时间段对比分析</li>
                  <li>收支趋势图表</li>
                  <li>热门类目统计</li>
                  <li>来源汇总分析</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 时间段对比 - 待实现
      <PeriodComparisonCard
        merchantId={merchant.merchant_id}
        currentStart={dateRange.start}
        currentEnd={dateRange.end}
      />
      */}

      {/* 趋势图表 - 待实现
      <TrendChart
        merchantId={merchant.merchant_id}
        startDate={dateRange.start}
        endDate={dateRange.end}
      />
      */}

      {/* Top类目图表 - 待实现
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopCategoriesChart
          merchantId={merchant.merchant_id}
          startDate={dateRange.start}
          endDate={dateRange.end}
          type="income"
        />
        <TopCategoriesChart
          merchantId={merchant.merchant_id}
          startDate={dateRange.start}
          endDate={dateRange.end}
          type="expense"
        />
      </div>
      */}

      {/* 来源汇总图表 - 待实现
      <SourceSummaryChart
        merchantId={merchant.merchant_id}
        startDate={dateRange.start}
        endDate={dateRange.end}
      />
      */}
    </div>
  );
}
