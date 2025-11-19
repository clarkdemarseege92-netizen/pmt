// 文件: /app/api/merchant/verify-recharge/route.ts

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { PostgrestError } from '@supabase/supabase-js'; 

const SLIP2GO_BASE_URL = process.env.SLIP2GO_BASE_URL;
const SLIP2GO_SECRET = process.env.SLIP2GO_SECRET;
const PLATFORM_PROMPTPAY_ID = process.env.PLATFORM_PROMPTPAY_ID;

// 假设的交易记录类型
type TransactionData = {
    transaction_id: string;
    user_id: string;
    amount: number;
    status: string;
    type: string;
    // 假设 profiles 表有一个 balance 字段
    profiles: { balance: number } | null;
}

export async function POST(request: Request) {
    const formData = await request.formData();
    const transactionId = formData.get('transactionId') as string;
    const file = formData.get('file') as File; 
    
    // 验证配置
    if (!SLIP2GO_SECRET || !PLATFORM_PROMPTPAY_ID) {
         return NextResponse.json({ success: false, message: '验证服务未配置。' }, { status: 500 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ success: false, message: '请先登录' }, { status: 401 });
    }

    try {
        // 1. 获取交易信息
        const { data: transactionData, error: fetchError } = await supabase
            .from('transactions') // <-- 假设的交易记录表
            .select(`*, profiles (balance)`) // <-- 假设联查用户余额
            .eq('transaction_id', transactionId)
            .eq('user_id', user.id) // 确保是该商户的充值请求
            .single() as { data: TransactionData | null, error: PostgrestError | null }; 

        if (fetchError || !transactionData) {
            return NextResponse.json({ success: false, message: '充值订单不存在。' }, { status: 404 });
        }
        if (transactionData.status !== 'pending') {
            return NextResponse.json({ success: false, message: `交易状态错误：已是 ${transactionData.status}。` }, { status: 400 });
        }
        
        const rechargeAmount = transactionData.amount;
        const currentBalance = transactionData.profiles?.balance || 0;

        // 2. 构造转发到 Slip2Go 的 FormData (确保收款方是平台)
        const slip2GoFormData = new FormData();
        const checkPayload = {
            "checkDuplicate": true, 
            "checkAmount": {
                "type": "eq", 
                "amount": rechargeAmount.toFixed(2), 
            },
            "checkReceiver": [ 
                {
                    "accountNumber": PLATFORM_PROMPTPAY_ID, // <-- 验证收款方是平台 ID
                }
            ],
        };

        slip2GoFormData.append('file', file); 
        slip2GoFormData.append('payload', JSON.stringify(checkPayload)); 
        
        // 3. 调用 Slip2Go API
        const slip2GoResponse = await fetch(`${SLIP2GO_BASE_URL}/verify-slip/qr-image/info`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SLIP2GO_SECRET}`, 
            },
            body: slip2GoFormData,
        });

        const slip2GoResult = await slip2GoResponse.json();

        // 4. 核心验证和余额更新
        if (slip2GoResult.code === '200200') {
            
            // 4.1 更新交易状态
            await supabase
                .from('transactions')
                .update({ status: 'completed' })
                .eq('transaction_id', transactionId);

            // 4.2 更新商户余额
            const { error: balanceError } = await supabase
                .from('profiles') // <-- 假设的 profiles 表
                .update({ balance: currentBalance + rechargeAmount })
                .eq('id', user.id);

            if (balanceError) {
                console.error('Balance Update Error:', balanceError);
                return NextResponse.json({ success: false, message: '余额更新失败，但凭证已验证。请联系客服。' }, { status: 500 });
            }

            return NextResponse.json({ success: true, message: '充值成功！余额已更新。' }, { status: 200 });

        } else {
            // 验证失败
            const errorMessage = slip2GoResult.message || '凭证验证失败，请核对信息。';
            return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
        }

    } catch (e) {
        console.error('Verify Recharge API Error:', e);
        return NextResponse.json({ success: false, message: '内部服务器错误。' }, { status: 500 });
    }
}