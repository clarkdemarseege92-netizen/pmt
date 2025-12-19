// app/types/accounting.ts
// 零售记账模块类型定义

/**
 * 多语言名称类型
 */
export type MultiLangName = {
  th: string;
  zh: string;
  en: string;
};

/**
 * 记账类型：收入或支出
 */
export type AccountingType = 'income' | 'expense';

/**
 * 记账来源
 * - manual: 手动录入
 * - platform_order: 平台订单自动生成
 * - platform_fee: 平台服务费扣款
 * - cash_order: 现金订单自动生成
 */
export type AccountingSource = 'manual' | 'platform_order' | 'platform_fee' | 'cash_order';

/**
 * 记账类目
 */
export interface AccountCategory {
  category_id: string;
  merchant_id: string;
  name?: MultiLangName | null;
  custom_name?: string | null;
  type: AccountingType;
  is_system: boolean;
  is_active: boolean;
  icon?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * 记账记录
 */
export interface AccountTransaction {
  transaction_id: string;
  merchant_id: string;
  type: AccountingType;
  amount: number;
  category_id: string | null;
  source: AccountingSource;
  order_id?: string | null;
  merchant_transaction_id?: number | null;
  product_id?: string | null;
  note?: string | null;
  metadata: Record<string, unknown>;
  is_editable: boolean;
  is_deletable: boolean;
  transaction_date: string; // ISO date string
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

/**
 * 带类目信息的记账记录
 */
export interface AccountTransactionWithCategory extends AccountTransaction {
  category?: AccountCategory | null;
}

/**
 * 财务概览
 */
export interface FinancialOverview {
  total_income: number;
  total_expense: number;
  net_profit: number;
  income_count: number;
  expense_count: number;
}

/**
 * 类目汇总
 */
export interface CategorySummary {
  category_id: string | null;
  category_name: MultiLangName | null;
  category_icon: string | null;
  type: AccountingType;
  total_amount: number;
  transaction_count: number;
}

/**
 * 创建手动记账的表单数据
 */
export interface CreateManualTransactionInput {
  merchant_id: string;
  type: AccountingType;
  amount: number;
  category_id?: string;
  note?: string;
  transaction_date?: string; // ISO date string, defaults to today
  product_id?: string;
}

/**
 * 更新手动记账的表单数据
 */
export interface UpdateManualTransactionInput {
  transaction_id: string;
  type?: AccountingType;
  amount?: number;
  category_id?: string;
  note?: string;
  transaction_date?: string;
  product_id?: string;
}

/**
 * 创建类目的表单数据
 */
export interface CreateCategoryInput {
  merchant_id: string;
  name: MultiLangName;
  type: AccountingType;
  icon?: string;
  sort_order?: number;
}

/**
 * 更新类目的表单数据
 */
export interface UpdateCategoryInput {
  category_id: string;
  name?: MultiLangName;
  icon?: string;
  sort_order?: number;
}

/**
 * 查询参数
 */
export interface TransactionQueryParams {
  merchant_id: string;
  type?: AccountingType;
  source?: AccountingSource;
  category_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

/**
 * Server Action 返回类型
 */
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// 快捷记账 - 现金订单相关类型
// ============================================

/**
 * 现金订单状态
 */
export type CashOrderStatus = 'completed' | 'cancelled';

/**
 * 订单明细项类型
 */
export type OrderItemType = 'product' | 'coupon';

/**
 * 订单明细项
 */
export interface CashOrderItem {
  type: OrderItemType;
  id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

/**
 * 现金订单
 */
export interface CashOrder {
  cash_order_id: string;
  merchant_id: string;
  order_number: string;
  total_amount: number;
  items: CashOrderItem[];
  item_count: number;
  note?: string | null;
  status: CashOrderStatus;
  transaction_id?: string | null;
  order_date: string; // ISO timestamp
  created_at: string;
  updated_at: string;
  cancelled_at?: string | null;
}

/**
 * 带关联记账记录的现金订单
 */
export interface CashOrderWithTransaction extends CashOrder {
  transaction?: AccountTransaction | null;
}

/**
 * 创建现金订单的输入
 */
export interface CreateCashOrderInput {
  merchant_id: string;
  items: CashOrderItem[];
  note?: string;
  order_date?: string; // ISO timestamp, defaults to now
}

/**
 * 现金订单统计
 */
export interface CashOrderStats {
  total_orders: number;
  total_amount: number;
  total_items: number;
  avg_order_amount: number;
  completed_orders: number;
  cancelled_orders: number;
}

/**
 * 快捷支出输入
 */
export interface QuickExpenseInput {
  merchant_id: string;
  category_id: string;
  amount: number;
  note?: string;
  transaction_date?: string; // ISO date, defaults to today
}
