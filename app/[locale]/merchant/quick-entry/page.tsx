// app/[locale]/merchant/quick-entry/page.tsx
// 快捷记账页面

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { QuickEntryPageClient } from './QuickEntryPageClient';

export default async function QuickEntryPage() {
  const supabase = await createSupabaseServerClient();

  // 验证用户登录
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 获取用户的第一个商户
  const { data: merchants } = await supabase
    .from('merchants')
    .select('merchant_id')
    .eq('owner_id', user.id)
    .limit(1);

  if (!merchants || merchants.length === 0) {
    redirect('/merchant/setup');
  }

  const merchantId = merchants[0].merchant_id;

  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    }>
      <QuickEntryPageClient merchantId={merchantId} />
    </Suspense>
  );
}
