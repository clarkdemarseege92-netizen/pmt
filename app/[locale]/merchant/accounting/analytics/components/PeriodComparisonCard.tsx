// app/[locale]/merchant/accounting/analytics/components/PeriodComparisonCard.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { HiArrowTrendingUp, HiArrowTrendingDown } from 'react-icons/hi2';

interface PeriodComparisonCardProps {
  merchantId: string;
  currentStart: string;
  currentEnd: string;
}

type PeriodStats = {
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
};

export function PeriodComparisonCard({ merchantId, currentStart, currentEnd }: PeriodComparisonCardProps) {
  const t = useTranslations('accounting.analytics');
  const [currentPeriod, setCurrentPeriod] = useState<PeriodStats | null>(null);
  const [previousPeriod, setPreviousPeriod] = useState<PeriodStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComparisonData = async () => {
      setLoading(true);

      try {
        // Calculate previous period dates
        const currentStartDate = new Date(currentStart);
        const currentEndDate = new Date(currentEnd);
        const periodLength = currentEndDate.getTime() - currentStartDate.getTime();

        const previousStartDate = new Date(currentStartDate.getTime() - periodLength);
        const previousEndDate = new Date(currentStartDate.getTime() - 1);

        const previousStart = previousStartDate.toISOString().split('T')[0];
        const previousEnd = previousEndDate.toISOString().split('T')[0];

        // Fetch current period data
        const { data: currentData, error: currentError } = await supabase
          .from('account_transactions')
          .select('type, amount')
          .eq('merchant_id', merchantId)
          .gte('transaction_date', currentStart)
          .lte('transaction_date', currentEnd)
          .is('deleted_at', null);

        if (currentError) throw currentError;

        // Fetch previous period data
        const { data: previousData, error: previousError } = await supabase
          .from('account_transactions')
          .select('type, amount')
          .eq('merchant_id', merchantId)
          .gte('transaction_date', previousStart)
          .lte('transaction_date', previousEnd)
          .is('deleted_at', null);

        if (previousError) throw previousError;

        // Calculate stats for current period
        const currentStats = calculateStats(currentData || []);
        const previousStats = calculateStats(previousData || []);

        setCurrentPeriod(currentStats);
        setPreviousPeriod(previousStats);
      } catch (error) {
        console.error('Error fetching comparison data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (merchantId && currentStart && currentEnd) {
      fetchComparisonData();
    }
  }, [merchantId, currentStart, currentEnd]);

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title">{t('periodComparison.title')}</h2>
          <div className="h-40 flex items-center justify-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentPeriod || !previousPeriod) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title">{t('periodComparison.title')}</h2>
          <div className="text-center text-base-content/50 py-8">
            {t('noData')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title">{t('periodComparison.title')}</h2>
        <p className="text-sm text-base-content/70 mb-4">
          {t('periodComparison.description')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Income Comparison */}
          <ComparisonMetric
            label={t('periodComparison.income')}
            currentValue={currentPeriod.income}
            previousValue={previousPeriod.income}
            isPositiveGood={true}
          />

          {/* Expense Comparison */}
          <ComparisonMetric
            label={t('periodComparison.expense')}
            currentValue={currentPeriod.expense}
            previousValue={previousPeriod.expense}
            isPositiveGood={false}
          />

          {/* Net Comparison */}
          <ComparisonMetric
            label={t('periodComparison.net')}
            currentValue={currentPeriod.net}
            previousValue={previousPeriod.net}
            isPositiveGood={true}
          />

          {/* Transaction Count Comparison */}
          <ComparisonMetric
            label={t('periodComparison.transactions')}
            currentValue={currentPeriod.transactionCount}
            previousValue={previousPeriod.transactionCount}
            isPositiveGood={true}
            isCurrency={false}
          />
        </div>
      </div>
    </div>
  );
}

// Helper function to calculate stats from transaction data
function calculateStats(transactions: Array<{ type: string; amount: number }>): PeriodStats {
  let income = 0;
  let expense = 0;

  transactions.forEach((tx) => {
    if (tx.type === 'income') {
      income += tx.amount;
    } else if (tx.type === 'expense') {
      expense += tx.amount;
    }
  });

  return {
    income: Math.round(income * 100) / 100,
    expense: Math.round(expense * 100) / 100,
    net: Math.round((income - expense) * 100) / 100,
    transactionCount: transactions.length,
  };
}

// Component for displaying individual comparison metrics
function ComparisonMetric({
  label,
  currentValue,
  previousValue,
  isPositiveGood,
  isCurrency = true,
}: {
  label: string;
  currentValue: number;
  previousValue: number;
  isPositiveGood: boolean;
  isCurrency?: boolean;
}) {
  const difference = currentValue - previousValue;
  const percentChange = previousValue !== 0 ? (difference / previousValue) * 100 : 0;

  const isIncrease = difference > 0;
  const isGoodChange = isIncrease === isPositiveGood;

  return (
    <div className="stat bg-base-200 rounded-lg">
      <div className="stat-title text-sm">{label}</div>
      <div className="stat-value text-2xl">
        {isCurrency ? `฿${currentValue.toLocaleString()}` : currentValue.toLocaleString()}
      </div>
      <div className={`stat-desc flex items-center gap-1 ${isGoodChange ? 'text-success' : 'text-error'}`}>
        {isIncrease ? (
          <HiArrowTrendingUp className="w-4 h-4" />
        ) : (
          <HiArrowTrendingDown className="w-4 h-4" />
        )}
        <span>
          {Math.abs(percentChange).toFixed(1)}% {isIncrease ? 'increase' : 'decrease'}
        </span>
      </div>
    </div>
  );
}
