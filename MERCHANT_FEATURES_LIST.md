# KUMMAK 商户端功能清单

> 版本：v1.0
> 更新日期：2025-12-20
> 基于：现有代码库分析

---

## 📋 目录

1. [功能总览](#功能总览)
2. [核心功能详解](#核心功能详解)
3. [功能开发状态](#功能开发状态)
4. [技术栈](#技术栈)
5. [页面路由映射](#页面路由映射)

---

## 功能总览

### 商户端导航菜单（共13个功能模块）

根据 `components/MerchantSidebar.tsx` 的导航菜单，商户端包含以下功能：

| 序号 | 功能模块 | 路由 | 图标 | 状态 |
|------|---------|------|------|------|
| 1 | 仪表板 (Dashboard) | `/merchant/dashboard` | HiSquares2X2 | ✅ 已实现 |
| 2 | 订单管理 (Orders) | `/merchant/orders` | HiClipboardDocumentList | ✅ 已实现 |
| 3 | 产品管理 (Products) | `/merchant/products` | HiShoppingBag | ✅ 已实现 |
| 4 | 产品分类 (Product Categories) | `/merchant/product-categories` | HiTag | ✅ 已实现 |
| 5 | 店铺设计 (Design) | `/merchant/design` | HiPaintBrush | ✅ 已实现 |
| 6 | 优惠券管理 (Coupons) | `/merchant/coupons` | HiTicket | ✅ 已实现 |
| 7 | 评价管理 (Reviews) | `/merchant/reviews` | HiChatBubbleLeftRight | ✅ 已实现 |
| 8 | 财务记账 (Accounting) | `/merchant/accounting` | HiCalculator | ✅ 已实现 |
| 9 | 快速记账 (Quick Entry) | `/merchant/quick-entry` | HiBoltSlash | ✅ 已实现 |
| 10 | 钱包管理 (Wallet) | `/merchant/wallet` | HiWallet | ✅ 已实现 |
| 11 | 员工管理 (Staff) | `/merchant/staff` | HiUserGroup | ✅ 已实现 |
| 12 | 核销中心 (Redeem) | `/merchant/redeem` | HiQrCode | ✅ 已实现 |
| 13 | 店铺设置 (Settings) | `/merchant/settings` | HiCog6Tooth | ✅ 已实现 |

**额外功能：**
- **商户注册/入驻** (`/merchant/onboarding`) - ✅ 已实现

**总计：14 个主要功能模块**

---

## 核心功能详解

### 1. 仪表板 (Dashboard) 📊

**路由：** `/merchant/dashboard`

**功能描述：**
- 商户数据总览仪表板
- 显示关键业绩指标

**核心功能：**
- 📈 销售统计（今日/本周/本月）
- 💰 收入统计
- 📦 订单数量统计
- 📊 数据趋势图表
- 🎯 待处理事项提醒

**数据来源：**
- `orders` 表（订单数据）
- `merchant_transactions` 表（交易数据）

---

### 2. 订单管理 (Orders) 📋

**路由：** `/merchant/orders`

**功能描述：**
- 查看和管理所有订单

**核心功能：**
- 📋 订单列表展示
  - 订单编号
  - 客户信息
  - 订单金额
  - 订单状态（pending/paid/used/completed）
  - 创建时间
- 🔍 订单搜索和筛选
  - 按状态筛选
  - 按日期范围筛选
  - 按订单号搜索
- 📄 订单详情查看
  - 商品/优惠券明细
  - 核销码
  - 支付信息

**数据来源：**
- `orders` 表
- `order_items` 表

**API 端点：**
- `GET /api/merchant/orders` - 获取订单列表
- `GET /api/merchant/orders/[orderId]` - 获取订单详情

---

### 3. 产品管理 (Products) 🛍️

**路由：** `/merchant/products`

**功能描述：**
- 管理商户的所有产品

**核心功能：**
- ➕ 创建新产品
  - 产品名称（支持多语言：中文、泰文、英文）
  - 产品描述
  - 价格
  - 库存
  - 产品图片上传
  - 产品分类关联
- ✏️ 编辑现有产品
- 🗑️ 删除产品
- 👁️ 产品列表展示
  - 缩略图
  - 名称
  - 价格
  - 库存状态
  - 销量统计
- 🔍 产品搜索
  - 支持模糊搜索（Fuzzy Match）
  - 跨语言搜索（中文/泰文/英文）
  - 产品字典集成
- 🏷️ 产品状态管理
  - 上架/下架
  - 库存管理

**数据来源：**
- `products` 表
- `merchant_categories` 表（产品分类）
- `product_dictionary` 表（产品字典）

**API 端点：**
- `POST /api/products` - 创建产品
- `PUT /api/products/[productId]` - 更新产品
- `DELETE /api/products/[productId]` - 删除产品

**相关文档：**
- `PRODUCT_DICTIONARY_IMPLEMENTATION.md` - 产品字典功能
- `BUGFIX_FUZZY_MATCH.md` - 模糊搜索修复
- `I18N_PRODUCT_FORM_UPDATE.md` - 多语言表单

---

### 4. 产品分类 (Product Categories) 🏷️

**路由：** `/merchant/product-categories`

**功能描述：**
- 管理商户自定义的产品分类体系

**核心功能：**
- ➕ 创建分类
  - 分类名称（支持多语言）
  - 分类描述
  - 分类图标/颜色
- ✏️ 编辑分类
- 🗑️ 删除分类
- 🔄 分类排序（拖拽调整顺序）
- 🔘 启用/禁用分类
- 📊 查看分类下的产品数量

**数据来源：**
- `merchant_categories` 表

**数据库迁移：**
- `supabase/migrations/20251217130000_create_merchant_product_categories.sql`

**相关文档：**
- `MERCHANT_PRODUCT_CATEGORIES_SUMMARY.md`
- `MERCHANT_PRODUCT_CATEGORIES_PLAN.md`

---

### 5. 店铺设计 (Design) 🎨

**路由：** `/merchant/design`

**功能描述：**
- 自定义店铺页面外观和品牌形象

**核心功能：**

#### 5.1 基本信息设置
- 🏪 店铺名称
- 📍 店铺地址（文字）
- 📝 店铺描述
- 📞 客服电话
- 🗺️ Google Maps 链接
- 🖼️ 店铺 Logo 上传

#### 5.2 店铺样式定制
- 🎨 主题颜色设置
  - 主色调 (Primary Color)
  - 次色调 (Secondary Color)
- 🔘 按钮样式选择
  - 圆角 (Rounded)
  - 药丸形 (Pill)
  - 方形 (Square)
- 🔤 字体家族选择
- 🖼️ 封面图上传
- 🌄 背景图上传
- 📢 公告文本设置

#### 5.3 显示配置
- 👁️ 显示库存开关
- 📊 显示销量开关
- 📱 网格列数设置（1列/2列）

#### 5.4 店铺链接 (Slug)
- 🔗 自定义店铺 URL Slug
  - 支持英文和数字
  - 自动格式化为小写
  - 唯一性验证
- 📋 店铺链接复制
  - `kummak.com/shop/[slug]`

#### 5.5 店铺分享
- 📱 生成带 QR 码的分享海报
  - 店铺名称
  - 店铺链接
  - 二维码
  - KUMMAK 品牌标识
- 💾 下载分享海报（PNG 格式）
- 📲 社交媒体分享引导

**数据来源：**
- `merchants` 表（基本信息、slug）
- `merchant_customizations` 表（样式定制）

**组件文件：**
- `app/[locale]/merchant/design/components/ShopShareSection.tsx`

**数据库迁移：**
- `supabase/migrations/20251220000000_add_merchant_slug.sql`

---

### 6. 优惠券管理 (Coupons) 🎫

**路由：** `/merchant/coupons`

**功能描述：**
- 创建和管理优惠券

**核心功能：**
- ➕ 创建优惠券
  - 优惠券标题（多语言）
  - 优惠券描述
  - 原价/折扣价
  - 有效期设置
  - 库存数量
  - 使用限制（每用户限购）
  - 优惠券图片上传
- ✏️ 编辑优惠券
- 🗑️ 删除优惠券
- 📊 优惠券列表
  - 销售统计
  - 剩余库存
  - 状态（进行中/已售罄/已过期）
- 🎁 优惠券套餐（Package）
  - 创建优惠券组合
  - 批量购买优惠

**数据来源：**
- `coupons` 表
- `coupon_packages` 表

---

### 7. 评价管理 (Reviews) ⭐

**路由：** `/merchant/reviews`

**功能描述：**
- 查看和回复客户评价

**核心功能：**
- 📋 评价列表展示
  - 客户头像和昵称
  - 评分（1-5 星）
  - 评价内容
  - 评价图片
  - 评价时间
- 💬 商户回复评价
- 🖼️ 查看评价图片（大图预览）
- 📊 评分统计
  - 平均评分
  - 各星级数量分布
- 🔍 评价筛选
  - 按评分筛选
  - 按日期筛选
  - 按是否回复筛选

**数据来源：**
- `reviews` 表

---

### 8. 财务记账 (Accounting) 💰

**路由：** `/merchant/accounting`

**功能描述：**
- 完整的商户财务记账系统

**核心功能：**

#### 8.1 收入支出记录
- ➕ 手动记账
  - 收入/支出选择
  - 金额输入
  - 分类选择
  - 备注说明
  - 日期选择
- 📋 交易记录列表
  - 日期
  - 分类
  - 金额
  - 余额
  - 来源（手动/平台订单/平台费用/现金订单）

#### 8.2 记账分类管理
- 🏷️ 系统预设分类
  - 平台订单收入
  - 平台服务费
  - 店铺租金
  - 员工工资
  - 水电费
  - 原材料采购
  - 其他收入/支出
- ✏️ 自定义分类名称
  - 支持多语言

#### 8.3 数据分析
- 📊 收入支出趋势图
- 📈 分类占比分析
- 📉 月度对比报表
- 💹 利润计算

#### 8.4 自动记账
- 🤖 平台订单自动同步
  - 订单核销时自动记录收入
  - 平台服务费自动记录支出
- 💵 现金订单记录
  - 快速记录线下现金交易

**数据来源：**
- `account_transactions` 表（记账交易）
- `account_categories` 表（记账分类）
- `orders` 表（平台订单自动同步）

**数据库迁移：**
- `supabase/migrations/20251216111706_create_accounting_tables.sql`
- `supabase/migrations/20251216120000_create_accounting_triggers.sql`
- `supabase/migrations/20251216130000_create_advanced_analytics.sql`
- `supabase/migrations/20251216180000_modify_categories_for_custom_names.sql`
- `supabase/migrations/20251217000000_create_cash_orders_system.sql`

**相关文档：**
- `ACCOUNTING_README.md` - 完整功能说明
- `ACCOUNTING_IMPLEMENTATION_PLAN.md` - 实施计划
- `ACCOUNTING_SETUP_GUIDE.md` - 设置指南
- `ACCOUNTING_PHASE1-2_SUMMARY.md` - 阶段1-2总结
- `ACCOUNTING_PHASE3_SUMMARY.md` - 阶段3总结
- `ACCOUNTING_PHASE4_SUMMARY.md` - 阶段4总结
- `ACCOUNTING_PHASE5_SUMMARY.md` - 阶段5总结
- `ACCOUNTING_PHASE5_CHARTS_GUIDE.md` - 图表功能指南
- `ACCOUNTING_CATEGORIES_SUMMARY.md` - 分类功能总结

---

### 9. 快速记账 (Quick Entry) ⚡

**路由：** `/merchant/quick-entry`

**功能描述：**
- 快速记录日常收支，简化记账流程

**核心功能：**
- ⚡ 快速记账入口
  - 预设常用收支项目
  - 一键录入
- 💵 现金订单管理
  - 快速记录线下销售
  - 无需客户信息
- 📊 今日汇总
  - 今日收入总计
  - 今日支出总计
  - 今日净利润
- 📝 最近记录
  - 快速查看最新记账
  - 快速修改/删除

**数据来源：**
- `account_transactions` 表
- `cash_orders` 表（现金订单）

**数据库迁移：**
- `supabase/migrations/20251217000000_create_cash_orders_system.sql`

---

### 10. 钱包管理 (Wallet) 💳

**路由：** `/merchant/wallet`

**功能描述：**
- 商户平台钱包管理

**核心功能：**

#### 10.1 余额查询
- 💰 当前钱包余额展示
- 📊 余额变动趋势图

#### 10.2 充值功能
- ➕ 发起充值
  - 输入充值金额（最低 ฿500）
  - 生成 PromptPay QR 码
  - 扫码支付
- 📸 上传支付凭证
  - 拍照/选择截图
  - 自动上传到 Supabase Storage
- ✅ 凭证验证
  - Slip2Go API 自动验证
  - AI 识别支付金额
  - 验证收款方
  - 自动更新余额

#### 10.3 交易历史
- 📋 交易记录列表
  - 交易类型（充值/服务费/提现/红利）
  - 金额
  - 余额变动
  - 交易时间
  - 交易状态（待处理/成功/失败）
  - 描述/备注
- 🔍 交易筛选
  - 按类型筛选
  - 按状态筛选
  - 按日期范围筛选
- 📄 分页浏览

#### 10.4 提现功能（开发中）
- ⏳ 申请提现（UI 已存在，功能待实现）
- 💼 银行账户绑定
- 📝 提现记录

**交易类型：**
- `top_up` - 充值
- `commission` - 平台服务费扣款
- `withdraw` - 提现
- `bonus` - 新商户红利（注册送 ฿2,000）

**数据来源：**
- `merchant_transactions` 表

**API 端点：**
- `POST /api/merchant/recharge` - 创建充值交易
- `POST /api/merchant/verify-recharge` - 验证支付凭证
- `POST /api/topup-checkout` - Stripe 充值（双模式）
- `GET /api/merchant/transactions` - 获取交易历史

**外部服务集成：**
- Slip2Go API - 支付凭证验证
- PromptPay - 泰国本地支付
- Stripe - 国际支付（可选）

**相关文档：**
- `MERCHANT_PAYMENT_SYSTEM_DESIGN.md` - 支付体系设计

---

### 11. 员工管理 (Staff) 👥

**路由：** `/merchant/staff`

**功能描述：**
- 管理商户员工账号

**核心功能：**
- ➕ 添加员工
  - 通过手机号搜索用户
  - 发送员工邀请
- 📋 员工列表
  - 员工姓名
  - 手机号
  - 邮箱
  - 加入时间
- 🗑️ 移除员工
- 🔐 权限管理（待实现）
  - 角色分配
  - 功能权限控制

**数据来源：**
- `merchant_staff` 表
- `profiles` 表（用户信息）

**API 端点：**
- `GET /api/merchant/staff` - 获取员工列表
- `POST /api/merchant/staff` - 添加员工
- `DELETE /api/merchant/staff` - 删除员工

**安全验证：**
- 验证用户已注册 KUMMAK
- 防止添加自己为员工
- 防止重复添加
- RLS 权限控制（仅能管理自己商户的员工）

---

### 12. 核销中心 (Redeem) 📱

**路由：** `/merchant/redeem`

**功能描述：**
- 订单核销功能

**核心功能：**

#### 12.1 扫码核销
- 📷 调用相机扫描 QR 码
- 🔍 自动识别核销码
- ✅ 验证订单有效性
- ✔️ 确认核销

#### 12.2 手动输入核销
- ⌨️ 输入核销码
- 🔍 查询订单信息
- ✅ 确认核销

#### 12.3 核销记录
- 📋 今日核销列表
- 📊 核销统计
- 🕐 核销历史

#### 12.4 核销验证
- 🔒 验证订单状态（仅限 `paid` 状态）
- 🏪 验证商户归属
- ⏰ 验证有效期
- 🎫 防止重复核销

**核销流程：**
```
扫码/输入核销码
    ↓
查询订单信息
    ↓
验证订单状态、商户、有效期
    ↓
显示订单详情（商品、金额、客户）
    ↓
商户确认核销
    ↓
更新订单状态为 'used'
    ↓
记录核销时间
    ↓
（未来）扣除平台服务费
```

**数据来源：**
- `orders` 表

**API 端点：**
- `POST /api/merchant/redeem` - 核销订单
- `GET /api/merchant/redeem/verify` - 验证核销码

---

### 13. 店铺设置 (Settings) ⚙️

**路由：** `/merchant/settings`

**功能描述：**
- 商户账户和店铺配置

**核心功能：**

#### 13.1 账户信息
- 👤 商户账号信息展示
- 📧 邮箱
- 📱 手机号
- 🔐 修改密码

#### 13.2 店铺信息
- 🏪 店铺名称
- 📍 店铺地址
- 📞 联系电话
- 🆔 商户 ID
- 📝 店铺描述

#### 13.3 收款设置
- 💳 PromptPay ID 设置
  - 手机号/国民身份证号/税号
- 🏦 银行账户信息（提现用）

#### 13.4 KYC 认证（待实现）
- 📄 营业执照上传
- 🆔 身份证上传
- ✅ 认证状态
- 📊 认证进度

#### 13.5 店铺状态
- 🟢 营业状态
- ⏸️ 暂停营业开关
- 🔒 账户冻结状态

#### 13.6 语言设置
- 🌐 界面语言选择
  - 中文
  - ไทย (泰文)
  - English (英文)

**数据来源：**
- `merchants` 表
- `profiles` 表

**API 端点：**
- `PUT /api/merchant/settings` - 更新设置
- `PUT /api/merchant/settings/promptpay` - 更新收款设置

---

### 14. 商户注册/入驻 (Onboarding) 🎉

**路由：** `/merchant/onboarding`

**功能描述：**
- 新商户注册引导流程

**核心功能：**
- 📝 填写店铺基本信息
  - 店铺名称
  - 联系电话
  - 详细地址
- 🎁 新商户福利提示
  - 注册即送 ฿2,000 平台体验金
- ✅ 创建商户账号
  - 插入 `merchants` 表记录
  - 创建初始 `merchant_customizations` 记录
  - 发放新商户红利（`merchant_transactions` 记录）
- 🚀 跳转到仪表板

**新商户红利流程：**
```
用户注册 KUMMAK 账号
    ↓
进入商户入驻页面
    ↓
填写店铺信息
    ↓
提交注册
    ↓
创建 merchants 记录
    ↓
自动创建 merchant_transactions 记录：
  - type: 'bonus'
  - amount: 2000
  - description: '欢迎加入！新商户体验金'
  - status: 'completed'
    ↓
跳转到仪表板，显示余额 ฿2,000
```

**数据来源：**
- `merchants` 表
- `merchant_customizations` 表
- `merchant_transactions` 表

**API 端点：**
- `POST /api/merchant/onboard` - 创建商户

---

## 功能开发状态

### 已完成功能 ✅

| 功能模块 | 完成度 | 备注 |
|---------|-------|------|
| 仪表板 | 100% | 完整统计和图表 |
| 订单管理 | 100% | 列表、详情、搜索 |
| 产品管理 | 100% | CRUD + 多语言 + 字典搜索 |
| 产品分类 | 100% | CRUD + 排序 + 启用/禁用 |
| 店铺设计 | 100% | 样式定制 + Slug + 分享海报 |
| 优惠券管理 | 100% | CRUD + 套餐 |
| 评价管理 | 100% | 查看 + 回复 + 图片预览 |
| 财务记账 | 100% | 5 个阶段全部完成 |
| 快速记账 | 100% | 快速入口 + 现金订单 |
| 钱包管理 | 90% | 充值、交易历史完成，提现待开发 |
| 员工管理 | 80% | 添加、删除完成，权限管理待开发 |
| 核销中心 | 90% | 扫码、手动核销完成，服务费扣款待集成 |
| 店铺设置 | 80% | 基本设置完成，KYC 认证待开发 |
| 商户注册 | 100% | 完整流程 + 红利发放 |

### 待开发功能 ⏳

| 功能 | 优先级 | 预计工作量 |
|-----|-------|----------|
| 订阅计划管理 | 高 | 5-7 天 |
| 平台服务费自动扣款 | 高 | 2-3 天 |
| 商户提现功能 | 中 | 3-4 天 |
| 员工权限管理 | 中 | 2-3 天 |
| KYC 认证 | 中 | 3-5 天 |
| 数据导出（Excel/PDF） | 低 | 2-3 天 |
| 高级数据分析 | 低 | 5-7 天 |
| API 访问（开放平台） | 低 | 7-10 天 |

---

## 技术栈

### 前端框架
- **Next.js 14** - React 全栈框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **DaisyUI** - UI 组件库

### 国际化
- **next-intl** - i18n 框架
- 支持语言：中文、泰文、英文

### 状态管理
- React Hooks (useState, useEffect)
- Server Components (数据获取)

### 数据库
- **Supabase** - PostgreSQL 数据库
  - Row Level Security (RLS)
  - Real-time subscriptions
  - Storage (文件存储)

### 外部服务
- **PromptPay** - 泰国本地支付
- **Slip2Go API** - 支付凭证验证
- **Stripe** - 国际支付（可选）
- **Google Maps API** - 地图服务

### 图标库
- **Heroicons 2 (react-icons/hi2)** - 图标组件

---

## 页面路由映射

### 商户端路由结构

```
/merchant
├── /dashboard              # 仪表板
├── /onboarding            # 商户注册
├── /orders                # 订单管理
├── /products              # 产品管理
├── /product-categories    # 产品分类
├── /design                # 店铺设计
├── /coupons               # 优惠券管理
├── /reviews               # 评价管理
├── /accounting            # 财务记账
│   ├── /analytics        # 数据分析（子页面）
├── /quick-entry           # 快速记账
├── /wallet                # 钱包管理
├── /staff                 # 员工管理
├── /redeem                # 核销中心
└── /settings              # 店铺设置
```

### API 路由结构

```
/api
├── /checkout              # 客户下单（生成订单）
├── /confirm-payment       # 确认支付（测试用）
├── /merchant
│   ├── /recharge         # 充值（创建交易）
│   ├── /verify-recharge  # 验证充值凭证
│   ├── /staff            # 员工管理
│   │   ├── GET          # 获取员工列表
│   │   ├── POST         # 添加员工
│   │   └── DELETE       # 删除员工
│   ├── /redeem           # 核销订单
│   ├── /transaction
│   │   ├── /cancel      # 取消交易
│   │   └── /resume      # 恢复交易
│   └── /[merchantId]
│       └── /customization # 店铺定制设置
├── /products              # 产品 CRUD
├── /topup-checkout        # Stripe 充值
└── /product-dictionary    # 产品字典 API
```

---

## 数据库表关系

### 核心表

```
merchants (商户表)
├── 1:1 → merchant_customizations (店铺定制)
├── 1:M → merchant_categories (产品分类)
├── 1:M → products (产品)
├── 1:M → coupons (优惠券)
├── 1:M → orders (订单)
├── 1:M → merchant_staff (员工)
├── 1:M → merchant_transactions (钱包交易)
├── 1:M → account_transactions (财务记账)
└── 1:M → reviews (评价)

orders (订单表)
├── M:1 → merchants (所属商户)
├── M:1 → profiles (客户)
└── 1:M → order_items (订单明细)

products (产品表)
├── M:1 → merchants (所属商户)
├── M:1 → merchant_categories (分类)
└── M:1 → product_dictionary (字典)

account_transactions (记账表)
├── M:1 → merchants (所属商户)
└── M:1 → account_categories (分类)

merchant_transactions (钱包交易表)
└── M:1 → merchants (所属商户)
```

---

## 总结

### 功能统计

- ✅ **已完成功能模块：** 14 个
- ✅ **核心功能完成度：** 95%+
- ⏳ **待完善功能：** 8 个
- 📄 **数据库表：** 20+ 张
- 🌐 **API 端点：** 30+ 个
- 🌍 **支持语言：** 3 种（中/泰/英）

### 技术亮点

1. **完整的财务系统** - 5 阶段开发，功能完善
2. **多语言产品管理** - 产品字典 + 模糊搜索
3. **灵活的店铺定制** - 样式、颜色、布局可自定义
4. **智能支付验证** - Slip2Go AI 识别支付凭证
5. **新商户激励** - 注册送 ฿2,000 体验金
6. **本地化支付** - PromptPay 集成（泰国主流支付）
7. **实时数据分析** - 仪表板图表、趋势分析

### 商业模式

**现金流设计：**
```
客户 --付款--> 商户（PromptPay 直接到账）
商户 --充值--> 平台钱包
商户 --服务费--> 平台（从钱包扣除）
```

**收入来源：**
1. 平台服务费（订单核销时扣款，费率待定）
2. 订阅计划费用（Free/Pro/Enterprise，待实现）

---

**文档版本：** v1.0
**更新日期：** 2025-12-20
**维护者：** KUMMAK 开发团队
