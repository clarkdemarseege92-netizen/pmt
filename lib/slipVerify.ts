// 文件: lib/slipVerify.ts
// Slip Verify API 集成 - 用于验证 PromptPay 付款凭证

export interface SlipVerifyResponse {
  success: boolean;
  data?: {
    amount: number;
    receiverAccount: string;
    receiverName?: string;
    transactionDateTime: string;
    transactionId: string;
    sender?: {
      account: string;
      name?: string;
    };
  };
  error?: string;
  message?: string;
}

/**
 * 验证付款凭证（通过 Slip Verify API）
 * @param base64Image - Base64 编码的付款凭证图片
 * @returns 验证结果
 */
export async function verifySlip(base64Image: string): Promise<SlipVerifyResponse> {
  // Slip OK API endpoint
  const apiUrl = 'https://api.slipok.com/api/line/apikey/14821';

  try {
    console.log('🔍 开始调用 Slip Verify API...');

    // 移除 base64 前缀（如果存在）
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    console.log('📤 发送请求到:', apiUrl);
    console.log('📤 Base64 长度:', cleanBase64.length);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: cleanBase64,
        log: true,
      }),
    });

    const result = await response.json();
    console.log('📥 Slip Verify API 响应状态:', response.status);
    console.log('📥 Slip Verify API 响应内容:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error('❌ Slip Verify API 返回错误:', response.status, response.statusText);
      console.error('❌ 错误详情:', result);
      return {
        success: false,
        error: result.message || `API 请求失败: ${response.status} ${response.statusText}`,
        message: result.message,
      };
    }

    // 检查 API 返回的数据结构
    if (result.success === false || !result.data) {
      return {
        success: false,
        error: result.message || '无法验证付款凭证',
        message: result.message,
      };
    }

    // 提取关键信息
    const slipData = result.data;

    return {
      success: true,
      data: {
        amount: parseFloat(slipData.amount || slipData.value || '0'),
        receiverAccount: slipData.receiver?.account || slipData.receiverAccount || '',
        receiverName: slipData.receiver?.name || slipData.receiverName,
        transactionDateTime: slipData.transDate || slipData.transactionDateTime || '',
        transactionId: slipData.transRef || slipData.transactionId || '',
        sender: {
          account: slipData.sender?.account || '',
          name: slipData.sender?.name || '',
        },
      },
    };

  } catch (error) {
    console.error('❌ Slip Verify API 调用异常:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 验证付款凭证是否匹配订单信息
 * @param slipData - Slip Verify 返回的数据
 * @param expectedAmount - 预期金额
 * @param expectedReceiver - 预期收款账号（PromptPay ID）
 * @param orderCreatedAt - 订单创建时间
 * @returns 是否匹配
 */
export function validateSlipData(
  slipData: SlipVerifyResponse['data'],
  expectedAmount: number,
  expectedReceiver: string,
  orderCreatedAt: string
): { valid: boolean; reason?: string } {
  if (!slipData) {
    return { valid: false, reason: '付款凭证数据为空' };
  }

  // 1. 验证金额（允许 ±0.01 的误差）
  const amountDiff = Math.abs(slipData.amount - expectedAmount);
  if (amountDiff > 0.01) {
    return {
      valid: false,
      reason: `金额不匹配：凭证显示 ฿${slipData.amount}，订单金额 ฿${expectedAmount}`,
    };
  }

  // 2. 验证收款账号
  const normalizedReceiver = expectedReceiver.replace(/\D/g, ''); // 只保留数字
  const normalizedSlipReceiver = slipData.receiverAccount.replace(/\D/g, '');

  if (!normalizedSlipReceiver.includes(normalizedReceiver) &&
      !normalizedReceiver.includes(normalizedSlipReceiver)) {
    return {
      valid: false,
      reason: `收款账号不匹配：凭证收款人 ${slipData.receiverAccount}，预期 ${expectedReceiver}`,
    };
  }

  // 3. 验证时间（付款时间必须在订单创建之后）
  const orderTime = new Date(orderCreatedAt).getTime();
  const transactionTime = new Date(slipData.transactionDateTime).getTime();

  if (transactionTime < orderTime - 5 * 60 * 1000) { // 允许 5 分钟误差
    return {
      valid: false,
      reason: '付款时间早于订单创建时间',
    };
  }

  // 4. 验证付款是否过期（超过 24 小时）
  const now = Date.now();
  if (now - transactionTime > 24 * 60 * 60 * 1000) {
    return {
      valid: false,
      reason: '付款凭证已过期（超过 24 小时）',
    };
  }

  return { valid: true };
}
