// app/[locale]/merchant/accounting/analytics/page.tsx
// 财务分析页面

import { Suspense } from 'react';
import { AnalyticsPageClient } from './AnalyticsPageClient';

export default function AnalyticsPage() {
  return (
    <div className="w-full">
      <Suspense fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      }>
        <AnalyticsPageClient />
      </Suspense>
    </div>
  );
}
