'use server';

// app/actions/accounting/analytics.ts
// 财务分析查询 Server Actions

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { ActionResult, FinancialOverview, CategorySummary } from '@/app/types/accounting';

/**
 * 获取财务概览
 *
 * @param merchantId - 商户ID
 * @param startDate - 开始日期 (YYYY-MM-DD)
 * @param endDate - 结束日期 (YYYY-MM-DD)
 * @returns 财务概览数据
 */
export async function getFinancialOverview(
  merchantId: string,
  startDate: string,
  endDate: string
): Promise<ActionResult<FinancialOverview>> {
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

    // 调用数据库RPC函数
    const { data, error } = await supabase
      .rpc('get_financial_overview', {
        p_merchant_id: merchantId,
        p_start_date: startDate,
        p_end_date: endDate,
      })
      .single();

    if (error) {
      console.error('Error getting financial overview:', error);
      return { success: false, error: 'Failed to get financial overview' };
    }

    return { success: true, data: data as FinancialOverview };
  } catch (error) {
    console.error('Error in getFinancialOverview:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 获取按类目汇总的财务数据
 *
 * @param merchantId - 商户ID
 * @param startDate - 开始日期 (YYYY-MM-DD)
 * @param endDate - 结束日期 (YYYY-MM-DD)
 * @returns 类目汇总数据
 */
export async function getCategorySummary(
  merchantId: string,
  startDate: string,
  endDate: string
): Promise<ActionResult<CategorySummary[]>> {
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

    // 调用数据库RPC函数
    const { data, error } = await supabase
      .rpc('get_category_summary', {
        p_merchant_id: merchantId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

    if (error) {
      console.error('Error getting category summary:', error);
      return { success: false, error: 'Failed to get category summary' };
    }

    return { success: true, data: data as CategorySummary[] };
  } catch (error) {
    console.error('Error in getCategorySummary:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 获取按日期汇总的财务趋势数据
 *
 * @param merchantId - 商户ID
 * @param startDate - 开始日期 (YYYY-MM-DD)
 * @param endDate - 结束日期 (YYYY-MM-DD)
 * @param interval - 聚合间隔 ('day' | 'week' | 'month')
 * @returns 趋势数据
 */
export async function getFinancialTrend(
  merchantId: string,
  startDate: string,
  endDate: string,
  interval: 'day' | 'week' | 'month' = 'day'
): Promise<ActionResult<Array<{
  date: string;
  income: number;
  expense: number;
  net: number;
}>>> {
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

    // 使用物化视图查询趋势数据
    const { data, error } = await supabase
      .from('merchant_financial_summary')
      .select('summary_date, type, total_amount')
      .eq('merchant_id', merchantId)
      .gte('summary_date', startDate)
      .lte('summary_date', endDate)
      .order('summary_date', { ascending: true });

    if (error) {
      console.error('Error getting financial trend:', error);
      return { success: false, error: 'Failed to get financial trend' };
    }

    // 聚合数据按日期
    const trendMap = new Map<string, { income: number; expense: number }>();

    data.forEach((row) => {
      const dateKey = row.summary_date;
      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, { income: 0, expense: 0 });
      }
      const entry = trendMap.get(dateKey)!;
      if (row.type === 'income') {
        entry.income += Number(row.total_amount);
      } else if (row.type === 'expense') {
        entry.expense += Number(row.total_amount);
      }
    });

    // 转换为数组格式
    const trendData = Array.from(trendMap.entries())
      .map(([date, { income, expense }]) => ({
        date,
        income,
        expense,
        net: income - expense,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { success: true, data: trendData };
  } catch (error) {
    console.error('Error in getFinancialTrend:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 按来源汇总财务数据
 *
 * @param merchantId - 商户ID
 * @param startDate - 开始日期 (YYYY-MM-DD)
 * @param endDate - 结束日期 (YYYY-MM-DD)
 * @returns 按来源汇总的数据
 */
export async function getSourceSummary(
  merchantId: string,
  startDate: string,
  endDate: string
): Promise<ActionResult<Array<{
  source: string;
  type: string;
  total_amount: number;
  transaction_count: number;
  avg_amount: number;
  min_amount: number;
  max_amount: number;
}>>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('merchant_id', merchantId)
      .eq('owner_id', user.id)
      .single();

    if (merchantError || !merchant) {
      return { success: false, error: 'Merchant not found or access denied' };
    }

    const { data, error } = await supabase
      .rpc('get_source_summary', {
        p_merchant_id: merchantId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

    if (error) {
      console.error('Error getting source summary:', error);
      return { success: false, error: 'Failed to get source summary' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getSourceSummary:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 按时间维度获取财务趋势
 *
 * @param merchantId - 商户ID
 * @param startDate - 开始日期 (YYYY-MM-DD)
 * @param endDate - 结束日期 (YYYY-MM-DD)
 * @param interval - 聚合间隔 ('day' | 'week' | 'month')
 * @returns 趋势数据
 */
export async function getTimeTrend(
  merchantId: string,
  startDate: string,
  endDate: string,
  interval: 'day' | 'week' | 'month' = 'day'
): Promise<ActionResult<Array<{
  date: string;
  total_income: number;
  total_expense: number;
  net_profit: number;
  income_count: number;
  expense_count: number;
}>>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('merchant_id', merchantId)
      .eq('owner_id', user.id)
      .single();

    if (merchantError || !merchant) {
      return { success: false, error: 'Merchant not found or access denied' };
    }

    // 根据间隔选择对应的RPC函数
    const rpcFunction = interval === 'month' ? 'get_monthly_trend'
      : interval === 'week' ? 'get_weekly_trend'
      : 'get_daily_trend';

    const { data, error } = await supabase
      .rpc(rpcFunction, {
        p_merchant_id: merchantId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

    if (error) {
      console.error(`Error getting ${interval} trend:`, error);
      return { success: false, error: `Failed to get ${interval} trend` };
    }

    // 转换数据格式
    const formattedData = (data || []).map((row: Record<string, unknown>) => ({
      date: String(row.transaction_date || row.week_start_date || row.month_date),
      total_income: Number(row.total_income),
      total_expense: Number(row.total_expense),
      net_profit: Number(row.net_profit),
      income_count: Number(row.income_count),
      expense_count: Number(row.expense_count),
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('Error in getTimeTrend:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 获取Top收入类目
 *
 * @param merchantId - 商户ID
 * @param startDate - 开始日期 (YYYY-MM-DD)
 * @param endDate - 结束日期 (YYYY-MM-DD)
 * @param limit - 返回数量，默认10
 * @returns Top收入类目列表
 */
export async function getTopIncomeCategories(
  merchantId: string,
  startDate: string,
  endDate: string,
  limit: number = 10
): Promise<ActionResult<Array<{
  category_id: string;
  category_name: Record<string, string>;
  category_icon: string;
  total_amount: number;
  transaction_count: number;
  avg_amount: number;
  percentage: number;
}>>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('merchant_id', merchantId)
      .eq('owner_id', user.id)
      .single();

    if (merchantError || !merchant) {
      return { success: false, error: 'Merchant not found or access denied' };
    }

    const { data, error } = await supabase
      .rpc('get_top_income_categories', {
        p_merchant_id: merchantId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_limit: limit,
      });

    if (error) {
      console.error('Error getting top income categories:', error);
      return { success: false, error: 'Failed to get top income categories' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getTopIncomeCategories:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 获取Top支出类目
 *
 * @param merchantId - 商户ID
 * @param startDate - 开始日期 (YYYY-MM-DD)
 * @param endDate - 结束日期 (YYYY-MM-DD)
 * @param limit - 返回数量，默认10
 * @returns Top支出类目列表
 */
export async function getTopExpenseCategories(
  merchantId: string,
  startDate: string,
  endDate: string,
  limit: number = 10
): Promise<ActionResult<Array<{
  category_id: string;
  category_name: Record<string, string>;
  category_icon: string;
  total_amount: number;
  transaction_count: number;
  avg_amount: number;
  percentage: number;
}>>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('merchant_id', merchantId)
      .eq('owner_id', user.id)
      .single();

    if (merchantError || !merchant) {
      return { success: false, error: 'Merchant not found or access denied' };
    }

    const { data, error } = await supabase
      .rpc('get_top_expense_categories', {
        p_merchant_id: merchantId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_limit: limit,
      });

    if (error) {
      console.error('Error getting top expense categories:', error);
      return { success: false, error: 'Failed to get top expense categories' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getTopExpenseCategories:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 对比两个时间段的财务数据
 *
 * @param merchantId - 商户ID
 * @param period1Start - 时段1开始日期
 * @param period1End - 时段1结束日期
 * @param period2Start - 时段2开始日期
 * @param period2End - 时段2结束日期
 * @returns 对比数据
 */
export async function comparePeriods(
  merchantId: string,
  period1Start: string,
  period1End: string,
  period2Start: string,
  period2End: string
): Promise<ActionResult<{
  period1: {
    total_income: number;
    total_expense: number;
    net_profit: number;
    income_count: number;
    expense_count: number;
  };
  period2: {
    total_income: number;
    total_expense: number;
    net_profit: number;
    income_count: number;
    expense_count: number;
  };
  changes: {
    income_change: number;
    expense_change: number;
    profit_change: number;
    income_change_percent: number;
    expense_change_percent: number;
    profit_change_percent: number;
  };
}>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('merchant_id', merchantId)
      .eq('owner_id', user.id)
      .single();

    if (merchantError || !merchant) {
      return { success: false, error: 'Merchant not found or access denied' };
    }

    const { data, error } = await supabase
      .rpc('compare_periods', {
        p_merchant_id: merchantId,
        p_period1_start: period1Start,
        p_period1_end: period1End,
        p_period2_start: period2Start,
        p_period2_end: period2End,
      });

    if (error) {
      console.error('Error comparing periods:', error);
      return { success: false, error: 'Failed to compare periods' };
    }

    // 解析结果
    const period1Data = data?.find((row: { period: string }) => row.period === 'period1') || {};
    const period2Data = data?.find((row: { period: string }) => row.period === 'period2') || {};

    const period1 = {
      total_income: Number(period1Data.total_income || 0),
      total_expense: Number(period1Data.total_expense || 0),
      net_profit: Number(period1Data.net_profit || 0),
      income_count: Number(period1Data.income_count || 0),
      expense_count: Number(period1Data.expense_count || 0),
    };

    const period2 = {
      total_income: Number(period2Data.total_income || 0),
      total_expense: Number(period2Data.total_expense || 0),
      net_profit: Number(period2Data.net_profit || 0),
      income_count: Number(period2Data.income_count || 0),
      expense_count: Number(period2Data.expense_count || 0),
    };

    // 计算变化
    const changes = {
      income_change: period2.total_income - period1.total_income,
      expense_change: period2.total_expense - period1.total_expense,
      profit_change: period2.net_profit - period1.net_profit,
      income_change_percent: period1.total_income > 0
        ? ((period2.total_income - period1.total_income) / period1.total_income) * 100
        : 0,
      expense_change_percent: period1.total_expense > 0
        ? ((period2.total_expense - period1.total_expense) / period1.total_expense) * 100
        : 0,
      profit_change_percent: period1.net_profit > 0
        ? ((period2.net_profit - period1.net_profit) / period1.net_profit) * 100
        : 0,
    };

    return { success: true, data: { period1, period2, changes } };
  } catch (error) {
    console.error('Error in comparePeriods:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 获取最近的交易记录
 *
 * @param merchantId - 商户ID
 * @param limit - 返回数量，默认20
 * @returns 最近的交易记录列表
 */
export async function getRecentTransactions(
  merchantId: string,
  limit: number = 20
): Promise<ActionResult<Array<{
  transaction_id: string;
  type: string;
  amount: number;
  category_id: string;
  category_name: Record<string, string>;
  source: string;
  note: string;
  transaction_date: string;
  created_at: string;
}>>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('merchant_id', merchantId)
      .eq('owner_id', user.id)
      .single();

    if (merchantError || !merchant) {
      return { success: false, error: 'Merchant not found or access denied' };
    }

    const { data, error } = await supabase
      .rpc('get_recent_transactions', {
        p_merchant_id: merchantId,
        p_limit: limit,
      });

    if (error) {
      console.error('Error getting recent transactions:', error);
      return { success: false, error: 'Failed to get recent transactions' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getRecentTransactions:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 刷新财务汇总物化视图
 * (仅供管理员或定时任务使用)
 *
 * @returns 刷新结果
 */
export async function refreshFinancialSummary(): Promise<ActionResult<void>> {
  try {
    const supabase = await createSupabaseServerClient();

    // 验证用户权限（可选：仅管理员）
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 刷新物化视图（并发刷新）
    const { error } = await supabase.rpc('refresh_materialized_view', {
      view_name: 'merchant_financial_summary',
    });

    if (error) {
      // 如果RPC函数不存在，使用SQL直接刷新
      const { error: sqlError } = await supabase
        .from('merchant_financial_summary')
        .select('summary_date', { count: 'exact', head: true });

      if (sqlError) {
        console.error('Error refreshing materialized view:', sqlError);
        return { success: false, error: 'Failed to refresh financial summary' };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in refreshFinancialSummary:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}
