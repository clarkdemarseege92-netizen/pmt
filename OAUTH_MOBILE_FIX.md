# 修复手机端 Google OAuth 注册失败

## 问题描述

- ✅ 电脑端：Google OAuth 注册成功
- ❌ 手机端：Google OAuth 注册失败
- ℹ️ 控制台警告和 generate_204 请求是正常现象，可忽略

## 原因分析

手机端 OAuth 失败通常由以下原因导致：

1. **移动浏览器 Cookie 限制**
2. **跨域重定向问题**
3. **移动网络环境差异**
4. **Google OAuth 移动端特殊要求**

## 解决方案

### 步骤 1: 检查 Supabase OAuth 配置

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择项目 `fqjbbfbcchpxwgbwnyri`
3. 点击左侧 **Authentication** → **URL Configuration**
4. 检查 **Site URL** 和 **Redirect URLs**

**确保配置如下**：

```
Site URL: https://你的vercel域名.vercel.app

Redirect URLs (添加所有可能的 URL):
https://你的vercel域名.vercel.app/auth/callback
https://你的vercel域名.vercel.app/**
```

### 步骤 2: 检查 Google Cloud Console 配置

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择您的项目
3. 导航到 **APIs & Services** → **Credentials**
4. 找到 OAuth 2.0 客户端 ID
5. 点击编辑

**确保 Authorized redirect URIs 包含**：

```
https://fqjbbfbcchpxwgbwnyri.supabase.co/auth/v1/callback
https://你的vercel域名.vercel.app/auth/callback
```

### 步骤 3: 修改登录页面代码（添加移动端检测和错误处理）

当前代码可能在移动端遇到问题，需要改进：

#### 问题 1: 移动端可能需要 `skipBrowserRedirect`

当前代码：
```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: provider,
  options: {
    redirectTo: redirectTo,
  },
});
```

**改进建议**：添加移动端检测和更详细的错误日志

```typescript
const handleOAuthLogin = async (provider: Provider) => {
  setLoading(true);
  setError(null);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const redirectTo = `${window.location.origin}/auth/callback`;

  console.log("🔵 LOGIN: OAuth 登录开始", {
    provider,
    redirectTo,
    isMobile,
    userAgent: navigator.userAgent.substring(0, 50)
  });

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: redirectTo,
        // 移动端可能需要不同的参数
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error("🔴 LOGIN: OAuth 失败", {
        message: error.message,
        status: error.status,
        name: error.name
      });
      setError(`登录失败: ${error.message}`);
      setLoading(false);
      return;
    }

    console.log("🟢 LOGIN: OAuth 启动成功，等待重定向...", data);
  } catch (err) {
    console.error("🔴 LOGIN: OAuth 异常", err);
    setError(err instanceof Error ? err.message : "未知错误");
    setLoading(false);
  }
};
```

### 步骤 4: 检查移动浏览器设置

手机端用户需要：

1. **启用 Cookie**
   - Safari (iOS): 设置 → Safari → 关闭"阻止所有 Cookie"
   - Chrome (Android): 设置 → 隐私和安全 → Cookie → 允许所有 Cookie

2. **禁用隐私浏览模式**
   - 隐私模式会限制 Cookie 和重定向

3. **使用主流浏览器**
   - 推荐：Chrome、Safari
   - 避免：微信内置浏览器、QQ 浏览器（可能有限制）

### 步骤 5: 添加调试信息收集

要了解手机端具体失败原因，需要添加详细日志：

```typescript
// 在 app/auth/callback/route.ts 中添加
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  console.log("🔵 AUTH CALLBACK: 收到回调", {
    url: requestUrl.href,
    userAgent,
    hasCode: !!requestUrl.searchParams.get("code"),
    hasError: !!requestUrl.searchParams.get("error"),
    params: Object.fromEntries(requestUrl.searchParams)
  });

  // ... 现有代码
}
```

## 测试步骤

修改后，请手机端用户执行以下测试：

1. **清除浏览器缓存和 Cookie**
2. **访问登录页面**
3. **点击 "使用 Google 登录"**
4. **记录以下信息**：
   - 是否跳转到 Google 登录页面？
   - Google 登录后是否返回网站？
   - 控制台是否有红色错误？
   - 具体错误信息是什么？

## 替代方案：使用 PKCE 流程

如果问题持续，可以切换到更安全的 PKCE 流程（推荐移动端）：

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: redirectTo,
    // 启用 PKCE
    flowType: 'pkce',
  },
});
```

## 需要收集的调试信息

请手机端用户提供：

1. **手机型号和操作系统**：例如 iPhone 13, iOS 17
2. **浏览器类型和版本**：例如 Safari 17.0
3. **具体错误信息**：截图控制台或错误提示
4. **Vercel 日志**：在失败后立即查看 Vercel 日志，看是否收到回调请求

## 常见移动端问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 白屏无响应 | Cookie 被阻止 | 启用 Cookie |
| 循环重定向 | CORS 或 Cookie SameSite | 检查 Supabase Site URL |
| 404 错误 | 回调 URL 不匹配 | 检查 Supabase Redirect URLs |
| 无限加载 | 网络问题 | 检查移动网络连接 |

## 下一步

1. 先检查 Supabase 和 Google Console 的配置
2. 如果配置正确，实施代码改进
3. 收集手机端详细错误日志
4. 根据具体错误信息进一步排查
