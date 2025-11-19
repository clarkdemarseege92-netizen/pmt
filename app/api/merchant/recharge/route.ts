// 文件: /app/api/merchant/recharge/route.ts

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { generatePromptPayPayload } from '@/lib/promptpay'; 
import { v4 as uuidv4 } from 'uuid'; 
// FIX 1: 移除未使用的 PostgrestError 导入

const PLATFORM_PROMPTPAY_ID = process.env.PLATFORM_PROMPTPAY_ID;

// 【新增类型】: 定义 merchant_transactions 表的插入结构，消除 'any'
interface MerchantTransactionInsert {
    merchant_id: string;
    type: 'top_up' | 'commission' | 'withdraw' | 'bonus';
    amount: number;
    status: 'pending' | 'completed' | 'failed'; 
    related_order_id: string;
    description: string;
    // id, balance_after, created_at 由数据库自动管理/触发器计算
}

// 请求体：仅接收充值金额
interface RechargeRequestBody {
    amount: number;
}

export async function POST(request: Request) {
    const { amount }: RechargeRequestBody = await request.json();

    if (!amount || amount <= 0) {
        return NextResponse.json({ success: false, message: '充值金额无效' }, { status: 400 });
    }
    
    if (!PLATFORM_PROMPTPAY_ID) {
        return NextResponse.json({ success: false, message: '平台收款ID未配置' }, { status: 500 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ success: false, message: '请先登录' }, { status: 401 });
    }

    try {
        // 1. 通过 user.id 查找 merchant_id
        const { data: merchantData, error: merchantError } = await supabase
            .from('merchants')
            .select('merchant_id')
            .eq('owner_id', user.id)
            .single();
            
        if (merchantError || !merchantData) {
            console.error('Merchant ID Fetch Error:', merchantError);
            return NextResponse.json({ success: false, message: '无法找到关联的商户ID。' }, { status: 403 });
        }
        
        const merchantId = merchantData.merchant_id;
        const topUpId = uuidv4(); 

        // 2. 构造插入数据结构
        const transactionData: MerchantTransactionInsert = {
            merchant_id: merchantId, 
            type: 'top_up', 
            amount: amount,
            status: 'pending', // 初始状态为 pending，等待支付验证
            related_order_id: topUpId, 
            description: `充值请求 (Ref: ${topUpId.slice(0, 8)})`,
        };

        // 3. 【核心修复】插入充值记录到 merchant_transactions 表
        // 不再需要 'as any'
        const { error: transactionError } = await supabase
            .from('merchant_transactions') 
            .insert(transactionData); 

        if (transactionError) {
            console.error('Transaction Creation Error:', transactionError);
            return NextResponse.json({ success: false, message: '充值订单创建失败' }, { status: 500 });
        }

        // 4. 生成 PromptPay 二维码 Payload (使用平台ID收款)
        const promptpayPayload = generatePromptPayPayload(PLATFORM_PROMPTPAY_ID, amount);

        // 5. 返回 Payload 和交易ID给客户端
        return NextResponse.json({
            success: true,
            transactionId: topUpId, 
            paymentMethod: 'PromptPay',
            promptpayPayload: promptpayPayload,
            paymentAmount: amount,
        }, { status: 200 });

    } catch (e) {
        console.error('Recharge API Error:', e);
        return NextResponse.json({ success: false, message: '内部服务器错误' }, { status: 500 });
    }
}