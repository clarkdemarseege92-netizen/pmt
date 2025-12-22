-- 订单通知触发器
-- 当订单状态变化时自动发送推送通知

-- 创建通知发送函数（调用 Edge Function）
CREATE OR REPLACE FUNCTION notify_merchant_on_order_change()
RETURNS TRIGGER AS $$
DECLARE
  v_merchant_id UUID;
  v_notification_type TEXT;
  v_title_zh TEXT;
  v_title_en TEXT;
  v_title_th TEXT;
  v_body_zh TEXT;
  v_body_en TEXT;
  v_body_th TEXT;
  v_order_number TEXT;
  v_total_amount DECIMAL;
BEGIN
  -- 获取商户ID和订单信息
  v_merchant_id := NEW.merchant_id;
  v_order_number := NEW.order_number;
  v_total_amount := NEW.total_amount;

  -- 新订单创建
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    v_notification_type := 'order_new';
    v_title_zh := '收到新订单';
    v_title_en := 'New Order Received';
    v_title_th := 'ได้รับคำสั่งซื้อใหม่';
    v_body_zh := format('订单 #%s，金额 ฿%.2f', v_order_number, v_total_amount);
    v_body_en := format('Order #%s, Amount ฿%.2f', v_order_number, v_total_amount);
    v_body_th := format('คำสั่งซื้อ #%s จำนวน ฿%.2f', v_order_number, v_total_amount);

  -- 订单支付完成
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'paid' AND NEW.status = 'paid' THEN
    v_notification_type := 'order_paid';
    v_title_zh := '订单已支付';
    v_title_en := 'Order Payment Received';
    v_title_th := 'ได้รับการชำระเงินแล้ว';
    v_body_zh := format('订单 #%s 已完成支付，金额 ฿%.2f', v_order_number, v_total_amount);
    v_body_en := format('Order #%s payment confirmed, Amount ฿%.2f', v_order_number, v_total_amount);
    v_body_th := format('คำสั่งซื้อ #%s ชำระเงินเรียบร้อย จำนวน ฿%.2f', v_order_number, v_total_amount);

  -- 订单取消
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    v_notification_type := 'order_cancelled';
    v_title_zh := '订单已取消';
    v_title_en := 'Order Cancelled';
    v_title_th := 'คำสั่งซื้อถูกยกเลิก';
    v_body_zh := format('订单 #%s 已被取消', v_order_number);
    v_body_en := format('Order #%s has been cancelled', v_order_number);
    v_body_th := format('คำสั่งซื้อ #%s ถูกยกเลิกแล้ว', v_order_number);

  ELSE
    -- 不需要发送通知
    RETURN NEW;
  END IF;

  -- 插入通知记录（待发送状态）
  -- 实际发送由定时任务或 Edge Function 处理
  INSERT INTO notification_logs (
    merchant_id,
    title,
    body,
    notification_type,
    status,
    reference_type,
    reference_id,
    data
  ) VALUES (
    v_merchant_id,
    v_title_en,  -- 默认使用英文，客户端根据语言设置显示
    v_body_en,
    v_notification_type,
    'pending',
    'order',
    NEW.order_id::TEXT,
    jsonb_build_object(
      'order_id', NEW.order_id,
      'order_number', v_order_number,
      'total_amount', v_total_amount,
      'status', NEW.status,
      'titles', jsonb_build_object('zh', v_title_zh, 'en', v_title_en, 'th', v_title_th),
      'bodies', jsonb_build_object('zh', v_body_zh, 'en', v_body_en, 'th', v_body_th)
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建订单触发器
DROP TRIGGER IF EXISTS on_order_change_notify ON orders;
CREATE TRIGGER on_order_change_notify
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_merchant_on_order_change();

-- 优惠券/订单核销通知函数
-- 注意：系统中优惠券核销是通过 orders 表状态从 'paid' 变为 'used' 来实现的
CREATE OR REPLACE FUNCTION notify_merchant_on_order_used()
RETURNS TRIGGER AS $$
DECLARE
  v_merchant_id UUID;
  v_item_name TEXT;
  v_customer_name TEXT;
  v_order_number TEXT;
  v_coupon_id UUID;
BEGIN
  -- 只处理核销事件（status 从 paid 变为 used）
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' AND NEW.status = 'used' THEN
    v_merchant_id := NEW.merchant_id;
    v_order_number := NEW.order_number;
    v_coupon_id := NEW.coupon_id;

    -- 获取商品/优惠券名称
    IF v_coupon_id IS NOT NULL THEN
      SELECT COALESCE(c.name->>'en', c.name->>'th', 'Coupon')
      INTO v_item_name
      FROM coupons c
      WHERE c.coupon_id = v_coupon_id;
    ELSE
      -- 获取第一个订单项的商品名称
      SELECT COALESCE(p.name->>'en', p.name->>'th', 'Product')
      INTO v_item_name
      FROM order_items oi
      JOIN products p ON p.product_id = oi.product_id
      WHERE oi.order_id = NEW.order_id
      LIMIT 1;
    END IF;

    -- 获取客户名称（使用 profiles 表）
    SELECT COALESCE(pr.full_name, 'Customer')
    INTO v_customer_name
    FROM profiles pr
    WHERE pr.id = NEW.user_id;

    -- 如果没找到用户资料，使用默认值
    IF v_customer_name IS NULL THEN
      v_customer_name := 'Customer';
    END IF;

    -- 插入通知记录
    INSERT INTO notification_logs (
      merchant_id,
      title,
      body,
      notification_type,
      status,
      reference_type,
      reference_id,
      data
    ) VALUES (
      v_merchant_id,
      'Coupon Redeemed',
      format('Order #%s redeemed: %s', v_order_number, COALESCE(v_item_name, 'Item')),
      'coupon_redeemed',
      'pending',
      'order',
      NEW.order_id::TEXT,
      jsonb_build_object(
        'order_id', NEW.order_id,
        'order_number', v_order_number,
        'coupon_id', v_coupon_id,
        'item_name', v_item_name,
        'customer_name', v_customer_name,
        'redeemed_at', NOW(),
        'titles', jsonb_build_object(
          'zh', '订单已核销',
          'en', 'Order Redeemed',
          'th', 'คำสั่งซื้อถูกใช้แล้ว'
        ),
        'bodies', jsonb_build_object(
          'zh', format('订单 #%s 已核销: %s', v_order_number, COALESCE(v_item_name, '商品')),
          'en', format('Order #%s redeemed: %s', v_order_number, COALESCE(v_item_name, 'Item')),
          'th', format('คำสั่งซื้อ #%s ถูกใช้แล้ว: %s', v_order_number, COALESCE(v_item_name, 'สินค้า'))
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建订单核销触发器
DROP TRIGGER IF EXISTS on_order_used_notify ON orders;
CREATE TRIGGER on_order_used_notify
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (OLD.status = 'paid' AND NEW.status = 'used')
  EXECUTE FUNCTION notify_merchant_on_order_used();

-- 评价通知函数
CREATE OR REPLACE FUNCTION notify_merchant_on_review()
RETURNS TRIGGER AS $$
DECLARE
  v_merchant_id UUID;
  v_product_name TEXT;
  v_customer_name TEXT;
  v_rating INT;
BEGIN
  -- 获取商品和商户信息
  SELECT p.merchant_id, COALESCE(p.name->>'en', p.name->>'th', 'Product')
  INTO v_merchant_id, v_product_name
  FROM products p
  WHERE p.product_id = NEW.product_id;

  -- 获取客户名称（使用 profiles 表）
  SELECT COALESCE(pr.full_name, 'Customer')
  INTO v_customer_name
  FROM profiles pr
  WHERE pr.id = NEW.user_id;

  -- 如果没找到用户资料，使用默认值
  IF v_customer_name IS NULL THEN
    v_customer_name := 'Customer';
  END IF;

  v_rating := NEW.rating;

  -- 插入通知记录
  INSERT INTO notification_logs (
    merchant_id,
    title,
    body,
    notification_type,
    status,
    reference_type,
    reference_id,
    data
  ) VALUES (
    v_merchant_id,
    'New Review Received',
    format('%s left a %s-star review for %s', v_customer_name, v_rating, v_product_name),
    'review_received',
    'pending',
    'review',
    NEW.review_id::TEXT,
    jsonb_build_object(
      'review_id', NEW.review_id,
      'product_id', NEW.product_id,
      'product_name', v_product_name,
      'customer_name', v_customer_name,
      'rating', v_rating,
      'comment', NEW.comment,
      'titles', jsonb_build_object(
        'zh', '收到新评价',
        'en', 'New Review Received',
        'th', 'ได้รับรีวิวใหม่'
      ),
      'bodies', jsonb_build_object(
        'zh', format('%s 给 %s 留下了 %s 星评价', v_customer_name, v_product_name, v_rating),
        'en', format('%s left a %s-star review for %s', v_customer_name, v_rating, v_product_name),
        'th', format('%s ให้รีวิว %s ดาวสำหรับ %s', v_customer_name, v_rating, v_product_name)
      )
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建评价触发器
DROP TRIGGER IF EXISTS on_review_created_notify ON reviews;
CREATE TRIGGER on_review_created_notify
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_merchant_on_review();

-- 创建发送待处理通知的函数（用于定时任务调用）
CREATE OR REPLACE FUNCTION process_pending_notifications()
RETURNS TABLE (
  notification_id UUID,
  merchant_id UUID,
  notification_type TEXT,
  title TEXT,
  body TEXT,
  data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nl.id as notification_id,
    nl.merchant_id,
    nl.notification_type,
    nl.title,
    nl.body,
    nl.data
  FROM notification_logs nl
  WHERE nl.status = 'pending'
    AND nl.created_at > NOW() - INTERVAL '1 hour'  -- 只处理1小时内的通知
  ORDER BY nl.created_at ASC
  LIMIT 100;  -- 每次最多处理100条
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 更新通知状态的函数
CREATE OR REPLACE FUNCTION update_notification_status(
  p_notification_id UUID,
  p_status TEXT,
  p_expo_ticket_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE notification_logs
  SET
    status = p_status,
    expo_ticket_id = p_expo_ticket_id,
    error_message = p_error_message,
    sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END,
    updated_at = NOW()
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 添加注释
COMMENT ON FUNCTION notify_merchant_on_order_change() IS '订单状态变化时发送推送通知（新订单、支付、取消）';
COMMENT ON FUNCTION notify_merchant_on_order_used() IS '订单核销时发送推送通知';
COMMENT ON FUNCTION notify_merchant_on_review() IS '收到新评价时发送推送通知';
COMMENT ON FUNCTION process_pending_notifications() IS '获取待处理的通知列表';
COMMENT ON FUNCTION update_notification_status(UUID, TEXT, TEXT, TEXT) IS '更新通知发送状态';
