// app/[locale]/merchant/quick-entry/components/TodaySummaryCards.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { HiArrowTrendingUp, HiArrowTrendingDown, HiChartBar } from 'react-icons/hi2';
import { getTodaySummary } from '@/app/actions/accounting/quick-entry';

type TodaySummaryCardsProps = {
  merchantId: string;
  refreshKey: number;
};

export function TodaySummaryCards({ merchantId, refreshKey }: TodaySummaryCardsProps) {
  const t = useTranslations('quickEntry');
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    today_income: 0,
    today_expense: 0,
    today_net: 0,
    income_count: 0,
    expense_count: 0,
  });

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true);
      const result = await getTodaySummary(merchantId);
      if (result.success && result.data) {
        setSummary(result.data);
      }
      setLoading(false);
    };

    loadSummary();
  }, [merchantId, refreshKey]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="stat bg-base-200 rounded-lg animate-pulse h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* 今日收入 */}
      <div className="stat bg-success/10 rounded-lg border border-success/20">
        <div className="stat-figure text-success">
          <HiArrowTrendingUp className="w-7 h-7" />
        </div>
        <div className="stat-title text-success/70 text-sm">{t('summary.todayIncome')}</div>
        <div className="stat-value text-success text-xl lg:text-2xl">
          {formatCurrency(summary.today_income)}
        </div>
        <div className="stat-desc text-success/60 text-xs">
          {summary.income_count} {t('summary.transactions')}
        </div>
      </div>

      {/* 今日支出 */}
      <div className="stat bg-error/10 rounded-lg border border-error/20">
        <div className="stat-figure text-error">
          <HiArrowTrendingDown className="w-7 h-7" />
        </div>
        <div className="stat-title text-error/70 text-sm">{t('summary.todayExpense')}</div>
        <div className="stat-value text-error text-xl lg:text-2xl">
          {formatCurrency(summary.today_expense)}
        </div>
        <div className="stat-desc text-error/60 text-xs">
          {summary.expense_count} {t('summary.transactions')}
        </div>
      </div>

      {/* 今日净额 */}
      <div className={`stat rounded-lg border ${
        summary.today_net >= 0
          ? 'bg-primary/10 border-primary/20'
          : 'bg-warning/10 border-warning/20'
      }`}>
        <div className={`stat-figure ${summary.today_net >= 0 ? 'text-primary' : 'text-warning'}`}>
          <HiChartBar className="w-7 h-7" />
        </div>
        <div className={`stat-title text-sm ${summary.today_net >= 0 ? 'text-primary/70' : 'text-warning/70'}`}>
          {t('summary.todayNet')}
        </div>
        <div className={`stat-value text-xl lg:text-2xl ${
          summary.today_net >= 0 ? 'text-primary' : 'text-warning'
        }`}>
          {formatCurrency(summary.today_net)}
        </div>
        <div className={`stat-desc text-xs ${summary.today_net >= 0 ? 'text-primary/60' : 'text-warning/60'}`}>
          {summary.today_net >= 0 ? t('summary.profit') : t('summary.loss')}
        </div>
      </div>
    </div>
  );
}
