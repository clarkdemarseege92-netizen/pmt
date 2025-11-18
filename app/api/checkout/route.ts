// 文件: /app/api/checkout/route.ts
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// --- 配置 ---
const MOCK_MODE = true; 

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock", {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiVersion: "2025-10-29.clover" as any, 
});

export async function POST(request: Request) {
  try {
    const { couponId } = await request.json();
    const supabase = await createSupabaseServerClient();
    
    // 1. 验证用户登录 (C端客户)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    // 2. 获取优惠券详情 + 商户风控信息
    const { data: coupon } = await supabase
      .from("coupons")
      .select(`
        *, 
        merchants ( 
          merchant_id, 
          status, 
          platform_balance, 
          is_suspended,
          shop_name
        )
      `) 
      .eq("coupon_id", couponId)
      .single();

    if (!coupon) {
      return NextResponse.json({ error: "优惠券不存在" }, { status: 404 });
    }

    if (coupon.stock_quantity <= 0) {
      return NextResponse.json({ error: "库存不足" }, { status: 400 });
    }

    // 3. 【核心风控与 KYC 检查】
    // 类型断言：明确 merchant 的结构
    const merchant = coupon.merchants as unknown as { 
      merchant_id: string, 
      status: string,
      platform_balance: number, 
      is_suspended: boolean,
      shop_name: string
    };

    // --- 检查 A: KYC / 入驻审核状态 (新增) ---
    // 只有状态为 'approved' 的商户才能交易
    if (merchant.status !== 'approved') {
      console.warn(`拦截未认证商户交易: ${merchant.shop_name} (${merchant.merchant_id})`);
      return NextResponse.json({ 
        error: "该商户尚未通过平台资质审核 (KYC)，暂时无法交易。请联系商户或平台客服。" 
      }, { status: 403 });
    }

    // --- 检查 B: 是否被因违规暂停 ---
    if (merchant.is_suspended) {
      return NextResponse.json({ error: "该商户服务暂停，无法购买" }, { status: 403 });
    }

    // --- 检查 C: 平台余额风控 ( < 500 THB ) ---
    // 余额不足 500 时，不仅拦截交易，还触发熔断
    if (merchant.platform_balance < 500) {
      // 触发熔断：标记为 suspended
      await supabase
        .from('merchants')
        .update({ is_suspended: true })
        .eq('merchant_id', merchant.merchant_id);
      
      return NextResponse.json({ error: "商户账户异常 (余额不足)，交易暂时无法进行" }, { status: 403 });
    }


    // --- 分支 A: 模拟模式 (开发用) ---
    if (MOCK_MODE) {
      console.log(">>> 进入模拟支付模式");
      
      const redemptionCode = generateRedemptionCode();
      
      // 插入订单
      const { data: order, error: orderError } = await supabase.from("orders").insert({
        customer_id: user.id,
        coupon_id: coupon.coupon_id,
        merchant_id: coupon.merchant_id,
        purchase_price: coupon.selling_price,
        status: "paid",
        redemption_code: redemptionCode,
        created_at: new Date().toISOString(),
      }).select('order_id').single();

      if (orderError) throw orderError;

      // 执行后续逻辑 (模拟 Webhook 的工作)
      // 1. 减库存
      await supabase.rpc("decrement_stock", { row_id: coupon.coupon_id });
      
      // 2. 扣除佣金 & 记录流水 (这是我们之前写的 RPC 函数)
      await supabase.rpc("process_order_commission", { 
        p_merchant_id: coupon.merchant_id,
        p_order_id: order.order_id,
        p_order_amount: coupon.selling_price
      });

      return NextResponse.json({ url: `${request.headers.get("origin")}/client/orders?success=true` });
    }

    // --- 分支 B: 真实 Stripe 模式 ---
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "thb",
            product_data: {
              name: coupon.name?.th || "Coupon",
              images: coupon.image_urls?.[0] ? [coupon.image_urls[0]] : [],
            },
            unit_amount: Math.round(coupon.selling_price * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${request.headers.get("origin")}/client/orders?success=true`,
      cancel_url: `${request.headers.get("origin")}/coupon/${couponId}?canceled=true`,
      metadata: {
        userId: user.id,
        couponId: coupon.coupon_id,
        merchantId: coupon.merchant_id,
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (err: unknown) {
    console.error("Checkout API Error:", err);
    let message = "Unknown error";
    if (err instanceof Error) message = err.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 辅助函数：生成核销码
function generateRedemptionCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PMT-${code.slice(0, 4)}-${code.slice(4, 8)}`;
}
