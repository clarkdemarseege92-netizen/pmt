// components/subscription/SubscriptionPlansGrid.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { SubscriptionPlanCard } from './SubscriptionPlanCard';
import { getSubscriptionPlans } from '@/app/actions/subscriptions';
import type { SubscriptionPlan } from '@/app/types/subscription';
import { Loader2 } from 'lucide-react';

interface SubscriptionPlansGridProps {
  currentPlanId?: string;
  onSelectPlan?: (plan: SubscriptionPlan) => void;
  excludeTrial?: boolean;
  disabled?: boolean;
}

export function SubscriptionPlansGrid({
  currentPlanId,
  onSelectPlan,
  excludeTrial = false,
  disabled = false
}: SubscriptionPlansGridProps) {
  const t = useTranslations('subscription');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        setLoading(true);
        const result = await getSubscriptionPlans();

        if (result.success && result.data) {
          let filteredPlans = result.data;

          // Exclude trial if requested
          if (excludeTrial) {
            filteredPlans = filteredPlans.filter(plan => plan.name !== 'trial');
          }

          setPlans(filteredPlans);
        } else {
          setError(result.error || 'Failed to load plans');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, [excludeTrial]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">{t('loadingPlans')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{t('errorLoadingPlans')}: {error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
      {plans.map((plan) => (
        <SubscriptionPlanCard
          key={plan.id}
          plan={plan}
          currentPlan={currentPlanId === plan.id}
          onSelect={onSelectPlan ? () => onSelectPlan(plan) : undefined}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
