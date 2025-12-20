-- 订阅系统自动化任务支持表
-- 执行时间: 阶段 5 开始前

-- ============================================
-- 1. 通知表 (用于存储系统通知)
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title JSONB NOT NULL,    -- 多语言标题 {en, th, zh}
  message JSONB NOT NULL,  -- 多语言消息 {en, th, zh}
  data JSONB,              -- 额外数据
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 通知表索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 通知表 RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的通知
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- 用户可以更新自己的通知（标记已读）
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 2. 定时任务日志表 (用于记录 cron 任务执行结果)
-- ============================================
CREATE TABLE IF NOT EXISTS cron_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL,
  result JSONB,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 日志表索引
CREATE INDEX IF NOT EXISTS idx_cron_logs_job_name ON cron_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_logs_executed_at ON cron_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_logs_success ON cron_logs(success);

-- ============================================
-- 3. 更新订阅表添加锁定相关字段
-- ============================================
DO $$
BEGIN
  -- 添加 locked_at 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchant_subscriptions' AND column_name = 'locked_at'
  ) THEN
    ALTER TABLE merchant_subscriptions ADD COLUMN locked_at TIMESTAMPTZ;
  END IF;

  -- 添加 data_retention_until 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchant_subscriptions' AND column_name = 'data_retention_until'
  ) THEN
    ALTER TABLE merchant_subscriptions ADD COLUMN data_retention_until TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================
-- 4. 查询待提醒订阅的函数
-- ============================================
CREATE OR REPLACE FUNCTION get_trial_subscriptions_expiring_in_days(days_from_now INTEGER)
RETURNS TABLE (
  subscription_id UUID,
  merchant_id UUID,
  shop_name TEXT,
  owner_id UUID,
  trial_end_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.id as subscription_id,
    ms.merchant_id,
    m.shop_name,
    m.owner_id,
    ms.trial_end_date
  FROM merchant_subscriptions ms
  JOIN merchants m ON ms.merchant_id = m.merchant_id
  WHERE ms.status = 'trial'
    AND ms.trial_end_date::date = (CURRENT_DATE + days_from_now * INTERVAL '1 day')::date;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 5. 查询需要锁定的过期订阅函数
-- ============================================
CREATE OR REPLACE FUNCTION get_expired_subscriptions()
RETURNS TABLE (
  subscription_id UUID,
  merchant_id UUID,
  shop_name TEXT,
  owner_id UUID,
  status TEXT,
  expired_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  -- 试用期过期
  SELECT
    ms.id as subscription_id,
    ms.merchant_id,
    m.shop_name,
    m.owner_id,
    ms.status,
    ms.trial_end_date as expired_date
  FROM merchant_subscriptions ms
  JOIN merchants m ON ms.merchant_id = m.merchant_id
  WHERE ms.status = 'trial'
    AND ms.trial_end_date < NOW()

  UNION ALL

  -- 订阅期末取消已到期
  SELECT
    ms.id as subscription_id,
    ms.merchant_id,
    m.shop_name,
    m.owner_id,
    ms.status,
    ms.current_period_end as expired_date
  FROM merchant_subscriptions ms
  JOIN merchants m ON ms.merchant_id = m.merchant_id
  WHERE ms.status = 'canceled'
    AND ms.cancel_at_period_end = TRUE
    AND ms.current_period_end < NOW()

  UNION ALL

  -- 逾期超过7天
  SELECT
    ms.id as subscription_id,
    ms.merchant_id,
    m.shop_name,
    m.owner_id,
    ms.status,
    ms.current_period_end as expired_date
  FROM merchant_subscriptions ms
  JOIN merchants m ON ms.merchant_id = m.merchant_id
  WHERE ms.status = 'past_due'
    AND ms.current_period_end < (NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 6. 获取用户未读通知数量
-- ============================================
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  count_result INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_result
  FROM notifications
  WHERE user_id = p_user_id
    AND read = FALSE;

  RETURN count_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 7. 标记通知为已读
-- ============================================
CREATE OR REPLACE FUNCTION mark_notifications_as_read(p_user_id UUID, p_notification_ids UUID[] DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF p_notification_ids IS NULL THEN
    -- 标记所有通知为已读
    UPDATE notifications
    SET read = TRUE, read_at = NOW()
    WHERE user_id = p_user_id
      AND read = FALSE;
  ELSE
    -- 标记指定通知为已读
    UPDATE notifications
    SET read = TRUE, read_at = NOW()
    WHERE user_id = p_user_id
      AND id = ANY(p_notification_ids)
      AND read = FALSE;
  END IF;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 完成
-- ============================================
COMMENT ON TABLE notifications IS '系统通知表，存储用户的各类通知消息';
COMMENT ON TABLE cron_logs IS '定时任务日志表，记录 cron 任务的执行结果';
