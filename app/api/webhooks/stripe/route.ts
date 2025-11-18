// 文件: /app/api/webhooks/stripe/route.ts (已更新支持充值)
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiVersion: "2025-10-29.clover" as any,
});
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = (await headers()).get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: unknown) {
    let message = "Unknown webhook error";
    if (err instanceof Error) message = err.message;
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // --- 仅处理支付成功事件 ---
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (!metadata) return NextResponse.json({ error: "Missing metadata" }, { status: 400 });

    // --- 核心分流逻辑 ---
    
    // 场景 A: 充值事件 (Top Up)
    if (metadata.type === 'TOPUP' && metadata.topUpAmount && metadata.merchantId) {
        
        const topUpAmount = parseFloat(metadata.topUpAmount);

        // 调用我们稍后要创建的 RPC 函数来增加余额和记录流水
        await supabase.rpc("add_top_up_balance", { 
            p_merchant_id: metadata.merchantId,
            p_amount: topUpAmount
        });
        
        console.log(`WEBHOOK: 充值成功处理 - 商户: ${metadata.merchantId}, 金额: ฿${topUpAmount}`);
        return NextResponse.json({ received: true, type: 'TOPUP' });
    }

    // 场景 B: 优惠券购买事件 (Commission) - 沿用旧逻辑
    if (metadata.couponId && metadata.merchantId) {
      
      const redemptionCode = `PMT-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
      const amountTotal = session.amount_total ? session.amount_total / 100 : 0;

      // 1. 创建订单
      const { data: order, error } = await supabase.from("orders").insert({
        customer_id: metadata.userId,
        coupon_id: metadata.couponId,
        merchant_id: metadata.merchantId,
        purchase_price: amountTotal,
        status: "paid",
        redemption_code: redemptionCode,
        payment_intent_id: session.payment_intent as string,
      }).select('order_id').single();

      if (error) throw error; 

      // 2. 减少库存 and 扣除佣金 (process_order_commission RPC handles both)
      await supabase.rpc("decrement_stock", { row_id: metadata.couponId });
      await supabase.rpc("process_order_commission", { 
        p_merchant_id: metadata.merchantId,
        p_order_id: order.order_id,
        p_order_amount: amountTotal
      });
      
      return NextResponse.json({ received: true, type: 'COMMISSION' });
    }
  }

  return NextResponse.json({ received: true, error: 'Event not handled' });
}