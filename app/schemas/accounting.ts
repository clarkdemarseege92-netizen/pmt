// app/schemas/accounting.ts
// 零售记账模块数据验证Schema

import { z } from 'zod';

/**
 * 多语言名称验证
 */
export const multiLangNameSchema = z.object({
  th: z.string().min(1, 'Thai name is required'),
  zh: z.string().min(1, 'Chinese name is required'),
  en: z.string().min(1, 'English name is required'),
});

/**
 * 记账类型验证
 */
export const accountingTypeSchema = z.enum(['income', 'expense'], {
  message: 'Type must be either income or expense',
});

/**
 * 记账来源验证
 */
export const accountingSourceSchema = z.enum(['manual', 'platform_order', 'platform_fee'], {
  message: 'Invalid source type',
});

/**
 * 创建手动记账验证
 */
export const createManualTransactionSchema = z.object({
  merchant_id: z.string().uuid('Invalid merchant ID'),
  type: accountingTypeSchema,
  amount: z.number()
    .positive('Amount must be greater than 0')
    .max(999999999.99, 'Amount is too large')
    .refine((val) => {
      // 验证最多2位小数
      const decimalPart = String(val).split('.')[1];
      return !decimalPart || decimalPart.length <= 2;
    }, 'Amount can have at most 2 decimal places'),
  category_id: z.string().uuid('Invalid category ID').optional(),
  note: z.string().max(500, 'Note is too long').optional(),
  transaction_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)')
    .optional(),
  product_id: z.string().uuid('Invalid product ID').optional(),
});

/**
 * 更新手动记账验证
 */
export const updateManualTransactionSchema = z.object({
  transaction_id: z.string().uuid('Invalid transaction ID'),
  type: accountingTypeSchema.optional(),
  amount: z.number()
    .positive('Amount must be greater than 0')
    .max(999999999.99, 'Amount is too large')
    .refine((val) => {
      const decimalPart = String(val).split('.')[1];
      return !decimalPart || decimalPart.length <= 2;
    }, 'Amount can have at most 2 decimal places')
    .optional(),
  category_id: z.string().uuid('Invalid category ID').nullable().optional(),
  note: z.string().max(500, 'Note is too long').nullable().optional(),
  transaction_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)')
    .optional(),
  product_id: z.string().uuid('Invalid product ID').nullable().optional(),
});

/**
 * 软删除记账记录验证
 */
export const deleteManualTransactionSchema = z.object({
  transaction_id: z.string().uuid('Invalid transaction ID'),
});

/**
 * 创建类目验证
 */
export const createCategorySchema = z.object({
  merchant_id: z.string().uuid('Invalid merchant ID'),
  name: multiLangNameSchema,
  type: accountingTypeSchema,
  icon: z.string().max(50, 'Icon name is too long').optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
});

/**
 * 更新类目验证
 */
export const updateCategorySchema = z.object({
  category_id: z.string().uuid('Invalid category ID'),
  name: multiLangNameSchema.optional(),
  icon: z.string().max(50, 'Icon name is too long').nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
});

/**
 * 删除类目验证
 */
export const deleteCategorySchema = z.object({
  category_id: z.string().uuid('Invalid category ID'),
});

/**
 * 查询记账记录验证
 */
export const queryTransactionsSchema = z.object({
  merchant_id: z.string().uuid('Invalid merchant ID'),
  type: accountingTypeSchema.optional(),
  source: accountingSourceSchema.optional(),
  category_id: z.string().uuid('Invalid category ID').optional(),
  start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date format (use YYYY-MM-DD)')
    .optional(),
  end_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format (use YYYY-MM-DD)')
    .optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
});

/**
 * 导出类型推断
 */
export type CreateManualTransactionInput = z.infer<typeof createManualTransactionSchema>;
export type UpdateManualTransactionInput = z.infer<typeof updateManualTransactionSchema>;
export type DeleteManualTransactionInput = z.infer<typeof deleteManualTransactionSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;
export type QueryTransactionsInput = z.infer<typeof queryTransactionsSchema>;
