// app/api/merchant/[merchantId]/customization/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  const { merchantId } = await params;
  
  console.log('🔵 收到商家自定义配置更新请求:', {
    merchantId,
    timestamp: new Date().toISOString()
  });

  try {
    const supabase = await createSupabaseServerClient();
    
    // 检查用户认证状态
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('👤 用户认证信息:', { 
      userId: user?.id, 
      email: user?.email,
      authError 
    });

    if (authError || !user) {
      console.log('❌ 用户未认证');
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📦 请求数据:', JSON.stringify(body, null, 2));

    // 验证商户权限 - 确保用户只能更新自己的商户配置
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('merchant_id', merchantId)
      .eq('owner_id', user.id)
      .single();

    if (merchantError || !merchant) {
      console.log('❌ 商户权限验证失败:', merchantError);
      return NextResponse.json({ error: '没有权限更新此商户的配置' }, { status: 403 });
    }

    // 根据你的表结构准备数据
    const customizationData = {
      merchant_id: merchantId,
      plan_level: body.plan_level || 'free',
      template_id: body.template_id || 'default',
      theme_primary_color: body.theme_primary_color || '#3b82f6',
      theme_secondary_color: body.theme_secondary_color || '#ffffff',
      button_style: body.button_style || 'rounded',
      font_family: body.font_family || 'sans',
      cover_image_url: body.cover_image_url || null,
      background_image_url: body.background_image_url || null,
      announcement_text: body.announcement_text || null,
      display_config: body.display_config || {
        show_stock: true,
        show_sales_count: true,
        grid_cols: 2
      },
      // 你的表中有这些字段，但页面可能没有使用，可以设为默认值
      homepage_styles: body.homepage_styles || {},
      detail_page_styles: body.detail_page_styles || {},

    };

    console.log('🟡 准备保存到数据库的数据:', customizationData);

    // 使用 upsert 来插入或更新数据
    const { data, error: upsertError } = await supabase
      .from('merchant_customizations')
      .upsert(customizationData, {
        onConflict: 'merchant_id',
        ignoreDuplicates: false
      })
      .select();

    if (upsertError) {
      console.error('❌ 数据库保存失败:', upsertError);
      return NextResponse.json({ 
        success: false, 
        error: `数据库保存失败: ${upsertError.message}` 
      }, { status: 500 });
    }

    console.log('✅ 数据保存成功:', data);

    return NextResponse.json({ 
      success: true,
      message: '配置保存成功',
      merchantId: merchantId,
      data: data?.[0],
      updatedAt: new Date().toISOString()
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('❌ API 服务器错误:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { success: false, error: '内部服务器错误: ' + errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  const { merchantId } = await params;
  
  console.log('🔵 收到商家自定义配置获取请求:', {
    merchantId
  });

  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 从数据库获取配置
    const { data: customization, error: fetchError } = await supabase
      .from('merchant_customizations')
      .select('*')
      .eq('merchant_id', merchantId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 表示没有找到记录
      console.error('❌ 获取配置失败:', fetchError);
      return NextResponse.json({ 
        success: false, 
        error: `获取配置失败: ${fetchError.message}` 
      }, { status: 500 });
    }

    // 如果没有找到配置，返回默认配置
    if (!customization) {
      console.log('🟡 未找到配置，返回默认配置');
      return NextResponse.json({ 
        success: true,
        message: '获取配置成功',
        merchantId: merchantId,
        data: {
          merchant_id: merchantId,
          plan_level: 'free',
          template_id: 'default',
          theme_primary_color: '#3b82f6',
          theme_secondary_color: '#ffffff',
          button_style: 'rounded',
          font_family: 'sans',
          cover_image_url: null,
          background_image_url: null,
          announcement_text: null,
          display_config: {
            show_stock: true,
            show_sales_count: true,
            grid_cols: 2
          },
          homepage_styles: {},
          detail_page_styles: {}
        }
      });
    }

    console.log('✅ 获取配置成功:', customization);

    return NextResponse.json({ 
      success: true,
      message: '获取配置成功',
      merchantId: merchantId,
      data: customization
    });

  } catch (error: unknown) {
    console.error('GET 方法错误:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { success: false, error: '内部服务器错误: ' + errorMessage },
      { status: 500 }
    );
  }
}