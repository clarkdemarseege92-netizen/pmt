// 文件: /app/page.tsx (Sprint 2 - 首页)

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Image from "next/image";
import Link from "next/link";

// 定义数据类型 (基于我们的数据库设计)
// 优惠券名称 
type MultiLangName = {
  th: string;
  en: string;
  [key: string]: string;
};

// 分类 [cite: 445, 10]
type Category = {
  category_id: string;
  name: MultiLangName;
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

// 辅助函数：安全地获取多语言名称 
const getLangName = (name: MultiLangName, lang = 'th') => {
  return name[lang] || name['en'] || "N/A";
};

// 这是一个服务器组件 (Server Component)，它可以直接异步获取数据
export default async function Home() {
  
  // 1. 获取数据
  const supabase = await createSupabaseServerClient();
  const lang = 'th'; // 暂定默认语言为泰语

  // 获取所有一级分类 (parent_id 为 null) [cite: 10, 113]
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('category_id, name, parent_id')
    .is('parent_id', null) // 
    .order('name->>th', { ascending: true }); // 按泰语名称排序

  // 获取精选优惠券 
  const { data: coupons, error: couponsError } = await supabase
    .from('coupons')
    .select('coupon_id, name, image_urls, selling_price, original_value')
    .limit(10); // 暂定获取10个

  if (categoriesError) console.error("Error fetching categories:", categoriesError.message);
  if (couponsError) console.error("Error fetching coupons:", couponsError.message);


  // 2. 渲染页面 (使用 daisyUI 组件)
  return (
    <main className="flex min-h-screen flex-col items-center">
      
      {/* Sprint 2 - Hero (顶部 Banner)  */}
      <div className="hero min-h-[300px] bg-base-200" style={{ backgroundImage: 'url(https://img.daisyui.com/images/stock/photo-1507358522600-9f71e620c44e.webp)' }}>
        <div className="hero-overlay bg-opacity-60"></div>
        <div className="hero-content text-center text-neutral-content">
          <div className="max-w-md">
            <h1 className="mb-5 text-5xl font-bold">PMT 优惠平台</h1>
            <p className="mb-5">发现您身边的最佳优惠</p>
            <input type="text" placeholder="搜索商家或优惠券..." className="input input-bordered w-full" />
          </div>
        </div>
      </div>

      {/* Sprint 2 - Categories Menu (一级分类菜单)  */}
      <div className="w-full max-w-6xl p-4">
        <h2 className="text-2xl font-bold mb-4">分类</h2>
        <ul className="menu menu-horizontal bg-base-100 rounded-box shadow-lg overflow-x-auto">
          {categories && categories.map((category: Category) => (
            <li key={category.category_id}>
              {/* Sprint 2 - 链接到搜索页  */}
              <Link href={`/search?category=${category.category_id}`}>
                {getLangName(category.name, lang)}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Sprint 2 - Coupons Grid (优惠券卡片网格)  */}
      <div className="w-full max-w-6xl p-4">
        <h2 className="text-2xl font-bold mb-4">精选优惠</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          
          {coupons && coupons.map((coupon: Coupon) => (
            <div key={coupon.coupon_id} className="card bg-base-100 shadow-xl transition-transform hover:scale-105">
              <figure className="h-48 relative">
                <Image
                  // <--- 修复 3: 从数组中获取第一张图，并提供备用
                  src={(coupon.image_urls && coupon.image_urls.length > 0) ? coupon.image_urls[0] : '/placeholder.jpg'} 
                  alt={getLangName(coupon.name, lang)}
                  layout="fill"
                  objectFit="cover"
                />
              </figure>
              <div className="card-body p-4">
                <h3 className="card-title text-lg truncate" title={getLangName(coupon.name, lang)}>
                  {getLangName(coupon.name, lang)}
                </h3>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-primary text-xl font-bold">
                    ฿{coupon.selling_price} {/* 售价 [cite: 200] */}
                  </span>
                  <span className="line-through text-base-content/60">
                    ฿{coupon.original_value} {/* 原价 [cite: 201] */}
                  </span>
                </div>
                <div className="card-actions justify-end mt-4">
                  {/* Sprint 2 - 链接到详情页 [cite: 121] */}
                  <Link href={`/coupon/${coupon.coupon_id}`} className="btn btn-primary btn-sm">
                    查看详情
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