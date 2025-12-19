// app/[locale]/merchant/accounting/AccountingPageClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { FinancialSummaryCards } from './components/FinancialSummaryCards';
import { TransactionList } from './components/TransactionList';
import { TransactionFilters } from './components/TransactionFilters';
import { AddTransactionModal } from './components/AddTransactionModal';
import Link from 'next/link';
import { HiPlus, HiChartBar, HiTag } from 'react-icons/hi2';

type Merchant = {
  merchant_id: string;
  shop_name: string;
};

export type TransactionFiltersType = {
  type?: 'income' | 'expense';
  source?: 'manual' | 'platform_order' | 'platform_fee';
  category_id?: string;
  start_date?: string;
  end_date?: string;
};

export function AccountingPageClient() {
  const t = useTranslations('accounting');
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filters, setFilters] = useState<TransactionFiltersType>({});
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadMerchant = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('merchants')
        .select('merchant_id, shop_name')
        .eq('owner_id', user.id)
        .maybeSingle();

      setMerchant(data);
      setLoading(false);
    };

    loadMerchant();
  }, []);

  const handleFilterChange = (newFilters: TransactionFiltersType) => {
    setFilters(newFilters);
  };

  const handleTransactionAdded = () => {
    setShowAddModal(false);
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="alert alert-warning">
          <span>{t('noMerchant')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-base-content/70 mt-1">{merchant.shop_name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/merchant/accounting/categories"
            className="btn btn-outline btn-sm"
          >
            <HiTag className="w-4 h-4" />
            {t('categories.title')}
          </Link>
          <Link
            href="/merchant/accounting/analytics"
            className="btn btn-outline btn-sm"
          >
            <HiChartBar className="w-4 h-4" />
            {t('analytics.title')}
          </Link>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddModal(true)}
          >
            <HiPlus className="w-5 h-5" />
            {t('addTransaction')}
          </button>
        </div>
      </div>

      {/* 财务汇总卡片 */}
      <FinancialSummaryCards
        merchantId={merchant.merchant_id}
        filters={filters}
        refreshKey={refreshKey}
      />

      {/* 筛选器 */}
      <TransactionFilters
        merchantId={merchant.merchant_id}
        onFilterChange={handleFilterChange}
      />

      {/* 记账记录列表 */}
      <TransactionList
        merchantId={merchant.merchant_id}
        filters={filters}
        refreshKey={refreshKey}
        onTransactionUpdated={() => setRefreshKey(prev => prev + 1)}
      />

      {/* 添加记账弹窗 */}
      {showAddModal && (
        <AddTransactionModal
          merchantId={merchant.merchant_id}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleTransactionAdded}
        />
      )}
    </div>
  );
}
