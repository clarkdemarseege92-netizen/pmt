// app/actions/accounting/cash-orders.ts
// 现金订单 Server Actions

'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type {
  ActionResult,
  CashOrder,
  CashOrderWithTransaction,
  CreateCashOrderInput,
  CashOrderStats,
} from '@/app/types/accounting';

/**
 * 创建现金订单
 * 自动生成订单编号和记账记录
 */
export async function createCashOrder(
  input: CreateCashOrderInput
): Promise<ActionResult<CashOrder>> {
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
    if (!input.items || input.items.length === 0) {
      return { success: false, error: 'Order items are required' };
    }

    // 计算订单总额
    const total_amount = input.items.reduce((sum, item) => sum + item.subtotal, 0);

    if (total_amount <= 0) {
      return { success: false, error: 'Order total must be greater than 0' };
    }

    // 生成订单编号
    const { data: orderNumber, error: numberError } = await supabase.rpc(
      'generate_cash_order_number',
      { p_merchant_id: input.merchant_id }
    );

    if (numberError || !orderNumber) {
      return { success: false, error: 'Failed to generate order number' };
    }

    // 创建现金订单
    const { data, error } = await supabase
      .from('cash_orders')
      .insert({
        merchant_id: input.merchant_id,
        order_number: orderNumber,
        total_amount,
        items: input.items,
        note: input.note || null,
        order_date: input.order_date || new Date().toISOString(),
        status: 'completed',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating cash order:', error);
      return { success: false, error: 'Failed to create cash order' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error creating cash order:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 获取现金订单列表
 */
export async function getCashOrders(
  merchantId: string,
  options: {
    startDate?: string;
    endDate?: string;
    status?: 'completed' | 'cancelled';
    limit?: number;
    offset?: number;
  } = {}
): Promise<ActionResult<CashOrder[]>> {
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

    // 构建查询
    let query = supabase
      .from('cash_orders')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('order_date', { ascending: false });

    // 添加筛选条件
    if (options.startDate) {
      query = query.gte('order_date', options.startDate);
    }
    if (options.endDate) {
      query = query.lte('order_date', options.endDate);
    }
    if (options.status) {
      query = query.eq('status', options.status);
    }

    // 分页
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching cash orders:', error);
      return { success: false, error: 'Failed to fetch cash orders' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Unexpected error fetching cash orders:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 获取单个现金订单（带关联记账记录）
 */
export async function getCashOrder(
  cashOrderId: string
): Promise<ActionResult<CashOrderWithTransaction>> {
  try {
    const supabase = await createSupabaseServerClient();

    // 验证用户权限
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 获取现金订单
    const { data: order, error: orderError } = await supabase
      .from('cash_orders')
      .select(`
        *,
        transaction:account_transactions(*)
      `)
      .eq('cash_order_id', cashOrderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Cash order not found' };
    }

    // 验证商户所有权
    const { data: merchant } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('merchant_id', order.merchant_id)
      .eq('owner_id', user.id)
      .single();

    if (!merchant) {
      return { success: false, error: 'Unauthorized' };
    }

    return { success: true, data: order };
  } catch (error) {
    console.error('Unexpected error fetching cash order:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 取消现金订单
 * 会自动软删除关联的记账记录
 */
export async function cancelCashOrder(
  cashOrderId: string
): Promise<ActionResult<CashOrder>> {
  try {
    const supabase = await createSupabaseServerClient();

    // 验证用户权限
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 获取现金订单
    const { data: order, error: fetchError } = await supabase
      .from('cash_orders')
      .select('*')
      .eq('cash_order_id', cashOrderId)
      .single();

    if (fetchError || !order) {
      return { success: false, error: 'Cash order not found' };
    }

    // 验证商户所有权
    const { data: merchant } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('merchant_id', order.merchant_id)
      .eq('owner_id', user.id)
      .single();

    if (!merchant) {
      return { success: false, error: 'Unauthorized' };
    }

    // 检查是否已取消
    if (order.status === 'cancelled') {
      return { success: false, error: 'Order is already cancelled' };
    }

    // 更新订单状态为取消
    // 触发器会自动软删除关联的记账记录
    const { data, error } = await supabase
      .from('cash_orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('cash_order_id', cashOrderId)
      .select()
      .single();

    if (error) {
      console.error('Error cancelling cash order:', error);
      return { success: false, error: 'Failed to cancel cash order' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error cancelling cash order:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * 获取现金订单统计
 */
export async function getCashOrderStats(
  merchantId: string,
  startDate?: string,
  endDate?: string
): Promise<ActionResult<CashOrderStats>> {
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

    // 调用数据库统计函数
    const { data, error } = await supabase.rpc('get_cash_order_stats', {
      p_merchant_id: merchantId,
      p_start_date: startDate || new Date().toISOString().split('T')[0],
      p_end_date: endDate || new Date().toISOString().split('T')[0],
    });

    if (error) {
      console.error('Error fetching cash order stats:', error);
      return { success: false, error: 'Failed to fetch statistics' };
    }

    // RPC 返回的是数组，取第一个元素
    const stats = Array.isArray(data) ? data[0] : data;

    return { success: true, data: stats };
  } catch (error) {
    console.error('Unexpected error fetching cash order stats:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
