// 文件: app/api/verify-payment/route.ts
// 付款凭证上传和验证 API

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { verifySlip, validateSlipData } from '@/lib/slipVerify';

export async function POST(request: Request) {
  try {
    const { orderId, slipImage } = await request.json();

    console.log('=== Verify Payment API ===');
    console.log('1. 收到请求，订单 ID:', orderId);

    // 1. 参数校验
    if (!orderId || !slipImage) {
      console.log('❌ 缺少必要参数');
      return NextResponse.json({
        success: false,
        message: '缺少订单 ID 或付款凭证',
      }, { status: 400 });
    }

    // 2. 验证用户登录
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    console.log('2. 用户信息:', user ? { id: user.id, email: user.email } : 'null');

    if (!user) {
      console.log('❌ 用户未登录');
      return NextResponse.json({
        success: false,
        message: '请先登录',
      }, { status: 401 });
    }

    // 3. 初始化 Admin 客户端（需要读取敏感的 merchant promptpay_id）
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ 缺少环境变量');
      return NextResponse.json({
        success: false,
        message: '服务器配置错误',
      }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 4. 查询订单信息（包括商户 PromptPay ID）
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        order_id,
        customer_id,
        purchase_price,
        status,
        created_at,
        merchant_id,
        merchants!inner (
          merchant_id,
          promptpay_id
        )
      `)
      .eq('order_id', orderId)
      .eq('customer_id', user.id)
      .single();

    console.log('3. 查询订单结果:', {
      found: !!order,
      error: orderError ? orderError.message : 'null',
      status: order?.status,
    });

    if (orderError || !order) {
      console.log('❌ 订单不存在或不属于当前用户');
      return NextResponse.json({
        success: false,
        message: '订单不存在或不属于您',
      }, { status: 404 });
    }

    // 类型断言
    type OrderWithMerchant = typeof order & {
      merchants: {
        merchant_id: string;
        promptpay_id: string;
      };
    };

    const orderData = order as OrderWithMerchant;

    // 5. 检查订单状态
    if (orderData.status !== 'pending') {
      console.log(`⚠️ 订单状态不是 pending，当前为: ${orderData.status}`);
      return NextResponse.json({
        success: false,
        message: `订单状态错误：当前为 ${orderData.status}`,
      }, { status: 400 });
    }

    // 6. 检查订单是否过期（30 分钟）
    const orderCreatedTime = new Date(orderData.created_at).getTime();
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;

    if (now - orderCreatedTime > thirtyMinutes) {
      console.log('⚠️ 订单已过期（超过 30 分钟）');

      // 删除过期订单
      await supabaseAdmin
        .from('orders')
        .delete()
        .eq('order_id', orderId);

      return NextResponse.json({
        success: false,
        message: '订单已过期（超过 30 分钟），请重新下单',
      }, { status: 400 });
    }

    // 7. 调用 Slip Verify API 验证凭证
    console.log('4. 开始验证付款凭证...');
    const slipVerifyResult = await verifySlip(slipImage);

    if (!slipVerifyResult.success || !slipVerifyResult.data) {
      console.log('❌ 付款凭证验证失败:', slipVerifyResult.error);
      return NextResponse.json({
        success: false,
        message: slipVerifyResult.error || '付款凭证验证失败',
      }, { status: 400 });
    }

    console.log('5. 凭证验证成功，数据:', slipVerifyResult.data);

    // 8. 验证凭证数据是否匹配订单
    const merchantPromptPayId = orderData.merchants.promptpay_id;
    const validation = validateSlipData(
      slipVerifyResult.data,
      orderData.purchase_price,
      merchantPromptPayId,
      orderData.created_at
    );

    if (!validation.valid) {
      console.log('❌ 凭证数据验证失败:', validation.reason);
      return NextResponse.json({
        success: false,
        message: validation.reason || '付款信息不匹配',
      }, { status: 400 });
    }

    console.log('✅ 凭证数据验证通过');

    // 9. 更新订单状态为 paid
    console.log('6. 更新订单状态为 paid...');
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
      })
      .eq('order_id', orderId);

    if (updateError) {
      console.error('❌ 更新订单状态错误:', updateError);
      return NextResponse.json({
        success: false,
        message: '更新订单状态失败',
      }, { status: 500 });
    }

    console.log('✅ 订单状态已更新为 paid');
    console.log('=== Verify Payment API 完成 ===\n');

    return NextResponse.json({
      success: true,
      message: '付款验证成功',
      data: {
        orderId: orderId,
        amount: slipVerifyResult.data.amount,
        transactionId: slipVerifyResult.data.transactionId,
      },
    });

  } catch (error) {
    console.error('❌ Verify Payment API 错误:', error);
    return NextResponse.json({
      success: false,
      message: '服务器内部错误',
    }, { status: 500 });
  }
}
