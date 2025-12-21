// components/subscription/SubscriptionStatusCard.tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { SubscriptionWithPlan } from '@/app/types/subscription';
import { Crown, AlertTriangle, Lock, CheckCircle2, Clock } from 'lucide-react';
import { TrialCountdown } from './TrialCountdown';

interface SubscriptionStatusCardProps {
  subscription: SubscriptionWithPlan;
  onUpgradeClick?: () => void;
  onManageClick?: () => void;
}

export function SubscriptionStatusCard({
  subscription,
  onUpgradeClick,
  onManageClick
}: SubscriptionStatusCardProps) {
  const t = useTranslations('subscription');
  const locale = useLocale() as 'en' | 'th' | 'zh';

  const planName = subscription.plan.display_name[locale] || subscription.plan.display_name.en;

  const getStatusIcon = () => {
    switch (subscription.status) {
      case 'trial':
        return <Clock className="w-6 h-6 text-blue-600" />;
      case 'active':
        return <CheckCircle2 className="w-6 h-6 text-green-600" />;
      case 'past_due':
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'canceled':
        return <AlertTriangle className="w-6 h-6 text-orange-600" />;
      case 'locked':
        return <Lock className="w-6 h-6 text-red-600" />;
      default:
        return <Crown className="w-6 h-6 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (subscription.status) {
      case 'trial':
        return 'bg-blue-50 border-blue-500';
      case 'active':
        return 'bg-green-50 border-green-500';
      case 'past_due':
        return 'bg-yellow-50 border-yellow-500';
      case 'canceled':
        return 'bg-orange-50 border-orange-500';
      case 'locked':
        return 'bg-red-50 border-red-500';
      default:
        return 'bg-gray-50 border-gray-500';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className={`rounded-lg border-2 p-6 ${getStatusColor()}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-xl font-bold text-gray-900">{planName}</h3>
            <p className="text-sm text-gray-600">
              {t(`subscriptionStatus.${subscription.status}`)}
            </p>
          </div>
        </div>
        {subscription.plan.price > 0 && (
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              ฿{subscription.plan.price}
            </div>
            <div className="text-sm text-gray-600">/{t('month')}</div>
          </div>
        )}
      </div>

      {/* Trial Countdown */}
      {subscription.status === 'trial' && subscription.trial_end_date && (
        <div className="mb-4">
          <TrialCountdown
            trialEndDate={subscription.trial_end_date}
            onUpgradeClick={onUpgradeClick}
          />
        </div>
      )}

      {/* Subscription Details */}
      <div className="space-y-2 mb-4 pb-4 border-b border-gray-300">
        {subscription.status === 'active' && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('currentPeriodStart')}:</span>
              <span className="font-medium text-gray-900">
                {formatDate(subscription.current_period_start)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('currentPeriodEnd')}:</span>
              <span className="font-medium text-gray-900">
                {formatDate(subscription.current_period_end)}
              </span>
            </div>
            {subscription.cancel_at_period_end && (
              <div className="flex items-center gap-2 text-sm text-orange-600 mt-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{t('cancelAtPeriodEnd')}</span>
              </div>
            )}
          </>
        )}

        {subscription.status === 'locked' && subscription.data_retention_until && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <Lock className="w-4 h-4" />
            <span>
              {t('dataRetentionUntil')}: {formatDate(subscription.data_retention_until)}
            </span>
          </div>
        )}
      </div>

      {/* Plan Limits */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white bg-opacity-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-900">
            {subscription.plan.product_limit}
          </div>
          <div className="text-xs text-gray-600">{t('productLimitLabel')}</div>
        </div>
        <div className="bg-white bg-opacity-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-900">
            {subscription.plan.coupon_type_limit}
          </div>
          <div className="text-xs text-gray-600">{t('couponTypeLimitLabel')}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {onUpgradeClick && subscription.status !== 'locked' && (
          <button
            onClick={onUpgradeClick}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4" />
            {subscription.status === 'trial' ? t('upgradeNow') : t('changePlan')}
          </button>
        )}
        {onManageClick && (
          <button
            onClick={onManageClick}
            className="flex-1 bg-white text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors border border-gray-300"
          >
            {t('manageSubscription')}
          </button>
        )}
      </div>
    </div>
  );
}
