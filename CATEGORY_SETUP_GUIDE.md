# 分类管理功能完整设置指南

## 📋 当前问题

根据 VS 日志显示的错误：

1. ❌ **Storage 权限问题**：`new row violates row-level security policy`
2. ❌ **数据库字段缺失**：`Could not find the 'description' column`

## ✅ 完整解决方案

### 步骤 1：执行完整修复脚本

1. 打开 **Supabase Dashboard** → **SQL Editor**
2. 点击 **"New query"**
3. 复制下面的完整脚本并粘贴
4. 点击 **"Run"** 执行

```sql
-- ========================================
-- 完整修复脚本
-- ========================================

-- 第一部分：修复 categories 表
-- ========================================

-- 1. 添加 description 字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'description'
    ) THEN
        ALTER TABLE categories ADD COLUMN description text;
    END IF;
END $$;

-- 2. 添加 icon_url 字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'icon_url'
    ) THEN
        ALTER TABLE categories ADD COLUMN icon_url text;
    END IF;
END $$;

-- 3. 添加 is_active 字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE categories ADD COLUMN is_active boolean DEFAULT true;
    END IF;
END $$;

-- 4. 添加 sort_order 字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE categories ADD COLUMN sort_order integer DEFAULT 0;
    END IF;
END $$;

-- 5. 创建索引
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);

-- 6. 更新现有数据
UPDATE categories SET is_active = true WHERE is_active IS NULL;

-- 第二部分：配置 Storage
-- ========================================

-- 1. 创建或更新 bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets',
  'public-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- 2. 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload to public-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update public-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete from public-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to public-assets" ON storage.objects;

-- 3. 创建新策略

-- 允许所有人读取
CREATE POLICY "Public read access to public-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-assets');

-- 允许管理员上传
CREATE POLICY "Admin can upload to public-assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'public-assets'
  AND auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);

-- 允许管理员更新
CREATE POLICY "Admin can update public-assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'public-assets'
  AND auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);

-- 允许管理员删除
CREATE POLICY "Admin can delete from public-assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'public-assets'
  AND auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);

-- 第三部分：验证配置
-- ========================================

-- 查看 categories 表结构
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;
```

### 步骤 2：验证结果

执行后，你应该看到 categories 表包含以下字段：

- ✅ `category_id`
- ✅ `name`
- ✅ `parent_id`
- ✅ `icon`
- ✅ `description` ⬅️ 新增
- ✅ `icon_url` ⬅️ 新增
- ✅ `is_active` ⬅️ 新增
- ✅ `sort_order` ⬅️ 新增
- ✅ `created_at`

### 步骤 3：检查 Storage Bucket

1. 进入 **Supabase Dashboard** → **Storage**
2. 应该看到 `public-assets` bucket
3. 确认它是 **Public** 的（图标应该有一个地球符号 🌐）

### 步骤 4：重新测试

1. 刷新管理后台：`http://localhost:3000/admin/categories`
2. 点击"添加一级分类"
3. 尝试上传图片

---

## 🔍 如果还是失败 - 运行诊断

在 Supabase SQL Editor 执行以下诊断查询：

```sql
-- 诊断查询 1：检查字段是否存在
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'categories'
AND column_name IN ('description', 'icon_url', 'is_active', 'sort_order');

-- 诊断查询 2：检查 bucket
SELECT id, name, public
FROM storage.buckets
WHERE id = 'public-assets';

-- 诊断查询 3：检查当前用户角色
SELECT
    auth.uid() as user_id,
    p.email,
    p.role
FROM public.profiles p
WHERE p.id = auth.uid();

-- 诊断查询 4：检查 Storage 策略
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND policyname LIKE '%public-assets%';
```

**预期结果：**

- 诊断查询 1：应该返回 4 行（4个字段）
- 诊断查询 2：应该返回 1 行，`public = true`
- 诊断查询 3：应该显示你的用户信息，`role = 'admin'`
- 诊断查询 4：应该返回 4 行（4个策略）

---

## 🐛 常见问题排查

### 问题 1：`Could not find the 'description' column`

**原因**：数据库字段未添加
**解决**：执行步骤 1 的 SQL 脚本

### 问题 2：`Bucket not found`

**原因**：Storage bucket 不存在
**解决**：执行步骤 1 的 SQL 脚本，它会自动创建

### 问题 3：`new row violates row-level security policy`

**原因**：Storage 权限策略配置错误
**解决**：

1. 确认你的账户 `role = 'admin'`
2. 执行步骤 1 的 SQL 脚本重新创建策略
3. 如果还是失败，尝试临时使用宽松策略：

```sql
-- 临时方案：允许所有认证用户上传（仅用于测试）
DROP POLICY IF EXISTS "Temp - Authenticated can upload" ON storage.objects;

CREATE POLICY "Temp - Authenticated can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'public-assets'
  AND auth.role() = 'authenticated'
);
```

测试成功后，删除临时策略，恢复到只允许管理员上传的策略。

---

## 📸 功能说明

### 图标上传功能

- **支持格式**：JPG, PNG, GIF, WebP
- **最大大小**：5MB
- **存储位置**：`public-assets/category-icons/`
- **访问方式**：公开 URL

### 分类显示控制

- **显示中**：`is_active = true`，在平台显示
- **已隐藏**：`is_active = false`，不在平台显示
- 点击按钮即可切换状态

---

## 📞 需要帮助？

如果执行上述步骤后还有问题，请提供：

1. 诊断查询的结果
2. VS 日志中的完整错误信息
3. 你的 Supabase 项目是否启用了 RLS（行级安全）

我会帮你进一步排查！
