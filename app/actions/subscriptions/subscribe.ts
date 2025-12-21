// app/actions/subscriptions/subscribe.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { ActionResponse, MerchantSubscription, PaymentMethod } from '@/app/types/subscription';

/**
 * 订阅付费方案
 * @param merchantId 商户ID
 * @param planId 订阅方案ID
 * @param paymentMethod 支付方式
 * @returns 订阅记录
 */
export async function subscribeToPlan(
  merchantId: string,
  planId: string,
  paymentMethod: PaymentMethod = 'wallet'
): Promise<ActionResponse<MerchantSubscription>> {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. 获取方案信息
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return {
        success: false,
        error: 'Subscription plan not found'
      };
    }

    // 2. 检查商户当前订阅状态
    const { data: currentSub } = await supabase
      .from('merchant_subscriptions')
      .select('*')
      .eq('merchant_id', merchantId)
      .single();

    // 3. 如果使用钱包支付，检查余额
    let currentBalance = 0;
    if (paymentMethod === 'wallet' && plan.price > 0) {
      // 尝试使用RPC函数，如果不存在则回退到查询
      const { data: rpcBalance, error: rpcError } = await supabase
        .rpc('get_merchant_balance', { p_merchant_id: merchantId });

      if (rpcError) {
        // RPC函数不存在，从交易记录获取余额
        const { data: lastTx } = await supabase
          .from('merchant_transactions')
          .select('balance_after')
          .eq('merchant_id', merchantId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        currentBalance = lastTx?.balance_after || 0;
      } else {
        currentBalance = rpcBalance || 0;
      }

      if (currentBalance < plan.price) {
        return {
          success: false,
          error: `Insufficient balance. Required: ฿${plan.price}, Available: ฿${currentBalance}`
        };
      }
    }

    // 4. 计算计费周期
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1); // 1个月计费周期

    // 5. 创建或更新订阅
    let subscription;

    if (currentSub) {
      // 更新现有订阅
      const { data, error } = await supabase
        .from('merchant_subscriptions')
        .update({
          plan_id: planId,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          canceled_at: null,
          locked_at: null,
          updated_at: now.toISOString()
        })
        .eq('merchant_id', merchantId)
        .select()
        .single();

      if (error) {
        console.error('Error updating subscription:', error);
        return {
          success: false,
          error: error.message
        };
      }

      subscription = data;
    } else {
      // 创建新订阅
      const { data, error } = await supabase
        .from('merchant_subscriptions')
        .insert({
          merchant_id: merchantId,
          plan_id: planId,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating subscription:', error);
        return {
          success: false,
          error: error.message
        };
      }

      subscription = data;
    }

    // 6. 如果价格 > 0，创建账单并扣款
    if (plan.price > 0) {
      // 创建账单
      const { data: invoice, error: invoiceError } = await supabase
        .from('subscription_invoices')
        .insert({
          merchant_id: merchantId,
          subscription_id: subscription.id,
          plan_id: planId,
          amount: plan.price,
          status: 'pending',
          period_start: now.toISOString(),
          period_end: periodEnd.toISOString(),
          payment_method: paymentMethod
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError);
        // 订阅已创建，但账单创建失败，记录错误但不回滚
      }

      // 从钱包扣款
      if (paymentMethod === 'wallet' && invoice) {
        const newBalance = currentBalance - plan.price;
        const { data: transaction, error: txError } = await supabase
          .from('merchant_transactions')
          .insert({
            merchant_id: merchantId,
            amount: plan.price,
            balance_after: newBalance,
            type: 'withdrawal',
            status: 'completed',
            description: `Subscription payment: ${plan.display_name.zh || plan.name}`
          })
          .select()
          .single();

        if (txError) {
          console.error('Error creating transaction:', txError);
        } else {
          // 更新账单状态
          await supabase
            .from('subscription_invoices')
            .update({
              status: 'paid',
              paid_at: now.toISOString(),
              merchant_transaction_id: transaction.id
            })
            .eq('id', invoice.id);
        }
      }
    }

    return {
      success: true,
      data: subscription as MerchantSubscription
    };
  } catch (error) {
    console.error('Error in subscribeToPlan:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
