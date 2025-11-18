// 文件: /app/api/topup-checkout/route.ts
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// --- 配置 ---
const MOCK_MODE = true; // 保持 Mock 模式，便于测试

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock", {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiVersion: "2025-10-29.clover" as any, 
});

export async function POST(request: Request) {
  try {
    const { merchantId, amount } = await request.json();
    const parsedAmount = Math.max(500, parseInt(amount)); // 最低充值 500
    
    // 1. 验证用户登录 (确认是商家本人操作)
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== (await supabase.from('merchants').select('owner_id').eq('merchant_id', merchantId).single()).data?.owner_id) {
      return NextResponse.json({ error: "权限不足或用户不匹配" }, { status: 403 });
    }

    // --- 分支 A: 模拟模式 (直接跳过支付) ---
    if (MOCK_MODE) {
      console.log(`>>> 模拟充值成功: ฿${parsedAmount}`);
      // 直接调用 Webhook 逻辑来处理余额增加和流水记录
      // 注意：这里需要 Webhook 的原子操作逻辑。

      // 为了简化，我们直接在 API 路由中处理，跳过 Webhook 模拟
      await supabase.rpc('add_top_up_balance', { // 我们稍后需要创建这个 RPC 函数
        p_merchant_id: merchantId,
        p_amount: parsedAmount
      });
      
      // 直接返回成功页面 URL
      return NextResponse.json({ url: `${request.headers.get("origin")}/merchant/wallet?success=true` });
    }

    // --- 分支 B: 真实 Stripe 模式 (收款到平台账户) ---
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "thb",
            product_data: {
              name: "PMT 平台服务充值",
              description: `充值金额: ฿${parsedAmount}`,
            },
            unit_amount: parsedAmount * 100, // Stripe 单位是分
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${request.headers.get("origin")}/merchant/wallet?success=true`,
      cancel_url: `${request.headers.get("origin")}/merchant/wallet?canceled=true`,
      metadata: {
        merchantId: merchantId,
        topUpAmount: parsedAmount.toString(), // 传递金额用于 Webhook 确认
        type: 'TOPUP' // 【关键】标识为充值事件
      },
      // ⚠️ 注意: 这里没有 transfer_data，因为钱是收给平台的，不是转给商户的。
    });

    return NextResponse.json({ url: session.url });

  } catch (err: unknown) {
    console.error("TopUp API Error:", err);
    let message = "Unknown error";
    if (err instanceof Error) message = err.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 注意: 还需要在数据库中创建 add_top_up_balance RPC (见下一步)