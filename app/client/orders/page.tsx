// 文件: /app/client/orders/page.tsx (Server Component)
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import OrderTabs from "@/components/OrderTabs"; // 引入 Client 组件

// 类型定义（与 OrderTabs.tsx 保持一致，但这里我们从 DB 接收所有字段）
type CouponData = {
    name: { th: string; en: string; };
    image_urls: string[];
};

type Order = {
    order_id: string;
    customer_id: string;
    redemption_code: string;
    purchase_price: number;
    status: 'paid' | 'used' | 'expired';
    created_at: string;
    coupons: CouponData; 
};


export default async function MyOrdersPage() {
    
    const supabase = await createSupabaseServerClient();
    
    // 1. 检查用户登录状态 (保护路由)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    // 2. 核心查询：获取用户所有订单
    // 联表查询 coupons 表，获取优惠券的 name 和 image_urls
    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
            order_id,
            customer_id,
            redemption_code,
            purchase_price,
            status,
            created_at,
            coupons (
                name,
                image_urls
            )
        `)
        .eq('customer_id', user.id) // 筛选当前用户
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching orders:", error.message);
        // 如果查询失败，返回空数组或显示错误信息
    }

    // 3. 渲染 Client Component
    return (
        <main className="max-w-4xl mx-auto p-4 lg:p-8">
            <h1 className="text-3xl font-bold mb-6">我的订单</h1>
            <OrderTabs orders={orders as Order[] || []} />
        </main>
    );
}
