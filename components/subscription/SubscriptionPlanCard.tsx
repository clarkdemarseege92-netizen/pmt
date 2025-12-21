// components/subscription/SubscriptionPlanCard.tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { SubscriptionPlan } from '@/app/types/subscription';
import { CheckCircle2, XCircle } from 'lucide-react';

interface SubscriptionPlanCardProps {
  plan: SubscriptionPlan;
  currentPlan?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
}

export function SubscriptionPlanCard({
  plan,
  currentPlan = false,
  onSelect,
  disabled = false
}: SubscriptionPlanCardProps) {
  const t = useTranslations('subscription');
  const locale = useLocale() as 'en' | 'th' | 'zh';

  const planName = plan.display_name[locale] || plan.display_name.en;
  const isPopular = plan.name === 'standard';

  return (
    <div
      className={`
        relative rounded-lg border-2 p-6 transition-all
        ${currentPlan ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}
        ${isPopular && !currentPlan ? 'ring-2 ring-purple-500' : ''}
        ${!disabled && onSelect ? 'cursor-pointer hover:shadow-lg' : ''}
        ${disabled ? 'opacity-60' : ''}
      `}
      onClick={!disabled && onSelect ? onSelect : undefined}
    >
      {/* Popular Badge */}
      {isPopular && !currentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
          {t('mostPopular')}
        </div>
      )}

      {/* Current Plan Badge */}
      {currentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
          {t('currentPlan')}
        </div>
      )}

      {/* Plan Name */}
      <h3 className="text-xl font-bold text-gray-900 mb-2">{planName}</h3>

      {/* Price */}
      <div className="mb-4">
        <span className="text-3xl font-bold text-gray-900">฿{plan.price}</span>
        {plan.price > 0 && (
          <span className="text-gray-500 ml-2">/{t('month')}</span>
        )}
      </div>

      {/* Limits */}
      <div className="space-y-2 mb-4 pb-4 border-b">
        <div className="flex items-center text-sm text-gray-600">
          <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
          {t('productLimit', { count: plan.product_limit })}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
          {t('couponTypeLimit', { count: plan.coupon_type_limit })}
        </div>
      </div>

      {/* Features */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-gray-700 mb-2">
          {t('features')}:
        </div>
        {Object.entries(plan.features).map(([feature, enabled]) => (
          <div key={feature} className="flex items-center text-sm">
            {enabled ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-gray-300 mr-2 shrink-0" />
            )}
            <span className={enabled ? 'text-gray-700' : 'text-gray-400'}>
              {t(`feature.${feature}`)}
            </span>
          </div>
        ))}
      </div>

      {/* Action Button */}
      {onSelect && !currentPlan && (
        <button
          onClick={onSelect}
          disabled={disabled}
          className={`
            mt-6 w-full py-2 px-4 rounded-lg font-semibold transition-colors
            ${
              disabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {t('selectPlan')}
        </button>
      )}
    </div>
  );
}
