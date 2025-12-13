// 文件: app/page.tsx (首页 - 支持 i18n 方案A)
import NearbyCoupons from "@/components/NearbyCoupons";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Image from "next/image";
import {Link} from '@/i18n/routing';
import {getTranslations} from 'next-intl/server';
import {getLocalizedValue} from '@/lib/i18nUtils';

// 【关键修复】禁用静态生成和缓存，确保每次请求都是动态的
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 定义数据类型 (基于我们的数据库设计)
// 优惠券名称
type MultiLangName = {
  th?: string;
  en?: string;
  [key: string]: string | undefined;
};

// 分类
type Category = {
  category_id: string;
  name: string | MultiLangName;
  parent_id: string | null;
};

// 优惠券
type Coupon = {
  coupon_id: string;
  name: MultiLangName;
  image_urls: string[];
  selling_price: number;
  original_value: number;
};

// 这是一个服务器组件 (Server Component)，它可以直接异步获取数据
export default async function Home({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  // 获取当前语言（从路由参数获取）
  const {locale} = await params;

  console.log('🌐 HOME PAGE: Current locale =', locale);

  // 获取翻译
  const t = await getTranslations('home');

  console.log('🌐 HOME PAGE: Translation test:', {
    heroTitle: t('hero.title'),
    heroSubtitle: t('hero.subtitle'),
    categories: t('categories')
  });

  // 1. 获取数据
  const supabase = await createSupabaseServerClient();

  // 获取所有一级分类 (parent_id 为 null)
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('category_id, name, parent_id')
    .is('parent_id', null)
    .eq('is_active', true) // 只显示激活的分类
    .order('sort_order', { ascending: true }); // 按排序顺序排序

  // 获取精选优惠券
  const { data: coupons, error: couponsError } = await supabase
    .from('coupons')
    .select('coupon_id, name, image_urls, selling_price, original_value')
    .limit(10); // 暂定获取10个

  if (categoriesError) console.error("Error fetching categories:", categoriesError.message);
  if (couponsError) console.error("Error fetching coupons:", couponsError.message);

  // 调试：检查第一个分类和优惠券的数据结构
  if (categories && categories.length > 0) {
    console.log('🔍 HOME PAGE: First category data =', JSON.stringify(categories[0]));
  }
  if (coupons && coupons.length > 0) {
    console.log('🔍 HOME PAGE: First coupon data =', JSON.stringify(coupons[0]));
  }


  // 2. 渲染页面 (使用 daisyUI 组件)
  return (
    <main className="flex min-h-screen flex-col items-center">
      {/* Sprint 2 - Hero (顶部 Banner)  */}
      <div className="hero min-h-[300px] bg-base-200" style={{ backgroundImage: 'url(https://img.daisyui.com/images/stock/photo-1507358522600-9f71e620c44e.webp)' }}>
        <div className="hero-overlay bg-opacity-60"></div>
        <div className="hero-content text-center text-neutral-content">
          <div className="max-w-md">
            <h1 className="mb-5 text-5xl font-bold">{t('hero.title')}</h1>
            <p className="mb-5">{t('hero.subtitle')}</p>
            <input type="text" placeholder={t('hero.searchPlaceholder')} className="input input-bordered w-full" />
          </div>
        </div>
      </div>

      {/* Sprint 2 - Categories Menu (一级分类菜单)  */}
      <div className="w-full max-w-6xl p-4">
        <h2 className="text-2xl font-bold mb-4">{t('categories')}</h2>
        <ul className="menu menu-horizontal bg-base-100 rounded-box shadow-lg overflow-x-auto">
          {categories && categories.map((category: Category) => (
            <li key={category.category_id}>
              {/* Sprint 2 - 链接到搜索页  */}
              <Link href={`/search?category=${category.category_id}`}>
                {getLocalizedValue(category.name, locale as 'th' | 'zh' | 'en')}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* 附近优惠券板块 */}
      <div className="w-full max-w-6xl p-4">
        <NearbyCoupons />
      </div>

      {/* Sprint 2 - Coupons Grid (优惠券卡片网格)  */}
      <div className="w-full max-w-6xl p-4">
        <h2 className="text-2xl font-bold mb-4">{t('featuredDeals')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">

          {coupons && coupons.map((coupon: Coupon) => (
            <div key={coupon.coupon_id} className="card bg-base-100 shadow-xl transition-transform hover:scale-105">
              <figure className="h-48 relative">
<Image
  src={(coupon.image_urls && coupon.image_urls.length > 0) ? coupon.image_urls[0] : '/placeholder.jpg'}
  alt={getLocalizedValue(coupon.name, locale as 'th' | 'zh' | 'en') || ''}
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
                  {/* Sprint 2 - 链接到详情页 */}
                  <Link href={`/coupon/${coupon.coupon_id}`} className="btn btn-primary btn-sm">
                    {t('viewAll')}
                  </Link>
                </div>
              </div>
            </div>
          ))}

        </div>
      </div>
    </main>
  );
}
