// 文件: /app/[locale]/merchant/referral/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  HiClipboard,
  HiCheck,
  HiShare,
  HiUsers,
  HiCurrencyDollar,
  HiClock,
  HiBanknotes,
  HiGift,
  HiArrowPath
} from 'react-icons/hi2';

type ReferralStats = {
  referralCode: string;
  referralBalance: number;
  totalReferrals: number;
  successfulReferrals: number;
  totalEarned: number;
  pendingRewards: number;
};

type Reward = {
  id: string;
  refereeEmail: string;
  subscriptionPlan: string;
  subscriptionAmount: number;
  rewardAmount: number;
  status: 'pending' | 'approved' | 'cancelled';
  eligibleAt: string;
  approvedAt: string | null;
  createdAt: string;
};

type Withdrawal = {
  id: string;
  amount: number;
  bank_name: string;
  bank_account: string;
  account_name: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requested_at: string;
  processed_at: string | null;
  admin_note: string | null;
};

export default function ReferralPage() {
  const t = useTranslations('referral');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'rewards' | 'withdrawals'>('rewards');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
  });
  const [withdrawing, setWithdrawing] = useState(false);

  // 获取推荐统计
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/referral/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // 获取返利记录
  const fetchRewards = async () => {
    try {
      const response = await fetch('/api/referral/rewards');
      if (response.ok) {
        const data = await response.json();
        setRewards(data.rewards || []);
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
    }
  };

  // 获取提现记录
  const fetchWithdrawals = async () => {
    try {
      const response = await fetch('/api/referral/withdraw');
      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.withdrawals || []);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchRewards(), fetchWithdrawals()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // 复制推荐链接
  const copyReferralLink = async () => {
    if (!stats?.referralCode) return;
    const link = `${window.location.origin}/login?ref=${stats.referralCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // 分享推荐链接
  const shareReferralLink = async () => {
    if (!stats?.referralCode) return;
    const link = `${window.location.origin}/login?ref=${stats.referralCode}`;
    const shareText = `${t('shareText')}\n${link}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'KUMMAK',
          text: shareText,
          url: link,
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      // Fallback: 复制到剪贴板
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 提交提现申请
  const handleWithdraw = async () => {
    if (!stats || stats.referralBalance < 100) return;

    setWithdrawing(true);
    try {
      const response = await fetch('/api/referral/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withdrawForm),
      });

      if (response.ok) {
        alert(t('withdraw.success'));
        setShowWithdrawModal(false);
        setWithdrawForm({ amount: '', bankName: '', accountNumber: '', accountName: '' });
        // 刷新数据
        await Promise.all([fetchStats(), fetchWithdrawals()]);
      } else {
        const error = await response.json();
        alert(error.error || t('withdraw.failed'));
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      alert(t('withdraw.failed'));
    } finally {
      setWithdrawing(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // 获取状态徽章样式
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'badge-warning';
      case 'approved':
      case 'completed':
        return 'badge-success';
      case 'cancelled':
      case 'rejected':
        return 'badge-error';
      case 'processing':
        return 'badge-info';
      default:
        return 'badge-ghost';
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-base-content/70">{t('subtitle')}</p>
      </div>

      {/* 推荐链接卡片 */}
      <div className="card bg-linear-to-r from-primary to-secondary text-primary-content">
        <div className="card-body">
          <h2 className="card-title text-lg">{t('yourReferralLink')}</h2>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <div className="flex-1 bg-white/20 rounded-lg px-4 py-3 font-mono text-sm truncate">
              {stats?.referralCode
                ? `${typeof window !== 'undefined' ? window.location.origin : ''}/login?ref=${stats.referralCode}`
                : 'Loading...'}
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-ghost bg-white/20 hover:bg-white/30"
                onClick={copyReferralLink}
              >
                {copied ? <HiCheck className="w-5 h-5" /> : <HiClipboard className="w-5 h-5" />}
                {copied ? t('copied') : t('copyLink')}
              </button>
              <button
                className="btn btn-ghost bg-white/20 hover:bg-white/30"
                onClick={shareReferralLink}
              >
                <HiShare className="w-5 h-5" />
                {t('shareLink')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat bg-base-100 rounded-box shadow">
          <div className="stat-figure text-primary">
            <HiUsers className="w-8 h-8" />
          </div>
          <div className="stat-title">{t('stats.totalReferrals')}</div>
          <div className="stat-value text-primary">{stats?.totalReferrals || 0}</div>
        </div>

        <div className="stat bg-base-100 rounded-box shadow">
          <div className="stat-figure text-success">
            <HiGift className="w-8 h-8" />
          </div>
          <div className="stat-title">{t('stats.successfulReferrals')}</div>
          <div className="stat-value text-success">{stats?.successfulReferrals || 0}</div>
        </div>

        <div className="stat bg-base-100 rounded-box shadow">
          <div className="stat-figure text-info">
            <HiCurrencyDollar className="w-8 h-8" />
          </div>
          <div className="stat-title">{t('stats.totalEarned')}</div>
          <div className="stat-value text-info">฿{stats?.totalEarned?.toFixed(0) || 0}</div>
        </div>

        <div className="stat bg-base-100 rounded-box shadow">
          <div className="stat-figure text-warning">
            <HiBanknotes className="w-8 h-8" />
          </div>
          <div className="stat-title">{t('stats.availableBalance')}</div>
          <div className="stat-value text-warning">฿{stats?.referralBalance?.toFixed(0) || 0}</div>
          {stats && stats.referralBalance >= 100 && (
            <div className="stat-actions">
              <button
                className="btn btn-sm btn-warning"
                onClick={() => {
                  setWithdrawForm({ ...withdrawForm, amount: stats.referralBalance.toString() });
                  setShowWithdrawModal(true);
                }}
              >
                {t('withdraw.title')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 待发放提示 */}
      {stats && stats.pendingRewards > 0 && (
        <div className="alert alert-info">
          <HiClock className="w-5 h-5" />
          <span>{t('stats.pendingRewards')}: ฿{stats.pendingRewards.toFixed(0)}</span>
        </div>
      )}

      {/* 奖励规则 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="card-title text-lg">{t('howItWorks.title')}</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <div className="badge badge-primary badge-lg">1</div>
                <p>{t('howItWorks.step1')}</p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="badge badge-primary badge-lg">2</div>
                <p>{t('howItWorks.step2')}</p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="badge badge-primary badge-lg">3</div>
                <p>{t('howItWorks.step3')}</p>
              </div>
            </div>
            <div className="bg-base-200 rounded-lg p-4">
              <h4 className="font-semibold mb-3">{t('howItWorks.rewards')}</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span>Standard</span>
                  <span className="font-bold text-success">฿50</span>
                </li>
                <li className="flex justify-between">
                  <span>Professional</span>
                  <span className="font-bold text-success">฿100</span>
                </li>
                <li className="flex justify-between">
                  <span>Enterprise</span>
                  <span className="font-bold text-success">฿200</span>
                </li>
              </ul>
              <p className="text-xs text-base-content/60 mt-3">{t('howItWorks.note')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 记录选项卡 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="tabs tabs-boxed mb-4">
            <button
              className={`tab ${activeTab === 'rewards' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('rewards')}
            >
              {t('rewards.title')}
            </button>
            <button
              className={`tab ${activeTab === 'withdrawals' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('withdrawals')}
            >
              {t('withdrawals.title')}
            </button>
          </div>

          {activeTab === 'rewards' && (
            <div className="overflow-x-auto">
              {rewards.length === 0 ? (
                <div className="text-center py-8 text-base-content/50">
                  <HiGift className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{t('rewards.noRewards')}</p>
                </div>
              ) : (
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>{t('rewards.referee')}</th>
                      <th>{t('rewards.plan')}</th>
                      <th>{t('rewards.amount')}</th>
                      <th>{t('rewards.status')}</th>
                      <th>{t('rewards.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewards.map((reward) => (
                      <tr key={reward.id}>
                        <td className="font-mono text-sm">{reward.refereeEmail}</td>
                        <td className="capitalize">{reward.subscriptionPlan}</td>
                        <td className="font-bold text-success">฿{reward.rewardAmount}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(reward.status)}`}>
                            {t(`rewards.${reward.status}`)}
                          </span>
                        </td>
                        <td>{formatDate(reward.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'withdrawals' && (
            <div className="overflow-x-auto">
              {withdrawals.length === 0 ? (
                <div className="text-center py-8 text-base-content/50">
                  <HiBanknotes className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{t('withdrawals.noWithdrawals')}</p>
                </div>
              ) : (
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>{t('withdrawals.amount')}</th>
                      <th>{t('withdraw.bankName')}</th>
                      <th>{t('withdrawals.status')}</th>
                      <th>{t('withdrawals.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((withdrawal) => (
                      <tr key={withdrawal.id}>
                        <td className="font-bold">฿{withdrawal.amount}</td>
                        <td>{withdrawal.bank_name}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(withdrawal.status)}`}>
                            {t(`withdrawals.${withdrawal.status}`)}
                          </span>
                        </td>
                        <td>{formatDate(withdrawal.requested_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 提现弹窗 */}
      {showWithdrawModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">{t('withdraw.title')}</h3>

            <div className="py-4 space-y-4">
              <div className="alert alert-info">
                <span>{t('withdraw.balance')}: ฿{stats?.referralBalance?.toFixed(0) || 0}</span>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t('withdraw.amount')}</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={withdrawForm.amount}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                  max={stats?.referralBalance || 0}
                  min={100}
                />
                <label className="label">
                  <span className="label-text-alt">{t('withdraw.minAmount')}</span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t('withdraw.bankName')}</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="e.g. Bangkok Bank, Kasikorn Bank"
                  value={withdrawForm.bankName}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, bankName: e.target.value })}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t('withdraw.accountNumber')}</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="xxx-x-xxxxx-x"
                  value={withdrawForm.accountNumber}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value })}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t('withdraw.accountName')}</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={withdrawForm.accountName}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, accountName: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-action">
              <button className="btn" onClick={() => setShowWithdrawModal(false)}>
                {t('withdraw.title') === '申请提现' ? '取消' : 'Cancel'}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleWithdraw}
                disabled={
                  withdrawing ||
                  !withdrawForm.amount ||
                  !withdrawForm.bankName ||
                  !withdrawForm.accountNumber ||
                  !withdrawForm.accountName ||
                  parseFloat(withdrawForm.amount) < 100
                }
              >
                {withdrawing ? (
                  <>
                    <HiArrowPath className="w-4 h-4 animate-spin" />
                    {t('withdraw.submitting')}
                  </>
                ) : (
                  t('withdraw.submit')
                )}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowWithdrawModal(false)}></div>
        </div>
      )}
    </div>
  );
}
