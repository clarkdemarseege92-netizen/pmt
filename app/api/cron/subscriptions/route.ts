// app/api/cron/subscriptions/route.ts
// 订阅系统定时任务统一触发端点
// 直接调用各个任务的处理函数，避免内部 HTTP 调用问题

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
      trial_reminder: null as any,
      lock_expired: null as any,
      auto_renew: null as any,
      errors: [] as string[]
    };

    // 1. 运行试用期提醒任务
    try {
      results.trial_reminder = await runTrialReminder(now);
    } catch (error) {
      results.errors.push(`trial-reminder error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // 2. 运行账户锁定任务
    try {
      results.lock_expired = await runLockExpired(now);
    } catch (error) {
      results.errors.push(`lock-expired error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // 3. 运行自动续费任务
    try {
      results.auto_renew = await runAutoRenew(now);
    } catch (error) {
      results.errors.push(`auto-renew error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // 记录执行日志
    await supabaseAdmin
      .from('cron_logs')
      .insert({
        job_name: 'subscriptions-all',
        executed_at: now.toISOString(),
        result: results,
        success: results.errors.length === 0
      });

    return NextResponse.json({
      success: results.errors.length === 0,
      message: 'All subscription cron jobs executed',
      results
    });

  } catch (error) {
    console.error('Subscription cron jobs failed:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ========== 试用期提醒 ==========
async function runTrialReminder(now: Date) {
  const results = {
    reminded_7_days: 0,
    reminded_3_days: 0,
    reminded_1_day: 0,
    errors: [] as string[]
  };

  const remindDays = [7, 3, 1];

  for (const days of remindDays) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + days);
    const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

    const { data: subscriptions, error } = await supabaseAdmin
      .from('merchant_subscriptions')
      .select(`id, merchant_id, trial_end_date, merchants!inner(shop_name, owner_id)`)
      .eq('status', 'trial')
      .gte('trial_end_date', targetDate.toISOString().split('T')[0])
      .lt('trial_end_date', nextDay.toISOString().split('T')[0]);

    if (error) {
      results.errors.push(`${days}-day query error: ${error.message}`);
      continue;
    }

    for (const sub of subscriptions || []) {
      const merchant = sub.merchants as unknown as { shop_name: string; owner_id: string } | null;
      if (merchant?.owner_id) {
        await supabaseAdmin.from('notifications').insert({
          user_id: merchant.owner_id,
          type: 'trial_reminder',
          title: {
            en: `Trial expires in ${days} day${days > 1 ? 's' : ''}`,
            th: `ช่วงทดลองใช้จะหมดอายุใน ${days} วัน`,
            zh: `试用期将在 ${days} 天后到期`
          },
          message: {
            en: `Your trial period for ${merchant.shop_name} will expire soon. Subscribe now to continue using all features.`,
            th: `ช่วงทดลองใช้ของ ${merchant.shop_name} กำลังจะหมดอายุ สมัครสมาชิกตอนนี้เพื่อใช้งานฟีเจอร์ทั้งหมดต่อไป`,
            zh: `${merchant.shop_name} 的试用期即将到期。立即订阅以继续使用所有功能。`
          },
          data: { subscription_id: sub.id, merchant_id: sub.merchant_id, days_remaining: days },
          read: false
        });

        if (days === 7) results.reminded_7_days++;
        else if (days === 3) results.reminded_3_days++;
        else if (days === 1) results.reminded_1_day++;
      }
    }
  }

  return results;
}

// ========== 锁定过期账户 ==========
async function runLockExpired(now: Date) {
  const results = {
    trial_locked: 0,
    subscription_locked: 0,
    past_due_locked: 0,
    errors: [] as string[]
  };

  const dataRetentionDate = new Date(now);
  dataRetentionDate.setDate(dataRetentionDate.getDate() + 30);

  // 1. 锁定过期试用
  const { data: expiredTrials, error: error1 } = await supabaseAdmin
    .from('merchant_subscriptions')
    .select(`id, merchant_id, merchants!inner(shop_name, owner_id)`)
    .eq('status', 'trial')
    .lt('trial_end_date', now.toISOString());

  if (error1) {
    results.errors.push(`Trial query error: ${error1.message}`);
  } else {
    for (const sub of expiredTrials || []) {
      await supabaseAdmin.from('merchant_subscriptions').update({
        status: 'locked',
        locked_at: now.toISOString(),
        data_retention_until: dataRetentionDate.toISOString()
      }).eq('id', sub.id);
      results.trial_locked++;
    }
  }

  // 2. 锁定期末取消的订阅
  const { data: canceledSubs, error: error2 } = await supabaseAdmin
    .from('merchant_subscriptions')
    .select(`id, merchant_id, merchants!inner(shop_name, owner_id)`)
    .eq('status', 'canceled')
    .eq('cancel_at_period_end', true)
    .lt('current_period_end', now.toISOString());

  if (error2) {
    results.errors.push(`Canceled query error: ${error2.message}`);
  } else {
    for (const sub of canceledSubs || []) {
      await supabaseAdmin.from('merchant_subscriptions').update({
        status: 'locked',
        locked_at: now.toISOString(),
        data_retention_until: dataRetentionDate.toISOString()
      }).eq('id', sub.id);
      results.subscription_locked++;
    }
  }

  // 3. 锁定逾期超过7天的订阅
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: pastDueSubs, error: error3 } = await supabaseAdmin
    .from('merchant_subscriptions')
    .select(`id, merchant_id, merchants!inner(shop_name, owner_id)`)
    .eq('status', 'past_due')
    .lt('current_period_end', sevenDaysAgo.toISOString());

  if (error3) {
    results.errors.push(`Past due query error: ${error3.message}`);
  } else {
    for (const sub of pastDueSubs || []) {
      await supabaseAdmin.from('merchant_subscriptions').update({
        status: 'locked',
        locked_at: now.toISOString(),
        data_retention_until: dataRetentionDate.toISOString()
      }).eq('id', sub.id);
      results.past_due_locked++;
    }
  }

  return results;
}

// ========== 自动续费 ==========
async function runAutoRenew(now: Date) {
  const results = {
    renewed: 0,
    failed_insufficient_balance: 0,
    failed_other: 0,
    errors: [] as string[]
  };

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: expiringSubscriptions, error: queryError } = await supabaseAdmin
    .from('merchant_subscriptions')
    .select(`
      id, merchant_id, plan_id, current_period_start, current_period_end, cancel_at_period_end,
      subscription_plans!inner(id, name, price),
      merchants!inner(merchant_id, shop_name, owner_id, balance)
    `)
    .eq('status', 'active')
    .eq('cancel_at_period_end', false)
    .gte('current_period_end', now.toISOString().split('T')[0])
    .lt('current_period_end', tomorrow.toISOString().split('T')[0]);

  if (queryError) {
    results.errors.push(`Query error: ${queryError.message}`);
    return results;
  }

  for (const sub of expiringSubscriptions || []) {
    const plan = sub.subscription_plans as unknown as { id: string; name: string; price: number } | null;
    const merchant = sub.merchants as unknown as { merchant_id: string; shop_name: string; owner_id: string; balance: number } | null;
    const planPrice = plan?.price || 0;
    const merchantBalance = merchant?.balance || 0;

    if (merchantBalance < planPrice) {
      // 余额不足，标记为逾期
      await supabaseAdmin.from('merchant_subscriptions').update({
        status: 'past_due',
        updated_at: now.toISOString()
      }).eq('id', sub.id);
      results.failed_insufficient_balance++;
    } else {
      // 执行续费
      try {
        // 扣款
        await supabaseAdmin.from('merchants').update({
          balance: merchantBalance - planPrice
        }).eq('merchant_id', sub.merchant_id);

        // 创建交易记录
        const { data: transaction } = await supabaseAdmin
          .from('merchant_transactions')
          .insert({
            merchant_id: sub.merchant_id,
            type: 'withdrawal',
            amount: planPrice,
            description: `Subscription renewal: ${plan?.name || 'Plan'}`,
            status: 'completed'
          })
          .select('id')
          .single();

        // 更新订阅周期
        const newPeriodStart = sub.current_period_end;
        const newPeriodEnd = new Date(sub.current_period_end);
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

        await supabaseAdmin.from('merchant_subscriptions').update({
          current_period_start: newPeriodStart,
          current_period_end: newPeriodEnd.toISOString(),
          updated_at: now.toISOString()
        }).eq('id', sub.id);

        // 创建账单
        await supabaseAdmin.from('subscription_invoices').insert({
          merchant_id: sub.merchant_id,
          subscription_id: sub.id,
          plan_id: sub.plan_id,
          amount: planPrice,
          status: 'paid',
          period_start: newPeriodStart,
          period_end: newPeriodEnd.toISOString(),
          paid_at: now.toISOString(),
          payment_method: 'wallet',
          merchant_transaction_id: transaction?.id
        });

        results.renewed++;
      } catch (error) {
        results.errors.push(`Renew ${sub.id} error: ${error instanceof Error ? error.message : 'Unknown'}`);
        results.failed_other++;
      }
    }
  }

  return results;
}

export async function POST(request: NextRequest) {
  return GET(request);
}
