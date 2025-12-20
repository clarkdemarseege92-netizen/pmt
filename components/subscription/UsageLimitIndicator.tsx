// components/subscription/UsageLimitIndicator.tsx
'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, TrendingUp } from 'lucide-react';

interface UsageLimitIndicatorProps {
  currentCount: number;
  limitCount: number;
  type: 'product' | 'coupon';
  showUpgrade?: boolean;
  onUpgradeClick?: () => void;
}

export function UsageLimitIndicator({
  currentCount,
  limitCount,
  type,
  showUpgrade = false,
  onUpgradeClick
}: UsageLimitIndicatorProps) {
  const t = useTranslations('subscription');

  const percentage = limitCount > 0 ? (currentCount / limitCount) * 100 : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  // Color based on usage
  const getColor = () => {
    if (isAtLimit) return 'red';
    if (isNearLimit) return 'yellow';
    return 'blue';
  };

  const color = getColor();

  const colorClasses = {
    blue: {
      bg: 'bg-blue-500',
      text: 'text-blue-900',
      border: 'border-blue-500',
      light: 'bg-blue-50'
    },
    yellow: {
      bg: 'bg-yellow-500',
      text: 'text-yellow-900',
      border: 'border-yellow-500',
      light: 'bg-yellow-50'
    },
    red: {
      bg: 'bg-red-500',
      text: 'text-red-900',
      border: 'border-red-500',
      light: 'bg-red-50'
    }
  };

  return (
    <div className={`rounded-lg border-2 p-4 ${colorClasses[color].border} ${colorClasses[color].light}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isAtLimit && <AlertTriangle className="w-5 h-5 text-red-600" />}
          <span className={`font-semibold ${colorClasses[color].text}`}>
            {type === 'product' ? t('productUsage') : t('couponTypeUsage')}
          </span>
        </div>
        <span className={`text-sm font-semibold ${colorClasses[color].text}`}>
          {currentCount} / {limitCount}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
        <div
          className={`h-full ${colorClasses[color].bg} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Status Message */}
      <div className="flex items-center justify-between">
        <p className={`text-xs ${colorClasses[color].text}`}>
          {isAtLimit
            ? type === 'product'
              ? t('productLimitReached')
              : t('couponLimitReached')
            : isNearLimit
            ? type === 'product'
              ? t('productNearLimit')
              : t('couponNearLimit')
            : t('usageNormal')}
        </p>
        <span className={`text-xs font-medium ${colorClasses[color].text}`}>
          {percentage.toFixed(0)}%
        </span>
      </div>

      {/* Upgrade Button */}
      {showUpgrade && (isAtLimit || isNearLimit) && onUpgradeClick && (
        <button
          onClick={onUpgradeClick}
          className={`
            mt-3 w-full py-2 px-4 rounded-lg font-semibold transition-colors
            flex items-center justify-center gap-2
            ${isAtLimit ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'}
            text-white
          `}
        >
          <TrendingUp className="w-4 h-4" />
          {t('upgradeForMore')}
        </button>
      )}
    </div>
  );
}
