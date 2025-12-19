// app/[locale]/merchant/accounting/categories/page.tsx
import { Suspense } from 'react';
import { CategoriesPageClient } from './CategoriesPageClient';

export default function CategoriesPage() {
  return (
    <div className="w-full">
      <Suspense fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      }>
        <CategoriesPageClient />
      </Suspense>
    </div>
  );
}
