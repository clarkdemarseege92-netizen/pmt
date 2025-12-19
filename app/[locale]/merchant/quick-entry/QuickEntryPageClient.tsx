// app/[locale]/merchant/quick-entry/QuickEntryPageClient.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TodaySummaryCards } from './components/TodaySummaryCards';
import { ExpenseQuickTab } from './components/ExpenseQuickTab';
import { IncomePOSTab } from './components/IncomePOSTab';

type QuickEntryPageClientProps = {
  merchantId: string;
};

export function QuickEntryPageClient({ merchantId }: QuickEntryPageClientProps) {
  const t = useTranslations('quickEntry');
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    // 刷新今日统计
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">{t('title')}</h1>
        <p className="text-base-content/60 mt-1">{t('description')}</p>
      </div>

      {/* 今日统计卡片 - 在手机屏幕中隐藏 */}
      <div className="hidden md:block">
        <TodaySummaryCards merchantId={merchantId} refreshKey={refreshKey} />
      </div>

      {/* Tab 切换 */}
      <div className="tabs tabs-boxed mb-6 p-1 bg-base-200">
        <button
          className={`tab tab-lg flex-1 ${activeTab === 'income' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('income')}
        >
          <span className="text-lg mr-2">💰</span>
          {t('tabs.income')}
        </button>
        <button
          className={`tab tab-lg flex-1 ${activeTab === 'expense' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('expense')}
        >
          <span className="text-lg mr-2">💸</span>
          {t('tabs.expense')}
        </button>
      </div>

      {/* Tab 内容 */}
      <div>
        {activeTab === 'income' && (
          <IncomePOSTab merchantId={merchantId} onSuccess={handleSuccess} />
        )}
        {activeTab === 'expense' && (
          <ExpenseQuickTab merchantId={merchantId} onSuccess={handleSuccess} />
        )}
      </div>
    </div>
  );
}
