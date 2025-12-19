// app/[locale]/merchant/accounting/analytics/components/TopCategoriesChart.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TopCategoriesChartProps {
  merchantId: string;
  startDate: string;
  endDate: string;
  type: 'income' | 'expense';
}

type CategoryData = {
  category: string;
  amount: number;
};

export function TopCategoriesChart({ merchantId, startDate, endDate, type }: TopCategoriesChartProps) {
  const t = useTranslations('accounting.analytics');
  const [data, setData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategoryData = async () => {
      setLoading(true);

      try {
        // Fetch transactions with category information
        const { data: transactions, error } = await supabase
          .from('account_transactions')
          .select(`
            amount,
            category_id
          `)
          .eq('merchant_id', merchantId)
          .eq('type', type)
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .is('deleted_at', null);

        if (error) {
          console.error('Error fetching transactions:', error);
          throw error;
        }

        if (!transactions || transactions.length === 0) {
          setData([]);
          return;
        }

        // Get unique category IDs
        const categoryIds = [...new Set(transactions.map(tx => tx.category_id).filter(Boolean))];

        // Fetch category names only if there are category IDs
        let categoryNameMap: Record<string, string> = {};

        if (categoryIds.length > 0) {
          const { data: categories, error: catError } = await supabase
            .from('accounting_categories')
            .select('category_id, name_en')
            .in('category_id', categoryIds);

          // Note: catError might be an empty object {} which is not a real error
          // Only log if there's actual error content
          if (catError && Object.keys(catError).length > 0) {
            console.warn('Could not fetch some categories:', catError);
          }

          // Create category map for quick lookup
          // If some categories are missing, they'll just show as uncategorized
          categories?.forEach(cat => {
            categoryNameMap[cat.category_id] = cat.name_en;
          });
        }

        // Group by category and sum amounts
        const categoryMap: Record<string, number> = {};
        const uncategorizedLabel = t('topCategories.uncategorized');

        transactions.forEach((tx: any) => {
          const categoryName = tx.category_id ? (categoryNameMap[tx.category_id] || uncategorizedLabel) : uncategorizedLabel;
          if (!categoryMap[categoryName]) {
            categoryMap[categoryName] = 0;
          }
          categoryMap[categoryName] += tx.amount;
        });

        // Convert to array, sort by amount descending, and take top 10
        const categoryData: CategoryData[] = Object.entries(categoryMap)
          .map(([category, amount]) => ({
            category,
            amount: Math.round(amount * 100) / 100,
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10);

        setData(categoryData);
      } catch (error) {
        console.error('Error fetching category data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (merchantId && startDate && endDate) {
      fetchCategoryData();
    }
  }, [merchantId, startDate, endDate, type]);

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title">
            {type === 'income' ? t('topCategories.incomeTitle') : t('topCategories.expenseTitle')}
          </h2>
          <div className="h-80 flex items-center justify-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    );
  }

  const barColor = type === 'income' ? '#10b981' : '#ef4444';

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title">
          {type === 'income' ? t('topCategories.incomeTitle') : t('topCategories.expenseTitle')}
        </h2>
        <p className="text-sm text-base-content/70 mb-4">
          {type === 'income' ? t('topCategories.incomeDescription') : t('topCategories.expenseDescription')}
        </p>

        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="category" type="category" width={120} />
              <Tooltip
                formatter={(value: any) => [`฿${value}`, t('topCategories.amount')]}
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <Bar
                dataKey="amount"
                fill={barColor}
                name={type === 'income' ? t('topCategories.income') : t('topCategories.expense')}
              />
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
