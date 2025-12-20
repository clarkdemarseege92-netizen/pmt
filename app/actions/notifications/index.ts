// app/actions/notifications/index.ts
// 通知管理 Server Actions

'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: { en: string; th: string; zh: string };
  message: { en: string; th: string; zh: string };
  data?: Record<string, any>;
  read: boolean;
  read_at?: string;
  created_at: string;
}

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 获取用户通知列表
export async function getNotifications(
  limit: number = 20,
  offset: number = 0
): Promise<ActionResponse<Notification[]>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Notification[] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 获取未读通知数量
export async function getUnreadCount(): Promise<ActionResponse<number>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .rpc('get_unread_notification_count', { p_user_id: user.id });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as number };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 标记通知为已读
export async function markAsRead(
  notificationIds?: string[]
): Promise<ActionResponse<number>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .rpc('mark_notifications_as_read', {
        p_user_id: user.id,
        p_notification_ids: notificationIds || null
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as number };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 删除通知
export async function deleteNotification(
  notificationId: string
): Promise<ActionResponse<boolean>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 删除所有已读通知
export async function deleteReadNotifications(): Promise<ActionResponse<number>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('read', true)
      .select('id');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data?.length || 0 };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
