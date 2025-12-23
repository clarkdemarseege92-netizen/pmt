// app/api/merchant/check-balance/route.ts
// 检查商户余额是否满足 Slip2Go 验证要求 (>= 200 THB)

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const SLIP2GO_MIN_BALANCE = 200; // Slip2Go 验证最低余额要求

export async function POST(request: Request) {
  try {
    const { merchantId } = await request.json();

    if (!merchantId) {
      return NextResponse.json(
        { success: false, message: 'merchantId is required' },
        { status: 400 }
      );
    }

    // 使用 Admin 客户端查询商户余额
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { success: false, message: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 获取商户余额
    let balance = 0;
    const { data: rpcBalance, error: rpcError } = await supabaseAdmin.rpc(
      'get_merchant_balance',
      { p_merchant_id: merchantId }
    );

    if (rpcError) {
      // RPC 失败，回退到直接查询
      console.log('RPC failed, falling back to direct query:', rpcError);
      const { data: lastTx } = await supabaseAdmin
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

    const hasEnoughBalance = balance >= SLIP2GO_MIN_BALANCE;

    return NextResponse.json({
      success: true,
      data: {
        balance,
        hasEnoughBalance,
        requiredBalance: SLIP2GO_MIN_BALANCE,
      },
    });
  } catch (error) {
    console.error('Error checking merchant balance:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
