// 文件: /lib/promptpay.ts

/**
 * PromptPay EMVCo Payload 生成工具
 * 用于根据商户ID和金额，生成符合泰国 PromptPay 标准的二维码字符串。
 */

// 预定义常量
const PROMPTPAY_AID = 'A000000677010111'; // PromptPay 专用应用标识符
const CURRENCY_CODE = '764'; // THB (Thai Baht)
const COUNTRY_CODE = 'TH'; // Thailand
const MCC = '0000'; // Merchant Category Code: 通用/未定义

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
    let targetId: string;
    let idType: string;

    // 假设手机号是 +66 开头，证件号是纯数字
    if (promptpayId.startsWith('+66')) {
        // 手机号，ID Type '01'。去除 +66，并用 '0' 替换第一个字符
        targetId = '0' + promptpayId.substring(3).replace(/\D/g, '');
        idType = '01'; // 手机号 (MSISDN)
    } else {
        // 证件号或企业ID，ID Type '02' 或 '03' (这里我们统一用 '02' 证件号 Citizen ID)
        targetId = promptpayId.replace(/\D/g, ''); // 只保留数字
        idType = '02'; // 证件号/税号 (National ID/Tax ID)
    }

    // PromptPay ID 块 (Tag 29)
    // Sub ID 00: PromptPay AID (固定)
    const sub00 = '00' + formatLength(PROMPTPAY_AID) + PROMPTPAY_AID;
    // Sub ID 01: ID Type + Target ID
    const sub01 = '01' + formatLength(idType + targetId) + idType + targetId;
    // 合并 Tag 29
    const tag29Content = sub00 + sub01;
    const tag29 = '29' + formatLength(tag29Content) + tag29Content;

    // 2. 格式化金额 (必须是 'X.XX' 格式)
    const formattedAmount = amount.toFixed(2);

    // 3. 构建核心字符串 (不含 CRC)
    let payload = '';
    // Tag 00 - Payload Format Indicator: 01
    payload += '00' + formatLength('01') + '01';
    // Tag 01 - Point of Initiation Method: 12 (Dynamic/金额特定)
    payload += '01' + formatLength('12') + '12';
    // Tag 29 - Merchant Account Information
    payload += tag29;
    // Tag 52 - MCC
    payload += '52' + formatLength(MCC) + MCC;
    // Tag 53 - Currency
    payload += '53' + formatLength(CURRENCY_CODE) + CURRENCY_CODE;
    // Tag 54 - Amount
    payload += '54' + formatLength(formattedAmount) + formattedAmount;
    // Tag 58 - Country Code
    payload += '58' + formatLength(COUNTRY_CODE) + COUNTRY_CODE;
    // Tag 63 - CRC Checksum (Placeholder)
    payload += '6304'; 

    // 4. 计算 CRC 校验码
    const crc = calculateCrc16(payload);

    // 5. 返回最终 Payload
    // 将 placeholder '6304' 替换为计算出的 CRC
    return payload.slice(0, -4) + crc;
}