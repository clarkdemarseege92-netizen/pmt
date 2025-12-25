// 文件: /app/[locale]/merchant/subscription/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getCurrentSubscription,
  subscribeToPlan,
  cancelSubscription,
  reactivateSubscription
} from '@/app/actions/subscriptions';
import {
  SubscriptionStatusCard,
  SubscriptionPlansGrid,
  InvoiceList
} from '@/components/subscription';
import type { SubscriptionWithPlan, SubscriptionPlan } from '@/app/types/subscription';
import { Crown, CreditCard, FileText, Settings, Loader2 } from 'lucide-react';

type TabType = 'overview' | 'plans' | 'invoices';

export default function SubscriptionPage() {
  const t = useTranslations('subscriptionPage');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionWithPlan | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'plans' || tab === 'invoices') return tab;
    return 'overview';
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // 初始化
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error('Auth error:', authError);
          router.push(`/${locale}/login`);
          return;
        }

        const { data: merchant, error: merchantError } = await supabase
          .from("merchants")
          .select("merchant_id")
          .eq("owner_id", user.id)
          .single();

        if (merchantError || !merchant) {
          console.error('Merchant error:', merchantError);
          setLoading(false);
          return;
        }

        setMerchantId(merchant.merchant_id);

        // 从交易记录获取钱包余额
        const { data: lastTransaction, error: transactionError } = await supabase
          .from('merchant_transactions')
          .select('balance_after')
          .eq('merchant_id', merchant.merchant_id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (transactionError && transactionError.code !== 'PGRST116') {
          console.error('Transaction error:', transactionError);
        }

        setWalletBalance(lastTransaction?.balance_after || 0);
        await fetchSubscription(merchant.merchant_id);
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [locale, router]);

  const fetchSubscription = async (mId: string) => {
    const result = await getCurrentSubscription(mId);
    if (result.success && result.data) {
      setSubscription(result.data);
    }
  };

  // 刷新钱包余额
  const refreshWalletBalance = async (mId: string) => {
    try {
      const { data: lastTransaction, error } = await supabase
        .from('merchant_transactions')
        .select('balance_after')
        .eq('merchant_id', mId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error refreshing wallet balance:', error);
        return;
      }

      setWalletBalance(lastTransaction?.balance_after || 0);
    } catch (error) {
      console.error('Error refreshing wallet balance:', error);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!merchantId) return;

    const planName = plan.display_name[locale as 'en' | 'th' | 'zh'] || plan.display_name.en;

    // 检查余额（仅对付费方案）
    if (plan.price > 0 && walletBalance < plan.price) {
      if (confirm(t('insufficientBalance'))) {
        router.push(`/${locale}/merchant/wallet`);
      }
      return;
    }

    // 确认订阅：免费方案和付费方案使用不同的提示
    const confirmMessage = plan.price > 0
      ? t('confirmSubscribe', { plan: planName, price: plan.price })
      : t('confirmSubscribeFree', { plan: planName });

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await subscribeToPlan(merchantId, plan.id);
      if (result.success) {
        alert(t('subscribeSuccess'));
        await Promise.all([
          fetchSubscription(merchantId),
          refreshWalletBalance(merchantId)
        ]);
        // 触发侧边栏订阅状态更新
        window.dispatchEvent(new CustomEvent('subscription-updated'));
        setActiveTab('overview');
      } else {
        alert(t('subscribeFailed') + ': ' + result.error);
      }
    } catch {
      alert(t('subscribeFailed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!merchantId) return;

    if (!confirm(t('confirmCancel'))) return;

    setIsProcessing(true);
    try {
      const result = await cancelSubscription(merchantId);
      if (result.success) {
        alert(t('cancelSuccess'));
        await fetchSubscription(merchantId);
        // 触发侧边栏订阅状态更新
        window.dispatchEvent(new CustomEvent('subscription-updated'));
      } else {
        alert(t('cancelFailed') + ': ' + result.error);
      }
    } catch {
      alert(t('cancelFailed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivate = async () => {
    if (!merchantId || !subscription) return;

    if (walletBalance < subscription.plan.price) {
      if (confirm(t('insufficientBalance'))) {
        router.push(`/${locale}/merchant/wallet`);
      }
      return;
    }

    if (!confirm(t('confirmReactivate'))) return;

    setIsProcessing(true);
    try {
      const result = await reactivateSubscription(merchantId, subscription.plan_id);
      if (result.success) {
        alert(t('reactivateSuccess'));
        await Promise.all([
          fetchSubscription(merchantId),
          refreshWalletBalance(merchantId)
        ]);
        // 触发侧边栏订阅状态更新
        window.dispatchEvent(new CustomEvent('subscription-updated'));
      } else {
        alert(t('reactivateFailed') + ': ' + result.error);
      }
    } catch {
      alert(t('reactivateFailed'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Crown className="w-8 h-8 text-yellow-500" />
          {t('title')}
        </h1>
        <p className="text-base-content/70 mt-1">{t('subtitle')}</p>
      </div>

      {/* 标签页 */}
      <div className="tabs tabs-boxed mb-6 bg-base-200 p-1">
        <button
          className={`tab gap-2 ${activeTab === 'overview' ? 'tab-active bg-primary text-primary-content' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Settings className="w-4 h-4" />
          {t('tabs.overview')}
        </button>
        <button
          className={`tab gap-2 ${activeTab === 'plans' ? 'tab-active bg-primary text-primary-content' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          <Crown className="w-4 h-4" />
          {t('tabs.plans')}
        </button>
        <button
          className={`tab gap-2 ${activeTab === 'invoices' ? 'tab-active bg-primary text-primary-content' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          <FileText className="w-4 h-4" />
          {t('tabs.invoices')}
        </button>
      </div>

      {/* 标签页内容 */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 当前订阅状态 */}
          {subscription ? (
            <SubscriptionStatusCard
              subscription={subscription}
              onUpgradeClick={() => setActiveTab('plans')}
            />
          ) : (
            <div className="bg-base-100 rounded-lg border-2 border-dashed border-base-300 p-8 text-center">
              <Crown className="w-16 h-16 text-base-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">{t('noSubscription')}</h3>
              <p className="text-base-content/70 mb-4">{t('noSubscriptionDesc')}</p>
              <button
                className="btn btn-primary"
                onClick={() => setActiveTab('plans')}
              >
                {t('viewPlans')}
              </button>
            </div>
          )}

          {/* 钱包余额 */}
          <div className="bg-base-100 rounded-lg border border-base-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-semibold">{t('walletBalance')}</h3>
                  <p className="text-2xl font-bold text-green-600">฿{walletBalance.toFixed(2)}</p>
                </div>
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => router.push(`/${locale}/merchant/wallet`)}
              >
                {t('topUp')}
              </button>
            </div>
          </div>

          {/* 操作按钮 */}
          {subscription && (
            <div className="flex gap-3">
              {subscription.status === 'active' && !subscription.cancel_at_period_end && (
                <button
                  className="btn btn-outline btn-error"
                  onClick={handleCancel}
                  disabled={isProcessing}
                >
                  {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('cancelSubscription')}
                </button>
              )}

              {(subscription.status === 'locked' || subscription.status === 'canceled') && (
                <button
                  className="btn btn-primary"
                  onClick={handleReactivate}
                  disabled={isProcessing}
                >
                  {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('reactivateSubscription')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="bg-base-100 rounded-lg border border-base-200 p-6">
            <h2 className="text-xl font-bold mb-4">{t('choosePlan')}</h2>
            <p className="text-base-content/70 mb-6">{t('choosePlanDesc')}</p>
            <SubscriptionPlansGrid
              currentPlanId={subscription?.plan_id}
              onSelectPlan={handleSubscribe}
              excludeTrial={true}
              disabled={isProcessing}
            />
          </div>
        </div>
      )}

      {activeTab === 'invoices' && merchantId && (
        <div className="space-y-6">
          <div className="bg-base-100 rounded-lg border border-base-200 p-6">
            <h2 className="text-xl font-bold mb-4">{t('invoiceHistory')}</h2>
            <InvoiceList merchantId={merchantId} limit={20} />
          </div>
        </div>
      )}

      {/* 处理中遮罩 */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span>{t('processing')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
