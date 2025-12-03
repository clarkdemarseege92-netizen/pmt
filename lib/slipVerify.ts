// 文件: lib/slipVerify.ts
// Slip2Go API 集成 - 用于验证 PromptPay 付款凭证

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
 * 验证付款凭证（通过 Slip2Go API）
 * @param base64Image - Base64 编码的付款凭证图片
 * @returns 验证结果
 */
export async function verifySlip(base64Image: string): Promise<SlipVerifyResponse> {
  const apiUrl = process.env.SLIP2GO_BASE_URL || 'https://connect.slip2go.com/api';
  const apiSecret = process.env.SLIP2GO_SECRET;

  if (!apiSecret) {
    console.error('❌ 缺少 SLIP2GO_SECRET 环境变量');
    return {
      success: false,
      error: 'Slip2Go API 配置错误',
    };
  }

  try {
    console.log('🔍 开始调用 Slip2Go API...');

    // 将 base64 转换为 Blob 和 File 对象
    const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    const byteString = Buffer.from(base64Data, 'base64');
    const blob = new Blob([byteString], { type: 'image/png' });
    const file = new File([blob], 'slip.png', { type: 'image/png' });

    // 构造 FormData（按照 Slip2Go API 要求）
    const formData = new FormData();
    formData.append('file', file);
    // 不添加 payload，只做基础验证（无条件检查）

    console.log('📤 发送请求到:', `${apiUrl}/verify-slip/qr-image/info`);

    const response = await fetch(`${apiUrl}/verify-slip/qr-image/info`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiSecret}`,
      },
      body: formData,
    });

    const result = await response.json();
    console.log('📥 Slip2Go API 响应状态:', response.status);
    console.log('📥 Slip2Go API 响应码:', result.code);
    console.log('📥 Slip2Go API 响应内容:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error('❌ Slip2Go API 返回错误:', response.status, response.statusText);
      console.error('❌ 错误详情:', result);
      return {
        success: false,
        error: result.message || `API 请求失败: ${response.status} ${response.statusText}`,
        message: result.message,
      };
    }

    // 检查 Slip2Go API 返回码
    // 200000 = Slip found, 200200 = Slip is Valid
    if (!result.data || (result.code !== '200000' && result.code !== '200200')) {
      return {
        success: false,
        error: result.message || '无法验证付款凭证',
        message: result.message,
      };
    }

    // 提取关键信息（按照 Slip2Go API 响应格式）
    const slipData = result.data;

    return {
      success: true,
      data: {
        amount: parseFloat(slipData.amount || '0'),
        receiverAccount: slipData.receiver?.account?.proxy?.account ||
                        slipData.receiver?.account?.bank?.account || '',
        receiverName: slipData.receiver?.account?.name || '',
        transactionDateTime: slipData.dateTime || '',
        transactionId: slipData.transRef || '',
        sender: {
          account: slipData.sender?.account?.bank?.account || '',
          name: slipData.sender?.account?.name || '',
        },
      },
    };

  } catch (error) {
    console.error('❌ Slip2Go API 调用异常:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 验证付款凭证是否匹配订单信息
 * @param slipData - Slip2Go 返回的数据
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

  // 2. 验证收款账号（处理国家代码）
  // 移除所有非数字字符
  const normalizedReceiver = expectedReceiver.replace(/\D/g, ''); // 例如: "66626369169" 或 "+66626369169" -> "66626369169"
  const normalizedSlipReceiver = slipData.receiverAccount.replace(/\D/g, ''); // 例如: "0626369169" -> "0626369169"

  // 处理泰国国家代码：66 开头的号码去掉 66，0 开头的号码去掉 0
  const cleanReceiver = normalizedReceiver.replace(/^66/, '').replace(/^0/, ''); // "66626369169" -> "626369169"
  const cleanSlipReceiver = normalizedSlipReceiver.replace(/^66/, '').replace(/^0/, ''); // "0626369169" -> "626369169"

  console.log('🔍 验证收款账号:', {
    expected: expectedReceiver,
    slip: slipData.receiverAccount,
    normalizedReceiver,
    normalizedSlipReceiver,
    cleanReceiver,
    cleanSlipReceiver,
  });

  // 比较去掉国家代码和前导 0 后的号码
  if (cleanReceiver !== cleanSlipReceiver) {
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
