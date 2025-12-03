// 文件: /app/api/checkout/route.ts
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';
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
  coupon_id: string | null;
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

    // 1. 参数校验
    if ((!couponId && (!productIds || !Array.isArray(productIds))) || !quantity || quantity <= 0) {
      return NextResponse.json({ 
        success: false, 
        message: '参数错误：无效的商品或数量' 
      }, { status: 400 });
    }

    // --- 步骤 A: 身份验证 (使用普通客户端) ---
    // 验证当前发起请求的用户身份
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: '请先登录后再购买' 
      }, { status: 401 });
    }

    // --- 步骤 B: 初始化 Admin 客户端 ---
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    // === 🔍 调试代码开始 (问题解决后可删除) ===
    console.log("--------------------------------------------------");
    console.log("🔍 环境变量调试:");
    console.log("1. NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✅ 已读取" : "❌ 未读取 (Undefined)");
    console.log("2. SUPABASE_SERVICE_ROLE_KEY:", serviceRoleKey ? "✅ 已读取 (长度: " + serviceRoleKey.length + ")" : "❌ 未读取 (Undefined)");
    console.log("--------------------------------------------------");
    // === 调试代码结束 ===
    // 【防御性检查】确保环境变量存在，否则给出清晰的错误
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('FATAL ERROR: 缺少 SUPABASE_SERVICE_ROLE_KEY 环境变量。无法初始化 Admin 客户端。');
      return NextResponse.json({ 
        success: false, 
        message: '服务器配置错误：支付服务暂不可用 (Missing Server Config)' 
      }, { status: 500 });
    }

    // 创建拥有超级权限的 Admin 客户端 (用于读取敏感的 promptpay_id)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    let totalAmount = 0;
    let merchantId = '';
    let merchantPromptPayId = '';
    let orderItems: OrderItem[] = [];
    let targetCouponId: string | null = null;

    // 2. 单商品购买模式 (优惠券)
    if (couponId) {
      console.log('处理优惠券购买:', couponId);
      targetCouponId = couponId;
      
      // 使用 Admin 客户端查询
      const { data: coupon, error: couponError } = await supabaseAdmin
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
      const merchant = couponData.merchants;
      
      // 检查 Admin 是否成功读取到了 promptpay_id
      console.log('商户信息 (Admin查询):', {
        merchant_id: merchant.merchant_id,
        has_promptpay: !!merchant.promptpay_id, 
        is_suspended: merchant.is_suspended
      });

      if (merchant.is_suspended) {
        return NextResponse.json({ success: false, message: '该商户暂停营业，无法购买' }, { status: 403 });
      }

      if (!merchant.promptpay_id) {
        console.error('商户收款ID为空 (即使使用了 Admin 权限):', merchant);
        return NextResponse.json({ 
          success: false, 
          message: '商户收款设置不完整，暂时无法购买。' 
        }, { status: 400 });
      }

      if (couponData.stock_quantity < quantity) {
        return NextResponse.json({ success: false, message: `库存不足` }, { status: 400 });
      }

      totalAmount = couponData.selling_price * quantity;
      merchantId = merchant.merchant_id;
      merchantPromptPayId = merchant.promptpay_id;
      orderItems = [{ coupon_id: couponId, quantity }];

    } 
    // 3. 购物车模式 (商品)
    else if (productIds && Array.isArray(productIds)) {
      console.log('处理购物车购买:', productIds);
      
      const { data: products, error: productsError } = await supabaseAdmin
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
        return NextResponse.json({ success: false, message: '商品不存在或已下架' }, { status: 404 });
      }

      const productsData = products as unknown as ProductWithMerchant[];
      const productsWithValidMerchants = productsData.filter(p => p.merchants && p.merchants.merchant_id);

      if (productsWithValidMerchants.length === 0) {
        return NextResponse.json({ success: false, message: '商品商户数据异常' }, { status: 500 });
      }

      const uniqueMerchantIds = [...new Set(productsWithValidMerchants.map(p => p.merchants.merchant_id))];
      if (uniqueMerchantIds.length > 1) {
        return NextResponse.json({ success: false, message: '不能同时购买不同商户的商品' }, { status: 400 });
      }

      const merchant = productsWithValidMerchants[0].merchants;

      if (merchant.is_suspended) {
        return NextResponse.json({ success: false, message: '商户暂停营业' }, { status: 403 });
      }

      if (!merchant.promptpay_id) {
        return NextResponse.json({ success: false, message: '商户收款设置不完整' }, { status: 400 });
      }

      for (const product of productsWithValidMerchants) {
        totalAmount += product.original_price * quantity;
      }

      merchantId = merchant.merchant_id;
      merchantPromptPayId = merchant.promptpay_id;
      

      targetCouponId = null;

      orderItems = productsWithValidMerchants.map(p => ({ 
        product_id: p.product_id, 
        quantity 
      }));
    }

    // --- 步骤 C: 创建订单 (使用 Admin 客户端写入) ---
    // 使用 Admin 客户端可以避免因 RLS 策略导致的写入失败
    const orderId = uuidv4();
    const redemptionCode = Math.random().toString(36).substring(2, 12).toUpperCase();

    const orderData: OrderData = {
      order_id: orderId,
      customer_id: user.id, // 明确指定 customer_id 为当前登录用户
      coupon_id: targetCouponId,
      merchant_id: merchantId,
      purchase_price: totalAmount,
      status: 'pending',
      redemption_code: redemptionCode,
      quantity: quantity,
      payment_method: 'promptpay'
    };

    const { error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(orderData);

    if (orderError) {
      console.error('创建订单错误:', orderError);
      return NextResponse.json({ 
        success: false, 
        message: '创建订单失败: ' + orderError.message 
      }, { status: 500 });
    }

    // 5. 创建订单项（仅用于商品购买，插入到 order_items 表）
    // 注意：优惠券购买不需要 order_items，因为 coupon_id 已存储在 orders 表中
    if (orderItems.length > 0) {
      // 过滤掉优惠券项（只保留有 product_id 的项）
      const productItems = orderItems.filter(item => item.product_id);

      if (productItems.length > 0) {
        const { error: orderItemsError } = await supabaseAdmin
          .from('order_items')
          .insert(productItems.map(item => ({ order_id: orderId, ...item })));

        if (orderItemsError) {
          console.error('创建订单项错误:', orderItemsError);
          // 注意：订单已创建，但订单项失败。实际项目中可能需要回滚订单
          return NextResponse.json({
            success: false,
            message: '创建订单项失败: ' + orderItemsError.message
          }, { status: 500 });
        }

        console.log(`✅ 成功创建 ${productItems.length} 个商品订单项`);
      } else {
        console.log('ℹ️ 优惠券订单，跳过 order_items 创建（coupon_id 已存储在 orders 表）');
      }
    }

    // 6. 生成支付二维码
    const promptpayPayload = generatePromptPayPayload(merchantPromptPayId, totalAmount);

    return NextResponse.json({
      success: true,
      orderId: orderId,
      promptpayPayload: promptpayPayload,
      amount: totalAmount, 
      message: '订单创建成功'
    });

  } catch (error: unknown) {
    console.error('Checkout API 未预期错误:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      success: false, 
      message: '服务器内部错误: ' + errorMessage
    }, { status: 500 });
  }
}