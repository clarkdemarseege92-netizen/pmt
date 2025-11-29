// 文件: /app/api/redeem/route.ts
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

// 定义返回的订单类型
type RedeemOrder = {
  order_id: string;
  status: string;
  purchase_price: number;
  merchant_id: string;
  merchants: {
    owner_id: string;
  } | null;
  // 关联信息 (用于返回给前端展示)
  coupons: { name: { th: string; en: string } } | null;
  order_items: { 
    quantity: number; 
    products: { name: { th: string; en: string } } | null 
  }[];
};

export async function POST(request: Request) {
  try {
    const { redemption_code } = await request.json();

    if (!redemption_code) {
      return NextResponse.json({ success: false, message: '核销码不能为空' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: '请先登录' }, { status: 401 });
    }

    // 1. 查找订单信息 (包含商户Owner信息，用于后续权限判断)
    // 这里使用 maybeSingle() 防止查不到报错，后面统一处理
    const { data: orderData, error: fetchError } = await supabase
      .from('orders')
      .select(`
        order_id,
        status,
        purchase_price,
        merchant_id,
        merchants (
          owner_id
        ),
        coupons (
          name
        ),
        order_items (
          quantity,
          products (
            name
          )
        )
      `)
      .eq('redemption_code', redemption_code)
      .maybeSingle();

    if (fetchError) {
      console.error('Redeem Fetch Error:', fetchError);
      return NextResponse.json({ success: false, message: '系统查询错误' }, { status: 500 });
    }

    if (!orderData) {
      return NextResponse.json({ success: false, message: '无效的核销码' }, { status: 404 });
    }

    const order = orderData as unknown as RedeemOrder;

    // 2. 检查订单状态
    if (order.status === 'used') {
      return NextResponse.json({ success: false, message: '该订单已核销，请勿重复操作' }, { status: 400 });
    }
    if (order.status !== 'paid') {
      return NextResponse.json({ success: false, message: `订单状态异常 (${order.status})，无法核销` }, { status: 400 });
    }

    // --- 3. 核心权限验证 (老板 OR 员工) ---
    let hasPermission = false;

    // 3.1 检查是否是老板
    // 注意：Supabase 返回的 merchants 可能是数组也可能是对象，取决于你的数据结构，这里做安全访问
    const merchantOwnerId = Array.isArray(order.merchants) 
      ? order.merchants[0]?.owner_id 
      : order.merchants?.owner_id;

    if (merchantOwnerId === user.id) {
      hasPermission = true;
    } else {
      // 3.2 如果不是老板，检查是否是该商户的员工
      const { data: staffData } = await supabase
        .from('merchant_staff')
        .select('id')
        .eq('merchant_id', order.merchant_id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (staffData) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return NextResponse.json({ success: false, message: '您无权核销此订单（非本店订单）' }, { status: 403 });
    }

    // 4. 执行核销 (更新状态)
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'used',
        // 如果你的 orders 表有 used_at 字段，建议取消下面这行的注释
        // used_at: new Date().toISOString() 
      })
      .eq('order_id', order.order_id);

    if (updateError) {
      console.error('Redeem Update Error:', updateError);
      return NextResponse.json({ success: false, message: '核销更新失败' }, { status: 500 });
    }

    // 5. 返回成功信息 (用于前端弹窗展示)
    // 构造一个友好的商品名称显示
    let itemName = "未知商品";
    if (order.coupons?.name?.th) {
        itemName = order.coupons.name.th;
    } else if (order.order_items && order.order_items.length > 0) {
        const firstProduct = order.order_items[0].products;
        itemName = firstProduct?.name?.th || "商品";
        if (order.order_items.length > 1) itemName += ` 等${order.order_items.length}件`;
    }

    return NextResponse.json({ 
      success: true, 
      message: '核销成功',
      order_details: {
        order_id: order.order_id,
        price: order.purchase_price,
        item_name: itemName
      }
    });

  } catch (error) {
    console.error('Redeem API Error:', error);
    return NextResponse.json({ success: false, message: '服务器内部错误' }, { status: 500 });
  }
}