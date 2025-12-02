// 文件: /lib/promptpay.ts

/**
 * PromptPay EMVCo Payload 生成工具
 * 用于根据商户ID和金额，生成符合泰国 PromptPay 标准的二维码字符串。
 */

// 预定义常量
const PROMPTPAY_AID = 'A000000677010111'; // PromptPay 专用应用标识符
const CURRENCY_CODE = '764'; // THB (Thai Baht)
const COUNTRY_CODE = 'TH'; // Thailand

/**
 * 计算 EMVCo Payload 的 CRC16/CCITT-FALSE 校验码。
 * 这是生成 PromptPay QR Code 必须的步骤。
 * @param dataString 要校验的字符串
 * @returns 4位十六进制 CRC 校验码字符串
 */
function calculateCrc16(dataString: string): string {
    let crc = 0xFFFF; // 初始值
    const polynomial = 0x1021; // 多项式

    for (let i = 0; i < dataString.length; i++) {
        crc ^= (dataString.charCodeAt(i) << 8);
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = (crc << 1) ^ polynomial;
            } else {
                crc <<= 1;
            }
        }
    }
    // 确保结果是 4位十六进制，并补齐前导零
    return ('0000' + (crc & 0xFFFF).toString(16).toUpperCase()).slice(-4);
}

/**
 * 格式化 TLV (Tag-Length-Value) 结构中的 Length。
 * @param value 字符串值
 * @returns 2位长度字符串 (例如 '05' 或 '12')
 */
function formatLength(value: string): string {
    return ('00' + value.length).slice(-2);
}

/**
 * 根据 PromptPay ID 和金额生成 EMVCo Payload 字符串。
 * @param promptpayId 商户/平台设置的 PromptPay ID (手机号或证件号)
 * @param amount 订单金额 (必须 > 0)
 * @returns EMVCo Payload 字符串
 */
export function generatePromptPayPayload(promptpayId: string, amount: number): string {
    if (amount <= 0) {
        throw new Error("金额必须大于零。");
    }

    // 1. 预处理 PromptPay ID (Target ID)
    // 参考: dtinth/promptpay-qr 官方实现
    let targetId: string;
    let idType: string;

    // 清理输入：只保留数字
    const numbers = promptpayId.trim().replace(/[^0-9]/g, '');

    // 判断ID类型 (基于长度)
    if (numbers.length >= 13) {
        // 13位或更多：证件号/税号 (National ID/Tax ID)
        targetId = numbers;
        idType = '02'; // 证件号
    } else {
        // 少于13位：手机号
        // 标准格式转换 (参考 dtinth/promptpay-qr):
        // 1. 去掉前导0 (0812345678 → 812345678)
        // 2. 如果不是66开头，加上66 (812345678 → 66812345678)
        // 3. 补齐到13位 (66812345678 → 0066812345678)

        let phoneNumber = numbers.replace(/^0+/, ''); // 去掉所有前导0

        // 如果不是66开头，加66
        if (!phoneNumber.startsWith('66')) {
            phoneNumber = '66' + phoneNumber;
        }

        // 补齐到13位
        targetId = ('0000000000000' + phoneNumber).slice(-13);
        idType = '01'; // 手机号

        console.log(`🔧 手机号格式转换: ${promptpayId} → ${numbers} → ${targetId}`);
    }

    // PromptPay ID 块 (Tag 29)
    // Sub ID 00: PromptPay AID (固定)
    const sub00 = '00' + formatLength(PROMPTPAY_AID) + PROMPTPAY_AID;
    // Sub ID 01/02/03: Target ID (sub-tag 编号本身表示ID类型)
    // idType '01' = 手机号, '02' = 证件号, '03' = eWallet
    const subId = idType + formatLength(targetId) + targetId;
    // 合并 Tag 29
    const tag29Content = sub00 + subId;
    const tag29 = '29' + formatLength(tag29Content) + tag29Content;

    // 2. 格式化金额 (必须是 'X.XX' 格式)
    const formattedAmount = amount.toFixed(2);

    // 3. 构建核心字符串 (不含 CRC)
    // 字段顺序参考 dtinth/promptpay-qr: 00, 01, 29, 58, 53, 54, 63
    let payload = '';
    // Tag 00 - Payload Format Indicator: 01
    payload += '00' + formatLength('01') + '01';
    // Tag 01 - Point of Initiation Method: 12 (Dynamic QR - one-time use)
    payload += '01' + formatLength('12') + '12';
    // Tag 29 - Merchant Account Information
    payload += tag29;
    // Tag 58 - Country Code (TH) - 必须在 Tag 53 之前！
    payload += '58' + formatLength(COUNTRY_CODE) + COUNTRY_CODE;
    // Tag 53 - Transaction Currency (THB = 764)
    payload += '53' + formatLength(CURRENCY_CODE) + CURRENCY_CODE;
    // Tag 54 - Transaction Amount
    payload += '54' + formatLength(formattedAmount) + formattedAmount;
    // Tag 63 - CRC Checksum (Placeholder)
    payload += '6304'; 

    // 4. 计算 CRC 校验码
    const crc = calculateCrc16(payload);

    // 5. 返回最终 Payload
    // payload 的最后4个字符是 '6304' (CRC placeholder)
    // 我们需要替换为完整的 '6304' + CRC 值
    const finalPayload = payload + crc;

    // 【调试日志】
    console.log('🔵 PromptPay QR 生成成功:', {
        originalId: promptpayId,
        numbersOnly: numbers,
        targetId,
        idType: idType === '01' ? '手机号' : '证件号',
        amount: formattedAmount,
        payloadLength: finalPayload.length,
        payload: finalPayload.substring(0, 50) + '...',
        crc
    });

    return finalPayload;
}