// 文件: /app/client/orders/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import OrderTabs from "@/components/OrderTabs";

// --- 类型定义 ---
type MultiLangName = {
  th: string;
  en: string;
  [key: string]: string;
};

// 定义 OrderItem 内部结构
type OrderItemData = {
  quantity: number;
  products: {
    name: MultiLangName;
    image_urls: string[];
  } | null;
};

// 定义 Coupon 数据结构
type CouponData = {
  name: MultiLangName;
  image_urls: string[];
};

// 【修复核心】：完整的 Order 类型，包含 coupons 和 order_items
type Order = {
  order_id: string;
  customer_id: string;
  redemption_code: string;
  purchase_price: number;
  status: 'paid' | 'used' | 'expired' | 'pending'; // 添加 pending 状态
  created_at: string;
  coupon_id: string | null; // 允许为空
  // Supabase 通过 coupon_id 外键关联返回单个对象（不是数组）
  coupons: CouponData | null;
  order_items: OrderItemData[];
};

export default async function MyOrdersPage() {

    const supabase = await createSupabaseServerClient();

    // 1. 检查用户登录状态
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // 2. 核心查询

    const { data, error } = await supabase
        .from('orders')
        .select(`
            order_id,
            customer_id,
            redemption_code,
            purchase_price,
            status,
            created_at,
            coupon_id,
            coupons (
                name,
                image_urls
            ),
            order_items (
                quantity,
                products (
                    name,
                    image_urls
                )
            )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching orders:", error.message);
    }

    const orders = (data as unknown as Order[]) || [];

    return (
        <main className="max-w-4xl mx-auto p-4 lg:p-8">
            <h1 className="text-3xl font-bold mb-6">我的订单</h1>
            <OrderTabs orders={orders} />
        </main>
    );
}