-- =====================================================
-- 推送通知系统数据库迁移
-- 文件: 20251224_create_push_notification_system.sql
-- 版本: v1.0
-- 日期: 2025-12-24
-- =====================================================

-- =====================================================
-- 第一部分：创建推送令牌表
-- =====================================================

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_id UUID REFERENCES merchants(merchant_id) ON DELETE CASCADE,
  token TEXT NOT NULL,                    -- Expo Push Token
  device_type TEXT NOT NULL,              -- 'ios' | 'android'
  device_name TEXT,                       -- 设备名称
  app_version TEXT,                       -- App 版本
  is_active BOOLEAN DEFAULT true,         -- 是否有效
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_merchant ON push_tokens(merchant_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);

-- 注释
COMMENT ON TABLE push_tokens IS '推送通知令牌表';
COMMENT ON COLUMN push_tokens.token IS 'Expo Push Token (ExponentPushToken[...])';
COMMENT ON COLUMN push_tokens.device_type IS '设备类型: ios 或 android';
COMMENT ON COLUMN push_tokens.is_active IS '令牌是否有效（用于禁用或过期）';

-- =====================================================
-- 第二部分：创建通知偏好设置表
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_id UUID REFERENCES merchants(merchant_id) ON DELETE CASCADE,

  -- 订单通知
  order_new BOOLEAN DEFAULT true,           -- 新订单
  order_paid BOOLEAN DEFAULT true,          -- 订单支付
  order_cancelled BOOLEAN DEFAULT true,     -- 订单取消

  -- 业务通知
  coupon_redeemed BOOLEAN DEFAULT true,     -- 优惠券核销
  review_received BOOLEAN DEFAULT true,     -- 收到评价

  -- 系统通知
  system_alert BOOLEAN DEFAULT true,        -- 系统通知
  marketing BOOLEAN DEFAULT false,          -- 营销推广（默认关闭）

  -- 订阅相关
  subscription_expiring BOOLEAN DEFAULT true,  -- 订阅即将到期
  subscription_expired BOOLEAN DEFAULT true,   -- 订阅已过期

  -- 财务相关
  balance_low BOOLEAN DEFAULT true,         -- 余额不足
  withdrawal_status BOOLEAN DEFAULT true,   -- 提现状态更新

  -- 免打扰时段
  dnd_enabled BOOLEAN DEFAULT false,        -- 是否启用免打扰
  dnd_start_time TIME DEFAULT '22:00',      -- 免打扰开始时间
  dnd_end_time TIME DEFAULT '08:00',        -- 免打扰结束时间

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_merchant ON notification_preferences(merchant_id);

-- 注释
COMMENT ON TABLE notification_preferences IS '用户通知偏好设置表';
COMMENT ON COLUMN notification_preferences.dnd_enabled IS '免打扰模式：启用后在指定时段内不发送推送';
COMMENT ON COLUMN notification_preferences.marketing IS '营销推广通知默认关闭，需用户主动开启';

