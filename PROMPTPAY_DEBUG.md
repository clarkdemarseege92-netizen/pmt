# PromptPay QR Code 调试指南

## 问题：手机银行扫码显示 "Your QR data is invalid"

## 可能的原因

### 1. ✅ 已排除：手机号格式
- 您的号码 `+66626369169` 转换为 `0626369169` (10位) ✓
- 格式符合泰国标准

### 2. 🔍 需要检查：Tag 01 值

EMVCo QR 规范中 Tag 01 (Point of Initiation Method) 的值：
- **`11`** - Static QR (固定金额或无金额，可重复使用)
- **`12`** - Dynamic QR (一次性，包含交易信息)

**当前代码使用**: `11` (Dynamic with amount)

**可能的问题**: 有些泰国银行 APP 可能要求：
- 带金额的二维码使用 `12`
- 或者完全不使用 Tag 01

### 3. 🔍 需要检查：EMVCo Payload 结构

标准 PromptPay QR 结构：
```
00 02 01                    # Tag 00: Payload Format = "01"
01 02 11/12                 # Tag 01: Point of Initiation Method
29 XX ...                   # Tag 29: Merchant Account (PromptPay ID)
52 04 0000                  # Tag 52: MCC
53 03 764                   # Tag 53: Currency (THB)
54 XX amount                # Tag 54: Amount
58 02 TH                    # Tag 58: Country
63 04 XXXX                  # Tag 63: CRC16
```

### 4. 🔍 可能的问题：Tag 01 值选择

根据泰国 PromptPay 实际情况：

#### 方案 A: 使用 Tag 01 = 12 (动态二维码)
```typescript
payload += '01' + formatLength('12') + '12';
```

#### 方案 B: 完全移除 Tag 01 (某些实现不需要)
```typescript
// 不添加 Tag 01
```

#### 方案 C: 使用 Tag 01 = 11 (静态二维码带金额)
```typescript
payload += '01' + formatLength('11') + '11';  // 当前实现
```

## 建议的修复步骤

### 步骤 1: 尝试方案 A (Tag 01 = 12)

修改 `lib/promptpay.ts` 第 111 行：

```typescript
// 从
payload += '01' + formatLength('11') + '11';

// 改为
payload += '01' + formatLength('12') + '12';
```

### 步骤 2: 如果方案 A 失败，尝试方案 B (移除 Tag 01)

修改 `lib/promptpay.ts` 第 111 行：

```typescript
// 完全注释掉这一行
// payload += '01' + formatLength('11') + '11';
```

### 步骤 3: 测试实际的 PromptPay QR

使用以下工具验证生成的 QR 是否符合标准：

1. **在线 EMVCo QR 解析器**:
   - https://emvco.github.io/emv-qrcps/
   - 将生成的 payload 粘贴进去查看结构

2. **PromptPay QR 生成器对比**:
   - https://www.blognone.com/node/118061
   - 生成一个标准 PromptPay QR，对比 payload 结构

## 调试日志位置

当用户点击"购买"按钮后，在 **Vercel 日志** 或 **浏览器控制台** 中查看：

```
🔵 PromptPay QR 生成成功: {
    originalId: "+66626369169",
    cleanedId: "+66626369169",
    targetId: "0626369169",
    idType: "手机号",
    amount: "100.00",
    payloadLength: 87,
    payload: "00020101021129360016A000000677010111...",
    crc: "XXXX"
}
```

## 当前 Payload 示例

以 ฿100.50 为例，当前生成的 payload：

```
00020101021129360016A00000067701011101120106263691695204000053037645406100.505802TH6304B6DC
```

分解：
- `0002` `01` - Tag 00: Format = "01"
- `0102` `11` - Tag 01: Method = "11"  ← **可能需要改为 "12"**
- `2936` `0016A00000067701011101120106263691` - Tag 29: PromptPay
- `5204` `0000` - Tag 52: MCC
- `5303` `764` - Tag 53: Currency
- `5406` `100.50` - Tag 54: Amount
- `5802` `TH` - Tag 58: Country
- `6304` `B6DC` - Tag 63: CRC

## 参考资料

- [PromptPay QR Code 标准](https://www.bot.or.th/Thai/PaymentSystems/StandardPS/Documents/ThaiQRCode_Payment_Standard.pdf)
- [EMVCo QR Code Specification](https://www.emvco.com/emv-technologies/qrcodes/)

## 下一步

1. **尝试 Tag 01 = 12** (最可能的解决方案)
2. 重新部署到 Vercel
3. 测试扫码支付
4. 如果仍失败，分享 Vercel 日志中的完整 payload
