-- ========================================
-- 管理员后台数据库初始化脚本
-- ========================================

-- 1. 为 profiles 表添加 role 字段（如果还没有）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE profiles ADD COLUMN role text DEFAULT 'user';
    END IF;
END $$;

-- 2. 创建角色检查约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'profiles_role_check'
    ) THEN
        ALTER TABLE profiles
        ADD CONSTRAINT profiles_role_check
        CHECK (role IN ('user', 'merchant', 'admin'));
    END IF;
END $$;

-- 3. 创建 role 字段索引
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 4. 为 categories 表添加额外字段（如果还没有）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'icon'
    ) THEN
        ALTER TABLE categories ADD COLUMN icon text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'description'
    ) THEN
        ALTER TABLE categories ADD COLUMN description text;
    END IF;
END $$;

-- ========================================
-- 插入初始行业分类数据
-- ========================================

-- 清空现有分类（可选，仅用于全新安装）
-- TRUNCATE TABLE categories CASCADE;

-- 插入一级分类
INSERT INTO categories (category_id, name, parent_id, icon, description)
VALUES
  (gen_random_uuid(), '美食', NULL, '🍔', '各类餐饮美食'),
  (gen_random_uuid(), '休闲娱乐', NULL, '🎮', '休闲娱乐活动'),
  (gen_random_uuid(), '旅游', NULL, '✈️', '旅游出行服务'),
  (gen_random_uuid(), '生活服务', NULL, '🏠', '日常生活服务'),
  (gen_random_uuid(), '美容美发', NULL, '💇', '美容美发护理'),
  (gen_random_uuid(), '购物', NULL, '🛍️', '购物消费'),
  (gen_random_uuid(), '运动健身', NULL, '💪', '运动健身活动'),
  (gen_random_uuid(), '教育培训', NULL, '📚', '教育培训课程')
ON CONFLICT DO NOTHING;

-- 获取一级分类ID并插入二级分类

-- 美食类二级分类
INSERT INTO categories (category_id, name, parent_id, icon, description)
SELECT
  gen_random_uuid(),
  subcategory.name,
  main.category_id,
  subcategory.icon,
  subcategory.description
FROM categories main
CROSS JOIN (
  VALUES
    ('泰餐', '🍜', '泰式料理'),
    ('中餐', '🥟', '中式料理'),
    ('西餐', '🍕', '西式料理'),
    ('日韩料理', '🍱', '日本韩国料理'),
    ('快餐', '🍔', '快餐速食'),
    ('咖啡茶饮', '☕', '咖啡和茶饮'),
    ('甜品烘焙', '🍰', '甜品蛋糕'),
    ('火锅烧烤', '🍲', '火锅烧烤'),
    ('海鲜', '🦞', '海鲜料理')
) AS subcategory(name, icon, description)
WHERE main.name = '美食' AND main.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- 休闲娱乐类二级分类
INSERT INTO categories (category_id, name, parent_id, icon, description)
SELECT
  gen_random_uuid(),
  subcategory.name,
  main.category_id,
  subcategory.icon,
  subcategory.description
FROM categories main
CROSS JOIN (
  VALUES
    ('电影院', '🎬', '电影观看'),
    ('KTV', '🎤', 'K歌娱乐'),
    ('酒吧', '🍺', '酒吧夜店'),
    ('游戏厅', '🎮', '电玩游戏'),
    ('台球桌游', '🎱', '台球桌游'),
    ('密室逃脱', '🔐', '密室逃脱'),
    ('剧本杀', '📖', '剧本杀')
) AS subcategory(name, icon, description)
WHERE main.name = '休闲娱乐' AND main.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- 旅游类二级分类
INSERT INTO categories (category_id, name, parent_id, icon, description)
SELECT
  gen_random_uuid(),
  subcategory.name,
  main.category_id,
  subcategory.icon,
  subcategory.description
FROM categories main
CROSS JOIN (
  VALUES
    ('酒店住宿', '🏨', '酒店民宿'),
    ('景点门票', '🎫', '景区门票'),
    ('旅行社', '🧳', '旅行社服务'),
    ('租车服务', '🚗', '汽车租赁'),
    ('户外活动', '🏕️', '户外探险')
) AS subcategory(name, icon, description)
WHERE main.name = '旅游' AND main.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- 生活服务类二级分类
INSERT INTO categories (category_id, name, parent_id, icon, description)
SELECT
  gen_random_uuid(),
  subcategory.name,
  main.category_id,
  subcategory.icon,
  subcategory.description
