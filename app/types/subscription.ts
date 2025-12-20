// app/types/subscription.ts
// 订阅系统类型定义

export type SubscriptionPlanName = 'trial' | 'basic' | 'standard' | 'professional' | 'enterprise';

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'locked';

export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type PaymentMethod = 'wallet' | 'promptpay';

// 订阅方案
export interface SubscriptionPlan {
  id: string;
  name: SubscriptionPlanName;
  display_name: {
    en: string;
    th: string;
    zh: string;
  };
  price: number;
  product_limit: number;
  coupon_type_limit: number;
  features: SubscriptionFeatures;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 功能特性
export interface SubscriptionFeatures {
  pos_system: boolean;
  basic_accounting: boolean;
  advanced_accounting: boolean;
  advanced_dashboard: boolean;
  product_management: boolean;
  coupon_management: boolean;
  order_management: boolean;
  review_management: boolean;
  shop_design: boolean;
  data_export: boolean;
  expo_app: boolean;
  push_notifications: boolean;
  employee_management: boolean;
  api_access: boolean;
  marketing_tools: boolean;
}

// 商户订阅
export interface MerchantSubscription {
  id: string;
  merchant_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  trial_start_date: string | null;
  trial_end_date: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  locked_at: string | null;
  data_retention_until: string | null;
  created_at: string;
  updated_at: string;
}

// 订阅账单
export interface SubscriptionInvoice {
  id: string;
  merchant_id: string;
  subscription_id: string;
  plan_id: string;
  amount: number;
  status: InvoiceStatus;
  period_start: string;
  period_end: string;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  merchant_transaction_id: number | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

// 订阅状态检查结果
export interface SubscriptionStatusResult {
  is_active: boolean;
  plan_name: SubscriptionPlanName;
  status: SubscriptionStatus;
  features: SubscriptionFeatures;
  product_limit: number;
  coupon_type_limit: number;
}

// 限制检查结果
export interface LimitCheckResult {
  current_count: number;
  limit_count: number;
  can_create: boolean;
}

// API 响应类型
export interface ActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 完整订阅信息（包含方案详情）
export interface SubscriptionWithPlan extends MerchantSubscription {
  plan: SubscriptionPlan;
}
