// app/api/checkout/route.ts
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { generatePromptPayPayload } from '@/lib/promptpay';
import { v4 as uuidv4 } from 'uuid';

// 定义类型
interface OrderItem {
  coupon_id?: string;
  product_id?: string;
  quantity: number;
}

interface Merchant {
  merchant_id: string;
  shop_name: string;
  status: string;
  is_suspended: boolean;
  promptpay_id: string | null;
}

interface CouponWithMerchant {
  coupon_id: string;
  selling_price: number;
  stock_quantity: number;
  merchant_id: string;
  merchants: Merchant;
}

interface ProductWithMerchant {
  product_id: string;
  original_price: number;
  merchant_id: string;
  merchants: Merchant;
}

interface OrderData {
  order_id: string;
  customer_id: string;
  coupon_id: string;
  merchant_id: string;
  purchase_price: number;
  status: string;
  redemption_code: string;
  quantity?: number;
  payment_method?: string;
}

export async function POST(request: Request) {
  try {
    const { couponId, productIds, quantity } = await request.json();
    console.log('Checkout API 收到请求:', { couponId, productIds, quantity });

    // 1. 参数校验 - 支持两种模式
    if ((!couponId && (!productIds || !Array.isArray(productIds))) || !quantity || quantity <= 0) {
      return NextResponse.json({ 
        success: false, 
        message: '参数错误：无效的商品或数量' 
      }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: '请先登录后再购买' 
      }, { status: 401 });
    }

    let totalAmount = 0;
    let merchantId = '';
    let merchantPromptPayId = '';
    let orderItems: OrderItem[] = [];
    let targetCouponId = '';

    // 2. 单商品购买模式 (优惠券)
    if (couponId) {
      console.log('处理优惠券购买:', couponId);
      targetCouponId = couponId;
      
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select(`
          coupon_id,
          selling_price,
          stock_quantity,
          merchant_id,
          merchants!inner (
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
        console.error('优惠券查询错误:', couponError);
        return NextResponse.json({ 
          success: false, 
          message: '优惠券不存在或已下架' 
        }, { status: 404 });
      }

      const couponData = coupon as unknown as CouponWithMerchant;
      
      if (!couponData.merchants) {
        console.error('优惠券商户数据为空:', couponData);
        return NextResponse.json({ 
          success: false, 
          message: '商户数据异常' 
        }, { status: 500 });
      }

      const merchant = couponData.merchants;
      
      console.log('商户信息:', {
        merchant_id: merchant.merchant_id,
        promptpay_id: merchant.promptpay_id,
        is_suspended: merchant.is_suspended
      });

      if (merchant.is_suspended) {
        return NextResponse.json({ 
          success: false, 
          message: '该商户暂停营业，无法购买' 
        }, { status: 403 });
      }

      if (!merchant.promptpay_id) {
        console.error('商户收款ID为空:', merchant);
        return NextResponse.json({ 
          success: false, 
          message: '商户收款设置不完整，暂时无法购买。' 
        }, { status: 400 });
      }

      if (couponData.stock_quantity < quantity) {
        return NextResponse.json({ 
          success: false, 
          message: `库存不足，剩余 ${couponData.stock_quantity}` 
        }, { status: 400 });
      }

      totalAmount = couponData.selling_price * quantity;
      merchantId = merchant.merchant_id;
      merchantPromptPayId = merchant.promptpay_id;
      orderItems = [{ coupon_id: couponId, quantity }];

    } 
    // 3. 购物车模式 (商品) - 为商品创建虚拟优惠券
    else if (productIds && Array.isArray(productIds)) {
      console.log('处理购物车购买:', productIds);
      
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          product_id,
          original_price,
          merchant_id,
          merchants!inner (
            merchant_id,
            shop_name,
            status,
            is_suspended,
            promptpay_id
          )
        `)
        .in('product_id', productIds);

      if (productsError || !products || products.length === 0) {
        console.error('商品查询错误:', productsError);
        return NextResponse.json({ 
          success: false, 
          message: '商品不存在或已下架' 
        }, { status: 404 });
      }

      console.log('查询到的商品数据:', JSON.stringify(products, null, 2));

      const productsData = products as unknown as ProductWithMerchant[];

      const productsWithValidMerchants = productsData.filter(p => 
        p.merchants && p.merchants.merchant_id
      );

      if (productsWithValidMerchants.length === 0) {
        console.error('所有商品都没有商户数据:', productsData);
        return NextResponse.json({ 
          success: false, 
          message: '商品商户数据异常' 
        }, { status: 500 });
      }

      const uniqueMerchantIds = [...new Set(productsWithValidMerchants.map(p => {
        return p.merchants.merchant_id;
      }))];
      
      console.log('商户ID列表:', uniqueMerchantIds);

      if (uniqueMerchantIds.length > 1) {
        return NextResponse.json({ 
          success: false, 
          message: '不能同时购买不同商户的商品' 
        }, { status: 400 });
      }

      const merchant = productsWithValidMerchants[0].merchants;
      
      console.log('选择的商户信息:', {
        merchant_id: merchant.merchant_id,
        promptpay_id: merchant.promptpay_id,
        is_suspended: merchant.is_suspended
      });

      if (merchant.is_suspended) {
        return NextResponse.json({ 
          success: false, 
          message: '商户暂停营业，无法购买' 
        }, { status: 403 });
      }

      if (!merchant.promptpay_id) {
        console.error('商户收款ID为空:', merchant);
        return NextResponse.json({ 
          success: false, 
          message: '商户收款设置不完整，暂时无法购买。' 
        }, { status: 400 });
      }

      // 计算总金额
      for (const product of productsWithValidMerchants) {
        totalAmount += product.original_price * quantity;
      }

      merchantId = merchant.merchant_id;
      merchantPromptPayId = merchant.promptpay_id;
      
      // 为商品订单创建一个虚拟优惠券
      const virtualCouponId = uuidv4();
      targetCouponId = virtualCouponId;

      // 创建虚拟优惠券
      const { error: couponCreateError } = await supabase
        .from('coupons')
        .insert({
          coupon_id: virtualCouponId,
          merchant_id: merchantId,
          selling_price: totalAmount,
          original_value: totalAmount,
          stock_quantity: 999, // 设置足够大的库存
          name: { en: 'Product Order', th: 'คำสั่งซื้อสินค้า' },
          rules: { type: 'product_order' }
        });

      if (couponCreateError) {
        console.error('创建虚拟优惠券失败:', couponCreateError);
        return NextResponse.json({ 
          success: false, 
          message: '创建订单失败: ' + couponCreateError.message 
        }, { status: 500 });
      }

      orderItems = productsWithValidMerchants.map(p => ({ 
        product_id: p.product_id, 
        quantity 
      }));
    }

    console.log('订单信息:', { 
      totalAmount, 
      merchantId, 
      merchantPromptPayId, 
      orderItems,
      targetCouponId 
    });

    // 4. 创建订单
    const orderId = uuidv4();
    const redemptionCode = Math.random().toString(36).substring(2, 12).toUpperCase();

    // 构建订单数据
    const orderData: OrderData = {
      order_id: orderId,
      customer_id: user.id,
      coupon_id: targetCouponId,
      merchant_id: merchantId,
      purchase_price: totalAmount,
      status: 'pending',
      redemption_code: redemptionCode,
      quantity: quantity,
      payment_method: 'promptpay'
    };

    console.log('创建的订单数据:', orderData);

    const { error: orderError } = await supabase
      .from('orders')
      .insert(orderData);

    if (orderError) {
      console.error('创建订单错误:', orderError);
      return NextResponse.json({ 
        success: false, 
        message: '创建订单失败: ' + orderError.message 
      }, { status: 500 });
    }

    // 5. 创建订单项 (order_items)
    if (orderItems.length > 0) {
      try {
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(
            orderItems.map(item => ({
              order_id: orderId,
              ...item
            }))
          );

        if (itemsError) {
          console.warn('创建订单项失败:', itemsError);
        }
      } catch (itemsError) {
        console.warn('创建订单项异常:', itemsError);
      }
    }

    // 6. 生成支付二维码
    const promptpayPayload = generatePromptPayPayload(merchantPromptPayId, totalAmount);

    console.log('订单创建成功:', { orderId, totalAmount, promptpayPayload });

    return NextResponse.json({
      success: true,
      orderId: orderId,
      promptpayPayload: promptpayPayload,
      amount: totalAmount, 
      message: '订单创建成功'
    });

  } catch (error) {
    console.error('Checkout API 未预期错误:', error);
    return NextResponse.json({ 
      success: false, 
      message: '服务器内部错误' 
    }, { status: 500 });
  }
}