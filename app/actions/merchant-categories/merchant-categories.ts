// app/actions/merchant-categories/merchant-categories.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';

// ============================================================================
// 类型定义
// ============================================================================

type MultiLangName = {
  th: string;
  en: string;
  zh: string;
};

export type MerchantCategory = {
  category_id: string;
  merchant_id: string;
  name: MultiLangName;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateMerchantCategoryInput = {
  merchant_id: string;
  name: MultiLangName;
  icon?: string;
  sort_order?: number;
};

export type UpdateMerchantCategoryInput = {
  category_id: string;
  name?: MultiLangName;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
};

export type CategoryStats = {
  category_id: string;
  merchant_id: string;
  category_name: MultiLangName;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  product_count: number;
  active_product_count: number;
};

export type BatchUpdateOrderInput = {
  category_id: string;
  sort_order: number;
}[];

// ============================================================================
// 查询操作
// ============================================================================

/**
 * 获取商户的所有分类（仅启用的）
 */
export async function getMerchantCategories(merchantId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('merchant_product_categories')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching merchant categories:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data as MerchantCategory[] };
  } catch (error) {
    console.error('Error in getMerchantCategories:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    };
  }
}

/**
 * 获取商户的所有分类（包括禁用的，用于管理页面）
 */
export async function getAllMerchantCategories(merchantId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('merchant_product_categories')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching all merchant categories:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data as MerchantCategory[] };
  } catch (error) {
    console.error('Error in getAllMerchantCategories:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    };
  }
}

/**
 * 获取单个分类详情
 */
export async function getMerchantCategory(categoryId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('merchant_product_categories')
      .select('*')
      .eq('category_id', categoryId)
      .single();

    if (error) {
      console.error('Error fetching merchant category:', error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data: data as MerchantCategory };
  } catch (error) {
    console.error('Error in getMerchantCategory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    };
  }
}

/**
 * 获取分类统计信息（包含商品数量）
 */
export async function getMerchantCategoryStats(merchantId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('merchant_category_stats')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching category stats:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data as CategoryStats[] };
  } catch (error) {
    console.error('Error in getMerchantCategoryStats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    };
  }
}

/**
 * 获取未分类商品数量
 */
export async function getUncategorizedProductsCount(merchantId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc('get_uncategorized_products_count', {
      p_merchant_id: merchantId
    });

    if (error) {
      console.error('Error fetching uncategorized products count:', error);
      return { success: false, error: error.message, count: 0 };
    }

    return { success: true, count: data as number };
  } catch (error) {
    console.error('Error in getUncategorizedProductsCount:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      count: 0
    };
  }
}

// ============================================================================
// 创建操作
// ============================================================================

/**
 * 创建新分类
 */
