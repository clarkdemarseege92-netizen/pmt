// 文件: /app/search/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Image from "next/image";
import Link from "next/link";

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

// 辅助函数
const getLangName = (name: MultiLangName, lang = 'th') => {
  return name[lang] || name['en'] || "N/A";
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string };
}) {

  const supabase = await createSupabaseServerClient();
  const lang = 'th';
  const categoryId = searchParams.category;

  let coupons: Coupon[] | null = [];
  let currentCategory: Category | null = null;
  
  // 修复 1: 使用 const (数组的 push 操作不影响 const)
  const breadcrumbs = [{ name: getLangName({ th: "หน้าแรก", en: "Home" }), href: "/" }];

  if (categoryId) {
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('category_id, name, parent_id ( category_id, name )')
      .eq('category_id', categoryId)
      .single();

    if (categoryError) console.error("Error fetching category:", categoryError.message);

    if (categoryData) {
      // 修复 2 & 3: 使用 unknown 断言和局部变量，避免 any 和 null 检查错误
      const category = categoryData as unknown as Category;
      
      // 更新外部变量供 JSX 使用
      currentCategory = category;

      // 使用局部变量 category 构建面包屑，TS 就能正确识别它非空
      if (category.parent_id) {
        breadcrumbs.push({ 
          name: getLangName(category.parent_id.name, lang), 
          href: `/search?category=${category.parent_id.category_id}` 
        });
      }
      breadcrumbs.push({ name: getLangName(category.name, lang), href: "#" });
    }

    const { data: couponData, error: couponError } = await supabase
      .from('coupons')
      .select('*, coupon_categories!inner(category_id)')
      .eq('coupon_categories.category_id', categoryId)
      .limit(12);

    if (couponError) console.error("Error fetching coupons for category:", couponError.message);
    coupons = couponData as Coupon[];

  } else {
    breadcrumbs.push({ name: getLangName({ th: "ผลการค้นหาทั้งหมด", en: "All Results" }), href: "#" });
    
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
            {currentCategory ? getLangName(currentCategory.name, lang) : getLangName({ th: "ผลการค้นหา", en: "Results" })}
          </h1>
          <select className="select select-bordered select-sm" defaultValue="排序方式">
            <option disabled>排序方式</option>
            <option>价格 (低到高)</option>
            <option>价格 (高到低)</option>
            <option>最热销</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {coupons && coupons.length > 0 ? (
            coupons.map((coupon: Coupon) => (
              <div key={coupon.coupon_id} className="card bg-base-100 shadow-xl transition-transform hover:scale-105">
                <figure className="h-48 relative">
<Image
  src={(coupon.image_urls && coupon.image_urls.length > 0) ? coupon.image_urls[0] : '/placeholder.jpg'}
  alt={getLangName(coupon.name, lang)}
  fill
  className="object-cover"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
/>
                </figure>
                <div className="card-body p-4">
                  <h3 className="card-title text-lg truncate" title={getLangName(coupon.name, lang)}>
                    {getLangName(coupon.name, lang)}
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
                      查看详情
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-base-content/70">
              {getLangName({ th: "ไม่พบรายการที่ตรงกัน", en: "No matching items found." })}
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