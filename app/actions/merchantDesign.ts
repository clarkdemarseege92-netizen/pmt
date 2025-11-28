// app/actions/merchantDesign.ts
"use server";

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { 
  MerchantCustomization, 
  ApiResponse, 
  normalizeMerchantCustomization 
} from '@/app/types/merchantDesign';

export async function getMerchantCustomization(merchantId: string) {
  console.log('🟡 getMerchantCustomization 被调用:', merchantId);
  
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('merchant_customizations')
      .select('*')
      .eq('merchant_id', merchantId)
      .single();

    console.log('🟢 数据库查询结果:', { 
      hasData: !!data, 
      error: error,
      data: data 
    });

    if (error) {
      if (error.code === 'PGRST116') { // 没有找到记录
        return { success: true, data: null };
      }
      console.error('🔴 数据库查询错误:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('🔴 getMerchantCustomization 异常:', error);
    return { success: false, error: '获取配置失败' };
  }
}

export async function updateMerchantCustomization(
  merchantId: string, 
  config: MerchantCustomization
): Promise<ApiResponse<MerchantCustomization>> {
  try {
    const response = await fetch(`/api/merchants/${merchantId}/customization`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error('Failed to update customization');
    const data = await response.json();
    
    // 规范化返回的数据
    const normalizedData = normalizeMerchantCustomization(data);
    
    return { success: true, data: normalizedData };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}