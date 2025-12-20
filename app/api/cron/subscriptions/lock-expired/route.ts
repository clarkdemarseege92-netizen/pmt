// app/api/cron/subscriptions/lock-expired/route.ts
// 账户锁定自动化任务
// 建议每天运行一次，锁定试用期已过期且未订阅的账户

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
      trial_locked: 0,
      subscription_locked: 0,
      notifications_sent: 0,
      errors: [] as string[]
    };

    // 1. 锁定试用期已过期的账户
    const { data: expiredTrials, error: trialError } = await supabaseAdmin
      .from('merchant_subscriptions')
      .select(`
        id,
        merchant_id,
        trial_end_date,
        merchants!inner(shop_name, owner_id)
      `)
      .eq('status', 'trial')
      .lt('trial_end_date', now.toISOString());

    if (trialError) {
      results.errors.push(`Trial query error: ${trialError.message}`);
    } else if (expiredTrials && expiredTrials.length > 0) {
      // 计算数据保留截止日期（30天后）
      const dataRetentionDate = new Date(now);
      dataRetentionDate.setDate(dataRetentionDate.getDate() + 30);

      for (const sub of expiredTrials) {
        // 更新订阅状态为锁定
        const { error: updateError } = await supabaseAdmin
          .from('merchant_subscriptions')
          .update({
            status: 'locked',
            locked_at: now.toISOString(),
            data_retention_until: dataRetentionDate.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('id', sub.id);

        if (updateError) {
          results.errors.push(`Lock trial ${sub.id} error: ${updateError.message}`);
        } else {
          results.trial_locked++;

          // 发送锁定通知
          await sendLockNotification(sub, 'trial_expired');
          results.notifications_sent++;
        }
      }
    }

    // 2. 锁定订阅已过期且设置了期末取消的账户
    const { data: expiredSubscriptions, error: subError } = await supabaseAdmin
      .from('merchant_subscriptions')
      .select(`
        id,
        merchant_id,
        current_period_end,
        merchants!inner(shop_name, owner_id)
      `)
      .eq('status', 'canceled')
      .eq('cancel_at_period_end', true)
      .lt('current_period_end', now.toISOString());

    if (subError) {
      results.errors.push(`Subscription query error: ${subError.message}`);
    } else if (expiredSubscriptions && expiredSubscriptions.length > 0) {
      const dataRetentionDate = new Date(now);
      dataRetentionDate.setDate(dataRetentionDate.getDate() + 30);

      for (const sub of expiredSubscriptions) {
        const { error: updateError } = await supabaseAdmin
          .from('merchant_subscriptions')
          .update({
            status: 'locked',
            locked_at: now.toISOString(),
            data_retention_until: dataRetentionDate.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('id', sub.id);

        if (updateError) {
          results.errors.push(`Lock subscription ${sub.id} error: ${updateError.message}`);
        } else {
          results.subscription_locked++;

          await sendLockNotification(sub, 'subscription_expired');
          results.notifications_sent++;
        }
      }
    }

    // 3. 锁定逾期未付超过7天的账户
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: pastDueSubscriptions, error: pastDueError } = await supabaseAdmin
      .from('merchant_subscriptions')
      .select(`
        id,
        merchant_id,
        current_period_end,
        merchants!inner(shop_name, owner_id)
      `)
      .eq('status', 'past_due')
      .lt('current_period_end', sevenDaysAgo.toISOString());

    if (pastDueError) {
      results.errors.push(`Past due query error: ${pastDueError.message}`);
    } else if (pastDueSubscriptions && pastDueSubscriptions.length > 0) {
      const dataRetentionDate = new Date(now);
      dataRetentionDate.setDate(dataRetentionDate.getDate() + 30);

      for (const sub of pastDueSubscriptions) {
        const { error: updateError } = await supabaseAdmin
          .from('merchant_subscriptions')
          .update({
            status: 'locked',
            locked_at: now.toISOString(),
            data_retention_until: dataRetentionDate.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('id', sub.id);

        if (updateError) {
          results.errors.push(`Lock past due ${sub.id} error: ${updateError.message}`);
        } else {
          results.subscription_locked++;

          await sendLockNotification(sub, 'payment_overdue');
          results.notifications_sent++;
        }
      }
    }

    // 记录执行日志
    await supabaseAdmin
      .from('cron_logs')
      .insert({
        job_name: 'lock-expired',
        executed_at: now.toISOString(),
        result: results,
        success: results.errors.length === 0
      });

    return NextResponse.json({
      success: true,
      message: 'Lock expired accounts job completed',
      results
    });

  } catch (error) {
    console.error('Lock expired job failed:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function sendLockNotification(subscription: any, reason: string) {
  const merchantName = subscription.merchants?.shop_name || 'Merchant';
  const ownerId = subscription.merchants?.owner_id;

  const titles: Record<string, { en: string; th: string; zh: string }> = {
    trial_expired: {
      en: 'Trial Period Expired - Account Locked',
      th: 'ช่วงทดลองใช้หมดอายุ - บัญชีถูกล็อค',
      zh: '试用期已到期 - 账户已锁定'
    },
    subscription_expired: {
      en: 'Subscription Expired - Account Locked',
      th: 'การสมัครสมาชิกหมดอายุ - บัญชีถูกล็อค',
      zh: '订阅已到期 - 账户已锁定'
    },
    payment_overdue: {
      en: 'Payment Overdue - Account Locked',
      th: 'การชำระเงินเกินกำหนด - บัญชีถูกล็อค',
      zh: '付款逾期 - 账户已锁定'
    }
  };

  const messages: Record<string, { en: string; th: string; zh: string }> = {
    trial_expired: {
      en: `Your trial period for ${merchantName} has expired. Subscribe now to reactivate your account. Your data will be retained for 30 days.`,
      th: `ช่วงทดลองใช้ของ ${merchantName} หมดอายุแล้ว สมัครสมาชิกตอนนี้เพื่อเปิดใช้งานบัญชีใหม่ ข้อมูลจะถูกเก็บไว้ 30 วัน`,
      zh: `${merchantName} 的试用期已到期。立即订阅以重新激活您的账户。您的数据将保留30天。`
    },
    subscription_expired: {
      en: `Your subscription for ${merchantName} has expired. Reactivate now to continue using all features. Your data will be retained for 30 days.`,
      th: `การสมัครสมาชิกของ ${merchantName} หมดอายุแล้ว เปิดใช้งานใหม่ตอนนี้เพื่อใช้งานฟีเจอร์ทั้งหมดต่อไป ข้อมูลจะถูกเก็บไว้ 30 วัน`,
      zh: `${merchantName} 的订阅已到期。立即重新激活以继续使用所有功能。您的数据将保留30天。`
    },
    payment_overdue: {
      en: `Your payment for ${merchantName} is overdue. Please update your payment method to reactivate your account. Your data will be retained for 30 days.`,
      th: `การชำระเงินของ ${merchantName} เกินกำหนด กรุณาอัปเดตวิธีการชำระเงินเพื่อเปิดใช้งานบัญชีใหม่ ข้อมูลจะถูกเก็บไว้ 30 วัน`,
      zh: `${merchantName} 的付款已逾期。请更新您的付款方式以重新激活账户。您的数据将保留30天。`
    }
  };

  await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: ownerId,
      type: 'account_locked',
      title: titles[reason] || titles.trial_expired,
      message: messages[reason] || messages.trial_expired,
      data: {
        subscription_id: subscription.id,
        merchant_id: subscription.merchant_id,
        lock_reason: reason
      },
      read: false,
      created_at: new Date().toISOString()
    });

  console.log(`Sent lock notification to merchant: ${merchantName}, reason: ${reason}`);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
