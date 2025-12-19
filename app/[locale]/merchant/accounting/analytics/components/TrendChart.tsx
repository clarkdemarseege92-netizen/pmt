// app/[locale]/merchant/accounting/analytics/components/TrendChart.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TrendChartProps {
  merchantId: string;
  startDate: string;
  endDate: string;
}

type TrendData = {
  date: string;
  income: number;
  expense: number;
  net: number;
};

export function TrendChart({ merchantId, startDate, endDate }: TrendChartProps) {
  const t = useTranslations('accounting.analytics');
  const [data, setData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrendData = async () => {
      setLoading(true);

      try {
        // Fetch transactions within date range
        const { data: transactions, error } = await supabase
          .from('account_transactions')
          .select('transaction_date, type, amount')
          .eq('merchant_id', merchantId)
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .is('deleted_at', null)
          .order('transaction_date', { ascending: true });

        if (error) throw error;

        // Group by date
        const dateMap: Record<string, { income: number; expense: number }> = {};

        transactions?.forEach((tx) => {
          const date = tx.transaction_date;
          if (!dateMap[date]) {
            dateMap[date] = { income: 0, expense: 0 };
          }

          if (tx.type === 'income') {
            dateMap[date].income += tx.amount;
          } else if (tx.type === 'expense') {
            dateMap[date].expense += tx.amount;
          }
        });

        // Convert to array and calculate net
        const trendData: TrendData[] = Object.entries(dateMap)
          .map(([date, { income, expense }]) => ({
            date: new Date(date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }),
            income: Math.round(income * 100) / 100,
            expense: Math.round(expense * 100) / 100,
            net: Math.round((income - expense) * 100) / 100,
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setData(trendData);
      } catch (error) {
        console.error('Error fetching trend data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (merchantId && startDate && endDate) {
      fetchTrendData();
    }
  }, [merchantId, startDate, endDate]);

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title">{t('trendChart.title')}</h2>
          <div className="h-80 flex items-center justify-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title">{t('trendChart.title')}</h2>
        <p className="text-sm text-base-content/70 mb-4">
          {t('trendChart.description')}
        </p>

        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value: any) => [`฿${value}`, '']}
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                name={t('trendChart.income')}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="expense"
                stroke="#ef4444"
                name={t('trendChart.expense')}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="net"
                stroke="#3b82f6"
                name={t('trendChart.net')}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </LineChart>
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
