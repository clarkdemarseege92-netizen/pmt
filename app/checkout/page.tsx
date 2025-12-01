// app/checkout/page.tsx
import { Suspense } from 'react';
import CheckoutClient from './CheckoutClient';

export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4">加载中...</p>
        </div>
      </div>
    }>
      <CheckoutClient />
    </Suspense>
  );
}
