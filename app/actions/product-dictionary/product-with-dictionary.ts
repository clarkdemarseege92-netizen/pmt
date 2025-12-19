// app/actions/product-dictionary/product-with-dictionary.ts
'use server';

import { supabase } from '@/lib/supabaseClient';
import { searchDictionary, addToDictionary, updateDictionaryUsage } from './dictionary';
import type { MultilingualProductName } from '@/app/[locale]/merchant/products/components/ProductDictionaryInput';

export type ActionResponse<T = void> =
  | { success: true; data?: T; dictionary_action?: 'found_exact' | 'found_fuzzy' | 'added_new' | 'skipped' }
  | { success: false; error: string };

type CreateProductWithDictionaryParams = {
  merchant_id: string;
  name: MultilingualProductName;
  description?: { th: string; en: string; zh?: string };
  original_price: number;
  image_urls?: string[];
  category_id: string;
  merchant_category_id?: string | null;
  auto_add_to_dictionary?: boolean;
};

type UpdateProductWithDictionaryParams = {
  product_id: string;
  name?: MultilingualProductName;
  description?: { th: string; en: string; zh?: string };
  original_price?: number;
  image_urls?: string[];
  category_id?: string;
  merchant_category_id?: string | null;
};

/**
 * 创建商品并集成字典功能
 */
export async function createProductWithDictionary(
  params: CreateProductWithDictionaryParams
): Promise<ActionResponse<{ product_id: string }>> {
  try {
    // 1. 验证必填字段
    if (!params.name.th.trim()) {
      return { success: false, error: '泰语商品名称不能为空' };
    }
    if (!params.name.en.trim()) {
      return { success: false, error: '英语商品名称不能为空' };
    }
    if (!params.category_id) {
      return { success: false, error: '必须选择行业分类' };
    }

    // 2. 字典处理
    let dictionaryAction: 'found_exact' | 'found_fuzzy' | 'added_new' | 'skipped' = 'skipped';

    if (params.auto_add_to_dictionary !== false) {
      // 搜索字典
      const searchResult = await searchDictionary(params.name.th, 'product');

      if (searchResult.success && searchResult.match === 'exact') {
        // 找到精确匹配，更新使用统计
        await updateDictionaryUsage(searchResult.data.id);
        dictionaryAction = 'found_exact';
      } else if (searchResult.success && searchResult.match === 'none') {
        // 无匹配，添加到字典
        const addResult = await addToDictionary({
          name_key: params.name.th,
          name_translations: {
            th: params.name.th,
            en: params.name.en,
            zh: params.name.zh || ''
          },
          category: 'product'
        });

        if (addResult.success) {
          dictionaryAction = 'added_new';
        }
      } else if (searchResult.success && searchResult.match === 'fuzzy') {
        // 找到模糊匹配，但用户使用了自己的翻译，添加到字典
        const addResult = await addToDictionary({
          name_key: params.name.th,
          name_translations: {
            th: params.name.th,
            en: params.name.en,
            zh: params.name.zh || ''
          },
          category: 'product'
        });

        if (addResult.success) {
          dictionaryAction = 'added_new';
        }
      }
    }

    // 3. 创建商品（使用泰语作为name字段，保持向后兼容）
    const productData = {
      merchant_id: params.merchant_id,
      name: { th: params.name.th, en: params.name.en, zh: params.name.zh || '' },
      description: params.description || { th: '', en: '', zh: '' },
      original_price: params.original_price,
      image_urls: params.image_urls || [],
      category_id: params.category_id,
      merchant_category_id: params.merchant_category_id || null
    };

    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select('product_id')
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: { product_id: data.product_id },
      dictionary_action: dictionaryAction
    };

  } catch (error) {
    console.error('Error in createProductWithDictionary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '创建商品失败'
    };
  }
}

/**
 * 更新商品并集成字典功能
 */
export async function updateProductWithDictionary(
  params: UpdateProductWithDictionaryParams,
  name: MultilingualProductName,
  auto_add_to_dictionary: boolean = true
): Promise<ActionResponse> {
  try {
    // 1. 验证必填字段
    if (name && !name.th.trim()) {
      return { success: false, error: '泰语商品名称不能为空' };
    }
    if (name && !name.en.trim()) {
      return { success: false, error: '英语商品名称不能为空' };
    }

    // 2. 字典处理
    let dictionaryAction: 'found_exact' | 'found_fuzzy' | 'added_new' | 'skipped' = 'skipped';

    if (auto_add_to_dictionary && name) {
      // 搜索字典
      const searchResult = await searchDictionary(name.th, 'product');

      if (searchResult.success && searchResult.match === 'exact') {
        // 找到精确匹配，更新使用统计
        await updateDictionaryUsage(searchResult.data.id);
        dictionaryAction = 'found_exact';
      } else if (searchResult.success && searchResult.match === 'none') {
        // 无匹配，添加到字典
        const addResult = await addToDictionary({
          name_key: name.th,
          name_translations: {
            th: name.th,
            en: name.en,
            zh: name.zh || ''
          },
          category: 'product'
        });

        if (addResult.success) {
          dictionaryAction = 'added_new';
        }
      } else if (searchResult.success && searchResult.match === 'fuzzy') {
        // 找到模糊匹配，但用户使用了自己的翻译
        const addResult = await addToDictionary({
          name_key: name.th,
          name_translations: {
            th: name.th,
            en: name.en,
            zh: name.zh || ''
          },
          category: 'product'
        });

        if (addResult.success) {
          dictionaryAction = 'added_new';
        }
      }
    }

    // 3. 构建更新数据
    const updateData: Record<string, unknown> = {};

    if (name) {
      updateData.name = { th: name.th, en: name.en, zh: name.zh || '' };
    }
    if (params.description) {
      updateData.description = params.description;
    }
    if (params.original_price !== undefined) {
      updateData.original_price = params.original_price;
    }
    if (params.image_urls !== undefined) {
      updateData.image_urls = params.image_urls;
    }
    if (params.category_id !== undefined) {
      updateData.category_id = params.category_id;
    }
    if (params.merchant_category_id !== undefined) {
      updateData.merchant_category_id = params.merchant_category_id;
    }

    // 4. 更新商品
    const { error } = await supabase
      .from('products')
      .update(updateData)
      .eq('product_id', params.product_id);

    if (error) {
      console.error('Error updating product:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      dictionary_action: dictionaryAction
    };

  } catch (error) {
    console.error('Error in updateProductWithDictionary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '更新商品失败'
    };
  }
}

/**
 * 获取商品名称的字典建议
 */
export async function getProductNameSuggestions(
  name_th: string
): Promise<ActionResponse<Array<{ th: string; en: string; zh?: string }>>> {
  try {
    const result = await searchDictionary(name_th, 'product', 0.6, 10);

    if (!result.success) {
      return { success: false, error: result.error || '搜索失败' };
    }

    if (result.match === 'none') {
      return { success: true, data: [] };
    }

    if (result.match === 'exact') {
      return {
        success: true,
        data: [{
          th: result.data.name_translations.th,
          en: result.data.name_translations.en,
          zh: result.data.name_translations.zh
        }]
      };
    }

    // fuzzy match
    return {
      success: true,
      data: result.data.map(entry => ({
        th: entry.name_translations.th,
        en: entry.name_translations.en,
        zh: entry.name_translations.zh
      }))
    };

  } catch (error) {
    console.error('Error in getProductNameSuggestions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取建议失败'
    };
  }
}
