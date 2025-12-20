# KUMMAK 商户端 APP 实施文档
## React Native + Expo 完整实施指南

---

## 📋 目录

1. [项目概述](#项目概述)
2. [环境准备（您需要完成）](#环境准备您需要完成)
3. [项目架构](#项目架构)
4. [功能清单](#功能清单)
5. [技术栈](#技术栈)
6. [实施步骤](#实施步骤)
7. [推送通知配置](#推送通知配置)
8. [Supabase 集成](#supabase-集成)
9. [后台任务配置](#后台任务配置)
10. [打包部署](#打包部署)

---

## 项目概述

### 目标
将现有的 Next.js 商户端功能（`app/[locale]/merchant`）迁移到 React Native + Expo 移动应用，实现：
- ✅ 完整的商户管理功能
- ✅ 实时订单推送通知
- ✅ 后台任务监听新订单
- ✅ Supabase Auth 和 Realtime 集成
- ✅ 多语言支持（中文、英文、泰语）
- ✅ 离线缓存支持

### 项目信息
- **应用名称**: KUMMAK Merchant
- **包名**: `com.kummak.merchant`
- **支持平台**: Android（优先）、iOS（可选）
- **最低 Android 版本**: Android 8.0 (API 26)

---

## 环境准备（您需要完成）

### 1. 开发环境安装

#### macOS 用户需要安装：

```bash
# 1. 安装 Node.js (推荐 LTS 版本)
# 访问 https://nodejs.org/ 下载安装

# 验证安装
node --version  # 应该显示 v18.x 或更高
npm --version   # 应该显示 9.x 或更高

# 2. 安装 Watchman（可选，但推荐）
brew install watchman

# 3. 安装 EAS CLI（Expo Application Services）
npm install -g eas-cli

# 4. 创建 Expo 账号
# 访问 https://expo.dev/signup 注册账号

# 5. 登录 EAS CLI
eas login
```

#### Windows 用户需要安装：

```bash
# 1. 安装 Node.js
# 访问 https://nodejs.org/ 下载安装

# 验证安装
node --version
npm --version

# 2. 安装 EAS CLI
npm install -g eas-cli

# 3. 登录 EAS CLI
eas login
```

### 2. Android 开发环境（本地测试需要）

**选项 A：使用 Expo Go App（快速测试，推荐）**
```bash
# 在手机上安装 Expo Go
# Android: https://play.google.com/store/apps/details?id=host.exp.exponent
# iOS: https://apps.apple.com/app/expo-go/id982107779
```

**选项 B：Android Studio（完整测试）**
```bash
# 1. 下载 Android Studio
# https://developer.android.com/studio

# 2. 安装 Android SDK
# 在 Android Studio 中打开 SDK Manager
# 安装 Android SDK Platform 26 或更高

# 3. 配置环境变量（macOS/Linux）
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/emulator' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.zshrc
source ~/.zshrc

# Windows 用户需要手动设置系统环境变量
# ANDROID_HOME = C:\Users\你的用户名\AppData\Local\Android\Sdk
```

### 3. Firebase 配置（推送通知必需）

#### 创建 Firebase 项目：

1. 访问 [Firebase Console](https://console.firebase.google.com/)
2. 点击 "添加项目"
3. 输入项目名称：`kummak-merchant`
4. 禁用 Google Analytics（可选）
5. 创建项目

#### 配置 Android 应用：

1. 在 Firebase 项目中点击 Android 图标
2. 输入包名：`com.kummak.merchant`
3. 下载 `google-services.json` 文件
4. **重要**：将此文件保存，稍后需要放到项目中

#### 获取 FCM Server Key：

1. Firebase Console → 项目设置 → Cloud Messaging
2. 复制 "Server key"（稍后配置推送通知时需要）

### 4. Expo 项目配置

```bash
# 创建 Expo 账号后，在 https://expo.dev/ 创建新项目
# 项目名称: kummak-merchant
# 记录您的 Expo Project ID（稍后配置时需要）
```

### 5. Supabase 准备

确保您的 Supabase 项目已启用以下功能：

```sql
-- 1. 检查 Realtime 是否启用（在 Supabase Dashboard → Database → Replication）
-- 需要为以下表启用 Realtime:
-- - orders
-- - merchants
-- - merchant_staff

-- 2. 添加 RLS 策略允许移动端访问（如果还没有）
-- 已有的策略应该足够，但需要验证

-- 3. 获取以下信息（在 Settings → API）：
-- - Project URL (SUPABASE_URL)
-- - anon/public key (SUPABASE_ANON_KEY)
```

---

## 项目架构

```
kummak-merchant/              # Expo 项目根目录
├── app/                      # Expo Router 路由目录
│   ├── (auth)/              # 认证相关路由
│   │   └── login.tsx        # 登录页面
│   ├── (tabs)/              # 主要功能标签页
│   │   ├── _layout.tsx      # 标签布局
│   │   ├── dashboard.tsx    # 仪表板
│   │   ├── orders.tsx       # 订单管理
│   │   ├── products.tsx     # 商品管理
│   │   ├── redeem.tsx       # 核销中心
│   │   └── settings.tsx     # 设置
│   ├── coupons/             # 优惠券管理
│   │   └── index.tsx
│   ├── accounting/          # 记账管理
│   │   ├── index.tsx
│   │   ├── categories.tsx
│   │   └── analytics.tsx
│   ├── quick-entry/         # 快捷记账
│   │   └── index.tsx
│   ├── product-categories/  # 商品分类
│   │   └── index.tsx
│   ├── design/              # 店铺装修
│   │   └── index.tsx
│   ├── wallet/              # 钱包
│   │   └── index.tsx
│   ├── staff/               # 员工管理
│   │   └── index.tsx
│   ├── reviews/             # 评价管理
│   │   └── index.tsx
│   ├── _layout.tsx          # 根布局
│   └── index.tsx            # 应用入口
├── components/              # 可复用组件
│   ├── QRScanner.tsx       # QR 扫码组件
│   ├── OrderCard.tsx       # 订单卡片
│   ├── ProductCard.tsx     # 商品卡片
│   └── ...
├── lib/                     # 工具库
│   ├── supabase.ts         # Supabase 客户端
│   ├── notifications.ts    # 推送通知管理
│   ├── background.ts       # 后台任务
│   └── i18n.ts             # 国际化配置
├── hooks/                   # 自定义 Hooks
│   ├── useAuth.ts          # 认证 Hook
│   ├── useOrders.ts        # 订单 Hook
│   └── useRealtime.ts      # Realtime Hook
├── constants/               # 常量配置
│   ├── Colors.ts
│   └── translations.ts     # 翻译文件
├── assets/                  # 静态资源
│   ├── images/
│   └── sounds/
├── app.json                 # Expo 配置
├── eas.json                 # EAS Build 配置
├── google-services.json     # Firebase 配置（您需要添加）
└── package.json
```

---

## 功能清单

### ✅ 核心功能（必须实现）

#### 1. 认证与授权
- [x] Google 登录
- [x] 邮箱登录
- [x] 手机号登录
- [x] 自动登录（Token 持久化）
- [x] 权限验证（商户身份验证）

#### 2. 仪表板 (Dashboard)
- [x] 今日销售额统计
- [x] 今日核销数量
- [x] 收入汇总卡片
- [x] 销售趋势图表
- [x] 热门优惠券排行
- [x] 订单状态分布

#### 3. 订单管理 (Orders)
- [x] 订单列表（购物车订单 + 优惠券订单）
- [x] 订单状态筛选
- [x] 订单详情查看
- [x] 订单搜索
- [x] 实时订单更新（Supabase Realtime）
- [x] 新订单推送通知

#### 4. 核销中心 (Redeem)
- [x] QR 码扫描
- [x] 手动输入核销码
- [x] 核销成功/失败反馈
- [x] 核销历史记录
- [x] 相机权限处理

#### 5. 商品管理 (Products)
- [x] 商品列表
- [x] 添加/编辑商品
- [x] 商品分类
- [x] 图片上传
- [x] 字典翻译辅助
- [x] 批量设置分类

#### 6. 优惠券管理 (Coupons)
- [x] 优惠券列表
- [x] 创建/编辑优惠券
- [x] 套餐商品选择
- [x] 库存管理

#### 7. 记账管理 (Accounting)
- [x] 收入/支出记录
- [x] 类目管理
- [x] 交易筛选
- [x] 财务分析报表
- [x] 收支趋势图表

#### 8. 快捷记账 (Quick Entry)
- [x] 快速记录收入
- [x] 快速记录支出
- [x] 现金订单创建
- [x] 今日汇总统计

#### 9. 商品分类管理
- [x] 分类列表
- [x] 添加/编辑分类
- [x] 分类排序
- [x] 分类启用/禁用

#### 10. 店铺装修 (Design)
- [x] 店铺样式设置
- [x] 封面图上传
- [x] 自定义 Slug 设置
- [x] QR 码生成下载
- [x] 社交媒体分享

#### 11. 钱包 (Wallet)
- [x] 余额显示
- [x] 充值功能
- [x] 交易流水
- [x] 充值凭证上传

#### 12. 员工管理 (Staff)
- [x] 员工列表
- [x] 添加员工（通过手机号）
- [x] 移除员工

#### 13. 评价管理 (Reviews)
- [x] 评价列表
- [x] 商家回复
- [x] 评价图片查看

#### 14. 设置 (Settings)
- [x] 账户信息
- [x] 店铺信息编辑
- [x] Logo 上传
- [x] KYC 认证
- [x] PromptPay 设置
- [x] 语言切换
- [x] 退出登录

### 🔔 推送通知功能

- [x] 新订单推送
- [x] 订单状态变更推送
- [x] 钱包余额变动推送
- [x] 系统通知
- [x] 通知历史记录
- [x] 通知设置（开关）

### 🔄 后台任务功能

- [x] 定时检查新订单（15分钟间隔）
- [x] 离线订单同步
- [x] 数据缓存更新

---

## 技术栈

### 核心框架
```json
{
  "expo": "^52.0.0",
  "react-native": "0.76.x",
  "expo-router": "^4.0.0"
}
```

### UI 组件库
```json
{
  "@rneui/themed": "^4.0.0-rc.8",
  "@rneui/base": "^4.0.0-rc.8",
  "react-native-paper": "^5.12.0",
  "react-native-vector-icons": "^10.0.3"
}
```

### 数据管理
```json
{
  "@supabase/supabase-js": "^2.39.0",
  "@tanstack/react-query": "^5.17.0",
  "zustand": "^4.4.7"
}
```

### 推送通知
```json
{
  "expo-notifications": "~0.29.0",
  "expo-device": "~6.0.0",
  "expo-constants": "~16.0.0"
}
```

### 后台任务
```json
{
  "expo-task-manager": "~11.9.0",
  "expo-background-fetch": "~12.0.0"
}
```

### 相机/扫码
```json
{
  "expo-camera": "~16.0.0",
  "expo-barcode-scanner": "~14.0.0"
}
```

### 图片处理
```json
{
  "expo-image-picker": "~15.0.0",
  "expo-image-manipulator": "~12.0.0"
}
```

### 图表
```json
{
  "react-native-chart-kit": "^6.12.0",
  "react-native-svg": "15.8.0"
}
```

### 国际化
```json
{
  "i18next": "^23.7.0",
  "react-i18next": "^14.0.0"
}
```

---

## 实施步骤

### Phase 1: 项目初始化（第1天）

#### 1.1 创建 Expo 项目

```bash
# 在您的工作目录中执行
npx create-expo-app kummak-merchant --template

# 进入项目目录
cd kummak-merchant

# 安装 Expo Router
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

#### 1.2 安装核心依赖

```bash
# Supabase
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage

# 推送通知
npx expo install expo-notifications expo-device

# 后台任务
npx expo install expo-task-manager expo-background-fetch

# 相机/扫码
npx expo install expo-camera expo-barcode-scanner

# UI 组件
npm install @rneui/themed @rneui/base react-native-vector-icons

# 图表
npm install react-native-chart-kit react-native-svg

# 状态管理
npm install zustand @tanstack/react-query

# 图片处理
npx expo install expo-image-picker expo-image-manipulator

# 国际化
npm install i18next react-i18next

# 其他工具
npx expo install expo-secure-store expo-file-system
```

#### 1.3 配置 app.json

```json
{
  "expo": {
    "name": "KUMMAK Merchant",
    "slug": "kummak-merchant",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "scheme": "kummak-merchant",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#667eea"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.kummak.merchant",
      "infoPlist": {
        "NSCameraUsageDescription": "需要相机权限以扫描客户的核销二维码",
        "NSMicrophoneUsageDescription": "不需要麦克风权限"
      }
    },
    "android": {
      "package": "com.kummak.merchant",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#667eea"
      },
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "NOTIFICATIONS",
        "VIBRATE"
      ],
      "googleServicesFile": "./google-services.json"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#667eea",
          "sounds": [
            "./assets/sounds/notification.wav"
          ]
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "需要相机权限以扫描客户的核销二维码"
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "需要访问相册以上传商品图片和Logo"
        }
      ]
    ],
    "extra": {
      "router": {
        "origin": false
      },
      "eas": {
        "projectId": "YOUR_EXPO_PROJECT_ID"
      }
    }
  }
}
```

#### 1.4 配置 eas.json

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

### Phase 2: Supabase 集成（第1天）

#### 2.1 创建 Supabase 客户端

创建文件 `lib/supabase.ts`:

```typescript
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

#### 2.2 创建环境变量文件

创建文件 `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_FCM_SERVER_KEY=your-fcm-server-key
```

#### 2.3 创建认证 Hook

创建文件 `hooks/useAuth.ts`:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 获取初始 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 监听 auth 状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    session,
    user,
    loading,
    signOut: () => supabase.auth.signOut(),
  };
}
```

#### 2.4 创建 Realtime Hook

创建文件 `hooks/useRealtime.ts`:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useRealtimeOrders(merchantId: string) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!merchantId) return;

    const orderChannel = supabase
      .channel('merchant-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `merchant_id=eq.${merchantId}`,
        },
        (payload) => {
          console.log('New order:', payload.new);
          // 触发推送通知
          // triggerNotification(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `merchant_id=eq.${merchantId}`,
        },
        (payload) => {
          console.log('Order updated:', payload.new);
        }
      )
      .subscribe();

    setChannel(orderChannel);

    return () => {
      orderChannel.unsubscribe();
    };
  }, [merchantId]);

  return channel;
}
```

---

### Phase 3: 推送通知配置（第2天）

#### 3.1 创建通知管理器

创建文件 `lib/notifications.ts`:

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// 配置通知处理行为
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * 注册推送通知
 */
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#667eea',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('需要推送通知权限以接收新订单提醒！');
      return;
    }

    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })
    ).data;

    console.log('Push token:', token);
  } else {
    alert('必须使用真实设备才能接收推送通知');
  }

  return token;
}

