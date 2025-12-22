// 文件: /app/api/merchant/withdraw/route.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// 最低提现金额
const MIN_WITHDRAWAL_AMOUNT = 500;

// 计算手续费（2%，最低10泰铢）
function calculateFee(amount: number): number {
  const fee = amount * 0.02;
  return Math.max(fee, 10);
}

// GET - 获取提现记录
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

    // 验证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取商户信息
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('owner_id', user.id)
      .single();

    if (merchantError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // 获取提现记录
    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from('merchant_withdrawals')
      .select('*')
      .eq('merchant_id', merchant.merchant_id)
      .order('requested_at', { ascending: false });

    if (withdrawalsError) {
      console.error('Error fetching withdrawals:', withdrawalsError);
      return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 });
    }

    return NextResponse.json({ withdrawals: withdrawals || [] });
  } catch (error) {
    console.error('Error in GET /api/merchant/withdraw:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - 创建提现申请
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

    // 验证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取请求体
    const body = await request.json();
    const { amount, bankName, accountNumber, accountName } = body;

    // 验证必填字段
    if (!amount || !bankName || !accountNumber || !accountName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < MIN_WITHDRAWAL_AMOUNT) {
      return NextResponse.json({
        error: `Minimum withdrawal amount is ฿${MIN_WITHDRAWAL_AMOUNT}`
      }, { status: 400 });
    }

    // 获取商户信息
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('owner_id', user.id)
      .single();

    if (merchantError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // 获取当前余额
    const { data: lastTx } = await supabase
      .from('merchant_transactions')
      .select('balance_after')
      .eq('merchant_id', merchant.merchant_id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const currentBalance = lastTx?.balance_after || 0;

    // 检查余额是否充足
    if (currentBalance < withdrawAmount) {
      return NextResponse.json({
        error: 'Insufficient balance',
        currentBalance,
        requestedAmount: withdrawAmount
      }, { status: 400 });
    }

    // 检查是否有待处理的提现申请
    const { data: pendingWithdrawal } = await supabase
      .from('merchant_withdrawals')
      .select('id')
      .eq('merchant_id', merchant.merchant_id)
      .in('status', ['pending', 'processing'])
      .limit(1)
      .single();

    if (pendingWithdrawal) {
      return NextResponse.json({
        error: 'You have a pending withdrawal request. Please wait for it to be processed.'
      }, { status: 400 });
    }

    // 计算手续费和实际到账金额
    const fee = calculateFee(withdrawAmount);
    const netAmount = withdrawAmount - fee;

    // 创建提现交易记录（冻结金额）
    const newBalance = currentBalance - withdrawAmount;
    const { data: transaction, error: txError } = await supabase
      .from('merchant_transactions')
      .insert({
        merchant_id: merchant.merchant_id,
        amount: -withdrawAmount,  // 负数表示支出
        balance_after: newBalance,
        type: 'withdraw',
        status: 'pending',  // 提现交易为待处理状态
        description: `Withdrawal request: ฿${withdrawAmount} (Fee: ฿${fee.toFixed(2)})`
      })
      .select()
      .single();

    if (txError) {
      console.error('Error creating transaction:', txError);
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
    }

    // 创建提现申请记录
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('merchant_withdrawals')
      .insert({
        merchant_id: merchant.merchant_id,
        amount: withdrawAmount,
        fee: fee,
        net_amount: netAmount,
        bank_name: bankName,
        bank_account: accountNumber,
        account_name: accountName,
        status: 'pending',
        transaction_id: transaction.id
      })
      .select()
      .single();

    if (withdrawalError) {
      console.error('Error creating withdrawal:', withdrawalError);
      // 回滚交易记录
      await supabase
        .from('merchant_transactions')
        .delete()
        .eq('id', transaction.id);
      return NextResponse.json({ error: 'Failed to create withdrawal request' }, { status: 500 });
    }

    console.log(`MERCHANT WITHDRAW: Created withdrawal request ${withdrawal.id} for merchant ${merchant.merchant_id}, amount: ฿${withdrawAmount}`);

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawAmount,
        fee: fee,
        netAmount: netAmount,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error in POST /api/merchant/withdraw:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
