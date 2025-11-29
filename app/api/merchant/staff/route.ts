// 文件: /app/api/merchant/staff/route.ts
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

// GET: 获取员工列表
// 【修复 1】移除未使用的 request 参数
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1. 获取当前用户的商户ID
  const { data: merchant } = await supabase
    .from('merchants')
    .select('merchant_id')
    .eq('owner_id', user.id)
    .single();

  if (!merchant) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });

  // 2. 获取该商户的所有员工 (联表查询 profile 信息)
  const { data: staff, error } = await supabase
    .from('merchant_staff')
    .select(`
      id,
      created_at,
      user_id,
      profiles (
        phone,
        email
      )
    `)
    .eq('merchant_id', merchant.merchant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, data: staff });
}

// POST: 添加员工 (通过手机号)
export async function POST(request: Request) {
  const { phone } = await request.json();
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. 获取商户信息
    const { data: merchant } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('owner_id', user.id)
      .single();

    if (!merchant) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });

    // 2. 查找目标用户 (根据手机号)
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ success: false, message: '未找到该手机号注册的用户，请确认对方已注册 PMT。' }, { status: 404 });
    }

    if (targetUser.id === user.id) {
        return NextResponse.json({ success: false, message: '您不能添加自己为员工。' }, { status: 400 });
    }

    // 3. 添加到 merchant_staff 表
    const { error: insertError } = await supabase
      .from('merchant_staff')
      .insert({
        merchant_id: merchant.merchant_id,
        user_id: targetUser.id
      });

    if (insertError) {
      if (insertError.code === '23505') { // 唯一性约束冲突
        return NextResponse.json({ success: false, message: '该用户已经是您的员工了。' }, { status: 400 });
      }
      throw insertError;
    }

    return NextResponse.json({ success: true, message: '添加成功' });

  } catch (error: unknown) { 
    // 【修复 2】使用 unknown 替代 any，并进行类型检查
    console.error(error);
    let errorMessage = '未知错误';
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String((error as { message: unknown }).message);
    }
    return NextResponse.json({ success: false, message: '操作失败: ' + errorMessage }, { status: 500 });
  }
}

// DELETE: 删除员工
export async function DELETE(request: Request) {
  const { staffId } = await request.json();
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 安全检查：RLS 会确保只能删除自己商户下的记录
  const { error } = await supabase
    .from('merchant_staff')
    .delete()
    .eq('id', staffId);

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

  return NextResponse.json({ success: true, message: '删除成功' });
}