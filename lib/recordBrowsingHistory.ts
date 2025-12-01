// lib/recordBrowsingHistory.ts
import { createSupabaseServerClient } from "./supabaseServer";

export async function recordBrowsingHistory(
  itemType: 'product' | 'coupon' | 'merchant',
  itemId: string
) {
  try {
    const supabase = await createSupabaseServerClient();

    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();

    // 如果用户未登录，不记录浏览历史
    if (!user) {
      return { success: false, reason: 'not_logged_in' };
    }

    // 插入浏览记录
    const { error } = await supabase
      .from('browsing_history')
      .insert({
        user_id: user.id,
        item_type: itemType,
        item_id: itemId,
        viewed_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error recording browsing history:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Exception in recordBrowsingHistory:', error);
    return { success: false, error };
  }
}
