// app/api/cron/subscriptions/auto-renew/route.ts
// 订阅自动续费任务
// 建议每天运行一次，自动续费即将到期的订阅

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function validateCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return true;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const results = {
      renewed: 0,
      failed_insufficient_balance: 0,
      failed_other: 0,
      notifications_sent: 0,
      errors: [] as string[]
    };

    // 查询需要续费的活跃订阅（当前周期在今天结束）
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: expiringSubscriptions, error: queryError } = await supabaseAdmin
      .from('merchant_subscriptions')
      .select(`
        id,
        merchant_id,
        plan_id,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        subscription_plans!inner(id, name, price),
        merchants!inner(merchant_id, shop_name, owner_id, balance)
      `)
      .eq('status', 'active')
      .eq('cancel_at_period_end', false)
      .gte('current_period_end', now.toISOString().split('T')[0])
      .lt('current_period_end', tomorrow.toISOString().split('T')[0]);

    if (queryError) {
      results.errors.push(`Query error: ${queryError.message}`);
      return NextResponse.json({
        success: false,
        message: 'Failed to query subscriptions',
        results
      }, { status: 500 });
    }

    if (!expiringSubscriptions || expiringSubscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No subscriptions to renew today',
        results
      });
    }

    for (const sub of expiringSubscriptions) {
      const plan = sub.subscription_plans as unknown as { id: string; name: string; price: number } | null;
      const merchant = sub.merchants as unknown as { merchant_id: string; shop_name: string; owner_id: string; balance: number } | null;
      const planPrice = plan?.price || 0;
      const merchantBalance = merchant?.balance || 0;

      // 检查余额是否足够
      if (merchantBalance < planPrice) {
        // 余额不足，标记为逾期
        const { error: updateError } = await supabaseAdmin
          .from('merchant_subscriptions')
          .update({
            status: 'past_due',
            updated_at: now.toISOString()
          })
          .eq('id', sub.id);

        if (updateError) {
          results.errors.push(`Update past_due ${sub.id} error: ${updateError.message}`);
        } else {
          results.failed_insufficient_balance++;

          // 创建失败的账单
          await supabaseAdmin
            .from('subscription_invoices')
            .insert({
              merchant_id: sub.merchant_id,
              subscription_id: sub.id,
              plan_id: sub.plan_id,
              amount: planPrice,
              status: 'failed',
              period_start: sub.current_period_end,
              period_end: getNextPeriodEnd(sub.current_period_end),
              payment_method: 'wallet',
              failure_reason: 'Insufficient balance',
              created_at: now.toISOString(),
              updated_at: now.toISOString()
            });

          // 发送余额不足通知
          await sendRenewalNotification(sub, 'insufficient_balance', planPrice, merchantBalance);
          results.notifications_sent++;
        }
        continue;
      }

      // 余额足够，执行续费
      try {
        // 1. 从钱包扣款
        const { error: balanceError } = await supabaseAdmin
          .from('merchants')
          .update({
            balance: merchantBalance - planPrice
          })
          .eq('merchant_id', sub.merchant_id);

        if (balanceError) {
          throw new Error(`Balance deduction failed: ${balanceError.message}`);
        }

        // 2. 创建交易记录
        const { data: transaction, error: transError } = await supabaseAdmin
          .from('merchant_transactions')
          .insert({
            merchant_id: sub.merchant_id,
            type: 'withdrawal',
            amount: planPrice,
            description: `Subscription renewal: ${plan?.name || 'Plan'}`,
            status: 'completed',
            created_at: now.toISOString()
          })
          .select('id')
          .single();

        if (transError) {
          throw new Error(`Transaction creation failed: ${transError.message}`);
        }

        // 3. 计算新的计费周期
        const newPeriodStart = sub.current_period_end;
        const newPeriodEnd = getNextPeriodEnd(sub.current_period_end);

        // 4. 更新订阅
        const { error: subUpdateError } = await supabaseAdmin
          .from('merchant_subscriptions')
          .update({
            current_period_start: newPeriodStart,
            current_period_end: newPeriodEnd,
            updated_at: now.toISOString()
          })
          .eq('id', sub.id);

        if (subUpdateError) {
          throw new Error(`Subscription update failed: ${subUpdateError.message}`);
        }

        // 5. 创建已支付的账单
        await supabaseAdmin
          .from('subscription_invoices')
          .insert({
            merchant_id: sub.merchant_id,
            subscription_id: sub.id,
            plan_id: sub.plan_id,
            amount: planPrice,
            status: 'paid',
            period_start: newPeriodStart,
            period_end: newPeriodEnd,
            paid_at: now.toISOString(),
            payment_method: 'wallet',
            merchant_transaction_id: transaction?.id,
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          });

        results.renewed++;

        // 发送续费成功通知
        await sendRenewalNotification(sub, 'success', planPrice, merchantBalance - planPrice);
        results.notifications_sent++;

      } catch (error) {
        results.errors.push(`Renew ${sub.id} error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.failed_other++;
      }
    }

    // 记录执行日志
    await supabaseAdmin
      .from('cron_logs')
      .insert({
        job_name: 'auto-renew',
        executed_at: now.toISOString(),
        result: results,
        success: results.errors.length === 0
      });

    return NextResponse.json({
      success: true,
      message: 'Auto renew job completed',
      results
    });

  } catch (error) {
    console.error('Auto renew job failed:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function getNextPeriodEnd(currentPeriodEnd: string): string {
  const date = new Date(currentPeriodEnd);
  date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}

async function sendRenewalNotification(
  subscription: any,
  status: 'success' | 'insufficient_balance',
  amount: number,
  remainingBalance: number
) {
  const merchantName = subscription.merchants?.shop_name || 'Merchant';
  const ownerId = subscription.merchants?.owner_id;
  const planName = subscription.subscription_plans?.name || 'Plan';

  const titles: Record<string, { en: string; th: string; zh: string }> = {
    success: {
      en: 'Subscription Renewed Successfully',
      th: 'ต่ออายุสมาชิกสำเร็จ',
      zh: '订阅续费成功'
    },
    insufficient_balance: {
      en: 'Subscription Renewal Failed - Insufficient Balance',
      th: 'ต่ออายุสมาชิกล้มเหลว - ยอดเงินไม่เพียงพอ',
      zh: '订阅续费失败 - 余额不足'
    }
  };

  const messages: Record<string, { en: string; th: string; zh: string }> = {
    success: {
      en: `Your ${planName} subscription for ${merchantName} has been renewed. ฿${amount} was deducted from your wallet. Remaining balance: ฿${remainingBalance.toFixed(2)}`,
      th: `การสมัครสมาชิก ${planName} ของ ${merchantName} ได้รับการต่ออายุแล้ว หักเงิน ฿${amount} จากกระเป๋า ยอดเงินคงเหลือ: ฿${remainingBalance.toFixed(2)}`,
      zh: `${merchantName} 的 ${planName} 订阅已续费。已从钱包扣除 ฿${amount}。剩余余额：฿${remainingBalance.toFixed(2)}`
    },
    insufficient_balance: {
      en: `Your ${planName} subscription for ${merchantName} could not be renewed due to insufficient balance. Please top up ฿${amount} to continue using all features. Current balance: ฿${remainingBalance.toFixed(2)}`,
      th: `การสมัครสมาชิก ${planName} ของ ${merchantName} ไม่สามารถต่ออายุได้เนื่องจากยอดเงินไม่เพียงพอ กรุณาเติมเงิน ฿${amount} เพื่อใช้งานฟีเจอร์ทั้งหมดต่อไป ยอดเงินปัจจุบัน: ฿${remainingBalance.toFixed(2)}`,
      zh: `${merchantName} 的 ${planName} 订阅因余额不足无法续费。请充值 ฿${amount} 以继续使用所有功能。当前余额：฿${remainingBalance.toFixed(2)}`
    }
  };

  await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: ownerId,
      type: status === 'success' ? 'subscription_renewed' : 'renewal_failed',
      title: titles[status],
      message: messages[status],
      data: {
        subscription_id: subscription.id,
        merchant_id: subscription.merchant_id,
        plan_name: planName,
        amount: amount,
        remaining_balance: remainingBalance
      },
      read: false,
      created_at: new Date().toISOString()
    });

  console.log(`Sent renewal ${status} notification to merchant: ${merchantName}`);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
