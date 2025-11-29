// 文件: /app/client/history/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Link from "next/link";
import Image from "next/image";
// 【修复】将 HiStorefront 替换为 HiBuildingStorefront
import { HiClock, HiBuildingStorefront, HiTag, HiShoppingBag } from "react-icons/hi2";
import { ReactNode } from "react";

// 定义多语言名称类型
type MultiLangName = { th: string; en: string; [key: string]: string } | null | undefined;

// 【修复】消除 any，定义辅助函数参数类型
const getLangName = (name: MultiLangName, lang = 'th') => name?.[lang] || name?.['en'] || "N/A";

// 定义历史记录项的详情类型
type ItemDetail = {
  merchant_id?: string;
  shop_name?: string;
  name?: MultiLangName;
  selling_price?: number;
  original_price?: number;
  image_urls?: string[];
  logo_url?: string;
};

export default async function HistoryPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: history } = await supabase
    .from('browsing_history')
    .select('*')
    .eq('user_id', user.id)
    .order('viewed_at', { ascending: false })
    .limit(50);

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-4 text-base-content/30">
          <HiClock className="w-10 h-10" />
        </div>
        <h2 className="text-lg font-bold">暂无浏览记录</h2>
        <Link href="/" className="btn btn-primary btn-sm mt-6">去首页看看</Link>
      </div>
    );
  }

  const productIds = history.filter(h => h.item_type === 'product').map(h => h.item_id);
  const couponIds = history.filter(h => h.item_type === 'coupon').map(h => h.item_id);
  const merchantIds = history.filter(h => h.item_type === 'merchant').map(h => h.item_id);

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
        <HiClock className="text-secondary" /> 最近浏览
      </h1>

      <div className="space-y-2">
        {history.map(item => {
          let detail: ItemDetail | undefined;
          let link = "#";
          let label = "";
          // 【修复】将 icon 定义为 ReactNode 或 null
          let icon: ReactNode = null;

          if (item.item_type === 'product') {
            detail = productsMap.get(item.item_id);
            link = detail ? `/shop/${detail.merchant_id}` : "#";
            label = "商品";
            icon = <HiShoppingBag />;
          } else if (item.item_type === 'coupon') {
            detail = couponsMap.get(item.item_id);
            link = `/coupon/${item.item_id}`;
            label = "优惠券";
            icon = <HiTag />;
          } else if (item.item_type === 'merchant') {
            detail = merchantsMap.get(item.item_id);
            link = `/shop/${item.item_id}`;
            label = "店铺";
            icon = <HiBuildingStorefront />;
          }

          if (!detail) return null;

          const name = item.item_type === 'merchant' ? detail.shop_name : getLangName(detail.name);
          const image = item.item_type === 'merchant' ? detail.logo_url : detail.image_urls?.[0];
          const time = new Date(item.viewed_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });

          return (
            <Link key={item.id} href={link} className="flex items-center gap-4 p-3 bg-base-100 border border-base-200 rounded-lg hover:bg-base-50 transition-colors group">
              <div className="relative w-16 h-16 rounded overflow-hidden bg-base-200 shrink-0">
                {image && <Image src={image} alt={name || 'Item'} fill className="object-cover" sizes="64px" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div className="font-bold text-sm truncate">{name}</div>
                  <span className="text-xs text-base-content/40 shrink-0">{time}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-base-content/60">
                  <span className="flex items-center gap-1">{icon} {label}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}