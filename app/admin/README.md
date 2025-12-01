# 管理员后台使用说明

## 概述

超级管理员后台用于管理整个平台的核心数据，包括行业分类、用户、商户等。

## 功能模块

### 1. 行业分类管理 (`/admin/categories`)

管理平台的行业分类体系，支持两级分类结构。

#### 功能特性：
- ✅ 添加一级分类（如：美食、休闲娱乐、旅游等）
- ✅ 为一级分类添加二级分类（如：美食 > 泰餐、中餐、西餐等）
- ✅ 编辑分类信息（名称、图标、描述）
- ✅ 删除分类（需先删除所有子分类）
- ✅ 树形展示分类层级
- ✅ **图标上传**：支持上传图片或使用 Emoji 表情作为图标
- ✅ **显示控制**：可控制分类是否在平台显示（显示中/已隐藏）
- ✅ **排序功能**：支持自定义分类排序顺序

#### 分类示例：

**一级分类：**
- 🍔 美食
- 🎮 休闲娱乐
- ✈️ 旅游
- 🏠 生活服务
- 💇 美容美发

**二级分类（美食下）：**
- 🍜 泰餐
- 🥟 中餐
- 🍕 西餐
- 🍔 快餐
- ☕ 咖啡茶饮

### 2. 仪表板 (`/admin`)

显示平台整体数据统计和快捷操作入口。

## 权限要求

访问管理员后台需要满足以下条件：

1. 用户必须已登录
2. 用户在 `profiles` 表中的 `role` 字段必须为 `'admin'`

## 设置管理员权限

在 Supabase 数据库中执行以下 SQL 来将用户设置为管理员：

\`\`\`sql
-- 将指定用户设置为管理员
UPDATE profiles
SET role = 'admin'
WHERE id = 'YOUR_USER_ID';
\`\`\`

## 数据库表结构

### categories 表

| 字段 | 类型 | 说明 |
|------|------|------|
| category_id | uuid | 主键 |
| name | text | 分类名称 |
| parent_id | uuid | 父分类ID（一级分类为null） |
| icon | text | 图标（emoji表情） |
| description | text | 分类描述 |
| **icon_url** | text | **图标图片URL（优先于emoji显示）** |
| **is_active** | boolean | **是否在平台显示（默认true）** |
| **sort_order** | integer | **排序顺序（默认0）** |
| created_at | timestamp | 创建时间 |

### profiles 表（需要添加 role 字段）

如果 `profiles` 表中还没有 `role` 字段，需要添加：

\`\`\`sql
-- 添加 role 字段
ALTER TABLE profiles
ADD COLUMN role text DEFAULT 'user';

-- 创建索引
CREATE INDEX idx_profiles_role ON profiles(role);

-- 添加检查约束
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('user', 'merchant', 'admin'));
\`\`\`

## API 路由

### 分类管理 API

**获取所有分类**
\`\`\`
GET /api/admin/categories
\`\`\`

**创建新分类**
\`\`\`
POST /api/admin/categories
Body: {
  name: string,
  parent_id?: string | null,
  icon?: string,
  description?: string,
  icon_url?: string,      // 新增：图标图片URL
  is_active?: boolean,    // 新增：是否显示（默认true）
  sort_order?: integer    // 新增：排序顺序（默认0）
}
\`\`\`

**更新分类**
\`\`\`
PUT /api/admin/categories/[id]
Body: {
  name?: string,
  icon?: string,
  description?: string,
  icon_url?: string,      // 新增：图标图片URL
  is_active?: boolean,    // 新增：是否显示
  sort_order?: integer    // 新增：排序顺序
}
\`\`\`

**删除分类**
\`\`\`
DELETE /api/admin/categories/[id]
\`\`\`

**上传图标图片**
\`\`\`
POST /api/admin/upload
Content-Type: multipart/form-data
Body: {
  file: File  // 图片文件（JPG, PNG, GIF, WebP，最大5MB）
}
Response: {
  success: true,
  url: string,     // 公开访问URL
  path: string     // Storage路径
}
\`\`\`

## 安全注意事项

1. 所有 API 路由都会验证用户是否为管理员
2. 删除分类前会检查是否有子分类
3. 建议定期备份分类数据
4. 不要随意授予管理员权限

## 使用流程

1. 以管理员账户登录
2. 访问 `/admin` 进入管理后台
3. 点击"行业分类管理"进入分类管理页面
4. 点击"添加一级分类"创建主分类
5. 在主分类行点击"添加子分类"创建二级分类
6. 使用编辑和删除按钮管理现有分类

## 技术栈

- **前端框架**: Next.js 16 + React
- **UI 库**: DaisyUI (TailwindCSS)
- **图标**: React Icons (HeroIcons 2)
- **数据库**: Supabase (PostgreSQL)
- **认证**: Supabase Auth

## 故障排除

### 问题：无法访问管理后台
**解决方案**：
1. 确认用户已登录
2. 检查 `profiles` 表中该用户的 `role` 是否为 `'admin'`
3. 清除浏览器缓存并重新登录

### 问题：无法删除分类
**解决方案**：
1. 检查该分类是否有子分类，需先删除所有子分类
2. 检查是否有商户或商品关联到该分类

## 重要配置

### Supabase Storage 配置

分类图标上传功能需要配置 Supabase Storage：

1. **创建 Storage Bucket**：
   - Bucket 名称：`public-assets`
   - 公开访问：✅ 启用
   - 文件大小限制：5MB
   - 允许的 MIME 类型：`image/*`

2. **配置权限策略**：
   执行 `database/complete_fix.sql` 中的 SQL 脚本

3. **验证配置**：
   - 进入 Supabase Dashboard → Storage
   - 确认 `public-assets` bucket 存在且为公开

### 数据库初始化

执行以下脚本添加新字段：

\`\`\`bash
# 执行完整修复脚本
database/complete_fix.sql
\`\`\`

或参考详细指南：
\`\`\`bash
# 查看详细设置指南
CATEGORY_SETUP_GUIDE.md
\`\`\`

## 未来扩展

可以考虑添加以下功能：
- ✅ ~~批量导入/导出分类~~
- ✅ ~~分类排序功能~~ （已完成）
- ✅ ~~分类图片上传~~ （已完成）
- ✅ ~~分类显示控制~~ （已完成）
- 分类使用统计
- 操作日志记录
- 拖拽排序功能
