// app/actions/subscriptions/start-trial.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { ActionResponse, MerchantSubscription } from '@/app/types/subscription';

/**
 * 开始试用期
 * 商户注册时自动调用，创建30天试用期订阅
 * @param merchantId 商户ID
 * @returns 订阅记录
 */
export async function startTrial(
  merchantId: string
): Promise<ActionResponse<MerchantSubscription>> {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. 检查是否已有订阅
    const { data: existing } = await supabase
      .from('merchant_subscriptions')
      .select('id')
      .eq('merchant_id', merchantId)
      .single();

    if (existing) {
      return {
        success: false,
        error: 'Merchant already has a subscription'
      };
    }

    // 2. 获取试用期方案
    const { data: trialPlan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('name', 'trial')
      .single();

    if (planError || !trialPlan) {
      console.error('Error fetching trial plan:', planError);
      return {
        success: false,
        error: 'Trial plan not found'
      };
    }

    // 3. 创建试用期订阅
    const now = new Date();
    const trialEndDate = new Date(now);
    trialEndDate.setDate(trialEndDate.getDate() + 30); // 30天试用期

    const { data: subscription, error: insertError } = await supabase
      .from('merchant_subscriptions')
      .insert({
        merchant_id: merchantId,
        plan_id: trialPlan.id,
        status: 'trial',
        trial_start_date: now.toISOString(),
        trial_end_date: trialEndDate.toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating trial subscription:', insertError);
      return {
        success: false,
        error: insertError.message
      };
    }

    return {
      success: true,
      data: subscription as MerchantSubscription
    };
  } catch (error) {
    console.error('Error in startTrial:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
