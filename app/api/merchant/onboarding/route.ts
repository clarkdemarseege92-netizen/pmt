// 文件: /app/api/merchant/onboarding/route.ts
// 商户入驻 API - 使用 Admin 客户端绕过 RLS

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 创建 Admin 客户端 (绕过 RLS)
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin credentials');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shopName, address, phone } = body;

    // 验证必填字段
    if (!shopName || !address || !phone) {
      return NextResponse.json(
        { success: false, message: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    // 获取当前用户
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    // 使用 Admin 客户端来创建商户（绕过 RLS）
    const supabaseAdmin = createAdminClient();

    // 检查用户是否已经有商户
    const { data: existingMerchant } = await supabaseAdmin
      .from('merchants')
      .select('merchant_id')
      .eq('owner_id', user.id)
      .single();

    if (existingMerchant) {
      return NextResponse.json(
        { success: false, message: '您已经创建了商户' },
        { status: 400 }
      );
    }

    // 1. 创建商户记录
    const { data: newMerchant, error: insertError } = await supabaseAdmin
      .from('merchants')
      .insert({
        owner_id: user.id,
        shop_name: shopName,
        address: address,
        contact_phone: phone,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create merchant:', insertError);
      return NextResponse.json(
        { success: false, message: '创建商户失败: ' + insertError.message },
        { status: 500 }
      );
    }

    // 2. 升级用户角色为商户
    const { error: rpcError } = await supabaseAdmin.rpc('set_role_to_merchant', {
      user_uuid: user.id,
    });

    if (rpcError) {
      console.error('Failed to upgrade user role:', rpcError);
      // 不阻止流程，继续
    }

    // 3. 创建默认记账分类（如果触发器失败了，手动创建）
    const defaultCategories = [
      // 收入分类
      { type: 'income', name: 'sales', custom_name: null, icon: 'cash', sort_order: 1 },
      { type: 'income', name: 'service', custom_name: null, icon: 'briefcase', sort_order: 2 },
      { type: 'income', name: 'other_income', custom_name: null, icon: 'trending-up', sort_order: 3 },
      // 支出分类
      { type: 'expense', name: 'supplies', custom_name: null, icon: 'cube', sort_order: 1 },
      { type: 'expense', name: 'utilities', custom_name: null, icon: 'flash', sort_order: 2 },
      { type: 'expense', name: 'rent', custom_name: null, icon: 'home', sort_order: 3 },
      { type: 'expense', name: 'salary', custom_name: null, icon: 'people', sort_order: 4 },
      { type: 'expense', name: 'transport', custom_name: null, icon: 'car', sort_order: 5 },
      { type: 'expense', name: 'food', custom_name: null, icon: 'restaurant', sort_order: 6 },
      { type: 'expense', name: 'other_expense', custom_name: null, icon: 'ellipsis-horizontal', sort_order: 7 },
    ];

    // 检查是否已有分类（可能触发器已创建）
    const { data: existingCategories } = await supabaseAdmin
      .from('account_categories')
      .select('category_id')
      .eq('merchant_id', newMerchant.merchant_id)
      .limit(1);

    if (!existingCategories || existingCategories.length === 0) {
      // 创建默认分类
      const categoriesToInsert = defaultCategories.map(cat => ({
        merchant_id: newMerchant.merchant_id,
        type: cat.type,
        name: cat.name,
        custom_name: cat.custom_name,
        icon: cat.icon,
        sort_order: cat.sort_order,
        is_system: true,
        is_active: true,
      }));

      const { error: catError } = await supabaseAdmin
        .from('account_categories')
        .insert(categoriesToInsert);

      if (catError) {
        console.error('Failed to create default categories:', catError);
        // 不阻止流程
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        merchant_id: newMerchant.merchant_id,
        shop_name: newMerchant.shop_name,
      },
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
