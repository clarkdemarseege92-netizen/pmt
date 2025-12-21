// app/[locale]/merchant/dashboard/components/SalesTrendChart.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SalesTrendChartProps {
  merchantId: string;
  days?: number; // 显示最近几天的数据，默认7天
}

type DailySales = {
  date: string;
  sales: number;
  orders: number;
};

export function SalesTrendChart({ merchantId, days = 7 }: SalesTrendChartProps) {
  const t = useTranslations('merchantDashboard.charts');
  const [data, setData] = useState<DailySales[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalesData = async () => {
      setLoading(true);

      // 计算日期范围
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      try {
        // 查询该商户的订单数据
        const { data: orders, error } = await supabase
          .from('orders')
          .select('created_at, total_amount, status')
          .eq('merchant_id', merchantId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .in('status', ['completed', 'pending']); // 只统计已完成和待处理的订单

        if (error) {
          // 静默处理 - 可能是表不存在或无数据
          console.debug('SalesTrendChart: No sales data available');
          setLoading(false);
          return;
        }

        // 按日期分组统计
        const salesByDate: Record<string, { sales: number; orders: number }> = {};

        // 初始化所有日期为0
        for (let i = 0; i < days; i++) {
          const date = new Date();
          date.setDate(date.getDate() - (days - 1 - i));
          const dateStr = date.toISOString().split('T')[0];
          salesByDate[dateStr] = { sales: 0, orders: 0 };
        }

        // 统计实际数据
        orders?.forEach((order) => {
          const dateStr = order.created_at.split('T')[0];
          if (salesByDate[dateStr]) {
            salesByDate[dateStr].sales += order.total_amount;
            salesByDate[dateStr].orders += 1;
          }
        });

        // 转换为图表数据格式
        const chartData: DailySales[] = Object.entries(salesByDate).map(([date, stats]) => ({
          date: new Date(date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
          sales: Math.round(stats.sales * 100) / 100,
          orders: stats.orders,
        }));

        setData(chartData);
      } catch {
        // 静默处理查询错误
        console.debug('SalesTrendChart: Failed to fetch sales data');
      } finally {
        setLoading(false);
      }
    };

    if (merchantId) {
      fetchSalesData();
    }
  }, [merchantId, days]);

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title">{t('salesTrend')}</h2>
          <div className="h-64 flex items-center justify-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title">{t('salesTrend')}</h2>
        <p className="text-sm text-base-content/70">
          {t('last7Days')}
        </p>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="sales"
              stroke="#8b5cf6"
              strokeWidth={2}
              name={t('salesAmount')}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="orders"
              stroke="#10b981"
              strokeWidth={2}
              name={t('ordersCount')}
            />
          </LineChart>
        </ResponsiveContainer>

        {data.length === 0 && (
          <div className="text-center text-base-content/50 py-8">
            {t('noData')}
          </div>
        )}
      </div>
    </div>
  );
}
