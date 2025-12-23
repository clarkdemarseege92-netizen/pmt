// 文件: /app/api/referral/rewards/route.ts
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

    // 获取返利记录，包含被推荐人信息
    const { data: rewards, error: rewardsError } = await supabase
      .from('referral_rewards')
      .select(`
        id,
        subscription_plan,
        subscription_amount,
        reward_amount,
        status,
        eligible_at,
        approved_at,
        created_at,
        referee:referee_id (
          email
        )
      `)
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (rewardsError) {
      console.error('Error fetching rewards:', rewardsError);
      return NextResponse.json({ error: 'Failed to fetch rewards' }, { status: 500 });
    }

    // 格式化数据
    const formattedRewards = rewards?.map(reward => {
      // referee 可能是数组或单个对象，需要正确处理
      const refereeData = reward.referee;
      let refereeEmail = 'Unknown';
      if (refereeData) {
        if (Array.isArray(refereeData)) {
          refereeEmail = (refereeData[0] as { email: string })?.email || 'Unknown';
        } else {
          refereeEmail = (refereeData as { email: string }).email || 'Unknown';
        }
      }

      return {
        id: reward.id,
        refereeEmail,
        subscriptionPlan: reward.subscription_plan,
        subscriptionAmount: parseFloat(reward.subscription_amount),
        rewardAmount: parseFloat(reward.reward_amount),
        status: reward.status,
        eligibleAt: reward.eligible_at,
        approvedAt: reward.approved_at,
        createdAt: reward.created_at,
      };
    }) || [];

    return NextResponse.json({ rewards: formattedRewards });
  } catch (error) {
    console.error('Error in referral rewards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
