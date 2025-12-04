# Next.js i18n 迁移计划（next-intl）

## 📋 项目概述

**目标：** 将项目从 React Context 国际化方案迁移到 next-intl 官方方案
**支持语言：** 泰语 (th)、简体中文 (zh)、英语 (en)
**开始日期：** 2025-12-04
**预计完成：** TBD

---

## 🎯 迁移策略

### 阶段 1：基础设施搭建 ✅
- [x] 安装 next-intl 依赖
- [x] 创建翻译文件结构 (messages/)
- [x] 配置 i18n 路由
- [x] 创建中间件（middleware）
- [x] 更新根 layout

### 阶段 2：首页迁移（测试阶段）🚧 进行中
- [ ] 迁移首页 (app/[locale]/page.tsx)
- [ ] 迁移 Navbar 组件
- [ ] 迁移 NearbyCoupons 组件
- [ ] 迁移 LanguageSwitcher 组件
- [ ] 测试部署
- [ ] 验证功能

### 阶段 3：核心页面迁移 ⏳ 待开始
- [ ] 优惠券详情页 (/coupon/[id])
- [ ] 搜索页 (/search)
- [ ] 登录/注册页 (/login, /register)

### 阶段 4：用户中心迁移 ⏳ 待开始
- [ ] 客户端布局 (/client/layout.tsx)
- [ ] 个人资料页 (/client/profile)
- [ ] 订单页面 (/client/orders)

### 阶段 5：商家中心迁移 ⏳ 待开始
- [ ] 商家布局 (/merchant/layout.tsx)
- [ ] 商家仪表板 (/merchant/dashboard)
- [ ] 商品管理 (/merchant/products)
- [ ] 优惠券管理 (/merchant/coupons)
- [ ] 订单管理 (/merchant/orders)
- [ ] 核销页面 (/merchant/redeem)

### 阶段 6：管理员后台迁移 ⏳ 待开始
- [ ] 管理员布局 (/admin/layout.tsx)
- [ ] 管理员仪表板 (/admin/dashboard)
- [ ] 其他管理页面

### 阶段 7：清理工作 ⏳ 待开始
- [ ] 删除旧的 Context 方案文件
- [ ] 删除旧的翻译文件
- [ ] 更新文档
- [ ] 最终测试

---

## 📁 新文件结构

```
/Users/jasonbear/pmt/
├── app/
│   ├── [locale]/              # 新增：语言路由
│   │   ├── layout.tsx         # 新增：语言布局
│   │   ├── page.tsx           # 迁移：首页
│   │   ├── coupon/
│   │   ├── client/
│   │   ├── merchant/
│   │   └── admin/
│   ├── layout.tsx             # 保留：根布局
│   └── not-found.tsx          # 新增：404页面
│
├── messages/                  # 新增：翻译文件目录
│   ├── th.json               # 泰语翻译
│   ├── zh.json               # 简体中文翻译
│   └── en.json               # 英语翻译
│
├── i18n/
│   ├── request.ts            # 新增：服务器端 i18n
│   └── routing.ts            # 新增：路由配置
│
├── middleware.ts             # 新增：i18n 中间件
│
└── 旧文件（待删除）
    ├── contexts/LanguageContext.tsx
    ├── locales/translations.ts
    └── hooks/useTranslation.ts
```

---

## 🔄 URL 路由变化

### 之前（React Context）
```
/                          # 首页
/coupon/123               # 优惠券详情
/client/orders            # 我的订单
/merchant/dashboard       # 商家仪表板
```

### 之后（next-intl）
```
/                          # 自动重定向到 /th 或 /zh 或 /en
/th                        # 泰语首页
/zh                        # 中文首页
/en                        # 英语首页
/th/coupon/123            # 泰语优惠券详情
/zh/client/orders         # 中文我的订单
/en/merchant/dashboard    # 英语商家仪表板
```

---

## 📊 进度追踪

### 总体进度
- **已完成：** 1/7 个阶段
- **进行中：** 阶段 2（首页迁移 - 70%）
- **完成度：** 24%

### 详细进度

#### ✅ 阶段 1：基础设施搭建（100%）
| 任务 | 状态 | 完成时间 | 备注 |
|------|------|----------|------|
| 安装依赖 | ✅ | 2025-12-04 | next-intl@^3.0.0 |
| 创建翻译文件 | ✅ | 2025-12-04 | th.json, zh.json, en.json |
| 配置路由 | ✅ | 2025-12-04 | i18n/routing.ts |
| 创建中间件 | ✅ | 2025-12-04 | middleware.ts |
| 更新根布局 | ✅ | 2025-12-04 | app/layout.tsx |

