// 文件: /app/api/referral/withdraw/route.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const MIN_WITHDRAWAL_AMOUNT = 100; // 最低提现金额 100 THB

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
          set() {},
          remove() {},
        },
      }
    );

    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取提现记录
    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from('referral_withdrawals')
      .select('*')
      .eq('user_id', user.id)
      .order('requested_at', { ascending: false });

    if (withdrawalsError) {
      console.error('Error fetching withdrawals:', withdrawalsError);
      return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 });
    }

    return NextResponse.json({ withdrawals: withdrawals || [] });
  } catch (error) {
    console.error('Error in referral withdrawals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 解析请求体
    const body = await request.json();
    const { amount, bankName, accountNumber, accountName } = body;

    // 验证必填字段
    if (!amount || !bankName || !accountNumber || !accountName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 验证提现金额
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < MIN_WITHDRAWAL_AMOUNT) {
      return NextResponse.json({
        error: `Minimum withdrawal amount is ฿${MIN_WITHDRAWAL_AMOUNT}`
      }, { status: 400 });
    }

    // 获取用户余额
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('referral_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const currentBalance = parseFloat(profile.referral_balance || '0');

    // 检查余额是否足够
    if (withdrawAmount > currentBalance) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // 创建提现申请
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('referral_withdrawals')
      .insert({
        user_id: user.id,
        amount: withdrawAmount,
        bank_name: bankName,
        bank_account: accountNumber,
        account_name: accountName,
        status: 'pending',
      })
      .select()
      .single();

    if (withdrawalError) {
      console.error('Error creating withdrawal:', withdrawalError);
      return NextResponse.json({ error: 'Failed to create withdrawal' }, { status: 500 });
    }

    // 扣除余额
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ referral_balance: currentBalance - withdrawAmount })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating balance:', updateError);
      // 回滚：删除提现记录
      await supabase.from('referral_withdrawals').delete().eq('id', withdrawal.id);
      return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      withdrawal,
      newBalance: currentBalance - withdrawAmount
    });
  } catch (error) {
    console.error('Error in withdrawal request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
