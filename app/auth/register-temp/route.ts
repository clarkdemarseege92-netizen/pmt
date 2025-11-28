// app/api/auth/register-temp/route.ts
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { CartItem } from '@/types/cart';

export async function POST(request: Request) {
  try {
    const { phone, temp_session_id, cart_items } = await request.json();
    
    console.log('注册临时用户请求:', { phone, temp_session_id, cart_items: cart_items?.length });

    // 验证手机号
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { error: '手机号是必填项' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // 1. 检查手机号是否已存在
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('id, phone')
      .eq('phone', phone)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 表示没有找到记录
      console.error('检查用户存在时出错:', checkError);
      return NextResponse.json(
        { error: '服务器错误' },
        { status: 500 }
      );
    }

    let userId: string;

    if (existingUser) {
      // 用户已存在，使用现有用户 ID
      userId = existingUser.id;
      console.log('用户已存在，使用现有用户:', userId);
    } else {
      // 2. 创建新用户
      const { data: newUser, error: createError } = await supabase
        .from('profiles')
        .insert({
          phone,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('创建用户失败:', createError);
        return NextResponse.json(
          { error: '注册失败，请重试' },
          { status: 400 }
        );
      }

      userId = newUser.id;
      console.log('新用户创建成功:', userId);
    }

    // 3. 迁移购物车数据（如果有）
    if (cart_items && cart_items.length > 0 && temp_session_id) {
      await saveUserCart(supabase, userId, temp_session_id, cart_items);
    }

    // 4. 返回用户信息
    const userData = {
      user_id: userId,
      phone: phone,
      is_temp: false,
      created_at: new Date()
    };

    console.log('注册成功，返回用户数据:', userData);

    return NextResponse.json(userData);

  } catch (error) {
    console.error('注册临时用户时发生错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// 保存用户购物车数据到数据库
async function saveUserCart(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string, 
  tempSessionId: string, 
  cartItems: CartItem[]
): Promise<void> {
  try {
    console.log('保存用户购物车数据:', {
      userId,
      tempSessionId,
      cartItemsCount: cartItems.length
    });

    // 保存购物车数据到 user_carts 表
    const { error } = await supabase
      .from('user_carts')
      .upsert({
        user_id: userId,
        session_id: tempSessionId,
        cart_data: cartItems,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('保存购物车数据失败:', error);
    } else {
      console.log('购物车数据保存成功');
    }

  } catch (error) {
    console.error('保存用户购物车时出错:', error);
  }
}

// 可选：添加 GET 请求处理来调试
export async function GET() {
  return NextResponse.json({ 
    message: '注册临时用户 API',
    usage: 'POST /api/auth/register-temp with { phone, temp_session_id, cart_items }'
  });
}