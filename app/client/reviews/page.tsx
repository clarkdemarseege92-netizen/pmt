// 文件: /app/client/reviews/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Image from "next/image"; // 【修复】移除未使用的 Link
import { HiChatBubbleBottomCenterText, HiStar } from "react-icons/hi2";

// 类型定义
type MultiLangName = { th: string; en: string; [key: string]: string } | null | undefined;

// 【修复】定义订单数据结构，消除 any
interface ReviewOrder {
  order_id: string;
  created_at: string;
  purchase_price: number;
  coupons: { name: MultiLangName; image_urls: string[] } | { name: MultiLangName; image_urls: string[] }[] | null;
  order_items: {
    products: { name: MultiLangName; image_urls: string[] } | null;
  }[];
}

const getLangName = (name: MultiLangName, lang = 'th') => name?.[lang] || name?.['en'] || "N/A";

export default async function ReviewsPendingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: ordersData } = await supabase
    .from('orders')
    .select(`
      order_id,
      created_at,
      purchase_price,
      coupons (name, image_urls),
      order_items (
        products (name, image_urls)
      )
    `)
    .eq('customer_id', user.id)
    .eq('status', 'used') 
    .order('created_at', { ascending: false });

  // 强制类型断言
  const orders = ordersData as unknown as ReviewOrder[];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <HiChatBubbleBottomCenterText className="text-warning" /> 待评价订单
      </h1>

      {!orders || orders.length === 0 ? (
        <div className="text-center py-20 bg-base-100 rounded-box border border-base-200">
          <p className="text-base-content/60">您目前没有待评价的订单。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            let image = '/placeholder.jpg';
            let name = '未知商品';
            
            if (order.coupons) { 
                const c = Array.isArray(order.coupons) ? order.coupons[0] : order.coupons;
                image = c.image_urls?.[0] || image;
                name = getLangName(c.name);
            } else if (order.order_items && order.order_items.length > 0) {
                const p = order.order_items[0].products;
                image = p?.image_urls?.[0] || image;
                name = getLangName(p?.name);
            }

            return (
              <div key={order.order_id} className="card md:card-side bg-base-100 shadow-sm border border-base-200 p-4 gap-4 items-center">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-base-200 shrink-0">
                  <Image src={image} alt={name} fill className="object-cover" unoptimized />
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <h3 className="font-bold text-lg">{name}</h3>
                  <p className="text-sm text-base-content/60">消费时间: {new Date(order.created_at).toLocaleDateString()}</p>
                </div>

                <div className="flex-none">
                  <button className="btn btn-warning btn-sm gap-2">
                    <HiStar /> 去评价
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}