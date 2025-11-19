// 文件: /app/api/verify-payment/route.ts

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import 'server-only'; 
// 引入 PostgrestError 类型以替代 'any'
import { PostgrestError } from '@supabase/supabase-js'; 

// Slip2Go API 配置 (请替换为您注册后获得的值)
const SLIP2GO_BASE_URL = process.env.SLIP2GO_BASE_URL || 'https://connect.slip2go.com/api'; 
const SLIP2GO_SECRET = process.env.SLIP2GO_SECRET || 'Kp9Uxi2k2uigrXcuL+UQthK65VoHIJr7o08zCIaPVBU='; // 必须来自 .env

// 订单和商户信息的类型
type OrderData = {
    order_id: string;
    status: string;
    purchase_price: number;
    redemption_code: string;
    merchants: { promptpay_id: string } | null;
}

export async function POST(request: Request) {
    // 1. 从 Next.js Request 中解析 FormData
    const formData = await request.formData();
    const orderId = formData.get('orderId') as string;
    const file = formData.get('file') as File; 
    
    if (!orderId || !file) {
        return NextResponse.json({ success: false, message: '缺少订单ID或支付凭证文件。' }, { status: 400 });
    }
    
    // 检查 API Secret 是否设置
    if (SLIP2GO_SECRET === 'YOUR_SLIP2GO_API_SECRET_HERE' || !SLIP2GO_SECRET) {
         console.error('SLIP2GO_SECRET is not set in environment variables.');
         return NextResponse.json({ success: false, message: '支付验证服务未配置。' }, { status: 500 });
    }

    // FIX 1: 必须使用 await 获取 Supabase 客户端对象
    const supabase = await createSupabaseServerClient();
    
    // FIX 2: 必须在客户端调用 auth.getUser() 前使用 await
    const { data: { user } } = await supabase.auth.getUser(); 

    if (!user) {
        return NextResponse.json({ success: false, message: '请先登录' }, { status: 401 });
    }

    try {
        // 2. 获取订单和商户信息 (现在 supabase 已经正确 await)
        const { data: orderData, error: fetchError } = await supabase
            .from('orders')
            .select(`
                *,
                merchants (promptpay_id)
            `)
            .eq('order_id', orderId)
            .eq('customer_id', user.id) 
            // FIX 3: 使用 PostgrestError 替代 'any'
            .single() as { data: OrderData | null, error: PostgrestError | null }; 

        if (fetchError || !orderData) {
            return NextResponse.json({ success: false, message: '订单不存在或不属于您。' }, { status: 404 });
        }

        if (orderData.status !== 'pending') {
            return NextResponse.json({ success: false, message: `订单状态错误：已是 ${orderData.status}。` }, { status: 400 });
        }

        const merchantPromptPayId = orderData.merchants?.promptpay_id;
        const purchasePrice = orderData.purchase_price;

        if (!merchantPromptPayId) {
            return NextResponse.json({ success: false, message: '商户 PromptPay ID 缺失，请联系客服。' }, { status: 500 });
        }
        
        // --- 3. 构造转发到 Slip2Go 的 FormData ---
        const slip2GoFormData = new FormData();
        
        // 3.1 构造条件 Payload JSON
        const checkPayload = {
            "checkDuplicate": true, 
            "checkAmount": {
                "type": "eq", 
                "amount": purchasePrice.toFixed(2), // 使用精确的字符串金额
            },
            "checkReceiver": [ 
                {
                    "accountNumber": merchantPromptPayId, 
                }
            ],
        };

        // 3.2 附加文件和 JSON Payload
        slip2GoFormData.append('file', file); 
        // 将 JSON 条件附加为名为 'payload' 的字符串字段
        slip2GoFormData.append('payload', JSON.stringify(checkPayload)); 
        
        // --- 4. 调用 Slip2Go API ---
        
        const slip2GoResponse = await fetch(`${SLIP2GO_BASE_URL}/verify-slip/qr-image/info`, {
            method: 'POST',
            // 重要：不要设置 Content-Type，让 fetch API 和 FormData 自动设置 multipart/form-data
            headers: {
                'Authorization': `Bearer ${SLIP2GO_SECRET}`, 
            },
            body: slip2GoFormData, // 发送构造好的 FormData
        });

        const slip2GoResult = await slip2GoResponse.json();

        // 5. 核心验证逻辑
        if (slip2GoResult.code === '200200') {
            // Code 200200: Slip is Valid (所有条件都匹配)

            // 6. 更新订单状态 (现在 supabase 已经正确 await)
            const { error: updateError } = await supabase
                .from('orders')
                .update({ status: 'paid' })
                .eq('order_id', orderId);

            if (updateError) {
                console.error('Update Error:', updateError);
                return NextResponse.json({ success: false, message: '订单激活失败。' }, { status: 500 });
            }

            // 7. 成功返回核销码
            return NextResponse.json({
                success: true,
                message: '支付验证成功！',
                redemptionCode: orderData.redemption_code,
            }, { status: 200 });

        } else {
            // 验证失败：处理各种错误码
            let errorMessage = slip2GoResult.message || '凭证验证失败，请重试。';
            
            // 细化错误信息 (根据文档)
            if (slip2GoResult.code === '200402') errorMessage = '支付金额不匹配，请核对。';
            if (slip2GoResult.code === '200501') errorMessage = '该凭证已被用于其他订单（重复使用）。';
            if (slip2GoResult.code === '200401') errorMessage = '收款方信息不正确，请确保您扫描了正确的二维码。';
            if (slip2GoResult.code === '401005') errorMessage = '平台配额不足，请联系客服。';

            return NextResponse.json({ success: false, message: errorMessage, code: slip2GoResult.code }, { status: 400 });
        }

    } catch (e) {
        console.error('Verify Payment API Error:', e);
        return NextResponse.json({ success: false, message: '内部服务器错误。' }, { status: 500 });
    }
}