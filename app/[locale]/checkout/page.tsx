// app/[locale]/checkout/page.tsx
import { Suspense } from 'react';
import CheckoutClient from './CheckoutClient';
import {getTranslations} from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const t = await getTranslations('checkout');

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4">{t('loading')}</p>
        </div>
      </div>
    }>
      <CheckoutClient />
    </Suspense>
  );
}
