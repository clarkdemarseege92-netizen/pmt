# 管理员账号设置指南

## 问题诊断

你遇到的问题：使用 Google 登录后被退出，这是因为你的账号没有管理员权限。

## 解决方案

### 步骤 1：在 Supabase 中设置管理员权限

1. **登录 Supabase Dashboard**
   - 访问：https://supabase.com/dashboard
   - 选择你的项目

2. **打开 SQL Editor**
   - 左侧菜单 → SQL Editor
   - 点击 "New query"

3. **执行以下 SQL 命令**

```sql
-- 方法 1：如果你已经知道你的用户 ID
UPDATE profiles
SET role = 'admin'
WHERE id = 'your-user-id-here';

-- 方法 2：通过邮箱查找并设置管理员（推荐）
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@gmail.com';

-- 方法 3：查看所有用户，找到你的账号
SELECT id, email, role FROM profiles;

-- 然后复制你的 user_id，使用方法 1 更新
```

### 步骤 2：验证设置

```sql
-- 确认你的账号已经是管理员
SELECT id, email, role
FROM profiles
WHERE email = 'your-email@gmail.com';

-- 应该返回 role = 'admin'
```

### 步骤 3：重新登录

1. 访问 `/admin-login`
2. 点击"使用 Google 账号登录"
3. 现在应该可以成功进入管理后台了

---

## 快速设置命令（复制粘贴）

**请将 `your-email@gmail.com` 替换为你的真实 Google 邮箱：**

```sql
-- 1. 查看你的账号是否存在
SELECT id, email, role FROM profiles WHERE email = 'your-email@gmail.com';

-- 2. 设置为管理员
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@gmail.com';

-- 3. 验证是否成功
SELECT id, email, role FROM profiles WHERE email = 'your-email@gmail.com';
```

---

## 常见问题

### Q1: 找不到我的账号怎么办？

**A:** 先用普通用户身份登录一次（访问 `/login`），系统会自动创建 profile 记录，然后再执行上面的 SQL 命令。

### Q2: 如何查看所有用户？

```sql
SELECT id, email, role, created_at
FROM profiles
ORDER BY created_at DESC;
```

### Q3: 如何添加多个管理员？

```sql
-- 批量设置
UPDATE profiles
SET role = 'admin'
WHERE email IN (
    'admin1@example.com',
    'admin2@example.com',
    'admin3@example.com'
);
```

### Q4: 如何取消管理员权限？

```sql
UPDATE profiles
SET role = 'user'
WHERE email = 'user@example.com';
```

---

## 管理员功能

设置为管理员后，你可以访问：

- `/admin` - 管理员仪表板
- `/admin/tools` - 管理员工具（批量更新商户位置等）
- `/admin/users` - 用户管理
- `/admin/categories` - 分类管理

---

## 安全建议

1. **不要公开分享管理员账号**
2. **定期检查管理员列表**：
   ```sql
   SELECT id, email, created_at
   FROM profiles
   WHERE role = 'admin';
   ```
3. **及时移除离职管理员的权限**

---

## 数据库表结构

`profiles` 表应该包含以下字段：

- `id` (uuid) - 用户 ID（外键关联 auth.users）
- `email` (text) - 邮箱
- `role` (text) - 角色：'user' | 'admin' | 'merchant'
- `created_at` (timestamp) - 创建时间

如果你的表结构不同，请根据实际情况调整 SQL 命令。