/**
 * 保存推送 Token 到 Supabase
 */
export async function savePushToken(merchantId: string, token: string) {
  try {
    // 保存到 merchant_push_tokens 表
    const { error } = await supabase
      .from('merchant_push_tokens')
      .upsert({
        merchant_id: merchantId,
        push_token: token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    console.log('Push token saved successfully');
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

/**
 * 发送本地通知（用于新订单提醒）
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: any
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null, // 立即显示
  });
}
```

#### 3.2 在 Supabase 中创建推送 Token 表

```sql
-- 在 Supabase SQL Editor 中执行

CREATE TABLE IF NOT EXISTS merchant_push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID REFERENCES merchants(merchant_id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id, platform)
);

-- 创建索引
CREATE INDEX idx_merchant_push_tokens_merchant_id ON merchant_push_tokens(merchant_id);

-- 启用 RLS
ALTER TABLE merchant_push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS 策略：商户只能管理自己的 token
CREATE POLICY "Merchants can manage own push tokens"
ON merchant_push_tokens
FOR ALL
USING (
  merchant_id IN (
    SELECT merchant_id FROM merchants
    WHERE owner_id = auth.uid()
  )
);
```

---

### Phase 4: 后台任务配置（第2天）

#### 4.1 创建后台任务管理器

创建文件 `lib/background.ts`:

```typescript
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { supabase } from './supabase';
import { sendLocalNotification } from './notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_FETCH_TASK = 'check-new-orders';

/**
 * 定义后台任务
 */
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log('Background task running...');

    // 获取商户 ID
    const merchantId = await AsyncStorage.getItem('current_merchant_id');
    if (!merchantId) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 获取最后检查时间
    const lastCheck = await AsyncStorage.getItem('last_order_check');
    const checkTime = lastCheck ? new Date(lastCheck) : new Date(Date.now() - 15 * 60 * 1000);

    // 查询新订单
    const { data: newOrders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('status', 'paid')
      .gte('created_at', checkTime.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 如果有新订单，发送通知
    if (newOrders && newOrders.length > 0) {
      await sendLocalNotification(
        '💰 新订单到账！',
        `您有 ${newOrders.length} 笔新订单待处理`,
        { orders: newOrders }
      );

      // 更新最后检查时间
      await AsyncStorage.setItem('last_order_check', new Date().toISOString());

      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('Background task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * 注册后台任务
 */
export async function registerBackgroundFetchAsync() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15 * 60, // 15 分钟
      stopOnTerminate: false, // 应用关闭后继续运行
      startOnBoot: true, // 开机自启
    });
    console.log('Background fetch registered');
  } catch (error) {
    console.error('Failed to register background fetch:', error);
  }
}

/**
 * 取消注册后台任务
 */
export async function unregisterBackgroundFetchAsync() {
  await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
}
```

---

### Phase 5: 核心功能实现（第3-5天）

#### 5.1 登录页面示例

创建文件 `app/(auth)/login.tsx`:

```typescript
import { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      router.replace('/(tabs)/dashboard');
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>KUMMAK Merchant</Text>

      <TextInput
        style={styles.input}
        placeholder="邮箱"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="密码"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={signInWithEmail}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? '登录中...' : '登录'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    color: '#667eea',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

#### 5.2 订单列表示例

创建文件 `app/(tabs)/orders.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeOrders } from '@/hooks/useRealtime';

type Order = {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  created_at: string;
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [merchantId, setMerchantId] = useState<string>('');

  // 获取商户 ID
  useEffect(() => {
    async function getMerchant() {
      const { data } = await supabase
        .from('merchants')
        .select('merchant_id')
        .eq('owner_id', user?.id)
        .single();

      if (data) {
        setMerchantId(data.merchant_id);
      }
    }

    if (user) getMerchant();
  }, [user]);

  // 订阅实时订单更新
  useRealtimeOrders(merchantId);

  // 加载订单
  useEffect(() => {
    async function loadOrders() {
      if (!merchantId) return;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setOrders(data);
      }
      setLoading(false);
    }

    loadOrders();
  }, [merchantId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.orderCard}>
            <Text style={styles.orderId}>订单号: {item.order_id}</Text>
            <Text>金额: ฿{item.amount}</Text>
            <Text>状态: {item.status}</Text>
            <Text style={styles.date}>
              {new Date(item.created_at).toLocaleString('zh-CN')}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
});
```

#### 5.3 QR 扫码组件示例

创建文件 `components/QRScanner.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { Camera, CameraView } from 'expo-camera';

type QRScannerProps = {
  onScan: (data: string) => void;
};

export default function QRScanner({ onScan }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    onScan(data);
  };

  if (hasPermission === null) {
    return <Text>请求相机权限中...</Text>;
  }

  if (hasPermission === false) {
    return <Text>无相机权限</Text>;
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
      {scanned && (
        <Button title="再次扫描" onPress={() => setScanned(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

---

### Phase 6: 国际化配置（第5天）

#### 6.1 配置 i18next

创建文件 `lib/i18n.ts`:

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 导入翻译文件
import zh from '@/constants/translations/zh.json';
import en from '@/constants/translations/en.json';
import th from '@/constants/translations/th.json';

const LANGUAGE_KEY = 'user_language';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
      th: { translation: th },
    },
    lng: 'th', // 默认泰语
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// 加载保存的语言设置
AsyncStorage.getItem(LANGUAGE_KEY).then((lang) => {
  if (lang) {
    i18n.changeLanguage(lang);
  }
});

export default i18n;
```

#### 6.2 创建翻译文件

从现有的 `messages/` 目录复制翻译内容到：
- `constants/translations/zh.json`
- `constants/translations/en.json`
- `constants/translations/th.json`

---

## 打包部署

### 1. 本地测试

```bash
# 启动开发服务器
npx expo start

# 扫描二维码（使用 Expo Go）
# 或按 'a' 在 Android 模拟器中打开
# 或按 'i' 在 iOS 模拟器中打开
```

### 2. 构建 APK (Preview)

```bash
# 初始化 EAS
eas build:configure

# 构建 APK（用于测试）
eas build -p android --profile preview

# 构建完成后会生成下载链接
# 下载 APK 并安装到手机测试
```

### 3. 生产构建

```bash
# 构建生产版本
eas build -p android --profile production

# 提交到 Google Play（可选）
eas submit -p android
```

---

## 项目检查清单

### 开发前准备

- [ ] Node.js 已安装（v18+）
- [ ] EAS CLI 已安装并登录
- [ ] Expo 账号已创建
- [ ] Firebase 项目已创建
- [ ] `google-services.json` 已下载
- [ ] Supabase 配置信息已准备
- [ ] Android 开发环境已配置（可选）

### 项目配置

- [ ] Expo 项目已创建
- [ ] 所有依赖已安装
- [ ] `app.json` 已配置
- [ ] `eas.json` 已配置
- [ ] `.env` 文件已创建
- [ ] `google-services.json` 已放置在项目根目录

### 功能实现

- [ ] Supabase 客户端已配置
- [ ] 认证功能已实现
- [ ] 推送通知已配置
- [ ] 后台任务已配置
- [ ] Realtime 订阅已实现
- [ ] QR 扫码功能已实现
- [ ] 所有核心页面已完成
- [ ] 国际化已配置

### 测试

- [ ] 登录/登出功能正常
- [ ] 订单列表加载正常
- [ ] 实时订单更新正常
- [ ] 推送通知接收正常
- [ ] QR 扫码核销正常
- [ ] 所有功能模块测试通过

### 部署

- [ ] APK 构建成功
- [ ] 应用安装测试通过
- [ ] 生产环境测试通过

---

## 常见问题

### Q1: Expo Go 和开发构建的区别？

**A**: Expo Go 是快速测试工具，但不支持某些原生模块（如 Firebase）。开发构建是完整的自定义应用，支持所有功能。

**推荐**：初期用 Expo Go 测试基础功能，后期使用 `eas build --profile development` 构建开发版本。

### Q2: 如何调试推送通知？

**A**:
```bash
# 发送测试通知
npx expo push:android:send -t YOUR_EXPO_PUSH_TOKEN
```

### Q3: 后台任务不执行怎么办？

**A**:
- 确保应用已授予后台权限
- Android 设置 → 应用 → KUMMAK Merchant → 电池 → 不限制
- 某些手机厂商（小米、华为）需要额外设置自启动权限

### Q4: 如何更新环境变量？

**A**: 修改 `.env` 后需要重启 Expo 服务器:
```bash
npx expo start --clear
```

### Q5: 如何查看应用日志？

**A**:
```bash
# Android 日志
npx react-native log-android

# iOS 日志
npx react-native log-ios
```

---

## 后续优化建议

1. **性能优化**
   - 实现订单列表虚拟化
   - 添加图片缓存
   - 优化 Realtime 连接管理

2. **用户体验**
   - 添加骨架屏加载
   - 实现下拉刷新
   - 添加错误边界处理

3. **功能增强**
   - 订单统计图表优化
   - 离线模式支持
   - 数据导出功能

4. **安全性**
   - 实现 SSL Pinning
   - 添加生物识别登录
   - 敏感数据加密存储

---

## 技术支持

如遇到问题，请参考：

- [Expo 官方文档](https://docs.expo.dev/)
- [Supabase 文档](https://supabase.com/docs)
- [React Native 文档](https://reactnative.dev/)
- [Expo 推送通知指南](https://docs.expo.dev/push-notifications/overview/)

---

## 版本历史

- **v1.0.0** (2025-12-20) - 初始版本
  - 完整商户端功能
  - 推送通知支持
  - Supabase Realtime 集成
  - 后台任务支持

---

**文档创建日期**: 2025年12月20日
**最后更新日期**: 2025年12月20日
**作者**: Claude (Anthropic)
**项目**: KUMMAK Merchant APP
