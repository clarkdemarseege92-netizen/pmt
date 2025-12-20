// app/actions/subscriptions/cancel.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { ActionResponse, MerchantSubscription } from '@/app/types/subscription';

/**
 * 取消订阅（期末生效）
 * @param merchantId 商户ID
 * @returns 更新后的订阅记录
 */
export async function cancelSubscription(
  merchantId: string
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
        error: 'No active subscription found'
      };
    }

    // 2. 检查订阅状态
    if (currentSub.status === 'locked' || currentSub.status === 'canceled') {
      return {
        success: false,
        error: `Cannot cancel subscription with status: ${currentSub.status}`
      };
    }

    // 3. 标记为期末取消
    const { data: updated, error: updateError } = await supabase
      .from('merchant_subscriptions')
      .update({
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('merchant_id', merchantId)
      .select()
      .single();

    if (updateError) {
      console.error('Error canceling subscription:', updateError);
      return {
        success: false,
        error: updateError.message
      };
    }

    return {
      success: true,
      data: updated as MerchantSubscription
    };
  } catch (error) {
    console.error('Error in cancelSubscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 立即取消订阅（不等到期末）
 * @param merchantId 商户ID
 */
export async function cancelSubscriptionImmediately(
  merchantId: string
): Promise<ActionResponse<MerchantSubscription>> {
  try {
    const supabase = await createSupabaseServerClient();

    const now = new Date();

    const { data: updated, error } = await supabase
      .from('merchant_subscriptions')
      .update({
        status: 'canceled',
        cancel_at_period_end: false,
        canceled_at: now.toISOString(),
        current_period_end: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('merchant_id', merchantId)
      .select()
      .single();

    if (error) {
      console.error('Error canceling subscription immediately:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data: updated as MerchantSubscription
    };
  } catch (error) {
    console.error('Error in cancelSubscriptionImmediately:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
