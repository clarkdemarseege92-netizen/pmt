// 文件: /app/merchant/orders/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import MerchantOrdersClient, { OrderDetail } from "./MerchantOrdersClient"; 

// 定义 Supabase 原始返回的数据结构，允许 coupons/profiles 是数组或对象 (处理联表查询的返回差异)
interface RawOrder extends Omit<OrderDetail, 'coupons' | 'profiles'> {
  coupons: OrderDetail['coupons'] | OrderDetail['coupons'][];
  profiles: OrderDetail['profiles'] | OrderDetail['profiles'][];
}

export default async function MerchantOrdersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 1. 获取当前用户的商户 ID
  const { data: merchant } = await supabase
    .from("merchants")
    .select("merchant_id")
    .eq("owner_id", user.id)
    .single();

  if (!merchant) {
    return <div className="p-8">未找到商户信息，请先注册店铺。</div>;
  }

  // 2. 获取该商户的所有订单 (联表查询: coupons, order_items->products, profiles)
  const { data: ordersData, error } = await supabase
    .from("orders")
    .select(`
      *,
      coupons (name, image_urls),
      order_items (
        quantity,
        products (name, image_urls, original_price)
      ),
      profiles (phone, email)
    `)
    .eq("merchant_id", merchant.merchant_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch orders error:", error);
    return <div className="p-8 text-error">加载订单失败: {error.message}</div>;
  }

  // 3. 数据规范化：将可能为数组的关联数据统一转换为对象
  const orders: OrderDetail[] = (ordersData as unknown as RawOrder[] || []).map((order) => ({
    ...order,
    // 如果是一对一关联但返回了数组，取第一个元素
    coupons: Array.isArray(order.coupons) ? order.coupons[0] : order.coupons,
    profiles: Array.isArray(order.profiles) ? order.profiles[0] : order.profiles,
  }));

  return (
    <main className="w-full max-w-6xl mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">订单管理</h1>
      <MerchantOrdersClient orders={orders} />
    </main>
  );
}