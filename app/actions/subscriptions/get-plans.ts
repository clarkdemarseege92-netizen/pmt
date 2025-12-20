// app/actions/subscriptions/get-plans.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { ActionResponse, SubscriptionPlan } from '@/app/types/subscription';

/**
 * 获取所有订阅方案
 * @returns 订阅方案列表
 */
export async function getSubscriptionPlans(): Promise<ActionResponse<SubscriptionPlan[]>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      console.error('Error fetching subscription plans:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }

    return {
      success: true,
      data: data as SubscriptionPlan[]
    };
  } catch (error) {
    console.error('Error in getSubscriptionPlans:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    };
  }
}

/**
 * 根据名称获取订阅方案
 * @param planName 方案名称
 */
export async function getSubscriptionPlanByName(
  planName: string
): Promise<ActionResponse<SubscriptionPlan>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', planName)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching subscription plan:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data: data as SubscriptionPlan
    };
  } catch (error) {
    console.error('Error in getSubscriptionPlanByName:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
