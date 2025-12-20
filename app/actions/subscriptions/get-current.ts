// app/actions/subscriptions/get-current.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { ActionResponse, SubscriptionWithPlan } from '@/app/types/subscription';

/**
 * 获取商户当前订阅信息
 * @param merchantId 商户ID
 * @returns 订阅信息（包含方案详情）
 */
export async function getCurrentSubscription(
  merchantId: string
): Promise<ActionResponse<SubscriptionWithPlan | null>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('merchant_subscriptions')
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq('merchant_id', merchantId)
      .single();

    if (error) {
      // 如果商户没有订阅记录，返回 null
      if (error.code === 'PGRST116') {
        return {
          success: true,
          data: null
        };
      }

      console.error('Error fetching current subscription:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data: data as SubscriptionWithPlan
    };
  } catch (error) {
    console.error('Error in getCurrentSubscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 使用数据库函数检查订阅状态
 * @param merchantId 商户ID
 */
export async function checkSubscriptionStatus(merchantId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .rpc('check_subscription_status', {
        p_merchant_id: merchantId
      });

    if (error) {
      console.error('Error checking subscription status:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // RPC 返回数组，取第一个元素
    const status = Array.isArray(data) ? data[0] : data;

    return {
      success: true,
      data: status
    };
  } catch (error) {
    console.error('Error in checkSubscriptionStatus:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
