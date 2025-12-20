// components/subscription/TrialCountdown.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Clock, AlertTriangle } from 'lucide-react';

interface TrialCountdownProps {
  trialEndDate: string;
  onUpgradeClick?: () => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeRemaining(endDate: string): TimeRemaining {
  const total = new Date(endDate).getTime() - new Date().getTime();

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, total };
}

export function TrialCountdown({ trialEndDate, onUpgradeClick }: TrialCountdownProps) {
  const t = useTranslations('subscription');
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(
    calculateTimeRemaining(trialEndDate)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(trialEndDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [trialEndDate]);

  // Trial expired
  if (timeRemaining.total <= 0) {
    return (
      <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <div>
            <h3 className="font-bold text-red-900">{t('trialExpired')}</h3>
            <p className="text-sm text-red-700">{t('trialExpiredMessage')}</p>
          </div>
        </div>
        {onUpgradeClick && (
          <button
            onClick={onUpgradeClick}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            {t('upgradeNow')}
          </button>
        )}
      </div>
    );
  }

  // Less than 7 days remaining - show warning
  const isWarning = timeRemaining.days < 7;
  const isUrgent = timeRemaining.days < 3;

  return (
    <div
      className={`
        rounded-lg p-4 border-2
        ${isUrgent ? 'bg-red-50 border-red-500' : isWarning ? 'bg-yellow-50 border-yellow-500' : 'bg-blue-50 border-blue-500'}
      `}
    >
      <div className="flex items-center gap-3 mb-3">
        <Clock
          className={`w-6 h-6 ${isUrgent ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-blue-600'}`}
        />
        <div className="flex-1">
          <h3
            className={`font-bold ${isUrgent ? 'text-red-900' : isWarning ? 'text-yellow-900' : 'text-blue-900'}`}
          >
            {t('trialPeriod')}
          </h3>
          <p
            className={`text-sm ${isUrgent ? 'text-red-700' : isWarning ? 'text-yellow-700' : 'text-blue-700'}`}
          >
            {isUrgent ? t('trialEndingSoon') : t('trialTimeRemaining')}
          </p>
        </div>
      </div>

      {/* Countdown Display */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="text-center">
          <div
            className={`text-2xl font-bold ${isUrgent ? 'text-red-900' : isWarning ? 'text-yellow-900' : 'text-blue-900'}`}
          >
            {timeRemaining.days}
          </div>
          <div
            className={`text-xs ${isUrgent ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-blue-600'}`}
          >
            {t('days')}
          </div>
        </div>
        <div className="text-center">
          <div
            className={`text-2xl font-bold ${isUrgent ? 'text-red-900' : isWarning ? 'text-yellow-900' : 'text-blue-900'}`}
          >
            {timeRemaining.hours}
          </div>
          <div
            className={`text-xs ${isUrgent ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-blue-600'}`}
          >
            {t('hours')}
          </div>
        </div>
        <div className="text-center">
          <div
            className={`text-2xl font-bold ${isUrgent ? 'text-red-900' : isWarning ? 'text-yellow-900' : 'text-blue-900'}`}
          >
            {timeRemaining.minutes}
          </div>
          <div
            className={`text-xs ${isUrgent ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-blue-600'}`}
          >
            {t('minutes')}
          </div>
        </div>
        <div className="text-center">
          <div
            className={`text-2xl font-bold ${isUrgent ? 'text-red-900' : isWarning ? 'text-yellow-900' : 'text-blue-900'}`}
          >
            {timeRemaining.seconds}
          </div>
          <div
            className={`text-xs ${isUrgent ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-blue-600'}`}
          >
            {t('seconds')}
          </div>
        </div>
      </div>

      {/* Upgrade Button */}
      {onUpgradeClick && isWarning && (
        <button
          onClick={onUpgradeClick}
          className={`
            w-full py-2 px-4 rounded-lg font-semibold transition-colors
            ${isUrgent ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'}
            text-white
          `}
        >
          {t('upgradeNow')}
        </button>
      )}
    </div>
  );
}
