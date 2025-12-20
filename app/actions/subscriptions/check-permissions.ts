// app/actions/subscriptions/check-permissions.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { ActionResponse, LimitCheckResult } from '@/app/types/subscription';

/**
 * 检查功能权限
 * @param merchantId 商户ID
 * @param feature 功能名称
 * @returns 是否有权限
 */
export async function checkFeatureAccess(
  merchantId: string,
  feature: string
): Promise<ActionResponse<{ hasAccess: boolean; reason?: string }>> {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. 获取订阅状态
    const { data: status } = await supabase
      .rpc('check_subscription_status', {
        p_merchant_id: merchantId
      });

    const subscriptionStatus = Array.isArray(status) ? status[0] : status;

    if (!subscriptionStatus) {
      return {
        success: true,
        data: {
          hasAccess: false,
          reason: 'No active subscription'
        }
      };
    }

    // 2. 检查订阅是否激活
    if (!subscriptionStatus.is_active) {
      return {
        success: true,
        data: {
          hasAccess: false,
          reason: `Subscription status: ${subscriptionStatus.status}`
        }
      };
    }

    // 3. 检查功能权限
    const features = subscriptionStatus.features;
    const hasFeature = features && features[feature] === true;

    return {
      success: true,
      data: {
        hasAccess: hasFeature,
        reason: hasFeature ? undefined : `Feature '${feature}' not available in ${subscriptionStatus.plan_name} plan`
      }
    };
  } catch (error) {
    console.error('Error in checkFeatureAccess:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 检查余额是否足够解锁核心服务（≥ ฿200）
 * @param merchantId 商户ID
 */
export async function checkBalanceUnlock(
  merchantId: string
): Promise<ActionResponse<{ unlocked: boolean; balance?: number }>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: unlocked, error } = await supabase
      .rpc('check_balance_unlock', {
        p_merchant_id: merchantId
      });

    if (error) {
      console.error('Error checking balance unlock:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // 获取实际余额（尝试RPC，失败则回退到查询）
    let balance = 0;
    const { data: rpcBalance, error: rpcError } = await supabase
      .rpc('get_merchant_balance', { p_merchant_id: merchantId });

    if (rpcError) {
      const { data: lastTx } = await supabase
        .from('merchant_transactions')
        .select('balance_after')
        .eq('merchant_id', merchantId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      balance = lastTx?.balance_after || 0;
    } else {
      balance = rpcBalance || 0;
    }

    return {
      success: true,
      data: {
        unlocked: unlocked === true,
        balance
      }
    };
  } catch (error) {
    console.error('Error in checkBalanceUnlock:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 检查产品数量是否达到上限
 * @param merchantId 商户ID
 */
export async function checkProductLimit(
  merchantId: string
): Promise<ActionResponse<LimitCheckResult>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .rpc('check_product_limit', {
        p_merchant_id: merchantId
      });

    if (error) {
      console.error('Error checking product limit:', error);
      return {
        success: false,
        error: error.message
      };
    }

    const result = Array.isArray(data) ? data[0] : data;

    return {
      success: true,
      data: result as LimitCheckResult
    };
  } catch (error) {
    console.error('Error in checkProductLimit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 检查优惠券券种是否达到上限
 * @param merchantId 商户ID
 */
export async function checkCouponTypeLimit(
  merchantId: string
): Promise<ActionResponse<LimitCheckResult>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .rpc('check_coupon_type_limit', {
        p_merchant_id: merchantId
      });

    if (error) {
      console.error('Error checking coupon type limit:', error);
      return {
        success: false,
        error: error.message
      };
    }

    const result = Array.isArray(data) ? data[0] : data;

    return {
      success: true,
      data: result as LimitCheckResult
    };
  } catch (error) {
    console.error('Error in checkCouponTypeLimit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
