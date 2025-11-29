// 文件: /app/client/favorites/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Link from "next/link";
import Image from "next/image";
// 【修复】替换图标
import { HiHeart, HiBuildingStorefront, HiTag, HiShoppingBag } from "react-icons/hi2";
import { ReactNode } from "react";

type MultiLangName = { th: string; en: string; [key: string]: string } | null | undefined;

const getLangName = (name: MultiLangName, lang = 'th') => name?.[lang] || name?.['en'] || "N/A";

// 【修复】定义详情类型
type ItemDetail = {
  merchant_id?: string;
  shop_name?: string;
  name?: MultiLangName;
  selling_price?: number;
  original_price?: number;
  image_urls?: string[];
  logo_url?: string;
};

export default async function FavoritesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: favorites } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (!favorites || favorites.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-4 text-base-content/30">
          <HiHeart className="w-10 h-10" />
        </div>
        <h2 className="text-lg font-bold">暂无收藏</h2>
        <p className="text-sm text-base-content/60 mt-2">快去浏览商品，把你喜欢的加入收藏吧！</p>
        <Link href="/" className="btn btn-primary btn-sm mt-6">去逛逛</Link>
      </div>
    );
  }

  const productIds = favorites.filter(f => f.item_type === 'product').map(f => f.item_id);
  const couponIds = favorites.filter(f => f.item_type === 'coupon').map(f => f.item_id);
  const merchantIds = favorites.filter(f => f.item_type === 'merchant').map(f => f.item_id);

  const [productsRes, couponsRes, merchantsRes] = await Promise.all([
    productIds.length > 0 ? supabase.from('products').select('product_id, merchant_id, name, original_price, image_urls').in('product_id', productIds) : { data: [] },
    couponIds.length > 0 ? supabase.from('coupons').select('coupon_id, name, selling_price, image_urls').in('coupon_id', couponIds) : { data: [] },
    merchantIds.length > 0 ? supabase.from('merchants').select('merchant_id, shop_name, logo_url').in('merchant_id', merchantIds) : { data: [] },
  ]);

  const productsMap = new Map(productsRes.data?.map(p => [p.product_id, p]));
  const couponsMap = new Map(couponsRes.data?.map(c => [c.coupon_id, c]));
  const merchantsMap = new Map(merchantsRes.data?.map(m => [m.merchant_id, m]));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <HiHeart className="text-error" /> 我的收藏
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {favorites.map(fav => {
          let item: ItemDetail | undefined;
          let link = "#";
          let typeLabel = "";
          // 【修复】定义为 ReactNode
          let icon: ReactNode = null;

          if (fav.item_type === 'product') {
            item = productsMap.get(fav.item_id);
            link = `/shop/${item?.merchant_id}`;
            typeLabel = "商品";
            icon = <HiShoppingBag />;
          } else if (fav.item_type === 'coupon') {
            item = couponsMap.get(fav.item_id);
            link = `/coupon/${fav.item_id}`;
            typeLabel = "优惠券";
            icon = <HiTag />;
          } else if (fav.item_type === 'merchant') {
            item = merchantsMap.get(fav.item_id);
            link = `/shop/${fav.item_id}`;
            typeLabel = "店铺";
            icon = <HiBuildingStorefront />;
          }

          if (!item) return null;

          const name = fav.item_type === 'merchant' ? item.shop_name : getLangName(item.name);
          const price = fav.item_type === 'merchant' ? null : (item.selling_price || item.original_price);
          const image = fav.item_type === 'merchant' ? item.logo_url : item.image_urls?.[0];

          return (
            <Link key={fav.id} href={link} className="card card-side bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-all h-32">
              <figure className="relative w-32 h-full bg-base-50">
                {image ? (
                  <Image src={image} alt={name || 'Fav'} fill className="object-cover" sizes="128px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-base-content/20 bg-base-200">No Image</div>
                )}
                <div className="absolute top-1 left-1 badge badge-xs badge-neutral opacity-80 gap-1 p-2 text-white">
                  {icon} {typeLabel}
                </div>
              </figure>
              <div className="card-body p-4 justify-between w-full min-w-0">
                <h3 className="font-bold text-sm line-clamp-2" title={name}>{name}</h3>
                <div className="flex justify-between items-end">
                  {price !== null && price !== undefined ? (
                    <span className="text-lg font-bold text-primary">฿{price}</span>
                  ) : (
                    <span className="text-xs text-base-content/50">进入店铺</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}