#### 🚧 阶段 2：首页迁移（70%）
| 任务 | 状态 | 开始时间 | 完成时间 | 备注 |
|------|------|----------|----------|------|
| 迁移首页 | ✅ | 2025-12-04 | 2025-12-04 | app/[locale]/page.tsx |
| 迁移 Navbar | ✅ | 2025-12-04 | 2025-12-04 | 使用 useTranslations |
| 迁移 NearbyCoupons | ✅ | 2025-12-04 | 2025-12-04 | 修复硬编码中文错误 |
| 迁移 LanguageSwitcher | ✅ | 2025-12-04 | 2025-12-04 | LanguageSwitcherNew.tsx |
| 修复数据库数据问题 | 🚧 | 2025-12-04 | - | 需要执行 SQL 脚本 |
| 本地测试 | 🚧 | 2025-12-04 | - | npm run dev |
| Vercel 部署测试 | ⏳ | - | - | 验证生产环境 |

---

## 🛠️ 技术细节

### 翻译键命名规范
```typescript
// 使用嵌套结构
{
  "nav": {
    "home": "首页",
    "login": "登录"
  },
  "home": {
    "title": "欢迎",
    "hero": {
      "title": "标题",
      "subtitle": "副标题"
    }
  }
}
```

### 使用方式

#### 服务器组件
```tsx
import {getTranslations} from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('home');
  return <h1>{t('title')}</h1>;
}
```

#### 客户端组件
```tsx
'use client';
import {useTranslations} from 'next-intl';

export default function Component() {
  const t = useTranslations('nav');
  return <button>{t('login')}</button>;
}
```

#### 数据库多语言字段（保持不变）
```tsx
import {getLocalizedValue} from '@/hooks/useTranslation';

// 继续使用现有的 getLocalizedValue 函数
const name = getLocalizedValue(coupon.name, locale);
```

---

## ⚠️ 注意事项

### 1. 兼容性问题
- ✅ 数据库多语言字段（`{th: "...", zh: "...", en: "..."}` ）保持不变
- ✅ `getLocalizedValue` 辅助函数保留并继续使用
- ⚠️ 所有路由都会添加语言前缀（需要更新内部链接）
- ⚠️ 客户端切换语言会刷新页面（URL 改变）

### 2. SEO 优化
- ✅ 每个语言都有独立 URL
- ✅ 自动生成 `<link rel="alternate" hreflang="..." />`
- ✅ 支持搜索引擎索引不同语言版本

### 3. 部署注意事项
- Vercel 自动支持 next-intl
- 无需额外配置
- 中间件会自动处理语言检测和重定向

---

## 🧪 测试清单

### 首页测试（阶段 2 完成后）
- [ ] 访问 `/` 自动重定向到正确语言
- [ ] 访问 `/th` 显示泰语内容
- [ ] 访问 `/zh` 显示中文内容
- [ ] 访问 `/en` 显示英语内容
- [ ] 语言切换器正常工作
- [ ] Navbar 翻译正确
- [ ] 附近优惠券翻译正确
- [ ] 数据库多语言字段（商户名、优惠券名）显示正确
- [ ] 图片加载正常
- [ ] 链接跳转正确（包含语言前缀）

### 全局测试（阶段 7 完成后）
- [ ] 所有页面翻译完整
- [ ] 所有链接包含语言前缀
- [ ] 表单验证消息支持多语言
- [ ] 错误消息支持多语言
- [ ] Toast 通知支持多语言
- [ ] Email 通知支持多语言
- [ ] SEO 元数据支持多语言
- [ ] 无控制台错误
- [ ] 无 404 错误

---

## 📝 已知问题

### 待解决
1. **问题：** 数据库中的多语言字段数据不完整
   - **影响：** 首页显示的分类和优惠券名称始终显示为泰语，即使切换到中文或英文
   - **根本原因：**
     - 分类 `name` 字段存储为纯字符串而非 JSONB 对象
     - 优惠券 `name` 字段的 `zh` 和 `en` 键为空字符串
   - **解决方案：**
     1. ✅ 已改进 `lib/i18nUtils.ts` 中的 `getLocalizedValue` 函数，跳过空字符串
     2. 🚧 需要执行 SQL 脚本修复数据库数据（见 `quick-fix-data.md`）
   - **优先级：** 🔴 高（阻塞阶段 2 测试）

2. **问题：** 组件中存在硬编码的中文错误提示
   - **影响：** NearbyCoupons 组件的错误提示不支持多语言
   - **解决方案：** ✅ 已修复，改用 `t('locationFailed')`
   - **优先级：** ✅ 已解决

---

## 📚 参考资料

- [next-intl 官方文档](https://next-intl-docs.vercel.app/)
- [Next.js App Router i18n](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [项目原有翻译文件](locales/translations.ts)

---

## 🔗 相关文件

- 本迁移计划：`I18N_MIGRATION_PLAN.md`
- 原有商户快照文档：`MERCHANT_LOCATION_SNAPSHOT_SETUP.md`
- 部署清单：`DEPLOYMENT_CHECKLIST.md`

---

**最后更新：** 2025-12-04 14:50
**更新人：** Claude
**下一步：** 执行数据库修复 SQL，完成阶段 2（首页迁移）测试
