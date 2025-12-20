// app/actions/subscriptions/notifications.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { ActionResponse } from '@/app/types/subscription';

export interface SubscriptionNotification {
  id: string;
  user_id: string;
  type: string;
  title: {
    en: string;
    th: string;
    zh: string;
  };
  message: {
    en: string;
    th: string;
    zh: string;
  };
  data?: Record<string, any>;
  read: boolean;
  created_at: string;
}

/**
 * 获取用户的订阅相关通知
 * @param userId 用户ID
 * @param limit 限制数量
 */
export async function getSubscriptionNotifications(
  userId: string,
  limit: number = 10
): Promise<ActionResponse<SubscriptionNotification[]>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .in('type', ['trial_reminder', 'renewal_failed', 'subscription_renewed', 'subscription_locked', 'subscription_expiring'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }

    return {
      success: true,
      data: data as SubscriptionNotification[]
    };
  } catch (error) {
    console.error('Error in getSubscriptionNotifications:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    };
  }
}

/**
 * 标记通知为已读
 * @param notificationId 通知ID
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 标记所有通知为已读
 * @param userId 用户ID
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
