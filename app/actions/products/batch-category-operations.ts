// app/actions/products/batch-category-operations.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';

// ============================================================================
// 类型定义
// ============================================================================

export type BatchAssignCategoryInput = {
  product_ids: string[];
  merchant_category_id: string | null; // null 表示取消分类
};

export type BatchAssignResult = {
  success: boolean;
  updated_count?: number;
  error?: string;
};

// ============================================================================
// 批量操作
// ============================================================================

/**
 * 批量为商品分配分类
 * @param input 包含商品ID列表和目标分类ID（null表示取消分类）
 */
export async function batchAssignProductCategory(input: BatchAssignCategoryInput): Promise<BatchAssignResult> {
  try {
    const supabase = await createSupabaseServerClient();

    // 验证输入
    if (!input.product_ids || input.product_ids.length === 0) {
      return { success: false, error: 'No products selected' };
    }

    // 批量更新商品分类
    const { data, error } = await supabase
      .from('products')
      .update({ merchant_category_id: input.merchant_category_id })
      .in('product_id', input.product_ids)
      .select();

    if (error) {
      console.error('Error batch assigning product category:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      updated_count: data?.length ?? 0
    };
  } catch (error) {
    console.error('Error in batchAssignProductCategory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 为单个商品分配分类
 * @param productId 商品ID
 * @param categoryId 分类ID（null表示取消分类）
 */
export async function assignProductCategory(
  productId: string,
  categoryId: string | null
): Promise<BatchAssignResult> {
  return batchAssignProductCategory({
    product_ids: [productId],
    merchant_category_id: categoryId
  });
}

/**
 * 获取指定分类下的所有商品
 * @param merchantId 商户ID
 * @param categoryId 分类ID（null表示未分类）
 */
export async function getProductsByCategory(
  merchantId: string,
  categoryId: string | null
) {
  try {
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from('products')
      .select('product_id, name, original_price, merchant_category_id')
      .eq('merchant_id', merchantId);

    if (categoryId === null) {
      query = query.is('merchant_category_id', null);
    } else {
      query = query.eq('merchant_category_id', categoryId);
    }

    const { data, error } = await query.order('product_id', { ascending: true });

    if (error) {
      console.error('Error fetching products by category:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getProductsByCategory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    };
  }
}

/**
 * 批量取消商品分类（将分类设置为null）
 * @param productIds 商品ID列表
 */
export async function batchRemoveProductCategory(productIds: string[]): Promise<BatchAssignResult> {
  return batchAssignProductCategory({
    product_ids: productIds,
    merchant_category_id: null
  });
}
