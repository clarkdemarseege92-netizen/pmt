// app/actions/subscriptions/subscribe.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { ActionResponse, MerchantSubscription, PaymentMethod } from '@/app/types/subscription';

// 推荐返利金额配置
const REFERRAL_REWARDS: Record<string, number> = {
  'standard': 50,    // 标准版订阅返利 50 THB
  'professional': 100, // 专业版订阅返利 100 THB
  'enterprise': 200,  // 企业版订阅返利 200 THB
};

/**
 * 处理推荐返利
 * @param supabase Supabase客户端
 * @param merchantId 新订阅的商户ID
 * @param planName 订阅方案名称
 * @param planPrice 订阅价格
 */
async function processReferralReward(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  merchantId: string,
  planName: string,
  planPrice: number
) {
  try {
    // 1. 获取商户对应的用户ID
    const { data: merchant } = await supabase
      .from('merchants')
      .select('owner_id')
      .eq('merchant_id', merchantId)
      .single();

    if (!merchant?.owner_id) {
      console.log('REFERRAL: 无法找到商户对应的用户');
      return;
    }

    // 2. 检查用户是否有推荐人
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('referred_by')
      .eq('id', merchant.owner_id)
      .single();

    if (!userProfile?.referred_by) {
      console.log('REFERRAL: 用户没有推荐人');
      return;
    }

    // 3. 检查是否已经有过返利记录（仅首次订阅有效）
    const { data: existingReward } = await supabase
      .from('referral_rewards')
      .select('id')
      .eq('referee_id', merchant.owner_id)
      .limit(1)
      .single();

    if (existingReward) {
      console.log('REFERRAL: 该用户已经触发过推荐返利');
      return;
    }

    // 4. 计算返利金额
    const rewardAmount = REFERRAL_REWARDS[planName.toLowerCase()] || 0;
    if (rewardAmount === 0) {
      console.log('REFERRAL: 该方案不参与推荐返利:', planName);
      return;
    }

    // 5. 创建返利记录（1天后生效）
    const eligibleAt = new Date();
    eligibleAt.setDate(eligibleAt.getDate() + 1); // 1天后可发放

    const { error: rewardError } = await supabase
      .from('referral_rewards')
      .insert({
        referrer_id: userProfile.referred_by,
        referee_id: merchant.owner_id,
        subscription_plan: planName,
        subscription_amount: planPrice,
        reward_amount: rewardAmount,
        status: 'pending',
        eligible_at: eligibleAt.toISOString(),
      });

    if (rewardError) {
      console.error('REFERRAL: 创建返利记录失败:', rewardError);
    } else {
      console.log('REFERRAL: 成功创建返利记录', {
        referrerId: userProfile.referred_by,
        refereeId: merchant.owner_id,
        rewardAmount,
        eligibleAt: eligibleAt.toISOString(),
      });
    }
  } catch (error) {
    console.error('REFERRAL: 处理推荐返利时出错:', error);
    // 不影响主流程，仅记录错误
  }
}

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

    // 2.5 防止重复订阅：检查最近10秒内是否有相同方案的订阅交易
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    const { data: recentTransaction } = await supabase
      .from('merchant_transactions')
      .select('id, created_at')
      .eq('merchant_id', merchantId)
      .eq('type', 'withdrawal')
      .eq('status', 'completed')
      .ilike('description', `%${plan.name}%`)
      .gte('created_at', tenSecondsAgo)
      .limit(1)
      .single();

    if (recentTransaction) {
      return {
        success: false,
        error: 'Please wait a moment before retrying. A subscription is already being processed.'
      };
    }

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
            description: `Subscription payment: ${plan.name}`
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

      // 7. 处理推荐返利（仅限付费订阅）
      await processReferralReward(supabase, merchantId, plan.name, plan.price);
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
