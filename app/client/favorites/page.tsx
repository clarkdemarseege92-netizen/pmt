// app/client/favorites/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import FavoritesClient from "./FavoritesClient";

// 定义 Supabase 返回的原始数据类型
interface ProductRaw {
  product_id: string;
  name: string | { th: string; en: string };
  original_price: number;
  image_urls: string[];
  merchant_id: string;
}

interface CouponRaw {
  coupon_id: string;
  name: string | { th: string; en: string };
  selling_price: number;
  original_value: number;
  merchant_id?: string;
  image_urls?: string[];
}

interface MerchantRaw {
  merchant_id: string;
  shop_name: string;
  logo_url?: string;
  description?: string;
}

export default async function FavoritesPage() {
  const supabase = await createSupabaseServerClient();
  
  // 1. 获取当前用户
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // 2. 获取收藏数据
  // 先获取用户的收藏列表
  const { data: favoritesList } = await supabase
    .from('favorites')
    .select('item_id, item_type')
    .eq('user_id', user.id);

  // 分别获取不同类型的 item_id
  const productIds = favoritesList?.filter(f => f.item_type === 'product').map(f => f.item_id) || [];
  const couponIds = favoritesList?.filter(f => f.item_type === 'coupon').map(f => f.item_id) || [];
  const merchantIds = favoritesList?.filter(f => f.item_type === 'merchant').map(f => f.item_id) || [];

  // 根据 ID 列表查询详细数据
  const [productsRes, couponsRes, merchantsRes] = await Promise.all([
    // 获取收藏的商品详情
    productIds.length > 0
      ? supabase
          .from('products')
          .select('product_id, name, original_price, image_urls, merchant_id')
          .in('product_id', productIds)
      : { data: [], error: null },

    // 获取收藏的优惠券详情
    couponIds.length > 0
      ? supabase
          .from('coupons')
          .select('coupon_id, name, selling_price, original_value, merchant_id, image_urls')
          .in('coupon_id', couponIds)
      : { data: [], error: null },

    // 获取收藏的店铺详情
    merchantIds.length > 0
      ? supabase
          .from('merchants')
          .select('merchant_id, shop_name, logo_url, description')
          .in('merchant_id', merchantIds)
      : { data: [], error: null },
  ]);

  // 3. 处理数据（转换为前端需要的格式）
  const favoriteProducts = ((productsRes.data as ProductRaw[]) || []).map((product) => ({
    product_id: product.product_id,
    name: typeof product.name === 'object' ? product.name.th : product.name,
    price: product.original_price,
    image_url: product.image_urls?.[0] || '',
    merchant_id: product.merchant_id,
  }));

  const favoriteCoupons = ((couponsRes.data as CouponRaw[]) || []).map((coupon) => ({
    coupon_id: coupon.coupon_id,
    title: typeof coupon.name === 'object' ? coupon.name.th : coupon.name,
    description: `原价 ฿${coupon.original_value} | 折扣价 ฿${coupon.selling_price}`,
    discount_value: coupon.original_value - coupon.selling_price,
    merchant_id: coupon.merchant_id || '',
    image_url: coupon.image_urls?.[0] || '',
  }));

  const favoriteMerchants = ((merchantsRes.data as MerchantRaw[]) || []).map((merchant) => ({
    merchant_id: merchant.merchant_id,
    shop_name: merchant.shop_name,
    logo_url: merchant.logo_url || undefined,
    description: merchant.description || undefined,
  }));

  // 4. 渲染客户端组件
  return (
    <FavoritesClient
      favoriteProducts={favoriteProducts}
      favoriteCoupons={favoriteCoupons}
      favoriteMerchants={favoriteMerchants}
    />
  );
}