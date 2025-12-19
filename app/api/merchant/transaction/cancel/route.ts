import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { transactionId } = await request.json();

  if (!transactionId) {
    return NextResponse.json({ success: false, message: 'Missing transaction ID' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, message: 'Please login first' }, { status: 401 });
  }

  try {
    // 1. 查找并验证归属权 (Select 权限检查)
    const { data: transaction, error: fetchError } = await supabase
      .from('merchant_transactions')
      .select(`id, status, merchants!inner(owner_id)`)
      .eq('id', transactionId)
      .eq('merchants.owner_id', user.id)
      .single();

    if (fetchError || !transaction) {
        console.error('Fetch Error:', fetchError);
        return NextResponse.json({ success: false, message: 'Transaction not found or access denied' }, { status: 403 });
    }

    if (transaction.status !== 'pending') {
        return NextResponse.json({ success: false, message: 'Can only cancel pending transactions' }, { status: 400 });
    }

    // 2. 执行更新操作 (Update 权限检查)
    // 关键修改：添加 .select() 以获取更新后的记录，从而判断是否真的更新成功
    const { data: updatedData, error: updateError } = await supabase
      .from('merchant_transactions')
      .update({
        status: 'failed', // 如果您的数据库习惯用 'cancelled'，请在这里修改
        description: 'Top-up request - Cancelled by user'
      })
      .eq('id', transactionId)
      .select(); 

    if (updateError) {
        console.error('Update Error:', updateError);
        return NextResponse.json({ success: false, message: 'Update error: ' + updateError.message }, { status: 500 });
    }

    // 3. 检查是否真的有数据被修改
    // 如果 RLS 禁止 Update，updatedData 会是空数组，且不报错
    if (!updatedData || updatedData.length === 0) {
        console.error('Update Failed: No rows affected (RLS Policy violation likely).');
        return NextResponse.json({
            success: false,
            message: 'Cancellation failed: Database policy denied modification. Please contact administrator to check Update policy.'
        }, { status: 403 });
    }

    return NextResponse.json({ success: true, message: 'Transaction cancelled' });

  } catch (e) {
    console.error('Cancel Transaction Exception:', e);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}