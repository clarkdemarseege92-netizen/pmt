// app/[locale]/merchant/accounting/page.tsx
// 记账管理主页面

import { Suspense } from 'react';
import { AccountingPageClient } from './AccountingPageClient';

export default function AccountingPage() {
  return (
    <div className="w-full">
      <Suspense fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      }>
        <AccountingPageClient />
      </Suspense>
    </div>
  );
}
