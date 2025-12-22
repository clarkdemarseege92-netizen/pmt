// 文件: /app/api/merchant/staff/route.ts
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// 创建 Admin 客户端 (绕过 RLS)
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin credentials');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

// 从 Authorization header 或 cookie 获取用户
async function getAuthenticatedUser() {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');

  // 如果有 Bearer token (移动端)
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const supabaseAdmin = createAdminClient();
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user;
  }

  // 否则使用 cookie (网页端)
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET: 获取员工列表
export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1. 获取当前用户的商户ID (使用 Admin 客户端)
  const supabaseAdmin = createAdminClient();
  const { data: merchant } = await supabaseAdmin
    .from('merchants')
    .select('merchant_id')
    .eq('owner_id', user.id)
    .single();

  if (!merchant) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });

  // 2. 使用 Admin 客户端获取员工列表 (绕过 RLS 获取其他用户的 profiles)
  const { data: staff, error } = await supabaseAdmin
    .from('merchant_staff')
    .select(`
      id,
      created_at,
      user_id,
      profiles (
        phone,
        email,
        avatar_url,
        full_name
      )
    `)
    .eq('merchant_id', merchant.merchant_id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, data: staff });
}

// 格式化泰国手机号为国际格式 (66xxxxxxxxx)
function formatThaiPhone(phone: string): string {
  // 移除所有非数字字符
  const digits = phone.replace(/\D/g, '');

  // 如果以 0 开头 (本地格式)，替换为 66
  if (digits.startsWith('0')) {
    return '66' + digits.substring(1);
  }

  // 如果以 66 开头，直接返回
  if (digits.startsWith('66')) {
    return digits;
  }

  // 如果是9位数字（没有前缀），添加66
  if (digits.length === 9) {
    return '66' + digits;
  }

  // 其他情况直接返回
  return digits;
}

// POST: 添加员工 (通过手机号)
export async function POST(request: Request) {
  console.log('🟢 POST /api/merchant/staff - Request received');

  const body = await request.json();
  console.log('📥 Request body:', body);

  const { phone: rawPhone } = body;
  const user = await getAuthenticatedUser();

  console.log('👤 Current user:', user?.id);

  if (!user) {
    console.log('❌ Unauthorized - no user');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 格式化手机号
  const phone = formatThaiPhone(rawPhone);
  console.log('📱 Raw phone:', rawPhone, '-> Formatted:', phone);

  try {
    // 1. 获取商户信息 (使用 Admin 客户端)
    const supabaseAdmin = createAdminClient();
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .select('merchant_id')
      .eq('owner_id', user.id)
      .single();

    console.log('🏪 Merchant query result:', { merchant, error: merchantError });

    if (!merchant) {
      console.log('❌ Merchant not found for user:', user.id);
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // 2. 查找目标用户 (根据手机号) - 使用 Admin 客户端绕过 RLS
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .single();

    console.log('👥 Target user query result:', { targetUser, error: userError, phoneQueried: phone });

    if (userError || !targetUser) {
      console.log('❌ User not found for phone:', phone, 'Error:', userError);
      return NextResponse.json({ success: false, message: '未找到该手机号注册的用户，请确认对方已注册 KUMMAK。' }, { status: 404 });
    }

    if (targetUser.id === user.id) {
        return NextResponse.json({ success: false, message: '您不能添加自己为员工。' }, { status: 400 });
    }

    // 3. 添加到 merchant_staff 表 - 使用 Admin 客户端绕过 RLS
    const { error: insertError } = await supabaseAdmin
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
  const user = await getAuthenticatedUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 使用 Admin 客户端删除员工
  const supabaseAdmin = createAdminClient();

  // 先验证这个员工属于当前用户的商户
  const { data: merchant } = await supabaseAdmin
    .from('merchants')
    .select('merchant_id')
    .eq('owner_id', user.id)
    .single();

  if (!merchant) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
  }

  // 删除员工（确保是自己商户的员工）
  const { error } = await supabaseAdmin
    .from('merchant_staff')
    .delete()
    .eq('id', staffId)
    .eq('merchant_id', merchant.merchant_id);

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

  return NextResponse.json({ success: true, message: '删除成功' });
}