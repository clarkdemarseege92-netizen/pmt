// app/[locale]/merchant/product-categories/page.tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { ProductCategoriesPageClient } from './ProductCategoriesPageClient';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'productCategories' });

  return {
    title: t('title'),
  };
}

export default async function ProductCategoriesPage() {
  const supabase = await createSupabaseServerClient();

  // 验证用户登录
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 验证商户身份
  const { data: merchant } = await supabase
    .from('merchants')
    .select('merchant_id, shop_name')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!merchant) {
    redirect('/merchant/onboarding');
  }

  return <ProductCategoriesPageClient />;
}
