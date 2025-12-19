// app/[locale]/merchant/accounting/analytics/components/SourceSummaryChart.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SourceSummaryChartProps {
  merchantId: string;
  startDate: string;
  endDate: string;
}

type SourceData = {
  name: string;
  value: number;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function SourceSummaryChart({ merchantId, startDate, endDate }: SourceSummaryChartProps) {
  const t = useTranslations('accounting.analytics');
  const [data, setData] = useState<SourceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSourceData = async () => {
      setLoading(true);

      try {
        // Fetch transactions with source information
        const { data: transactions, error } = await supabase
          .from('account_transactions')
          .select('amount, source')
          .eq('merchant_id', merchantId)
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .is('deleted_at', null);

        if (error) throw error;

        // Group by source and sum amounts
        const sourceMap: Record<string, number> = {};

        transactions?.forEach((tx) => {
          const source = tx.source || 'other';
          if (!sourceMap[source]) {
            sourceMap[source] = 0;
          }
          sourceMap[source] += Math.abs(tx.amount); // Use absolute value for pie chart
        });

        // Convert to array and sort by value descending
        const sourceData: SourceData[] = Object.entries(sourceMap)
          .map(([name, value]) => ({
            name: getSourceLabel(name, t),
            value: Math.round(value * 100) / 100,
          }))
          .sort((a, b) => b.value - a.value);

        setData(sourceData);
      } catch (error) {
        console.error('Error fetching source data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (merchantId && startDate && endDate) {
      fetchSourceData();
    }
  }, [merchantId, startDate, endDate, t]);

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title">{t('sourceSummary.title')}</h2>
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
        <h2 className="card-title">{t('sourceSummary.title')}</h2>
        <p className="text-sm text-base-content/70 mb-4">
          {t('sourceSummary.description')}
        </p>

        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `฿${value}`} />
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

// Helper function to get localized source labels
function getSourceLabel(source: string, t: any): string {
  const sourceMap: Record<string, string> = {
    'platform_order': t('sourceSummary.platformOrder'),
    'cash_order': t('sourceSummary.cashOrder'),
    'manual_entry': t('sourceSummary.manualEntry'),
    'manual': t('sourceSummary.manualEntry'), // Handle 'manual' as well
    'other': t('sourceSummary.other'),
  };
  return sourceMap[source] || t('sourceSummary.other');
}

// Custom label renderer for pie chart
function renderCustomizedLabel(entry: any) {
  // Recharts automatically calculates percent for us
  const percent = entry.percent ? (entry.percent * 100).toFixed(0) : '0';
  return `${entry.name} (${percent}%)`;
}
