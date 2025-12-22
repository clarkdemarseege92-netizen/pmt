// 文件: /app/api/referral/stats/route.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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

    // 获取用户的推荐码和余额
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('referral_code, referral_balance')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 获取推荐统计
    const { data: referrals, error: referralsError } = await supabase
      .from('profiles')
      .select('id')
      .eq('referred_by', user.id);

    // 获取返利记录
    const { data: rewards, error: rewardsError } = await supabase
      .from('referral_rewards')
      .select('*')
      .eq('referrer_id', user.id);

    const totalReferrals = referrals?.length || 0;
    const successfulReferrals = rewards?.filter(r => r.status === 'approved').length || 0;
    const totalEarned = rewards
      ?.filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + parseFloat(r.reward_amount), 0) || 0;
    const pendingRewards = rewards
      ?.filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + parseFloat(r.reward_amount), 0) || 0;

    return NextResponse.json({
      referralCode: profile.referral_code,
      referralBalance: parseFloat(profile.referral_balance || '0'),
      totalReferrals,
      successfulReferrals,
      totalEarned,
      pendingRewards,
    });
  } catch (error) {
    console.error('Error in referral stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
