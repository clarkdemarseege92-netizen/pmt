// 文件: /app/api/admin/merchant-withdrawals/route.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET - 获取商户提现列表
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options) {
            try {
              cookieStore.set(name, value, options);
            } catch (error) {
              console.error('Cookie set error:', error);
            }
          },
          remove(name: string, options) {
            try {
              cookieStore.set(name, '', options);
            } catch (error) {
              console.error('Cookie remove error:', error);
            }
          },
        },
      }
    );

    // 验证管理员权限
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // 获取商户提现列表（带商户信息）
    const { data: withdrawals, error } = await supabase
      .from('merchant_withdrawals')
      .select(`
        *,
        merchants!merchant_withdrawals_merchant_id_fkey (
          merchant_id,
          shop_name,
          owner_id
        )
      `)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching merchant withdrawals:', error);
      return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 });
    }

    // 统计数据
    const stats = {
      pending: withdrawals?.filter(w => w.status === 'pending').length || 0,
      processing: withdrawals?.filter(w => w.status === 'processing').length || 0,
      totalPendingAmount: withdrawals
        ?.filter(w => w.status === 'pending' || w.status === 'processing')
        .reduce((sum, w) => sum + parseFloat(w.amount), 0) || 0
    };

    return NextResponse.json({
      withdrawals: withdrawals || [],
      stats
    });
  } catch (error) {
    console.error('Error in GET /api/admin/merchant-withdrawals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
