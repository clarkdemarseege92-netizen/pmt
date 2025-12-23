// 文件: /app/api/admin/withdrawals/[id]/route.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// 验证管理员权限
async function verifyAdmin(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: 'Forbidden - Admin only', status: 403 };
  }

  return { user, profile };
}

// GET - 获取单个提现详情
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const authResult = await verifyAdmin(supabase);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { data: withdrawal, error } = await supabase
      .from('referral_withdrawals')
      .select(`
        *,
        user:user_id (
          id,
          email,
          full_name,
          referral_balance
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    }

    return NextResponse.json(withdrawal);
  } catch (error) {
    console.error('Error fetching withdrawal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - 处理提现（批准/拒绝）
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const authResult = await verifyAdmin(supabase);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { action, admin_note } = body;

    if (!action || !['approve', 'reject', 'processing'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // 获取当前提现记录
    const { data: withdrawal, error: fetchError } = await supabase
      .from('referral_withdrawals')
      .select('*, user:user_id (referral_balance)')
      .eq('id', id)
      .single();

    if (fetchError || !withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    }

    // 根据 action 更新状态
    let newStatus: string;
    let updateData: Record<string, unknown> = {
      admin_note,
      processed_by: authResult.user.id,
      processed_at: new Date().toISOString(),
    };

    if (action === 'approve') {
      newStatus = 'completed';
    } else if (action === 'reject') {
      newStatus = 'rejected';

      // 拒绝时，将金额退还到用户余额
      const currentBalance = Number((withdrawal.user as { referral_balance: number })?.referral_balance) || 0;
      const refundAmount = Number(withdrawal.amount) || 0;

      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ referral_balance: currentBalance + refundAmount })
        .eq('id', withdrawal.user_id);

      if (balanceError) {
        console.error('Error refunding balance:', balanceError);
        return NextResponse.json({ error: 'Failed to refund balance' }, { status: 500 });
      }
    } else {
      newStatus = 'processing';
    }

    updateData.status = newStatus;

    // 更新提现记录
    const { data: updatedWithdrawal, error: updateError } = await supabase
      .from('referral_withdrawals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating withdrawal:', updateError);
      return NextResponse.json({ error: 'Failed to update withdrawal' }, { status: 500 });
    }

    console.log(`ADMIN: Withdrawal ${id} ${action}ed by ${authResult.user.email}`);

    return NextResponse.json(updatedWithdrawal);
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
