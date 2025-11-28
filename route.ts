import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { generatePromptPayPayload } from '@/lib/promptpay';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const { couponId, quantity } = await request.json();

    // 1. 基础参数校验
    if (!couponId || !quantity || quantity <= 0) {
      return NextResponse.json({ success: false, message: '参数错误：无效的优惠券或数量' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: '请先登录后再购买' }, { status: 401 });
    }

    // 2. 获取优惠券详情 (含商户信息)
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select(`
        coupon_id,
        selling_price,
        stock_quantity,
        merchants (
          merchant_id,
          shop_name,
          status,
          is_suspended,
          promptpay_id
        )
      `)
      .eq('coupon_id', couponId)
      .single();

    if (couponError || !coupon) {
      console.error('Coupon Fetch Error:', couponError);
      return NextResponse.json({ success: false, message: '优惠券不存在或已下架' }, { status: 404 });
    }

    // 处理 merchants 可能是数组的情况
    const merchantData = coupon.merchants;
    const merchant = Array.isArray(merchantData) ? merchantData[0] : merchantData;
    
    // 3. 业务规则检查
    if (!merchant) {
       return NextResponse.json({ success: false, message: '商户数据异常' }, { status: 500 });
    }
    
    if (merchant.is_suspended) {
        return NextResponse.json({ success: false, message: '该商户暂停营业，无法购买' }, { status: 403 });
    }

    if (!merchant.promptpay_id) {
        return NextResponse.json({ success: false, message: '商户未配置收款方式，无法购买' }, { status: 400 });
    }

    if (coupon.stock_quantity < quantity) {
        return NextResponse.json({ success: false, message: `库存不足，剩余 ${coupon.stock_quantity}` }, { status: 400 });
    }

    // 4. 准备订单数据
    const orderId = uuidv4();
    const totalAmount = coupon.selling_price * quantity;
    
    // 生成核销码 (您的数据库有默认值逻辑，但这里手动生成确保返回给前端)
    // 数据库定义: SUBSTRING(md5((random())::text) from 1 for 10)
    // 我们在代码里生成一个类似的随机码
    const redemptionCode = Math.random().toString(36).substring(2, 12).toUpperCase();

    // 5. 创建订单
    // 【核心修复】字段名必须与您的数据库完全一致
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        order_id: orderId,
        customer_id: user.id,      // 数据库字段是 customer_id (不是 user_id)
        merchant_id: merchant.merchant_id,
        coupon_id: coupon.coupon_id,
        // quantity: quantity,     // 注意：您的数据库没有 quantity 字段，这里暂不写入
        purchase_price: totalAmount, // 数据库字段是 purchase_price (不是 total_price)
        status: 'pending',
        // payment_method: 'promptpay', // 数据库没有这个字段，已移除
        redemption_code: redemptionCode,
      });

    if (orderError) {
      console.error('Create Order Error:', orderError);
      // 这里的错误信息会返回给前端，方便调试
      return NextResponse.json({ 
          success: false, 
          message: '创建订单失败: ' + orderError.message 
      }, { status: 500 });
    }

    // 6. 生成支付二维码 Payload
    const promptpayPayload = generatePromptPayPayload(merchant.promptpay_id, totalAmount);

    return NextResponse.json({
      success: true,
      orderId: orderId,
      promptpayPayload: promptpayPayload,
      amount: totalAmount, 
      message: '订单创建成功'
    });

  } catch (error) {
    console.error('Checkout API Unexpected Error:', error);
    return NextResponse.json({ success: false, message: '服务器内部错误' }, { status: 500 });
  }
}