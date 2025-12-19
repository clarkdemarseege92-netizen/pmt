'use server';

// app/actions/accounting/categories.ts
// 记账类目管理 Server Actions

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { ActionResult, AccountCategory } from '@/app/types/accounting';

/**
 * 获取商户的所有类目
 *
 * @param merchantId - 商户ID
 * @returns 类目列表
 */
export async function getCategories(merchantId: string): Promise<ActionResult<AccountCategory[]>> {
  try {
    const supabase = await createSupabaseServerClient();

    // 验证用户权限
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 验证商户所有权
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('merchant_id', merchantId)
      .eq('owner_id', user.id)
      .single();

    if (merchantError || !merchant) {
      return { success: false, error: 'Merchant not found or access denied' };
    }

    // 查询类目
    const { data: categories, error: queryError } = await supabase
      .from('account_categories')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('type', { ascending: true })
      .order('sort_order', { ascending: true });

    if (queryError) {
      console.error('Error querying categories:', queryError);
      return { success: false, error: 'Failed to query categories' };
    }

    return { success: true, data: categories as AccountCategory[] };
  } catch (error) {
    console.error('Error in getCategories:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 创建自定义类目
 *
 * @param params - 创建类目的参数
 * @param params.merchant_id - 商户ID
 * @param params.name - 类目名称（自定义文本）
 * @param params.type - 类型：income 或 expense
 * @returns 创建的类目
 */
export async function createCategory(params: {
  merchant_id: string;
  name: string;
  type: 'income' | 'expense';
}): Promise<ActionResult<AccountCategory>> {
  try {
    const supabase = await createSupabaseServerClient();

    // 验证用户权限
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 验证输入
    if (!params.name || params.name.trim() === '') {
      return { success: false, error: 'Category name is required' };
    }

    if (!['income', 'expense'].includes(params.type)) {
      return { success: false, error: 'Type must be either income or expense' };
    }

    // 验证商户所有权
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('merchant_id', params.merchant_id)
      .eq('owner_id', user.id)
      .single();

    if (merchantError || !merchant) {
      return { success: false, error: 'Merchant not found or access denied' };
    }

    // 获取当前最大的 sort_order
    const { data: maxOrderData } = await supabase
      .from('account_categories')
      .select('sort_order')
      .eq('merchant_id', params.merchant_id)
      .eq('type', params.type)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxOrderData?.sort_order || 0) + 1;

    // 创建类目（使用 custom_name 而不是 name）
    const { data: category, error: insertError } = await supabase
      .from('account_categories')
      .insert({
        merchant_id: params.merchant_id,
        custom_name: params.name.trim(), // 使用 custom_name 存储自定义名称
        type: params.type,
        is_system: false, // 自定义类目
        sort_order: nextOrder,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating category:', insertError);
      // 检查是否是唯一性约束错误
      if (insertError.code === '23505') {
        return { success: false, error: 'A category with this name already exists for this type' };
      }
      return { success: false, error: 'Failed to create category' };
    }

    return { success: true, data: category as AccountCategory };
  } catch (error) {
    console.error('Error in createCategory:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 更新自定义类目
 *
 * @param params - 更新类目的参数
 * @param params.category_id - 类目ID
 * @param params.name - 新的类目名称
 * @returns 更新后的类目
 */
export async function updateCategory(params: {
  category_id: string;
  name: string;
}): Promise<ActionResult<AccountCategory>> {
  try {
    const supabase = await createSupabaseServerClient();

    // 验证用户权限
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 验证输入
    if (!params.name || params.name.trim() === '') {
      return { success: false, error: 'Category name is required' };
    }

    // 查询原类目并验证权限
    const { data: existingCategory, error: fetchError } = await supabase
      .from('account_categories')
      .select('*, merchants!inner(owner_id)')
      .eq('category_id', params.category_id)
      .eq('is_system', false) // 只能更新非系统类目
      .single();

    if (fetchError || !existingCategory) {
      return { success: false, error: 'Category not found or cannot be edited (system category)' };
    }

    // 验证商户所有权
    if (existingCategory.merchants.owner_id !== user.id) {
      return { success: false, error: 'Access denied' };
    }

    // 更新类目（更新 custom_name）
    const { data: updatedCategory, error: updateError } = await supabase
      .from('account_categories')
      .update({
        custom_name: params.name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('category_id', params.category_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating category:', updateError);
      // 检查是否是唯一性约束错误
      if (updateError.code === '23505') {
        return { success: false, error: 'A category with this name already exists for this type' };
      }
      return { success: false, error: 'Failed to update category' };
    }

    return { success: true, data: updatedCategory as AccountCategory };
  } catch (error) {
    console.error('Error in updateCategory:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 删除自定义类目
 *
 * @param params - 删除类目的参数
 * @param params.category_id - 类目ID
 * @returns 删除结果
 */
export async function deleteCategory(params: {
  category_id: string;
}): Promise<ActionResult<void>> {
  try {
    const supabase = await createSupabaseServerClient();

    // 验证用户权限
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 查询原类目并验证权限
    const { data: existingCategory, error: fetchError } = await supabase
      .from('account_categories')
      .select('*, merchants!inner(owner_id)')
      .eq('category_id', params.category_id)
      .eq('is_system', false) // 只能删除非系统类目
      .single();

    if (fetchError || !existingCategory) {
      return { success: false, error: 'Category not found or cannot be deleted (system category)' };
    }

    // 验证商户所有权
    if (existingCategory.merchants.owner_id !== user.id) {
      return { success: false, error: 'Access denied' };
    }

    // 检查是否有关联的记账记录
    const { count, error: countError } = await supabase
      .from('account_transactions')
      .select('transaction_id', { count: 'exact', head: true })
      .eq('category_id', params.category_id)
      .is('deleted_at', null);

    if (countError) {
      console.error('Error checking category usage:', countError);
      return { success: false, error: 'Failed to check category usage' };
    }

    if (count && count > 0) {
      return {
        success: false,
        error: `Cannot delete category: ${count} transaction(s) are using this category`,
      };
    }

    // 删除类目
    const { error: deleteError } = await supabase
      .from('account_categories')
      .delete()
      .eq('category_id', params.category_id);

    if (deleteError) {
      console.error('Error deleting category:', deleteError);
      return { success: false, error: 'Failed to delete category' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteCategory:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 切换类目启用/禁用状态
 *
 * @param categoryId - 类目ID
 * @param isActive - 新的启用状态
 * @returns 更新后的类目
 */
export async function toggleCategoryStatus(
  categoryId: string,
  isActive: boolean
): Promise<ActionResult<AccountCategory>> {
  try {
    const supabase = await createSupabaseServerClient();

    // 验证用户权限
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 查询原类目并验证权限
    const { data: existingCategory, error: fetchError } = await supabase
      .from('account_categories')
      .select('*, merchants!inner(owner_id)')
      .eq('category_id', categoryId)
      .single();

    if (fetchError || !existingCategory) {
      return { success: false, error: 'Category not found' };
    }

    // 验证商户所有权
    if (existingCategory.merchants.owner_id !== user.id) {
      return { success: false, error: 'Access denied' };
    }

    // 更新启用状态
    const { data: updatedCategory, error: updateError } = await supabase
      .from('account_categories')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('category_id', categoryId)
      .select()
      .single();

    if (updateError) {
      console.error('Error toggling category status:', updateError);
      return { success: false, error: 'Failed to update category status' };
    }

    return { success: true, data: updatedCategory as AccountCategory };
  } catch (error) {
    console.error('Error in toggleCategoryStatus:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}
