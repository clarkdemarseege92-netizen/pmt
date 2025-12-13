// 文件: /app/[locale]/search/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Image from "next/image";
import {Link} from '@/i18n/routing';
import {getTranslations} from 'next-intl/server';
import {getLocalizedValue} from '@/lib/i18nUtils';

// ----- 类型定义 -----
type MultiLangName = {
  th: string;
  en: string;
  [key: string]: string;
};

type ParentCategory = {
  category_id: string;
  name: MultiLangName;
}

type Category = {
  category_id: string;
  name: MultiLangName;
  parent_id: ParentCategory | null;
};

type Coupon = {
  coupon_id: string;
  name: MultiLangName;
  image_urls: string[];
  selling_price: number;
  original_value: number;
};

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{locale: string}>;
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const {locale} = await params;
  const resolvedSearchParams = await searchParams;
  const t = await getTranslations('search');

  const supabase = await createSupabaseServerClient();
  const categoryId = resolvedSearchParams.category;

  let coupons: Coupon[] | null = [];
  let currentCategory: Category | null = null;

  const breadcrumbs = [{ name: t('breadcrumbs.home'), href: "/" }];

  if (categoryId) {
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('category_id, name, parent_id ( category_id, name )')
      .eq('category_id', categoryId)
      .single();

    if (categoryError) console.error("Error fetching category:", categoryError.message);

    if (categoryData) {
      const category = categoryData as unknown as Category;

      // 更新外部变量供 JSX 使用
      currentCategory = category;

      // 使用局部变量 category 构建面包屑，TS 就能正确识别它非空
      if (category.parent_id) {
        breadcrumbs.push({
          name: getLocalizedValue(category.parent_id.name, locale as 'th' | 'zh' | 'en'),
          href: `/search?category=${category.parent_id.category_id}`
        });
      }
      breadcrumbs.push({ name: getLocalizedValue(category.name, locale as 'th' | 'zh' | 'en'), href: "#" });
    }

    const { data: couponData, error: couponError } = await supabase
      .from('coupons')
      .select('*, coupon_categories!inner(category_id)')
      .eq('coupon_categories.category_id', categoryId)
      .limit(12);

    if (couponError) console.error("Error fetching coupons for category:", couponError.message);
    coupons = couponData as Coupon[];

  } else {
    breadcrumbs.push({ name: t('breadcrumbs.allResults'), href: "#" });

    const { data: allCoupons, error: allCouponsError } = await supabase
      .from('coupons')
      .select('coupon_id, name, image_urls, selling_price, original_value')
      .limit(12);

    if (allCouponsError) console.error("Error fetching all coupons:", allCouponsError.message);
    coupons = allCoupons as Coupon[];
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 lg:p-8">
      <div className="w-full max-w-6xl">

        <div className="text-sm breadcrumbs mb-4">
          <ul>
            {breadcrumbs.map((crumb, index) => (
              <li key={index}>
                {crumb.href === "#" ? (
                  <span>{crumb.name}</span>
                ) : (
                  <Link href={crumb.href} className="link hover:link-primary">
                    {crumb.name}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-between items-center mb-4 p-4 bg-base-200 rounded-lg">
          <h1 className="text-2xl font-bold">
            {currentCategory ? getLocalizedValue(currentCategory.name, locale as 'th' | 'zh' | 'en') : t('title')}
          </h1>
          <select className="select select-bordered select-sm" defaultValue={t('sort.label')}>
            <option disabled>{t('sort.label')}</option>
            <option>{t('sort.priceLowHigh')}</option>
            <option>{t('sort.priceHighLow')}</option>
            <option>{t('sort.popular')}</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {coupons && coupons.length > 0 ? (
            coupons.map((coupon: Coupon) => (
              <div key={coupon.coupon_id} className="card bg-base-100 shadow-xl transition-transform hover:scale-105">
                <figure className="h-48 relative">
<Image
  src={(coupon.image_urls && coupon.image_urls.length > 0) ? coupon.image_urls[0] : '/placeholder.jpg'}
  alt={getLocalizedValue(coupon.name, locale as 'th' | 'zh' | 'en')}
  fill
  className="object-cover"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
/>
                </figure>
                <div className="card-body p-4">
                  <h3 className="card-title text-lg truncate" title={getLocalizedValue(coupon.name, locale as 'th' | 'zh' | 'en')}>
                    {getLocalizedValue(coupon.name, locale as 'th' | 'zh' | 'en')}
                  </h3>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-primary text-xl font-bold">
                      ฿{coupon.selling_price}
                    </span>
                    <span className="line-through text-base-content/60">
                      ฿{coupon.original_value}
                    </span>
                  </div>
                  <div className="card-actions justify-end mt-4">
                    <Link href={`/coupon/${coupon.coupon_id}`} className="btn btn-primary btn-sm">
                      {t('viewDetails')}
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-base-content/70">
              {t('noResults')}
            </p>
          )}
        </div>

        <div className="join mt-8 flex justify-center">
          <button className="join-item btn btn-active">1</button>
          <button className="join-item btn">2</button>
          <button className="join-item btn">3</button>
          <button className="join-item btn btn-disabled">...</button>
          <button className="join-item btn">10</button>
        </div>

      </div>
    </main>
  );
}
