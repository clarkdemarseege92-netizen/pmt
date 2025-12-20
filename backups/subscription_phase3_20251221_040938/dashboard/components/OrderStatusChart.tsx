// app/[locale]/merchant/dashboard/components/OrderStatusChart.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface OrderStatusChartProps {
  merchantId: string;
}

type StatusCount = {
  status: string;
  count: number;
};

const COLORS = {
  pending: '#f59e0b',     // 待处理 - 橙色
  completed: '#10b981',   // 已完成 - 绿色
  cancelled: '#ef4444',   // 已取消 - 红色
  refunded: '#6b7280',    // 已退款 - 灰色
};

export function OrderStatusChart({ merchantId }: OrderStatusChartProps) {
  const t = useTranslations('merchantDashboard.charts');
  const [data, setData] = useState<StatusCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchOrderStatus = async () => {
      setLoading(true);

      try {
        // 查询该商户的订单状态统计
        const { data: orders, error } = await supabase
          .from('orders')
          .select('status')
          .eq('merchant_id', merchantId);

        if (error) throw error;

        // 统计各状态数量
        const statusCounts: Record<string, number> = {};
        let totalOrders = 0;

        orders?.forEach((order) => {
          statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
          totalOrders++;
        });

        // 转换为图表数据格式
        const chartData: StatusCount[] = Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count,
        }));

        setData(chartData);
        setTotal(totalOrders);
      } catch (error) {
        console.error('获取订单状态数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    if (merchantId) {
      fetchOrderStatus();
    }
  }, [merchantId]);

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title">{t('orderStatus')}</h2>
          <div className="h-64 flex items-center justify-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    );
  }

  // 准备图表数据 - 添加翻译的标签
  const chartData = data.map(item => ({
    name: t(`status.${item.status}`),
    value: item.count,
    status: item.status,
  }));

  // 自定义工具提示
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-base-100 p-3 border border-base-300 rounded-lg shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm">
            {t('ordersCount')}: {data.value}
          </p>
          <p className="text-sm">
            {t('percentage')}: {percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title">{t('orderStatus')}</h2>
        <p className="text-sm text-base-content/70">
          {t('totalOrders')}: {total}
        </p>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[entry.status as keyof typeof COLORS] || '#94a3b8'}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
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
