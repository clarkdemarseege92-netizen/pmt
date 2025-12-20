// app/actions/subscriptions/invoices.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { ActionResponse, SubscriptionInvoice } from '@/app/types/subscription';

/**
 * 获取商户的订阅账单列表
 * @param merchantId 商户ID
 * @param limit 限制数量（默认10）
 */
export async function getSubscriptionInvoices(
  merchantId: string,
  limit: number = 10
): Promise<ActionResponse<SubscriptionInvoice[]>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('subscription_invoices')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching subscription invoices:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }

    return {
      success: true,
      data: data as SubscriptionInvoice[]
    };
  } catch (error) {
    console.error('Error in getSubscriptionInvoices:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    };
  }
}

/**
 * 创建订阅账单
 * @param merchantId 商户ID
 * @param subscriptionId 订阅ID
 * @param planId 方案ID
 * @param periodStart 计费周期开始
 * @param periodEnd 计费周期结束
 */
export async function createSubscriptionInvoice(
  merchantId: string,
  subscriptionId: string,
  planId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<ActionResponse<SubscriptionInvoice>> {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. 获取方案信息
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('price, display_name')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return {
        success: false,
        error: 'Subscription plan not found'
      };
    }

    // 2. 创建账单
    const { data: invoice, error: invoiceError } = await supabase
      .from('subscription_invoices')
      .insert({
        merchant_id: merchantId,
        subscription_id: subscriptionId,
        plan_id: planId,
        amount: plan.price,
        status: 'pending',
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        payment_method: 'wallet'
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Error creating subscription invoice:', invoiceError);
      return {
        success: false,
        error: invoiceError.message
      };
    }

    return {
      success: true,
      data: invoice as SubscriptionInvoice
    };
  } catch (error) {
    console.error('Error in createSubscriptionInvoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 支付订阅账单（从钱包扣款）
 * @param invoiceId 账单ID
 */
export async function paySubscriptionInvoice(
  invoiceId: string
): Promise<ActionResponse<SubscriptionInvoice>> {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. 获取账单信息
    const { data: invoice, error: fetchError } = await supabase
      .from('subscription_invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (fetchError || !invoice) {
      return {
        success: false,
        error: 'Invoice not found'
      };
    }

    // 2. 检查账单状态
    if (invoice.status !== 'pending') {
      return {
        success: false,
        error: `Cannot pay invoice with status: ${invoice.status}`
      };
    }

    // 3. 检查钱包余额（尝试RPC，失败则回退到查询）
    let balance = 0;
    const { data: rpcBalance, error: rpcError } = await supabase
      .rpc('get_merchant_balance', { p_merchant_id: invoice.merchant_id });

    if (rpcError) {
      const { data: lastTx } = await supabase
        .from('merchant_transactions')
        .select('balance_after')
        .eq('merchant_id', invoice.merchant_id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      balance = lastTx?.balance_after || 0;
    } else {
      balance = rpcBalance || 0;
    }

    if (balance < invoice.amount) {
      // 更新账单为失败状态
      await supabase
        .from('subscription_invoices')
        .update({
          status: 'failed',
          failure_reason: `Insufficient balance. Required: ฿${invoice.amount}, Available: ฿${balance || 0}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      return {
        success: false,
        error: `Insufficient balance. Required: ฿${invoice.amount}, Available: ฿${balance || 0}`
      };
    }

    // 4. 创建钱包交易（扣款）
    const { data: transaction, error: txError } = await supabase
      .from('merchant_transactions')
      .insert({
        merchant_id: invoice.merchant_id,
        amount: invoice.amount,
        type: 'withdrawal',
        status: 'completed',
        description: `Subscription payment for invoice ${invoiceId}`
      })
      .select()
      .single();

    if (txError) {
      console.error('Error creating transaction:', txError);
      return {
        success: false,
        error: txError.message
      };
    }

    // 5. 更新账单状态
    const { data: updated, error: updateError } = await supabase
      .from('subscription_invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        merchant_transaction_id: transaction.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating invoice:', updateError);
      return {
        success: false,
        error: updateError.message
      };
    }

    return {
      success: true,
      data: updated as SubscriptionInvoice
    };
  } catch (error) {
    console.error('Error in paySubscriptionInvoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