export async function createMerchantCategory(input: CreateMerchantCategoryInput) {
  try {
    const supabase = await createSupabaseServerClient();

    // 验证分类名称 - MultiLangName 至少要有一个非空语言字段
    if (!input.name) {
      return { success: false, error: 'Category name is required', data: null };
    }

    const hasValidName = Object.values(input.name).some(val => val && val.trim().length > 0);
    if (!hasValidName) {
      return { success: false, error: 'Category name must have at least one language field', data: null };
    }

    // 验证每个语言字段的长度
    for (const [lang, value] of Object.entries(input.name)) {
      if (value && value.length > 50) {
        return { success: false, error: `Category name (${lang}) must be 50 characters or less`, data: null };
      }
    }

    // 如果未提供 sort_order，获取当前最大值并 +1
    let sortOrder = input.sort_order ?? 0;
    if (input.sort_order === undefined) {
      const { data: maxData } = await supabase
        .from('merchant_product_categories')
        .select('sort_order')
        .eq('merchant_id', input.merchant_id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxData) {
        sortOrder = maxData.sort_order + 1;
      }
    }

    const { data, error } = await supabase
      .from('merchant_product_categories')
      .insert({
        merchant_id: input.merchant_id,
        name: input.name,
        icon: input.icon || null,
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating merchant category:', error);
      // 处理唯一约束冲突
      if (error.code === '23505') {
        return { success: false, error: 'A category with this name already exists', data: null };
      }
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data: data as MerchantCategory };
  } catch (error) {
    console.error('Error in createMerchantCategory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    };
  }
}

// ============================================================================
// 更新操作
// ============================================================================

/**
 * 更新分类信息
 */
export async function updateMerchantCategory(input: UpdateMerchantCategoryInput) {
  try {
    const supabase = await createSupabaseServerClient();

    // 验证分类名称（如果提供）- MultiLangName 至少要有一个非空语言字段
    if (input.name !== undefined) {
      const hasValidName = Object.values(input.name).some(val => val && val.trim().length > 0);
      if (!hasValidName) {
        return { success: false, error: 'Category name must have at least one language field', data: null };
      }

      // 验证每个语言字段的长度
      for (const [lang, value] of Object.entries(input.name)) {
        if (value && value.length > 50) {
          return { success: false, error: `Category name (${lang}) must be 50 characters or less`, data: null };
        }
      }
    }

    // 构建更新对象
    const updateData: Record<string, any> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.icon !== undefined) updateData.icon = input.icon || null;
    if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'No fields to update', data: null };
    }

    const { data, error } = await supabase
      .from('merchant_product_categories')
      .update(updateData)
      .eq('category_id', input.category_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating merchant category:', error);
      // 处理唯一约束冲突
      if (error.code === '23505') {
        return { success: false, error: 'A category with this name already exists', data: null };
      }
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data: data as MerchantCategory };
  } catch (error) {
    console.error('Error in updateMerchantCategory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    };
  }
}

/**
 * 批量更新分类排序
 */
export async function batchUpdateCategoryOrder(merchantId: string, orders: BatchUpdateOrderInput) {
  try {
    const supabase = await createSupabaseServerClient();

    // 验证输入
    if (!orders || orders.length === 0) {
      return { success: false, error: 'No categories to update' };
    }

    // 调用数据库函数
    const { error } = await supabase.rpc('batch_update_category_order', {
      p_merchant_id: merchantId,
      p_category_orders: orders
    });

    if (error) {
      console.error('Error batch updating category order:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in batchUpdateCategoryOrder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// 删除操作
// ============================================================================

/**
 * 检查分类是否可以删除
 */
export async function checkCanDeleteCategory(categoryId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc('can_delete_category', {
      p_category_id: categoryId
    });

    if (error) {
      console.error('Error checking can delete category:', error);
      return { success: false, error: error.message, canDelete: false, productCount: 0, message: '' };
    }

    // RPC 返回的是数组，取第一个元素
    const result = Array.isArray(data) ? data[0] : data;

    return {
      success: true,
      canDelete: result.can_delete,
      productCount: result.product_count,
      message: result.message
    };
  } catch (error) {
    console.error('Error in checkCanDeleteCategory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      canDelete: false,
      productCount: 0,
      message: ''
    };
  }
}

/**
 * 删除分类（硬删除）
 */
export async function deleteMerchantCategory(categoryId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    // 先检查是否可以删除
    const checkResult = await checkCanDeleteCategory(categoryId);
    if (!checkResult.success) {
      return { success: false, error: checkResult.error };
    }

    if (!checkResult.canDelete) {
      return { success: false, error: checkResult.message };
    }

    const { error } = await supabase
      .from('merchant_product_categories')
      .delete()
      .eq('category_id', categoryId);

    if (error) {
      console.error('Error deleting merchant category:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteMerchantCategory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 禁用分类（软删除）
 */
export async function disableMerchantCategory(categoryId: string) {
  return updateMerchantCategory({
    category_id: categoryId,
    is_active: false
  });
}

/**
 * 启用分类
 */
export async function enableMerchantCategory(categoryId: string) {
  return updateMerchantCategory({
    category_id: categoryId,
    is_active: true
  });
}
