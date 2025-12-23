// app/actions/accounting/get-balance.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';

type BalanceCheckResult = {
  success: boolean;
  data?: {
    balance: number;
    hasEnoughForQR: boolean;
    hasKYC: boolean;
    promptpayId?: string | null;
  };
  error?: string;
};

const QR_MIN_BALANCE = 0; // 最低余额要求（暂时设为0，后续可调整）

/**
 * 获取商户钱包余额并检查是否可以使用二维码结算
 * 需要同时满足: 1) 余额 >= 0 THB  2) 已完成 KYC 验证（有 promptpay_id）
 * @param merchantId 商户ID
 */
export async function getMerchantBalanceForQR(
  merchantId: string
): Promise<BalanceCheckResult> {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. 检查商户的 KYC 状态（promptpay_id）
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('promptpay_id')
      .eq('merchant_id', merchantId)
      .single();

    if (merchantError) {
      console.error('Error fetching merchant:', merchantError);
      return {
        success: false,
        error: 'Failed to fetch merchant info',
      };
    }

    const hasKYC = !!merchant?.promptpay_id;

    // 2. 获取余额
    let balance = 0;
    const { data: rpcBalance, error: rpcError } = await supabase
      .rpc('get_merchant_balance', { p_merchant_id: merchantId });

    if (rpcError) {
      // RPC 失败，回退到直接查询
      const { data: lastTx } = await supabase
        .from('merchant_transactions')
        .select('balance_after')
        .eq('merchant_id', merchantId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      balance = lastTx?.balance_after || 0;
    } else {
      balance = rpcBalance || 0;
    }

    return {
      success: true,
      data: {
        balance,
        hasEnoughForQR: balance >= QR_MIN_BALANCE && hasKYC,
        hasKYC,
        promptpayId: merchant?.promptpay_id,
      },
    };
  } catch (error) {
    console.error('Error getting merchant balance:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
