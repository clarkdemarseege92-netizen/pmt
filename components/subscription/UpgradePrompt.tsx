// components/subscription/UpgradePrompt.tsx
'use client';

import { useTranslations } from 'next-intl';
import { Sparkles, X, Lock } from 'lucide-react';
import { useState } from 'react';

interface UpgradePromptProps {
  feature: string;
  currentPlan?: string;
  onUpgradeClick?: () => void;
  onDismiss?: () => void;
  variant?: 'banner' | 'modal' | 'inline';
}

export function UpgradePrompt({
  feature,
  currentPlan,
  onUpgradeClick,
  onDismiss,
  variant = 'inline'
}: UpgradePromptProps) {
  const t = useTranslations('subscription');
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) return null;

  // Banner variant - top of page
  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5" />
            <div>
              <span className="font-semibold">{t('upgradePrompt.banner')}</span>
              <span className="ml-2 text-sm opacity-90">
                {t('upgradePrompt.unlockFeature', { feature: t(`feature.${feature}`) })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onUpgradeClick && (
              <button
                onClick={onUpgradeClick}
                className="bg-white text-purple-600 px-4 py-1.5 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-sm"
              >
                {t('upgradeNow')}
              </button>
            )}
            {onDismiss && (
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Modal variant - centered overlay
  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 relative">
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}

          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-purple-600" />
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {t('upgradePrompt.modalTitle')}
            </h3>

            <p className="text-gray-600 mb-6">
              {t('upgradePrompt.featureLocked', {
                feature: t(`feature.${feature}`),
                plan: currentPlan || 'current'
              })}
            </p>

            <div className="space-y-3">
              {onUpgradeClick && (
                <button
                  onClick={onUpgradeClick}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  {t('viewUpgradeOptions')}
                </button>
              )}

              {onDismiss && (
                <button
                  onClick={handleDismiss}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  {t('maybeLater')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Inline variant - within content
  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-6 relative">
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 hover:bg-white/50 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      )}

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-6 h-6 text-purple-600" />
        </div>

        <div className="flex-1">
          <h4 className="text-lg font-bold text-gray-900 mb-1">
            {t('upgradePrompt.inlineTitle')}
          </h4>

          <p className="text-gray-700 mb-4">
            {t('upgradePrompt.unlockFeature', { feature: t(`feature.${feature}`) })}
          </p>

          {onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {t('upgradeNow')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
