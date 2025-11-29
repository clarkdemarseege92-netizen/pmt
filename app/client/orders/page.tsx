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
  status: 'paid' | 'used' | 'expired';
  created_at: string;
  coupon_id: string | null; // 允许为空
  // Supabase 联表查询返回数组（即使是多对一，取决于查询写法，通常这里前端接收数组处理更灵活）
  coupons: CouponData[] | null; 
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

    // 【修复】：将查询结果断言为 Order[]，消除 'any' 警告
    // 注意：这里假设 status 数据库值与 TypeScript 类型匹配，实际项目中可能需要更严格的校验
    const orders = (data as unknown as Order[]) || [];

    // 3. 渲染 Client Component
    return (
        <main className="max-w-4xl mx-auto p-4 lg:p-8">
            <h1 className="text-3xl font-bold mb-6">我的订单</h1>
            {/* 现在可以直接传递 orders，无需 as any */}
            <OrderTabs orders={orders} />
        </main>
    );
}