import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { generatePromptPayPayload } from '@/lib/promptpay';

const PLATFORM_PROMPTPAY_ID = process.env.PLATFORM_PROMPTPAY_ID;

export async function POST(request: Request) {
  const { transactionId } = await request.json();

  if (!transactionId) {
    return NextResponse.json({ success: false, message: '缺少交易ID' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, message: '请先登录' }, { status: 401 });
  }

  try {
    // 1. 验证交易归属权 (确保是该用户的商户发起的交易)
    // 联表查询：检查该交易所属的商户，是否属于当前登录用户
    const { data: transaction, error } = await supabase
      .from('merchant_transactions')
      .select(`
        id,
        amount,
        status,
        merchants!inner(owner_id) 
      `)
      .eq('id', transactionId)
      .eq('merchants.owner_id', user.id)
      .single();

    if (error || !transaction) {
      console.error('Resume Transaction Error:', error);
      return NextResponse.json({ success: false, message: '找不到该交易或无权操作' }, { status: 403 });
    }

    if (transaction.status !== 'pending') {
      return NextResponse.json({ success: false, message: '只有“审核中”的订单可以继续支付' }, { status: 400 });
    }

    if (!PLATFORM_PROMPTPAY_ID) {
        return NextResponse.json({ success: false, message: '服务器配置错误: 缺少收款ID' }, { status: 500 });
    }

    // 2. 重新生成 Payload
    const promptpayPayload = generatePromptPayPayload(PLATFORM_PROMPTPAY_ID, transaction.amount);

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      promptpayPayload,
      amount: transaction.amount
    });

  } catch (e) {
    console.error('Resume API Error:', e);
    return NextResponse.json({ success: false, message: '服务器内部错误' }, { status: 500 });
  }
}