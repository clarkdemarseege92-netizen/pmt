// lib/merchantUtils.ts
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function getMerchantPromptPayId(merchantId: string): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: merchant, error } = await supabase
      .from('merchants')
      .select('promptpay_id')
      .eq('merchant_id', merchantId)
      .single();

    if (error || !merchant) {
      console.error('获取商户promptpay_id失败:', error);
      return null;
    }

    return merchant.promptpay_id;
  } catch (error) {
    console.error('获取商户promptpay_id异常:', error);
    return null;
  }
}