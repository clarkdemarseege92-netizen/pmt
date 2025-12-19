// app/actions/accounting/quick-entry.ts
// 快捷记账 Server Actions

'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type {
  ActionResult,
  QuickExpenseInput,
  AccountTransaction,
  AccountCategory,
} from '@/app/types/accounting';

/**
 * 快捷支出录入
 * 创建支出类型的记账记录
 */
export async function createQuickExpense(
  input: QuickExpenseInput
): Promise<ActionResult<AccountTransaction>> {
  try {
    const supabase = await createSupabaseServerClient();

    // 验证用户权限
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 验证商户所有权
    const { data: merchant } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('merchant_id', input.merchant_id)
      .eq('owner_id', user.id)
      .single();

    if (!merchant) {
      return { success: false, error: 'Merchant not found or unauthorized' };
    }

    // 验证必填字段
    if (!input.category_id) {
      return { success: false, error: 'Category is required' };
    }

    if (!input.amount || input.amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0' };
    }

    // 验证类目是否存在且为支出类型
    const { data: category, error: categoryError } = await supabase
      .from('account_categories')
      .select('*')
      .eq('category_id', input.category_id)
      .eq('merchant_id', input.merchant_id)
      .eq('type', 'expense')
      .single();

    if (categoryError || !category) {
      return { success: false, error: 'Invalid expense category' };
    }

    // 创建记账记录
    const { data, error } = await supabase
      .from('account_transactions')
      .insert({
        merchant_id: input.merchant_id,
        type: 'expense',
        amount: input.amount,
        category_id: input.category_id,
        source: 'manual',
        note: input.note || null,
        transaction_date: input.transaction_date || new Date().toISOString().split('T')[0],
        is_editable: true,
        is_deletable: true,
        metadata: {
          quick_entry: true,
        },
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating quick expense:', error);
      return { success: false, error: 'Failed to create expense record' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error creating quick expense:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 获取支出类目列表（用于快捷支出）
 * 只返回启用的支出类目
 */
export async function getExpenseCategories(
  merchantId: string
): Promise<ActionResult<AccountCategory[]>> {
  try {
    const supabase = await createSupabaseServerClient();

    // 验证用户权限
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 验证商户所有权
    const { data: merchant } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('merchant_id', merchantId)
      .eq('owner_id', user.id)
      .single();

    if (!merchant) {
      return { success: false, error: 'Merchant not found or unauthorized' };
    }

    // 获取支出类目
    const { data, error } = await supabase
      .from('account_categories')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('type', 'expense')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching expense categories:', error);
      return { success: false, error: 'Failed to fetch categories' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Unexpected error fetching expense categories:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 获取今日收支汇总
 * 用于快捷记账页面的统计卡片
 */
export async function getTodaySummary(
  merchantId: string
): Promise<ActionResult<{
  today_income: number;
  today_expense: number;
  today_net: number;
  income_count: number;
  expense_count: number;
}>> {
  try {
    const supabase = await createSupabaseServerClient();

    // 验证用户权限
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 验证商户所有权
    const { data: merchant } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('merchant_id', merchantId)
      .eq('owner_id', user.id)
      .single();

    if (!merchant) {
      return { success: false, error: 'Merchant not found or unauthorized' };
    }

    const today = new Date().toISOString().split('T')[0];

    // 获取今日收入
    const { data: incomeData } = await supabase
      .from('account_transactions')
      .select('amount')
      .eq('merchant_id', merchantId)
      .eq('type', 'income')
      .eq('transaction_date', today)
      .is('deleted_at', null);

    // 获取今日支出
    const { data: expenseData } = await supabase
      .from('account_transactions')
      .select('amount')
      .eq('merchant_id', merchantId)
      .eq('type', 'expense')
      .eq('transaction_date', today)
      .is('deleted_at', null);

    const today_income = incomeData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const today_expense = expenseData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const today_net = today_income - today_expense;
    const income_count = incomeData?.length || 0;
    const expense_count = expenseData?.length || 0;

    return {
      success: true,
      data: {
        today_income,
        today_expense,
        today_net,
        income_count,
        expense_count,
      },
    };
  } catch (error) {
    console.error('Unexpected error fetching today summary:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
