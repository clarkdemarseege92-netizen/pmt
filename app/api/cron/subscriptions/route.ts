// app/api/cron/subscriptions/route.ts
// 订阅系统定时任务统一触发端点
// 可以用于一次性触发所有订阅相关的定时任务

import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

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

  const authHeader = request.headers.get('authorization') || '';

  try {
    const results = {
      trial_reminder: null as any,
      lock_expired: null as any,
      auto_renew: null as any,
      errors: [] as string[]
    };

    // 1. 运行试用期提醒任务
    try {
      const trialResponse = await fetch(`${BASE_URL}/api/cron/subscriptions/trial-reminder`, {
        method: 'GET',
        headers: { 'Authorization': authHeader }
      });
      results.trial_reminder = await trialResponse.json();
    } catch (error) {
      results.errors.push(`trial-reminder error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // 2. 运行账户锁定任务
    try {
      const lockResponse = await fetch(`${BASE_URL}/api/cron/subscriptions/lock-expired`, {
        method: 'GET',
        headers: { 'Authorization': authHeader }
      });
      results.lock_expired = await lockResponse.json();
    } catch (error) {
      results.errors.push(`lock-expired error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // 3. 运行自动续费任务
    try {
      const renewResponse = await fetch(`${BASE_URL}/api/cron/subscriptions/auto-renew`, {
        method: 'GET',
        headers: { 'Authorization': authHeader }
      });
      results.auto_renew = await renewResponse.json();
    } catch (error) {
      results.errors.push(`auto-renew error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

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

export async function POST(request: NextRequest) {
  return GET(request);
}
