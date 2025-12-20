// app/actions/subscriptions/reactivate.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { ActionResponse, MerchantSubscription } from '@/app/types/subscription';

/**
 * 重新激活订阅（从锁定状态恢复）
 * @param merchantId 商户ID
 * @param planId 订阅方案ID
 * @returns 更新后的订阅记录
 */
export async function reactivateSubscription(
  merchantId: string,
  planId: string
): Promise<ActionResponse<MerchantSubscription>> {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. 获取当前订阅
    const { data: currentSub, error: fetchError } = await supabase
      .from('merchant_subscriptions')
      .select('*')
      .eq('merchant_id', merchantId)
      .single();

    if (fetchError || !currentSub) {
      return {
        success: false,
        error: 'No subscription found'
      };
    }

    // 2. 只有 locked 或 canceled 状态才能重新激活
    if (!['locked', 'canceled'].includes(currentSub.status)) {
      return {
        success: false,
        error: `Cannot reactivate subscription with status: ${currentSub.status}`
      };
    }

    // 3. 获取方案信息
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

    // 4. 检查余额（如果方案价格 > 0）
    if (plan.price > 0) {
      const { data: balance } = await supabase
        .rpc('get_merchant_balance', { p_merchant_id: merchantId });

      if (!balance || balance < plan.price) {
        return {
          success: false,
          error: `Insufficient balance. Required: ฿${plan.price}, Available: ฿${balance || 0}`
        };
      }
    }

    // 5. 计算新的计费周期
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // 6. 更新订阅
    const { data: updated, error: updateError } = await supabase
      .from('merchant_subscriptions')
      .update({
        plan_id: planId,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        locked_at: null,
        data_retention_until: null,
        updated_at: now.toISOString()
      })
      .eq('merchant_id', merchantId)
      .select()
      .single();

    if (updateError) {
      console.error('Error reactivating subscription:', updateError);
      return {
        success: false,
        error: updateError.message
      };
    }

    // 7. 创建账单并扣款（如果价格 > 0）
    if (plan.price > 0) {
      const { data: invoice } = await supabase
        .from('subscription_invoices')
        .insert({
          merchant_id: merchantId,
          subscription_id: updated.id,
          plan_id: planId,
          amount: plan.price,
          status: 'pending',
          period_start: now.toISOString(),
          period_end: periodEnd.toISOString(),
          payment_method: 'wallet'
        })
        .select()
        .single();

      if (invoice) {
        // 从钱包扣款
        const { data: transaction } = await supabase
          .from('merchant_transactions')
          .insert({
            merchant_id: merchantId,
            amount: plan.price,
            type: 'withdrawal',
            status: 'completed',
            description: `Subscription reactivation: ${plan.display_name.zh || plan.name}`
          })
          .select()
          .single();

        if (transaction) {
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
      data: updated as MerchantSubscription
    };
  } catch (error) {
    console.error('Error in reactivateSubscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
