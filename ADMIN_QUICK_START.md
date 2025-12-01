# 管理员后台快速开始指南

## 🚀 快速上手（5分钟设置）

### 步骤 1: 初始化数据库

在 Supabase SQL Editor 中执行初始化脚本：

```bash
database/admin_setup.sql
```

这将会：
- ✅ 为 `profiles` 表添加 `role` 字段
- ✅ 创建角色约束和索引
- ✅ 为 `categories` 表添加 `icon` 和 `description` 字段
- ✅ 插入初始的行业分类数据（8个一级分类 + 50+个二级分类）

### 步骤 2: 配置 Google OAuth（必需）

在 Supabase Dashboard 中配置 Google OAuth：

1. 进入 Supabase Dashboard → Authentication → Providers
2. 找到 Google 提供商并启用它
3. 填入 Google OAuth 凭据：
   - **Client ID**: 从 Google Cloud Console 获取
   - **Client Secret**: 从 Google Cloud Console 获取
4. 保存设置

> 如何获取 Google OAuth 凭据，请参考 [Google OAuth 配置指南](https://supabase.com/docs/guides/auth/social-login/auth-google)

### 步骤 3: 创建管理员账户

#### 方法 A：使用 Google 账号登录后授权

1. 访问 `/admin-login` 页面
2. 点击"使用 Google 账号登录"
3. 首次登录会提示"您没有管理员权限"
4. 继续步骤 4 授予管理员权限

#### 方法 B：使用现有账户

使用你已经注册的账户

### 步骤 4: 授予管理员权限

在 Supabase SQL Editor 中执行：

```sql
-- 通过邮箱设置管理员权限
UPDATE profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);
```

或者先查看所有用户：

```sql
-- 查看所有用户
SELECT
  u.id,
  u.email,
  p.role,
  u.created_at
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at DESC;
```

然后通过 ID 设置：

```sql
-- 通过 ID 设置管理员权限
UPDATE profiles
SET role = 'admin'
WHERE id = 'YOUR_USER_ID_HERE';
```

### 步骤 5: 访问管理后台

1. 打开浏览器访问：
   ```
   http://localhost:3000/admin-login
   ```

   > **重要**：登录路径是 `/admin-login`（带连字符），不是 `/admin/login`

2. 点击"使用 Google 账号登录"按钮

3. 选择你的 Google 账户完成登录

4. 登录成功后将自动跳转到管理员仪表板

## 📁 功能模块

### 1. 管理员仪表板 (`/admin`)

- 查看平台数据统计
- 快捷操作入口
- 数据概览

### 2. 行业分类管理 (`/admin/categories`)

**功能：**
- ✅ 添加一级分类
- ✅ 添加二级分类
- ✅ 编辑分类（名称、图标、描述）
- ✅ 删除分类
- ✅ 树形展示

**示例分类：**
- 🍔 美食 → 泰餐、中餐、西餐、快餐...
- 🎮 休闲娱乐 → 电影院、KTV、酒吧...
- ✈️ 旅游 → 酒店住宿、景点门票...
- 💇 美容美发 → 美发、美容护肤、美甲...

### 3. 用户管理 (`/admin/users`)

（待实现）

### 4. 系统设置 (`/admin/settings`)

（待实现）

## 🔑 访问路径

| 路径 | 说明 |
|------|------|
| `/admin-login` | 管理员登录页面 |
| `/admin` | 管理员仪表板 |
| `/admin/categories` | 行业分类管理 |
| `/admin/users` | 用户管理 |
| `/admin/settings` | 系统设置 |

## 🔒 权限说明

### 用户角色

系统支持三种角色：

1. **user** (普通用户) - 默认角色
2. **merchant** (商户) - 商户用户
3. **admin** (管理员) - 超级管理员

### 权限验证

所有管理后台页面和 API 都会验证：
1. 用户是否已登录
2. 用户的 `role` 是否为 `admin`

未通过验证会自动重定向：
- 未登录 → `/admin-login`
- 非管理员 → `/`

## 📊 初始数据

初始化脚本会创建以下分类：

### 一级分类（8个）
1. 🍔 美食
2. 🎮 休闲娱乐
3. ✈️ 旅游
4. 🏠 生活服务
5. 💇 美容美发
6. 🛍️ 购物
7. 💪 运动健身
8. 📚 教育培训

### 二级分类（50+个）

每个一级分类下都有 5-9 个二级分类，例如：

**美食类：**
- 🍜 泰餐
- 🥟 中餐
- 🍕 西餐
- 🍱 日韩料理
- 🍔 快餐
- ☕ 咖啡茶饮
- 🍰 甜品烘焙
- 🍲 火锅烧烤
- 🦞 海鲜

**休闲娱乐类：**
- 🎬 电影院
- 🎤 KTV
- 🍺 酒吧
- 🎮 游戏厅
- 🎱 台球桌游
- 🔐 密室逃脱
- 📖 剧本杀

## 🛠️ API 端点

### 管理员认证

```bash
# 登录
POST /api/admin/login
{
  "email": "admin@example.com",
  "password": "your-password"
}

# 退出登录
POST /api/admin/logout
```

### 分类管理

```bash
# 获取所有分类
GET /api/admin/categories

# 创建分类
POST /api/admin/categories
{
  "name": "美食",
  "parent_id": null,
  "icon": "🍔",
  "description": "各类餐饮美食"
}

# 更新分类
PUT /api/admin/categories/[id]
{
  "name": "美食餐饮",
  "icon": "🍽️",
  "description": "更新后的描述"
}

# 删除分类
DELETE /api/admin/categories/[id]
```

## 🎨 UI 组件

使用 DaisyUI 组件库，包含：

- **导航**: navbar, dropdown, menu
- **布局**: card, divider
- **表单**: input, textarea, checkbox, button
- **反馈**: alert, modal, loading
- **数据**: table, badge, avatar

## 🔧 开发建议

### 1. 本地开发

```bash
# 启动开发服务器
npm run dev

# 访问管理后台
http://localhost:3000/admin-login
```

### 2. 数据库查询

```sql
-- 查看所有管理员
SELECT u.email, p.role
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE p.role = 'admin';

-- 查看分类统计
SELECT
  CASE WHEN parent_id IS NULL THEN '一级分类' ELSE '二级分类' END as level,
  COUNT(*) as count
FROM categories
GROUP BY CASE WHEN parent_id IS NULL THEN '一级分类' ELSE '二级分类' END;

-- 查看分类层级
SELECT
  main.name as "一级分类",
  main.icon as "图标",
  COUNT(sub.category_id) as "子分类数量"
FROM categories main
LEFT JOIN categories sub ON sub.parent_id = main.category_id
WHERE main.parent_id IS NULL
GROUP BY main.category_id, main.name, main.icon
ORDER BY main.name;
```

### 3. 安全检查

```sql
-- 检查是否有用户没有 role 字段
SELECT COUNT(*)
FROM profiles
WHERE role IS NULL;

-- 如果有，设置默认值
UPDATE profiles
SET role = 'user'
WHERE role IS NULL;
```

## 📝 常见问题

### Q1: 无法访问管理后台

**A:** 确保：
1. 用户已登录
2. profiles 表中该用户的 role 为 'admin'
3. 清除浏览器缓存后重试

### Q2: 登录后显示"您没有管理员权限"

**A:** 执行 SQL 设置管理员权限：
```sql
UPDATE profiles SET role = 'admin' WHERE id = 'YOUR_USER_ID';
```

### Q3: categories 表没有 icon 字段

**A:** 执行初始化脚本或手动添加：
```sql
ALTER TABLE categories ADD COLUMN icon text;
ALTER TABLE categories ADD COLUMN description text;
```

### Q4: 如何撤销管理员权限

**A:**
```sql
UPDATE profiles SET role = 'user' WHERE id = 'USER_ID';
```

## 📚 相关文档

- [管理后台详细说明](app/admin/README.md)
- [管理员登录说明](app/(admin-auth)/admin-login/README.md)
- [数据库初始化脚本](database/admin_setup.sql)

## 🎯 下一步

完成基础设置后，你可以：

1. ✅ 登录管理后台
2. ✅ 管理行业分类
3. ⏳ 添加更多分类
4. ⏳ 开发用户管理功能
5. ⏳ 开发商户管理功能
6. ⏳ 添加操作日志

## 💡 提示

- 管理员账户请使用强密码
- 定期备份分类数据
- 删除分类前确认没有关联数据
- 建议限制管理员数量
- 记录重要操作日志

---

**需要帮助？** 查看详细文档或联系技术支持。
