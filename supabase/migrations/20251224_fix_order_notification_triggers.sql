-- 修复订单通知触发器
-- 问题1：触发器函数尝试访问 orders.order_number，但该字段不存在
-- 问题2：PostgreSQL format() 不支持 %.2f 格式
-- 解决：使用 redemption_code 作为订单号，使用字符串连接代替 format()

-- 修复订单状态变化通知函数
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
  v_amount_str TEXT;
BEGIN
  -- 获取商户ID和订单信息
  v_merchant_id := NEW.merchant_id;
  -- 使用 redemption_code 作为订单号（orders 表没有 order_number 字段）
  v_order_number := COALESCE(NEW.redemption_code, SUBSTRING(NEW.order_id::TEXT FROM 1 FOR 8));
  v_total_amount := NEW.purchase_price;
  -- 格式化金额为字符串
  v_amount_str := to_char(v_total_amount, 'FM999999990.00');

  -- 新订单创建
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    v_notification_type := 'order_new';
    v_title_zh := '收到新订单';
    v_title_en := 'New Order Received';
    v_title_th := 'ได้รับคำสั่งซื้อใหม่';
    v_body_zh := '订单 #' || v_order_number || '，金额 ฿' || v_amount_str;
    v_body_en := 'Order #' || v_order_number || ', Amount ฿' || v_amount_str;
    v_body_th := 'คำสั่งซื้อ #' || v_order_number || ' จำนวน ฿' || v_amount_str;

  -- 订单支付完成
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'paid' AND NEW.status = 'paid' THEN
    v_notification_type := 'order_paid';
    v_title_zh := '订单已支付';
    v_title_en := 'Order Payment Received';
    v_title_th := 'ได้รับการชำระเงินแล้ว';
    v_body_zh := '订单 #' || v_order_number || ' 已完成支付，金额 ฿' || v_amount_str;
    v_body_en := 'Order #' || v_order_number || ' payment confirmed, Amount ฿' || v_amount_str;
    v_body_th := 'คำสั่งซื้อ #' || v_order_number || ' ชำระเงินเรียบร้อย จำนวน ฿' || v_amount_str;

  -- 订单取消
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    v_notification_type := 'order_cancelled';
    v_title_zh := '订单已取消';
    v_title_en := 'Order Cancelled';
    v_title_th := 'คำสั่งซื้อถูกยกเลิก';
    v_body_zh := '订单 #' || v_order_number || ' 已被取消';
    v_body_en := 'Order #' || v_order_number || ' has been cancelled';
    v_body_th := 'คำสั่งซื้อ #' || v_order_number || ' ถูกยกเลิกแล้ว';

  ELSE
    -- 不需要发送通知
    RETURN NEW;
  END IF;

  -- 插入通知记录（待发送状态）
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
    v_title_en,
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

-- 修复订单核销通知函数
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
    -- 使用 redemption_code 作为订单号（orders 表没有 order_number 字段）
    v_order_number := COALESCE(NEW.redemption_code, SUBSTRING(NEW.order_id::TEXT FROM 1 FOR 8));
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
    WHERE pr.id = NEW.customer_id;

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
      'Order #' || v_order_number || ' redeemed: ' || COALESCE(v_item_name, 'Item'),
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
          'zh', '订单 #' || v_order_number || ' 已核销: ' || COALESCE(v_item_name, '商品'),
          'en', 'Order #' || v_order_number || ' redeemed: ' || COALESCE(v_item_name, 'Item'),
          'th', 'คำสั่งซื้อ #' || v_order_number || ' ถูกใช้แล้ว: ' || COALESCE(v_item_name, 'สินค้า')
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 添加注释
COMMENT ON FUNCTION notify_merchant_on_order_change() IS '订单状态变化时发送推送通知（新订单、支付、取消）- 已修复使用 redemption_code 和字符串连接';
COMMENT ON FUNCTION notify_merchant_on_order_used() IS '订单核销时发送推送通知 - 已修复使用 redemption_code 和字符串连接';
