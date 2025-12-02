# Vercel 环境变量配置指南

## 问题说明

生产服务器上的支付功能需要 `SUPABASE_SERVICE_ROLE_KEY` 环境变量才能正常工作。这个密钥用于：

1. 读取商户的敏感信息（如 PromptPay 收款账号）
2. 创建订单（绕过 RLS 权限限制）
3. 执行需要管理员权限的数据库操作

## 配置步骤

### 1. 获取 Supabase Service Role Key

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择您的项目：`fqjbbfbcchpxwgbwnyri`
3. 点击左侧菜单的 **Settings** (设置)
4. 点击 **API** 选项
5. 找到 **Project API keys** 部分
6. 复制 **service_role** 密钥（⚠️ 注意：这是 `service_role`，不是 `anon` 公开密钥）

⚠️ **安全警告**：
- Service Role Key 拥有超级管理员权限，可以绕过所有 RLS 策略
- **永远不要**将此密钥暴露在客户端代码中
- **永远不要**将此密钥提交到 Git 仓库
- 仅在服务器端（API Routes）中使用

### 2. 在 Vercel 中配置环境变量

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择您的项目（pmt）
3. 点击顶部菜单的 **Settings**
4. 在左侧菜单中点击 **Environment Variables**
5. 点击 **Add New** 按钮
6. 配置如下：

```
Key:   SUPABASE_SERVICE_ROLE_KEY
Value: [粘贴您从 Supabase 复制的 service_role 密钥]
Environment: Production, Preview, Development (全选)
```

7. 点击 **Save** 保存

### 3. 重新部署

环境变量配置完成后，需要重新部署项目：

**方式 1: 通过 Vercel Dashboard**
1. 在项目页面点击 **Deployments** 选项卡
2. 找到最新的部署
3. 点击右侧的 **...** 菜单
4. 选择 **Redeploy**

**方式 2: 通过 Git 推送**
```bash
git commit --allow-empty -m "触发重新部署以应用环境变量"
git push origin main
```

### 4. 验证配置

部署完成后，测试支付流程：

1. 访问生产环境网站
2. 登录账号
3. 选择一个优惠券
4. 点击"购买"按钮
5. 应该能看到 PromptPay 二维码弹出

如果仍有问题，查看 Vercel 日志：
- 应该看到 `✅ 已读取 (长度: xxx)` 而不是 `❌ 未读取 (Undefined)`

## 当前需要的环境变量列表

确保 Vercel 中配置了以下所有环境变量：

```
NEXT_PUBLIC_SUPABASE_URL=https://fqjbbfbcchpxwgbwnyri.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (您的 anon 公开密钥)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (您的 service_role 密钥) ⭐ 新增
```

## 常见问题

**Q: 为什么本地开发环境可以正常工作？**
A: 可能您的 `.env.local` 文件中已经配置了这个密钥，但 Vercel 生产环境是独立的，需要单独配置。

**Q: 配置后还是不工作？**
A: 确保：
1. 密钥正确（完整复制，没有多余空格）
2. 环境选择了 Production
3. 重新部署了项目
4. 等待几分钟让部署完成

**Q: Service Role Key 泄露了怎么办？**
A: 立即在 Supabase Dashboard 中重新生成密钥，并更新 Vercel 环境变量。

## 技术说明

代码位置：`app/api/checkout/route.ts:77-92`

```typescript
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('FATAL ERROR: 缺少 SUPABASE_SERVICE_ROLE_KEY 环境变量');
  return NextResponse.json({
    success: false,
    message: '服务器配置错误：支付服务暂不可用 (Missing Server Config)'
  }, { status: 500 });
}
```

配置完成后，这个检查会通过，支付功能将正常工作。