-- =====================================================
-- 第三部分：创建通知记录表
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(merchant_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 通知内容
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,                              -- 附加数据 (screen, orderId, etc.)
  notification_type TEXT NOT NULL,         -- 通知类型

  -- 发送状态
  status TEXT DEFAULT 'pending',           -- pending/sent/delivered/failed/read
  expo_ticket_id TEXT,                     -- Expo 推送票据ID
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error_message TEXT,

  -- 关联信息
  reference_type TEXT,                     -- 关联类型 (order, coupon, review, subscription)
  reference_id TEXT,                       -- 关联ID

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_notification_logs_merchant ON notification_logs(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_unread ON notification_logs(user_id, read_at) WHERE read_at IS NULL;

-- 注释
COMMENT ON TABLE notification_logs IS '推送通知发送记录表';
COMMENT ON COLUMN notification_logs.status IS '状态: pending-待发送, sent-已发送, delivered-已送达, failed-失败, read-已读';
COMMENT ON COLUMN notification_logs.expo_ticket_id IS 'Expo Push Service 返回的票据ID，用于追踪送达状态';
COMMENT ON COLUMN notification_logs.data IS 'JSON格式附加数据，如 {"screen": "orders", "orderId": "xxx"}';

-- =====================================================
-- 第四部分：RLS 策略
-- =====================================================

-- 启用 RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- push_tokens 策略
CREATE POLICY "Users can view own push tokens" ON push_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens" ON push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens" ON push_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens" ON push_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- notification_preferences 策略
CREATE POLICY "Users can view own notification preferences" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences" ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- notification_logs 策略
CREATE POLICY "Users can view own notification logs" ON notification_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification logs" ON notification_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- 服务端写入策略（通过 service_role key）
CREATE POLICY "Service can insert notification logs" ON notification_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can insert push tokens" ON push_tokens
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 第五部分：辅助函数
-- =====================================================

-- 更新时间戳触发器函数
CREATE OR REPLACE FUNCTION update_push_tokens_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_notification_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_update_push_tokens_timestamp ON push_tokens;
CREATE TRIGGER trigger_update_push_tokens_timestamp
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_tokens_timestamp();

DROP TRIGGER IF EXISTS trigger_update_notification_preferences_timestamp ON notification_preferences;
CREATE TRIGGER trigger_update_notification_preferences_timestamp
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_timestamp();

-- =====================================================
-- 第六部分：获取用户推送令牌的函数
-- =====================================================

CREATE OR REPLACE FUNCTION get_merchant_push_tokens(p_merchant_id UUID)
RETURNS TABLE (
  token TEXT,
  user_id UUID,
  device_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pt.token,
    pt.user_id,
    pt.device_type
  FROM push_tokens pt
  WHERE pt.merchant_id = p_merchant_id
    AND pt.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_merchant_push_tokens IS '获取商户所有有效的推送令牌';

-- =====================================================
-- 第七部分：检查通知偏好的函数
-- =====================================================

CREATE OR REPLACE FUNCTION check_notification_preference(
  p_user_id UUID,
  p_notification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  pref_value BOOLEAN;
  is_dnd BOOLEAN;
  current_time_of_day TIME;
  dnd_start TIME;
  dnd_end TIME;
BEGIN
  -- 获取当前时间
  current_time_of_day := LOCALTIME;

  -- 获取用户偏好设置
  EXECUTE format(
    'SELECT %I, dnd_enabled, dnd_start_time, dnd_end_time FROM notification_preferences WHERE user_id = $1',
    p_notification_type
  ) INTO pref_value, is_dnd, dnd_start, dnd_end
  USING p_user_id;

  -- 如果没有设置偏好，默认允许（除了 marketing）
  IF pref_value IS NULL THEN
    IF p_notification_type = 'marketing' THEN
      RETURN false;
    ELSE
      RETURN true;
    END IF;
  END IF;

  -- 检查偏好是否开启
  IF NOT pref_value THEN
    RETURN false;
  END IF;

  -- 检查免打扰时段
  IF is_dnd THEN
    IF dnd_start < dnd_end THEN
      -- 正常时段 (如 22:00 - 08:00 跨天)
      IF current_time_of_day >= dnd_start OR current_time_of_day <= dnd_end THEN
        RETURN false;
      END IF;
    ELSE
      -- 跨天时段
      IF current_time_of_day >= dnd_start AND current_time_of_day <= dnd_end THEN
        RETURN false;
      END IF;
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_notification_preference IS '检查用户是否允许接收指定类型的通知（考虑偏好设置和免打扰时段）';

-- =====================================================
-- 第八部分：获取未读通知数量
-- =====================================================

CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM notification_logs
  WHERE user_id = p_user_id
    AND read_at IS NULL
    AND status IN ('sent', 'delivered');

  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_unread_notification_count IS '获取用户未读通知数量';

-- =====================================================
-- 第九部分：标记通知已读
-- =====================================================

CREATE OR REPLACE FUNCTION mark_notifications_read(
  p_user_id UUID,
  p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF p_notification_ids IS NULL THEN
    -- 标记所有未读为已读
    UPDATE notification_logs
    SET read_at = NOW()
    WHERE user_id = p_user_id
      AND read_at IS NULL;
  ELSE
    -- 标记指定通知为已读
    UPDATE notification_logs
    SET read_at = NOW()
    WHERE user_id = p_user_id
      AND id = ANY(p_notification_ids)
      AND read_at IS NULL;
  END IF;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_notifications_read IS '标记通知为已读，可指定ID列表或全部标记';

-- =====================================================
-- 迁移完成验证
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '推送通知系统数据库迁移完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '创建的表：';
  RAISE NOTICE '  - push_tokens (推送令牌表)';
  RAISE NOTICE '  - notification_preferences (通知偏好表)';
  RAISE NOTICE '  - notification_logs (通知记录表)';
  RAISE NOTICE '';
  RAISE NOTICE '创建的函数：';
  RAISE NOTICE '  - get_merchant_push_tokens()';
  RAISE NOTICE '  - check_notification_preference()';
  RAISE NOTICE '  - get_unread_notification_count()';
  RAISE NOTICE '  - mark_notifications_read()';
  RAISE NOTICE '========================================';
END $$;
