// app/[locale]/admin/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Link from "next/link";
import { HiFolder, HiUsers, HiBuildingStorefront, HiShoppingBag, HiTicket } from "react-icons/hi2";

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient();

  // 获取统计数据
  const [categoriesCount, usersCount, merchantsCount, productsCount, couponsCount] = await Promise.all([
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('merchants').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('coupons').select('*', { count: 'exact', head: true }),
  ]);

  const stats = [
    {
      title: '行业分类',
      count: categoriesCount.count || 0,
      icon: <HiFolder className="w-8 h-8" />,
      link: '/admin/categories',
      color: 'bg-primary',
    },
    {
      title: '用户总数',
      count: usersCount.count || 0,
      icon: <HiUsers className="w-8 h-8" />,
      link: '/admin/users',
      color: 'bg-secondary',
    },
    {
      title: '商户数量',
      count: merchantsCount.count || 0,
      icon: <HiBuildingStorefront className="w-8 h-8" />,
      link: '/admin/merchants',
      color: 'bg-accent',
    },
    {
      title: '商品数量',
      count: productsCount.count || 0,
      icon: <HiShoppingBag className="w-8 h-8" />,
      link: '/admin/products',
      color: 'bg-info',
    },
    {
      title: '优惠券数量',
      count: couponsCount.count || 0,
      icon: <HiTicket className="w-8 h-8" />,
      link: '/admin/coupons',
      color: 'bg-success',
    },
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">管理员仪表板</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Link key={index} href={stat.link}>
            <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-all cursor-pointer">
              <div className="card-body">
                <div className={`w-16 h-16 rounded-full ${stat.color} flex items-center justify-center text-white mb-4`}>
                  {stat.icon}
                </div>
                <h2 className="card-title text-base-content/60 text-sm">{stat.title}</h2>
                <p className="text-3xl font-bold">{stat.count}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 快捷操作 */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title mb-4">快捷操作</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/admin/categories" className="btn btn-outline btn-primary justify-start gap-3">
              <HiFolder className="w-5 h-5" />
              管理行业分类
            </Link>
            <Link href="/admin/users" className="btn btn-outline btn-secondary justify-start gap-3">
              <HiUsers className="w-5 h-5" />
              管理用户
            </Link>
            <Link href="/admin/merchants" className="btn btn-outline btn-accent justify-start gap-3">
              <HiBuildingStorefront className="w-5 h-5" />
              管理商户
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
