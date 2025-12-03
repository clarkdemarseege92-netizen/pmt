// 文件: /app/api/confirm-payment/route.ts
// 用于测试环境：直接将订单状态从 pending 更新为 paid
// 生产环境应该要求用户上传支付凭证并通过 Slip2Go 验证

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({
        success: false,
        message: '缺少订单 ID'
      }, { status: 400 });
    }

    // 验证用户登录
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        success: false,
        message: '请先登录'
      }, { status: 401 });
    }

    // 验证订单属于当前用户
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('order_id, customer_id, status')
      .eq('order_id', orderId)
      .eq('customer_id', user.id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({
        success: false,
        message: '订单不存在或不属于您'
      }, { status: 404 });
    }

    if (order.status !== 'pending') {
      return NextResponse.json({
        success: false,
        message: `订单状态错误：当前为 ${order.status}`
      }, { status: 400 });
    }

    // 更新订单状态为 paid
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('order_id', orderId);

    if (updateError) {
      console.error('更新订单状态错误:', updateError);
      return NextResponse.json({
        success: false,
        message: '更新订单状态失败'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '订单已确认支付'
    });

  } catch (error) {
    console.error('Confirm Payment API 错误:', error);
    return NextResponse.json({
      success: false,
      message: '服务器内部错误'
    }, { status: 500 });
  }
}
