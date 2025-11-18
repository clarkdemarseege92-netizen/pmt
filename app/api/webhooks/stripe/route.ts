// 文件: /app/api/webhooks/stripe/route.ts
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (metadata) {
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

      if (error) {
         console.error("Error creating order:", error);
         return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // 2. 减少库存
      await supabase.rpc("decrement_stock", { row_id: metadata.couponId });

      // 3. 【新增】扣除佣金 & 记录流水
      // 调用我们在 3.1 中创建的 SQL 函数
      if (order) {
        await supabase.rpc("process_order_commission", { 
          p_merchant_id: metadata.merchantId,
          p_order_id: order.order_id,
          p_order_amount: amountTotal
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}