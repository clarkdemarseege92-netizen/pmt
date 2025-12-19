// app/actions/products/get-products.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';

export type Product = {
  product_id: string;
  name: Record<string, string>; // JSONB with locale keys
  original_price: number;
  merchant_id: string;
  merchant_category_id?: string | null;
};

export type Coupon = {
  coupon_id: string;
  name: Record<string, string>; // JSONB with locale keys
  selling_price: number;
  original_value: number;
  merchant_id: string;
};

/**
 * 获取商户的产品列表（用于快捷收银）
 * @param merchantId 商户ID
 * @param categoryId 可选：按分类筛选（null 表示未分类，undefined 表示不筛选）
 */
export async function getProductsForQuickEntry(
  merchantId: string,
  categoryId?: string | null
) {
  try {
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from('products')
      .select('product_id, name, original_price, merchant_id, merchant_category_id')
      .eq('merchant_id', merchantId);

    // 按分类筛选
    if (categoryId !== undefined) {
      if (categoryId === null) {
        // 筛选未分类的商品
        query = query.is('merchant_category_id', null);
      } else {
        // 筛选指定分类的商品
        query = query.eq('merchant_category_id', categoryId);
      }
    }

    const { data, error } = await query.order('product_id', { ascending: true });

    if (error) {
      console.error('Error fetching products:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data as Product[] };
  } catch (error) {
    console.error('Error in getProductsForQuickEntry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    };
  }
}

/**
 * 获取商户的优惠券列表（用于快捷收银）
 */
export async function getCouponsForQuickEntry(merchantId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('coupons')
      .select('coupon_id, name, selling_price, original_value, merchant_id')
      .eq('merchant_id', merchantId)
      .order('coupon_id', { ascending: true });

    if (error) {
      console.error('Error fetching coupons:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data as Coupon[] };
  } catch (error) {
    console.error('Error in getCouponsForQuickEntry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    };
  }
}
