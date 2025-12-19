// app/[locale]/merchant/dashboard/components/TopCouponsChart.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getLocalizedValue } from '@/lib/i18nUtils';

interface TopCouponsChartProps {
  merchantId: string;
  limit?: number; // 显示前几名，默认5
}

type CouponSales = {
  coupon_id: string;
  name: any;
  sales: number;
  quantity: number;
};

export function TopCouponsChart({ merchantId, limit = 5 }: TopCouponsChartProps) {
  const t = useTranslations('merchantDashboard.charts');
  const locale = useLocale();
  const [data, setData] = useState<CouponSales[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopCoupons = async () => {
      setLoading(true);

      try {
        // 查询该商户的优惠券销售数据
        const { data: orderItems, error } = await supabase
          .from('order_items')
          .select(`
            coupon_id,
            quantity,
            price,
            coupons (
              coupon_id,
              name,
              merchant_id
            )
          `)
          .eq('coupons.merchant_id', merchantId)
          .not('coupons', 'is', null);

        if (error) throw error;

        // 按优惠券分组统计
        const salesByCoupon: Record<string, { name: any; sales: number; quantity: number }> = {};

        orderItems?.forEach((item: any) => {
          if (item.coupons) {
            const couponId = item.coupon_id;
            if (!salesByCoupon[couponId]) {
              salesByCoupon[couponId] = {
                name: item.coupons.name,
                sales: 0,
                quantity: 0,
              };
            }
            salesByCoupon[couponId].sales += item.price * item.quantity;
            salesByCoupon[couponId].quantity += item.quantity;
          }
        });

        // 转换为数组并排序
        const sortedData = Object.entries(salesByCoupon)
          .map(([coupon_id, stats]) => ({
            coupon_id,
            name: stats.name,
            sales: Math.round(stats.sales * 100) / 100,
            quantity: stats.quantity,
          }))
          .sort((a, b) => b.sales - a.sales)
          .slice(0, limit);

        setData(sortedData);
      } catch (error) {
        console.error('获取热门优惠券数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    if (merchantId) {
      fetchTopCoupons();
    }
  }, [merchantId, limit]);

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title">{t('topCoupons')}</h2>
          <div className="h-64 flex items-center justify-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    );
  }

  // 准备图表数据 - 提取本地化名称
  const chartData = data.map(item => ({
    name: getLocalizedValue(item.name, locale as 'th' | 'zh' | 'en').substring(0, 10) + '...',
    fullName: getLocalizedValue(item.name, locale as 'th' | 'zh' | 'en'),
    sales: item.sales,
    quantity: item.quantity,
  }));

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title">{t('topCoupons')}</h2>
        <p className="text-sm text-base-content/70">
          {t('topSellingCoupons')}
        </p>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip
                formatter={(value: any, name: string, props: any) => {
                  if (name === 'sales') return [`฿${value}`, t('salesAmount')];
                  if (name === 'quantity') return [value, t('soldQuantity')];
                  return value;
                }}
                labelFormatter={(label) => {
                  const item = chartData.find(d => d.name === label);
                  return item?.fullName || label;
                }}
              />
              <Legend />
              <Bar dataKey="sales" fill="#8b5cf6" name={t('salesAmount')} />
              <Bar dataKey="quantity" fill="#10b981" name={t('soldQuantity')} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-base-content/50 py-8">
            {t('noData')}
          </div>
        )}
      </div>
    </div>
  );
}