FROM categories main
CROSS JOIN (
  VALUES
    ('洗衣服务', '👔', '洗衣干洗'),
    ('家政服务', '🧹', '家政清洁'),
    ('维修服务', '🔧', '维修安装'),
    ('搬家服务', '📦', '搬家运输'),
    ('宠物服务', '🐕', '宠物护理'),
    ('摄影服务', '📷', '摄影拍照')
) AS subcategory(name, icon, description)
WHERE main.name = '生活服务' AND main.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- 美容美发类二级分类
INSERT INTO categories (category_id, name, parent_id, icon, description)
SELECT
  gen_random_uuid(),
  subcategory.name,
  main.category_id,
  subcategory.icon,
  subcategory.description
FROM categories main
CROSS JOIN (
  VALUES
    ('美发', '💇', '理发造型'),
    ('美容护肤', '💆', '美容护肤'),
    ('美甲', '💅', '美甲服务'),
    ('SPA按摩', '🧖', 'SPA按摩'),
    ('纹绣', '✨', '纹眉纹唇')
) AS subcategory(name, icon, description)
WHERE main.name = '美容美发' AND main.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- 购物类二级分类
INSERT INTO categories (category_id, name, parent_id, icon, description)
SELECT
  gen_random_uuid(),
  subcategory.name,
  main.category_id,
  subcategory.icon,
  subcategory.description
FROM categories main
CROSS JOIN (
  VALUES
    ('服装鞋包', '👕', '服装鞋包'),
    ('数码电器', '📱', '数码电器'),
    ('图书文具', '📚', '图书文具'),
    ('母婴用品', '👶', '母婴用品'),
    ('食品生鲜', '🥬', '食品生鲜')
) AS subcategory(name, icon, description)
WHERE main.name = '购物' AND main.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- 运动健身类二级分类
INSERT INTO categories (category_id, name, parent_id, icon, description)
SELECT
  gen_random_uuid(),
  subcategory.name,
  main.category_id,
  subcategory.icon,
  subcategory.description
FROM categories main
CROSS JOIN (
  VALUES
    ('健身房', '🏋️', '健身房'),
    ('瑜伽', '🧘', '瑜伽课程'),
    ('游泳', '🏊', '游泳馆'),
    ('球类运动', '⚽', '球类运动'),
    ('舞蹈', '💃', '舞蹈培训')
) AS subcategory(name, icon, description)
WHERE main.name = '运动健身' AND main.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- 教育培训类二级分类
INSERT INTO categories (category_id, name, parent_id, icon, description)
SELECT
  gen_random_uuid(),
  subcategory.name,
  main.category_id,
  subcategory.icon,
  subcategory.description
FROM categories main
CROSS JOIN (
  VALUES
    ('语言培训', '🗣️', '语言学习'),
    ('职业技能', '💼', '职业技能'),
    ('艺术培训', '🎨', '艺术培训'),
    ('学历教育', '🎓', '学历教育'),
    ('兴趣爱好', '🎸', '兴趣爱好')
) AS subcategory(name, icon, description)
WHERE main.name = '教育培训' AND main.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- ========================================
-- 设置第一个用户为管理员（示例）
-- 请替换为实际的用户ID
-- ========================================

-- 查看所有用户
-- SELECT id, email FROM auth.users;

-- 将指定用户设置为管理员
-- UPDATE profiles SET role = 'admin' WHERE id = 'YOUR_USER_ID_HERE';

-- ========================================
-- 完成
-- ========================================

-- 查询分类统计
SELECT
  CASE WHEN parent_id IS NULL THEN '一级分类' ELSE '二级分类' END as level,
  COUNT(*) as count
FROM categories
GROUP BY CASE WHEN parent_id IS NULL THEN '一级分类' ELSE '二级分类' END;

-- 查看所有分类层级结构
SELECT
  main.name as "一级分类",
  main.icon as "图标",
  COUNT(sub.category_id) as "子分类数量"
FROM categories main
LEFT JOIN categories sub ON sub.parent_id = main.category_id
WHERE main.parent_id IS NULL
GROUP BY main.category_id, main.name, main.icon
ORDER BY main.name;
