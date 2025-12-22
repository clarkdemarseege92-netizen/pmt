// 文件: /app/api/client/check-staff/route.ts
// 检查当前用户是否是某商户的员工

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

export async function GET() {
  console.log('🔍 [check-staff] API called');

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  console.log('👤 [check-staff] User:', user?.id);

  if (!user) {
    return NextResponse.json({ isStaff: false, message: 'Not authenticated' });
  }

  try {
    // 使用 Admin 客户端绕过 RLS 查询 merchant_staff 表
    const supabaseAdmin = createAdminClient();
    const { data: staffRecord, error } = await supabaseAdmin
      .from('merchant_staff')
      .select(`
        merchant_id,
        merchants (
          shop_name
        )
      `)
      .eq('user_id', user.id)
      .single();

    console.log('📋 [check-staff] Query result:', { staffRecord, error });

    if (error || !staffRecord) {
      return NextResponse.json({ isStaff: false });
    }

    return NextResponse.json({
      isStaff: true,
      merchantId: staffRecord.merchant_id,
      shopName: (staffRecord.merchants as { shop_name: string } | null)?.shop_name || null
    });

  } catch (err) {
    console.error('❌ [check-staff] Error:', err);
    return NextResponse.json({ isStaff: false, error: 'Server error' }, { status: 500 });
  }
}
