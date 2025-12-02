// PromptPay 测试工具
// 用于验证 PromptPay QR 生成是否正确

import { generatePromptPayPayload } from './promptpay';

console.log('=== PromptPay QR 生成测试 ===\n');

// 测试案例 1: 正确的泰国手机号 (10位)
try {
    console.log('测试 1: 标准泰国手机号 +66812345678');
    const payload1 = generatePromptPayPayload('+66812345678', 100.50);
    console.log('✅ 成功:', payload1.substring(0, 60) + '...\n');
} catch (err) {
    console.error('❌ 失败:', err instanceof Error ? err.message : err, '\n');
}

// 测试案例 2: 您的手机号 (9位，需要修复)
try {
    console.log('测试 2: 您的手机号 +66626369169');
    const payload2 = generatePromptPayPayload('+66626369169', 100.50);
    console.log('✅ 成功:', payload2.substring(0, 60) + '...\n');
} catch (err) {
    console.error('❌ 失败:', err instanceof Error ? err.message : err, '\n');
}

// 测试案例 3: 0开头的手机号
try {
    console.log('测试 3: 0开头手机号 0812345678');
    const payload3 = generatePromptPayPayload('0812345678', 100.50);
    console.log('✅ 成功:', payload3.substring(0, 60) + '...\n');
} catch (err) {
    console.error('❌ 失败:', err instanceof Error ? err.message : err, '\n');
}

// 测试案例 4: 身份证号 (13位)
try {
    console.log('测试 4: 泰国身份证号 1234567890123');
    const payload4 = generatePromptPayPayload('1234567890123', 100.50);
    console.log('✅ 成功:', payload4.substring(0, 60) + '...\n');
} catch (err) {
    console.error('❌ 失败:', err instanceof Error ? err.message : err, '\n');
}

console.log('=== 测试完成 ===');
