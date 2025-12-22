// app/api/notifications/send/route.ts
// API Route: 发送推送通知到商户

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 通知类型
type NotificationType =
  | 'order_new'
  | 'order_paid'
  | 'order_cancelled'
  | 'coupon_redeemed'
  | 'review_received'
  | 'subscription_expiring'
  | 'subscription_expired'
  | 'balance_low'
  | 'withdrawal_status'
  | 'system_alert'
  | 'marketing';

interface SendNotificationRequest {
  merchant_id: string;
  notification_type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  reference_type?: string;
  reference_id?: string;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 验证用户身份
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 解析请求体
    const body: SendNotificationRequest = await request.json();
    const {
      merchant_id,
      notification_type,
      title,
      body: notificationBody,
      data,
      reference_type,
      reference_id,
    } = body;

    // 验证必要参数
    if (!merchant_id || !notification_type || !title || !notificationBody) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: merchant_id, notification_type, title, body',
        },
        { status: 400 }
      );
    }

    // 验证商户权限（发送者必须是商户所有者或管理员）
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('merchant_id, owner_id')
      .eq('merchant_id', merchant_id)
      .single();

    if (merchantError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // 检查是否是管理员或商户所有者
    const { data: adminCheck } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const isAdmin = !!adminCheck;
    const isOwner = merchant.owner_id === user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Not authorized to send notifications to this merchant' },
        { status: 403 }
      );
    }

    // 获取商户的所有有效推送令牌
    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token, user_id, device_type')
      .eq('merchant_id', merchant_id)
      .eq('is_active', true);

    if (tokenError) {
      console.error('Error fetching push tokens:', tokenError);
      return NextResponse.json(
        { error: 'Failed to fetch push tokens' },
        { status: 500 }
      );
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json(
        { message: 'No active push tokens found', sent: 0 },
        { status: 200 }
      );
    }

    // 检查每个用户的通知偏好
    const userIds = [...new Set(tokens.map((t) => t.user_id))];
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select(
        `user_id, ${notification_type}, dnd_enabled, dnd_start_time, dnd_end_time`
      )
      .in('user_id', userIds);

    // 创建偏好映射
    const prefsMap = new Map<
      string,
      { enabled: boolean; dnd: boolean; dndStart?: string; dndEnd?: string }
    >();
    preferences?.forEach((p) => {
      const notificationEnabled =
        (p as Record<string, unknown>)[notification_type] ?? true;
      prefsMap.set(p.user_id, {
        enabled: notificationEnabled as boolean,
        dnd: p.dnd_enabled ?? false,
        dndStart: p.dnd_start_time,
        dndEnd: p.dnd_end_time,
      });
    });

    // 检查是否在免打扰时段
    const isInDndPeriod = (pref: {
      dnd: boolean;
      dndStart?: string;
      dndEnd?: string;
    }): boolean => {
      if (!pref.dnd) return false;

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;

      // 解析开始和结束时间
      const startTime = pref.dndStart || '22:00';
      const endTime = pref.dndEnd || '08:00';

      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      const start = startHour * 60 + startMin;
      const end = endHour * 60 + endMin;

      // 跨午夜的情况
      if (start > end) {
        return currentTime >= start || currentTime < end;
      }
      return currentTime >= start && currentTime < end;
    };

    // 过滤出允许接收此类通知的令牌
    const eligibleTokens = tokens.filter((t) => {
      const pref = prefsMap.get(t.user_id);
      if (!pref) {
        // 没有设置偏好，默认允许（除了 marketing）
        return notification_type !== 'marketing';
      }
      if (!pref.enabled) return false;
      if (isInDndPeriod(pref)) return false;
      return true;
    });

    if (eligibleTokens.length === 0) {
      return NextResponse.json(
        {
          message:
            'All users have disabled this notification type or are in DND period',
          sent: 0,
        },
        { status: 200 }
      );
    }

    // 构建 Expo 推送消息
    const messages = eligibleTokens.map((t) => ({
      to: t.token,
      sound: 'default',
      title,
      body: notificationBody,
      data: {
        ...data,
        notification_type,
        reference_type,
        reference_id,
      },
      badge: 1,
      channelId: getChannelId(notification_type),
      priority: getPriority(notification_type),
      ttl: 86400, // 24小时
    }));

    // 批量发送到 Expo Push Service
    const chunks = chunkArray(messages, 100);
    const allTickets: Array<{
      status: 'ok' | 'error';
      id?: string;
      message?: string;
    }> = [];

    for (const chunk of chunks) {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(chunk),
      });

      const result = await response.json();

      if (result.data) {
        allTickets.push(...result.data);
      }
    }

    // 记录通知日志
    const logEntries = eligibleTokens.map((t, index) => ({
      merchant_id,
      user_id: t.user_id,
      title,
      body: notificationBody,
      data,
      notification_type,
      status: allTickets[index]?.status === 'ok' ? 'sent' : 'failed',
      expo_ticket_id: allTickets[index]?.id,
      sent_at: new Date().toISOString(),
      error_message: allTickets[index]?.message,
      reference_type,
      reference_id,
    }));

    const { error: logError } = await supabase
      .from('notification_logs')
      .insert(logEntries);

    if (logError) {
      console.error('Error logging notifications:', logError);
    }

    // 更新令牌最后使用时间
    const tokenValues = eligibleTokens.map((t) => t.token);
    await supabase
      .from('push_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .in('token', tokenValues);

    // 统计发送结果
    const successCount = allTickets.filter((t) => t.status === 'ok').length;
    const failureCount = allTickets.filter((t) => t.status === 'error').length;

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failureCount,
      total: eligibleTokens.length,
    });
  } catch (error) {
    console.error('Push notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 根据通知类型获取 Android 通知渠道
function getChannelId(type: NotificationType): string {
  switch (type) {
    case 'order_new':
    case 'order_paid':
    case 'order_cancelled':
      return 'orders';
    case 'subscription_expiring':
    case 'subscription_expired':
    case 'system_alert':
      return 'system';
    case 'marketing':
      return 'marketing';
    default:
      return 'default';
  }
}

// 根据通知类型获取优先级
function getPriority(type: NotificationType): 'default' | 'normal' | 'high' {
  switch (type) {
    case 'order_new':
    case 'order_paid':
    case 'subscription_expiring':
    case 'subscription_expired':
    case 'withdrawal_status':
      return 'high';
    case 'marketing':
      return 'normal';
    default:
      return 'default';
  }
}

// 数组分块
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
