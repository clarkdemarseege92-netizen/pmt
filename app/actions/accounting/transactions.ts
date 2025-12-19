'use server';

// app/actions/accounting/transactions.ts
// 手动记账 Server Actions

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import {
  createManualTransactionSchema,
  updateManualTransactionSchema,
  deleteManualTransactionSchema,
  queryTransactionsSchema,
  type CreateManualTransactionInput,
  type UpdateManualTransactionInput,
  type DeleteManualTransactionInput,
  type QueryTransactionsInput,
} from '@/app/schemas/accounting';
import type { ActionResult, AccountTransaction, AccountTransactionWithCategory } from '@/app/types/accounting';

/**
 * 创建手动记账记录
 *
 * @param input - 创建记账的表单数据
 * @returns 创建的记账记录
 */
export async function createManualTransaction(
  input: CreateManualTransactionInput
): Promise<ActionResult<AccountTransaction>> {
  try {
    // 数据验证
    const validatedData = createManualTransactionSchema.parse(input);

    const supabase = await createSupabaseServerClient();

    // 验证商户权限
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 验证商户是否属于当前用户
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('merchant_id', validatedData.merchant_id)
      .eq('owner_id', user.id)
      .single();

    if (merchantError || !merchant) {
      return { success: false, error: 'Merchant not found or access denied' };
    }

    // 如果提供了category_id，验证类目是否存在且属于该商户
    if (validatedData.category_id) {
      const { data: category, error: categoryError } = await supabase
        .from('account_categories')
        .select('category_id')
        .eq('category_id', validatedData.category_id)
        .eq('merchant_id', validatedData.merchant_id)
        .single();

      if (categoryError || !category) {
        return { success: false, error: 'Category not found or access denied' };
      }
    }

    // 创建记账记录
    const { data: transaction, error: insertError } = await supabase
      .from('account_transactions')
      .insert({
        merchant_id: validatedData.merchant_id,
        type: validatedData.type,
        amount: validatedData.amount,
        category_id: validatedData.category_id || null,
        source: 'manual',
        note: validatedData.note || null,
        transaction_date: validatedData.transaction_date || new Date().toISOString().split('T')[0],
        product_id: validatedData.product_id || null,
        is_editable: true,
        is_deletable: true,
        metadata: {
          created_by: user.id,
          created_manually: true,
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating transaction:', insertError);
      return { success: false, error: 'Failed to create transaction' };
    }

    return { success: true, data: transaction as AccountTransaction };
  } catch (error) {
    console.error('Error in createManualTransaction:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 更新手动记账记录
 *
 * @param input - 更新记账的表单数据
 * @returns 更新后的记账记录
 */
export async function updateManualTransaction(
  input: UpdateManualTransactionInput
): Promise<ActionResult<AccountTransaction>> {
  try {
    // 数据验证
    const validatedData = updateManualTransactionSchema.parse(input);

    const supabase = await createSupabaseServerClient();

    // 验证用户权限
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 查询原记录并验证权限
    const { data: existingTransaction, error: fetchError } = await supabase
      .from('account_transactions')
      .select('*, merchants!inner(owner_id)')
      .eq('transaction_id', validatedData.transaction_id)
      .eq('source', 'manual')
      .eq('is_editable', true)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingTransaction) {
      return { success: false, error: 'Transaction not found or cannot be edited' };
    }

    // 验证商户所有权
    if (existingTransaction.merchants.owner_id !== user.id) {
      return { success: false, error: 'Access denied' };
    }

    // 如果更新了category_id，验证类目
    if (validatedData.category_id !== undefined && validatedData.category_id !== null) {
      const { data: category, error: categoryError } = await supabase
        .from('account_categories')
        .select('category_id')
        .eq('category_id', validatedData.category_id)
        .eq('merchant_id', existingTransaction.merchant_id)
        .single();

      if (categoryError || !category) {
        return { success: false, error: 'Category not found or access denied' };
      }
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (validatedData.type !== undefined) updateData.type = validatedData.type;
    if (validatedData.amount !== undefined) updateData.amount = validatedData.amount;
    if (validatedData.category_id !== undefined) updateData.category_id = validatedData.category_id;
    if (validatedData.note !== undefined) updateData.note = validatedData.note;
    if (validatedData.transaction_date !== undefined) updateData.transaction_date = validatedData.transaction_date;
    if (validatedData.product_id !== undefined) updateData.product_id = validatedData.product_id;

    // 更新记录
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('account_transactions')
      .update(updateData)
      .eq('transaction_id', validatedData.transaction_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      return { success: false, error: 'Failed to update transaction' };
    }

    return { success: true, data: updatedTransaction as AccountTransaction };
  } catch (error) {
    console.error('Error in updateManualTransaction:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 软删除手动记账记录
 *
 * @param input - 删除记账的参数
 * @returns 删除结果
 */
export async function deleteManualTransaction(
  input: DeleteManualTransactionInput
): Promise<ActionResult<void>> {
  try {
    // 数据验证
    const validatedData = deleteManualTransactionSchema.parse(input);

    const supabase = await createSupabaseServerClient();

    // 验证用户权限
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 查询原记录并验证权限
    const { data: existingTransaction, error: fetchError } = await supabase
      .from('account_transactions')
      .select('*, merchants!inner(owner_id)')
      .eq('transaction_id', validatedData.transaction_id)
      .eq('source', 'manual')
      .eq('is_deletable', true)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingTransaction) {
      return { success: false, error: 'Transaction not found or cannot be deleted' };
    }

    // 验证商户所有权
    if (existingTransaction.merchants.owner_id !== user.id) {
      return { success: false, error: 'Access denied' };
    }

    // 软删除（设置 deleted_at 时间戳）
    const { error: deleteError } = await supabase
      .from('account_transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('transaction_id', validatedData.transaction_id);

    if (deleteError) {
      console.error('Error deleting transaction:', deleteError);
      return { success: false, error: 'Failed to delete transaction' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteManualTransaction:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 查询记账记录列表
 *
 * @param input - 查询参数
 * @returns 记账记录列表
 */
export async function queryTransactions(
  input: QueryTransactionsInput
): Promise<ActionResult<AccountTransactionWithCategory[]>> {
  try {
    // 数据验证
    const validatedData = queryTransactionsSchema.parse(input);

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
      .eq('merchant_id', validatedData.merchant_id)
      .eq('owner_id', user.id)
      .single();

    if (merchantError || !merchant) {
      return { success: false, error: 'Merchant not found or access denied' };
    }

    // 构建查询
    let query = supabase
      .from('account_transactions')
      .select(`
        *,
        category:account_categories(*)
      `)
      .eq('merchant_id', validatedData.merchant_id)
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    // 应用筛选条件
    if (validatedData.type) {
      query = query.eq('type', validatedData.type);
    }

    if (validatedData.source) {
      query = query.eq('source', validatedData.source);
    }

    if (validatedData.category_id) {
      query = query.eq('category_id', validatedData.category_id);
    }

    if (validatedData.start_date) {
      query = query.gte('transaction_date', validatedData.start_date);
    }

    if (validatedData.end_date) {
      query = query.lte('transaction_date', validatedData.end_date);
    }

    // 应用分页
    const limit = validatedData.limit || 50;
    const offset = validatedData.offset || 0;
    query = query.range(offset, offset + limit - 1);

    // 执行查询
    const { data: transactions, error: queryError } = await query;

    if (queryError) {
      console.error('Error querying transactions:', queryError);
      return { success: false, error: 'Failed to query transactions' };
    }

    return { success: true, data: transactions as AccountTransactionWithCategory[] };
  } catch (error) {
    console.error('Error in queryTransactions:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}
