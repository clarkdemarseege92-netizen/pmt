// app/[locale]/merchant/dashboard/components/RevenueSummaryCard.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { HiCash, HiTrendingUp, HiCalendar, HiClock } from 'react-icons/hi';

interface RevenueSummaryCardProps {
  merchantId: string;
}

type RevenueSummary = {
  today: number;
  week: number;
  month: number;
  total: number;
};

export function RevenueSummaryCard({ merchantId }: RevenueSummaryCardProps) {
  const t = useTranslations('merchantDashboard.revenue');
  const [data, setData] = useState<RevenueSummary>({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRevenue = async () => {
      setLoading(true);

      try {
        // 计算日期范围
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const weekStart = new Date(now.setDate(now.getDate() - 7));
        const monthStart = new Date(now.setDate(1));

        // 查询今日收入
        const { data: todayOrders } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('merchant_id', merchantId)
          .gte('created_at', todayStart.toISOString())
          .in('status', ['completed', 'pending']);

        const todayRevenue = todayOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

        // 查询本周收入
        const { data: weekOrders } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('merchant_id', merchantId)
          .gte('created_at', weekStart.toISOString())
          .in('status', ['completed', 'pending']);

        const weekRevenue = weekOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

        // 查询本月收入
        const { data: monthOrders } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('merchant_id', merchantId)
          .gte('created_at', monthStart.toISOString())
          .in('status', ['completed', 'pending']);

        const monthRevenue = monthOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

        // 查询总收入
        const { data: totalOrders } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('merchant_id', merchantId)
          .in('status', ['completed', 'pending']);

        const totalRevenue = totalOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

        setData({
          today: Math.round(todayRevenue * 100) / 100,
          week: Math.round(weekRevenue * 100) / 100,
          month: Math.round(monthRevenue * 100) / 100,
          total: Math.round(totalRevenue * 100) / 100,
        });
      } catch (error) {
        console.error('获取收入数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    if (merchantId) {
      fetchRevenue();
    }
  }, [merchantId]);

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title">{t('title')}</h2>
          <div className="h-48 flex items-center justify-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title">{t('title')}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {/* 今日收入 */}
          <div className="stat bg-primary/10 rounded-lg">
            <div className="stat-figure text-primary">
              <HiClock className="w-8 h-8" />
            </div>
            <div className="stat-title">{t('today')}</div>
            <div className="stat-value text-primary">฿{data.today.toFixed(0)}</div>
            <div className="stat-desc">{t('todayDesc')}</div>
          </div>

          {/* 本周收入 */}
          <div className="stat bg-secondary/10 rounded-lg">
            <div className="stat-figure text-secondary">
              <HiCalendar className="w-8 h-8" />
            </div>
            <div className="stat-title">{t('week')}</div>
            <div className="stat-value text-secondary">฿{data.week.toFixed(0)}</div>
            <div className="stat-desc">{t('weekDesc')}</div>
          </div>

          {/* 本月收入 */}
          <div className="stat bg-accent/10 rounded-lg">
            <div className="stat-figure text-accent">
              <HiTrendingUp className="w-8 h-8" />
            </div>
            <div className="stat-title">{t('month')}</div>
            <div className="stat-value text-accent">฿{data.month.toFixed(0)}</div>
            <div className="stat-desc">{t('monthDesc')}</div>
          </div>

          {/* 总收入 */}
          <div className="stat bg-success/10 rounded-lg">
            <div className="stat-figure text-success">
              <HiCash className="w-8 h-8" />
            </div>
            <div className="stat-title">{t('total')}</div>
            <div className="stat-value text-success">฿{data.total.toFixed(0)}</div>
            <div className="stat-desc">{t('totalDesc')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
