// supabase/functions/process-pending-notifications/index.ts
// Supabase Edge Function: 处理待发送的推送通知
// 可由 cron job 定时调用

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PendingNotification {
  notification_id: string;
  merchant_id: string;
  notification_type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

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

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Processing pending notifications...');

    // 获取待处理的通知
    const { data: pendingNotifications, error: fetchError } = await supabase
      .rpc('process_pending_notifications');

    if (fetchError) {
      console.error('Error fetching pending notifications:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending notifications' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('No pending notifications to process');
      return new Response(
        JSON.stringify({ message: 'No pending notifications', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pendingNotifications.length} pending notifications`);

    let successCount = 0;
    let failureCount = 0;

    // 处理每个通知
    for (const notification of pendingNotifications as PendingNotification[]) {
      try {
        // 获取商户的推送令牌
        const { data: tokens, error: tokenError } = await supabase
          .from('push_tokens')
          .select('token, user_id')
          .eq('merchant_id', notification.merchant_id)
          .eq('is_active', true);

        if (tokenError || !tokens || tokens.length === 0) {
          console.log(`No tokens for merchant ${notification.merchant_id}`);
          await supabase.rpc('update_notification_status', {
            p_notification_id: notification.notification_id,
            p_status: 'failed',
            p_error_message: 'No active push tokens',
          });
          failureCount++;
          continue;
        }

        // 检查用户偏好
        const userIds = [...new Set(tokens.map((t) => t.user_id))];
        const { data: preferences } = await supabase
          .from('notification_preferences')
          .select(`user_id, ${notification.notification_type}, dnd_enabled`)
          .in('user_id', userIds);

        const prefsMap = new Map<string, boolean>();
        preferences?.forEach((p) => {
          const enabled = (p as Record<string, unknown>)[notification.notification_type] ?? true;
          const dnd = p.dnd_enabled ?? false;
          // 简单的 DND 检查（22:00 - 08:00）
          const hour = new Date().getHours();
          const inDnd = dnd && (hour >= 22 || hour < 8);
          prefsMap.set(p.user_id, enabled as boolean && !inDnd);
        });

        // 过滤有效的令牌
        const eligibleTokens = tokens.filter((t) => {
          const allowed = prefsMap.get(t.user_id);
          return allowed !== false; // 默认允许
        });

        if (eligibleTokens.length === 0) {
          await supabase.rpc('update_notification_status', {
            p_notification_id: notification.notification_id,
            p_status: 'skipped',
            p_error_message: 'All users disabled this notification type',
          });
          continue;
        }

        // 构建推送消息
        const messages: ExpoPushMessage[] = eligibleTokens.map((t) => ({
          to: t.token,
          sound: 'default',
          title: notification.title,
          body: notification.body,
          data: {
            ...notification.data,
            notification_type: notification.notification_type,
          },
          badge: 1,
          channelId: getChannelId(notification.notification_type),
          priority: getPriority(notification.notification_type),
          ttl: 86400,
        }));

        // 发送到 Expo
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(messages),
        });

        const result = await response.json();
        const tickets: ExpoPushTicket[] = result.data || [];
        const firstTicket = tickets[0];

        if (firstTicket?.status === 'ok') {
          await supabase.rpc('update_notification_status', {
            p_notification_id: notification.notification_id,
            p_status: 'sent',
            p_expo_ticket_id: firstTicket.id,
          });
          successCount++;
        } else {
          await supabase.rpc('update_notification_status', {
            p_notification_id: notification.notification_id,
            p_status: 'failed',
            p_error_message: firstTicket?.message || 'Unknown error',
          });
          failureCount++;
        }

        // 更新令牌最后使用时间
        const tokenValues = eligibleTokens.map((t) => t.token);
        await supabase
          .from('push_tokens')
          .update({ last_used_at: new Date().toISOString() })
          .in('token', tokenValues);

      } catch (error) {
        console.error(`Error processing notification ${notification.notification_id}:`, error);
        await supabase.rpc('update_notification_status', {
          p_notification_id: notification.notification_id,
          p_status: 'failed',
          p_error_message: error.message || 'Processing error',
        });
        failureCount++;
      }
    }

    console.log(`Processed: ${successCount} success, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingNotifications.length,
        sent: successCount,
        failed: failureCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Process notifications error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getChannelId(type: string): string {
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

function getPriority(type: string): 'default' | 'normal' | 'high' {
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
