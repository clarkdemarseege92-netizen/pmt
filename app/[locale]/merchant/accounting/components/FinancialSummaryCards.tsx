// app/[locale]/merchant/accounting/components/FinancialSummaryCards.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { HiArrowTrendingUp, HiArrowTrendingDown, HiChartBar } from 'react-icons/hi2';
import { getFinancialOverview } from '@/app/actions/accounting/analytics';
import type { TransactionFiltersType } from '../AccountingPageClient';

type FinancialSummaryCardsProps = {
  merchantId: string;
  filters: TransactionFiltersType;
  refreshKey: number;
};

export function FinancialSummaryCards({ merchantId, filters, refreshKey }: FinancialSummaryCardsProps) {
  const t = useTranslations('accounting');
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total_income: 0,
    total_expense: 0,
    net_profit: 0,
    income_count: 0,
    expense_count: 0,
  });

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true);

      // 设置默认日期范围（最近30天）
      const endDate = filters.end_date || new Date().toISOString().split('T')[0];
      const startDate = filters.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const result = await getFinancialOverview(
        merchantId,
        startDate,
        endDate
      );

      if (result.success && result.data) {
        setSummary(result.data);
      }
      setLoading(false);
    };

    loadSummary();
  }, [merchantId, filters.start_date, filters.end_date, refreshKey]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="stat bg-base-200 rounded-lg animate-pulse h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 总收入 */}
      <div className="stat bg-success/10 rounded-lg border border-success/20">
        <div className="stat-figure text-success">
          <HiArrowTrendingUp className="w-8 h-8" />
        </div>
        <div className="stat-title text-success/70">{t('totalIncome')}</div>
        <div className="stat-value text-success text-2xl lg:text-3xl">
          {formatCurrency(summary.total_income)}
        </div>
        <div className="stat-desc text-success/60">
          {t('transactionCount', { count: summary.income_count })}
        </div>
      </div>

      {/* 总支出 */}
      <div className="stat bg-error/10 rounded-lg border border-error/20">
        <div className="stat-figure text-error">
          <HiArrowTrendingDown className="w-8 h-8" />
        </div>
        <div className="stat-title text-error/70">{t('totalExpense')}</div>
        <div className="stat-value text-error text-2xl lg:text-3xl">
          {formatCurrency(summary.total_expense)}
        </div>
        <div className="stat-desc text-error/60">
          {t('transactionCount', { count: summary.expense_count })}
        </div>
      </div>

      {/* 净利润 */}
      <div className={`stat rounded-lg border ${
        summary.net_profit >= 0
          ? 'bg-primary/10 border-primary/20'
          : 'bg-warning/10 border-warning/20'
      }`}>
        <div className={`stat-figure ${summary.net_profit >= 0 ? 'text-primary' : 'text-warning'}`}>
          <HiChartBar className="w-8 h-8" />
        </div>
        <div className={`stat-title ${summary.net_profit >= 0 ? 'text-primary/70' : 'text-warning/70'}`}>
          {t('netProfit')}
        </div>
        <div className={`stat-value text-2xl lg:text-3xl ${
          summary.net_profit >= 0 ? 'text-primary' : 'text-warning'
        }`}>
          {formatCurrency(summary.net_profit)}
        </div>
        <div className={`stat-desc ${summary.net_profit >= 0 ? 'text-primary/60' : 'text-warning/60'}`}>
          {summary.net_profit >= 0 ? t('profit') : t('loss')}
        </div>
      </div>
    </div>
  );
}
