// app/api/merchant/[merchantId]/customization/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> } // 注意：params 是 Promise
) {
  // 必须 await params
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

    // TODO: 这里添加实际的数据库保存逻辑
    console.log('✅ 数据验证通过，模拟保存成功');
    
    return NextResponse.json({ 
      success: true,
      message: '配置保存成功',
      merchantId: merchantId, // 使用解构后的 merchantId
      receivedData: body,
      updatedAt: new Date().toISOString()
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('❌ API 服务器错误:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { error: '内部服务器错误: ' + errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  // 必须 await params
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

    // 模拟返回数据
    return NextResponse.json({ 
      success: true,
      message: '获取配置成功',
      merchantId: merchantId, // 使用解构后的 merchantId
      data: {
        merchant_id: merchantId,
        plan_level: 'free',
        template_id: 'default',
        theme_primary_color: '#3b82f6',
        theme_secondary_color: '#ffffff',
        button_style: 'rounded',
        font_family: 'sans',
        display_config: {
          show_stock: true,
          show_sales_count: true,
          grid_cols: 2
        }
      }
    });

  } catch (error: unknown) {
    console.error('GET 方法错误:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { error: '内部服务器错误: ' + errorMessage },
      { status: 500 }
    );
  }
}