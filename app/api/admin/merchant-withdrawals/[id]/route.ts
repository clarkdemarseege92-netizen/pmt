// 文件: /app/api/admin/merchant-withdrawals/[id]/route.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// PATCH - 更新提现状态（批准/拒绝）
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

    const body = await request.json();
    const { action, adminNote, rejectionReason } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // 获取提现记录
    const { data: withdrawal, error: fetchError } = await supabase
      .from('merchant_withdrawals')
      .select('*, merchant_transactions(*)')
      .eq('id', id)
      .single();

    if (fetchError || !withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    }

    if (withdrawal.status !== 'pending' && withdrawal.status !== 'processing') {
      return NextResponse.json({ error: 'Withdrawal already processed' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      // 批准提现
      // 1. 更新提现记录状态
      const { error: updateError } = await supabase
        .from('merchant_withdrawals')
        .update({
          status: 'completed',
          processed_at: now,
          processed_by: user.id,
          admin_note: adminNote || null
        })
        .eq('id', id);

      if (updateError) {
        console.error('Error approving withdrawal:', updateError);
        return NextResponse.json({ error: 'Failed to approve withdrawal' }, { status: 500 });
      }

      // 2. 更新关联的交易记录状态为完成
      if (withdrawal.transaction_id) {
        await supabase
          .from('merchant_transactions')
          .update({ status: 'completed' })
          .eq('id', withdrawal.transaction_id);
      }

      console.log(`ADMIN: Approved merchant withdrawal ${id} by ${user.email}`);

    } else if (action === 'reject') {
      // 拒绝提现
      // 1. 更新提现记录状态
      const { error: updateError } = await supabase
        .from('merchant_withdrawals')
        .update({
          status: 'rejected',
          processed_at: now,
          processed_by: user.id,
          admin_note: adminNote || null,
          rejection_reason: rejectionReason || '申请被拒绝'
        })
        .eq('id', id);

      if (updateError) {
        console.error('Error rejecting withdrawal:', updateError);
        return NextResponse.json({ error: 'Failed to reject withdrawal' }, { status: 500 });
      }

      // 2. 退还金额到商户余额
      if (withdrawal.transaction_id) {
        // 获取当前余额
        const { data: lastTx } = await supabase
          .from('merchant_transactions')
          .select('balance_after')
          .eq('merchant_id', withdrawal.merchant_id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const currentBalance = lastTx?.balance_after || 0;
        const newBalance = currentBalance + parseFloat(withdrawal.amount);

        // 创建退款交易记录
        await supabase
          .from('merchant_transactions')
          .insert({
            merchant_id: withdrawal.merchant_id,
            amount: parseFloat(withdrawal.amount),
            balance_after: newBalance,
            type: 'bonus',  // 使用 bonus 类型表示退款
            status: 'completed',
            description: `Withdrawal refund (rejected): ฿${withdrawal.amount}`
          });

        // 将原交易标记为失败
        await supabase
          .from('merchant_transactions')
          .update({ status: 'failed' })
          .eq('id', withdrawal.transaction_id);
      }

      console.log(`ADMIN: Rejected merchant withdrawal ${id} by ${user.email}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/admin/merchant-withdrawals/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
