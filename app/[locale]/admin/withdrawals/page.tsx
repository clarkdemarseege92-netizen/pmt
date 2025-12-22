// 文件: app/[locale]/admin/withdrawals/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import WithdrawalManagement from "./WithdrawalManagement";

export default async function WithdrawalsPage() {
  const supabase = await createSupabaseServerClient();

  // 获取推荐返利提现申请
  const { data: referralWithdrawals, error: referralError } = await supabase
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
    .order('requested_at', { ascending: false });

  if (referralError) {
    console.error("ADMIN WITHDRAWALS: 推荐提现查询错误:", referralError);
  }

  // 获取商户钱包提现申请
  const { data: merchantWithdrawals, error: merchantError } = await supabase
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

  if (merchantError) {
    console.error("ADMIN WITHDRAWALS: 商户提现查询错误:", merchantError);
  }

  // 获取推荐提现统计数据
  const referralStats = {
    pendingCount: referralWithdrawals?.filter(w => w.status === 'pending').length || 0,
    pendingAmount: referralWithdrawals?.filter(w => w.status === 'pending').reduce((sum, w) => sum + parseFloat(w.amount), 0) || 0,
    processingCount: referralWithdrawals?.filter(w => w.status === 'processing').length || 0,
    completedCount: referralWithdrawals?.filter(w => w.status === 'completed').length || 0,
    completedAmount: referralWithdrawals?.filter(w => w.status === 'completed').reduce((sum, w) => sum + parseFloat(w.amount), 0) || 0,
  };

  // 获取商户提现统计数据
  const merchantStats = {
    pendingCount: merchantWithdrawals?.filter(w => w.status === 'pending').length || 0,
    pendingAmount: merchantWithdrawals?.filter(w => w.status === 'pending').reduce((sum, w) => sum + parseFloat(w.amount), 0) || 0,
    processingCount: merchantWithdrawals?.filter(w => w.status === 'processing').length || 0,
    completedCount: merchantWithdrawals?.filter(w => w.status === 'completed').length || 0,
    completedAmount: merchantWithdrawals?.filter(w => w.status === 'completed').reduce((sum, w) => sum + parseFloat(w.amount), 0) || 0,
  };

  return (
    <WithdrawalManagement
      initialWithdrawals={referralWithdrawals || []}
      initialMerchantWithdrawals={merchantWithdrawals || []}
      stats={referralStats}
      merchantStats={merchantStats}
    />
  );
}
