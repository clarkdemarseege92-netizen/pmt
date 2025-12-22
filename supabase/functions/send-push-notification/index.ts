// supabase/functions/send-push-notification/index.ts
// Supabase Edge Function: 发送推送通知到 Expo Push Service

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

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

// 请求参数
interface NotificationPayload {
  merchant_id: string;
  notification_type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  reference_type?: string;
  reference_id?: string;
  channel_id?: string; // Android 通知渠道
}

// Expo 推送消息格式
interface ExpoPushMessage {
  to: string;
  sound?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
}

// Expo 推送响应
interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: Record<string, unknown>;
}

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 初始化 Supabase 客户端（使用 service role key）
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 解析请求体
    const payload: NotificationPayload = await req.json();
    const {
      merchant_id,
      notification_type,
      title,
      body,
      data,
      reference_type,
      reference_id,
      channel_id,
    } = payload;

    // 验证必要参数
    if (!merchant_id || !notification_type || !title || !body) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: merchant_id, notification_type, title, body',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Sending ${notification_type} notification to merchant: ${merchant_id}`);

    // 1. 获取商户的所有有效推送令牌
    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token, user_id, device_type')
      .eq('merchant_id', merchant_id)
      .eq('is_active', true);

    if (tokenError) {
      console.error('Error fetching push tokens:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch push tokens' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log('No active push tokens found for merchant');
      return new Response(
        JSON.stringify({ message: 'No active push tokens found', sent: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. 检查每个用户的通知偏好
    const userIds = [...new Set(tokens.map((t) => t.user_id))];
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select(`user_id, ${notification_type}, dnd_enabled, dnd_start_time, dnd_end_time`)
      .in('user_id', userIds);

    // 创建偏好映射
    const prefsMap = new Map<string, { enabled: boolean; dnd: boolean }>();
    preferences?.forEach((p) => {
      const notificationEnabled = p[notification_type] ?? true;
      prefsMap.set(p.user_id, {
        enabled: notificationEnabled,
        dnd: p.dnd_enabled ?? false,
      });
    });

    // 检查是否在免打扰时段
    const isInDndPeriod = (dndEnabled: boolean): boolean => {
      if (!dndEnabled) return false;

      const now = new Date();
      const currentHour = now.getHours();
      // 默认免打扰时段 22:00 - 08:00
      return currentHour >= 22 || currentHour < 8;
    };

    // 3. 过滤出允许接收此类通知的令牌
    const eligibleTokens = tokens.filter((t) => {
      const pref = prefsMap.get(t.user_id);
      if (!pref) {
        // 没有设置偏好，默认允许（除了 marketing）
        return notification_type !== 'marketing';
      }
      if (!pref.enabled) return false;
      if (isInDndPeriod(pref.dnd)) return false;
      return true;
    });

    if (eligibleTokens.length === 0) {
      console.log('All users have disabled this notification type or are in DND');
      return new Response(
        JSON.stringify({
          message: 'All users have disabled this notification type or are in DND period',
          sent: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. 构建 Expo 推送消息
    const messages: ExpoPushMessage[] = eligibleTokens.map((t) => ({
      to: t.token,
      sound: 'default',
      title,
      body,
      data: {
        ...data,
        notification_type,
        reference_type,
        reference_id,
      },
      badge: 1,
      channelId: channel_id || getChannelId(notification_type),
      priority: getPriority(notification_type),
      ttl: 86400, // 24小时
    }));

    // 5. 批量发送到 Expo Push Service（每次最多100条）
    const chunks = chunkArray(messages, 100);
    const allTickets: ExpoPushTicket[] = [];

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

    // 6. 记录通知日志
    const logEntries = eligibleTokens.map((t, index) => ({
      merchant_id,
      user_id: t.user_id,
      title,
      body,
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

    // 7. 更新令牌最后使用时间
    const tokenValues = eligibleTokens.map((t) => t.token);
    await supabase
      .from('push_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .in('token', tokenValues);

    // 8. 统计发送结果
    const successCount = allTickets.filter((t) => t.status === 'ok').length;
    const failureCount = allTickets.filter((t) => t.status === 'error').length;

    console.log(`Notification sent: ${successCount} success, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failureCount,
        total: eligibleTokens.length,
        tickets: allTickets.map((t) => ({
          status: t.status,
          id: t.id,
          message: t.message,
        })),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

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
