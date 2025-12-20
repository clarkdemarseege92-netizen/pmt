// app/api/cron/subscriptions/trial-reminder/route.ts
// 试用期到期提醒定时任务
// 建议每天运行一次，提醒试用期即将到期的商户

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 使用 service role key 进行管理员操作
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 验证 cron 密钥（用于保护 API）
function validateCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return true; // 开发环境允许
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // 验证请求
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const results = {
      reminded_7_days: 0,
      reminded_3_days: 0,
      reminded_1_day: 0,
      errors: [] as string[]
    };

    // 查询需要提醒的试用期订阅
    // 1. 7天后到期
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    // 2. 3天后到期
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    // 3. 1天后到期
    const oneDayLater = new Date(now);
    oneDayLater.setDate(oneDayLater.getDate() + 1);

    // 查询7天后到期的订阅
    const { data: sevenDaySubscriptions, error: error7 } = await supabaseAdmin
      .from('merchant_subscriptions')
      .select(`
        id,
        merchant_id,
        trial_end_date,
        merchants!inner(shop_name, owner_id)
      `)
      .eq('status', 'trial')
      .gte('trial_end_date', sevenDaysLater.toISOString().split('T')[0])
      .lt('trial_end_date', new Date(sevenDaysLater.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (error7) {
      results.errors.push(`7-day query error: ${error7.message}`);
    } else if (sevenDaySubscriptions) {
      for (const sub of sevenDaySubscriptions) {
        await sendTrialReminder(sub, 7);
        results.reminded_7_days++;
      }
    }

    // 查询3天后到期的订阅
    const { data: threeDaySubscriptions, error: error3 } = await supabaseAdmin
      .from('merchant_subscriptions')
      .select(`
        id,
        merchant_id,
        trial_end_date,
        merchants!inner(shop_name, owner_id)
      `)
      .eq('status', 'trial')
      .gte('trial_end_date', threeDaysLater.toISOString().split('T')[0])
      .lt('trial_end_date', new Date(threeDaysLater.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (error3) {
      results.errors.push(`3-day query error: ${error3.message}`);
    } else if (threeDaySubscriptions) {
      for (const sub of threeDaySubscriptions) {
        await sendTrialReminder(sub, 3);
        results.reminded_3_days++;
      }
    }

    // 查询1天后到期的订阅
    const { data: oneDaySubscriptions, error: error1 } = await supabaseAdmin
      .from('merchant_subscriptions')
      .select(`
        id,
        merchant_id,
        trial_end_date,
        merchants!inner(shop_name, owner_id)
      `)
      .eq('status', 'trial')
      .gte('trial_end_date', oneDayLater.toISOString().split('T')[0])
      .lt('trial_end_date', new Date(oneDayLater.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (error1) {
      results.errors.push(`1-day query error: ${error1.message}`);
    } else if (oneDaySubscriptions) {
      for (const sub of oneDaySubscriptions) {
        await sendTrialReminder(sub, 1);
        results.reminded_1_day++;
      }
    }

    // 记录执行日志
    await supabaseAdmin
      .from('cron_logs')
      .insert({
        job_name: 'trial-reminder',
        executed_at: now.toISOString(),
        result: results,
        success: results.errors.length === 0
      })
      .single();

    return NextResponse.json({
      success: true,
      message: 'Trial reminder job completed',
      results
    });

  } catch (error) {
    console.error('Trial reminder job failed:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 发送试用期提醒（可以扩展为发送邮件、短信、推送通知等）
async function sendTrialReminder(subscription: any, daysRemaining: number) {
  const merchantName = subscription.merchants?.shop_name || 'Merchant';
  const ownerId = subscription.merchants?.owner_id;

  // 创建系统通知（存入数据库）
  await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: ownerId,
      type: 'trial_reminder',
      title: {
        en: `Trial expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`,
        th: `ช่วงทดลองใช้จะหมดอายุใน ${daysRemaining} วัน`,
        zh: `试用期将在 ${daysRemaining} 天后到期`
      },
      message: {
        en: `Your trial period for ${merchantName} will expire soon. Subscribe now to continue using all features.`,
        th: `ช่วงทดลองใช้ของ ${merchantName} กำลังจะหมดอายุ สมัครสมาชิกตอนนี้เพื่อใช้งานฟีเจอร์ทั้งหมดต่อไป`,
        zh: `${merchantName} 的试用期即将到期。立即订阅以继续使用所有功能。`
      },
      data: {
        subscription_id: subscription.id,
        merchant_id: subscription.merchant_id,
        days_remaining: daysRemaining,
        trial_end_date: subscription.trial_end_date
      },
      read: false,
      created_at: new Date().toISOString()
    });

  console.log(`Sent ${daysRemaining}-day trial reminder to merchant: ${merchantName}`);
}

// 支持 POST 方法（用于手动触发）
export async function POST(request: NextRequest) {
  return GET(request);
}
