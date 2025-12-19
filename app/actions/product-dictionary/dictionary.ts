// app/actions/product-dictionary/dictionary.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';

// ============================================================================
// 类型定义
// ============================================================================

export type DictionaryEntry = {
  id: number;
  name_key: string;
  name_translations: {
    th: string;
    en: string;
    zh?: string;
  };
  description_translations?: {
    th?: string;
    en?: string;
    zh?: string;
  };
  category: 'product' | 'merchant_category';
  usage_count: number;
  similarity?: number;
  last_used_at?: string;
};

export type DictionarySearchResult =
  | { success: true; match: 'exact'; data: DictionaryEntry }
  | { success: true; match: 'fuzzy'; data: DictionaryEntry[] }
  | { success: true; match: 'none'; data: null }
  | { success: false; error: string };

export type AddDictionaryInput = {
  name_key: string;
  name_translations: {
    th: string;
    en: string;
    zh?: string;
  };
  description_translations?: {
    th?: string;
    en?: string;
    zh?: string;
  };
  category: 'product' | 'merchant_category';
};

export type AddDictionaryResult = {
  success: boolean;
  data?: DictionaryEntry;
  error?: string;
};

export type BatchSearchInput = {
  search_terms: string[];
  category?: 'product' | 'merchant_category';
};

export type BatchSearchResultItem = {
  search_term: string;
  found: boolean;
  data?: DictionaryEntry;
};

export type BatchSearchResult = {
  success: boolean;
  data?: BatchSearchResultItem[];
  error?: string;
};

// ============================================================================
// 主要功能函数
// ============================================================================

/**
 * 搜索字典 - 支持精确匹配和模糊匹配
 * @param searchTerm 搜索词（泰语）
 * @param category 字典分类（product 或 merchant_category）
 * @param similarityThreshold 相似度阈值（0-1，默认0.6）
 * @param maxResults 最大返回结果数（默认5）
 */
export async function searchDictionary(
  searchTerm: string,
  category: 'product' | 'merchant_category' = 'merchant_category',
  similarityThreshold: number = 0.6,
  maxResults: number = 5
): Promise<DictionarySearchResult> {
  try {
    const supabase = await createSupabaseServerClient();

    // 验证输入
    if (!searchTerm || searchTerm.trim().length === 0) {
      return { success: false, error: 'Search term is required' };
    }

    const normalizedTerm = searchTerm.trim();

    // 步骤1: 尝试精确匹配
    const { data: exactMatch, error: exactError } = await supabase
      .from('product_dictionary')
      .select('*')
      .eq('name_key', normalizedTerm)
      .eq('category', category)
      .eq('status', 'active')
      .single();

    if (exactError && exactError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (这是预期的，不是错误)
      console.error('Error in exact match search:', exactError);
      return { success: false, error: exactError.message };
    }

    if (exactMatch) {
      return {
        success: true,
        match: 'exact',
        data: exactMatch as DictionaryEntry
      };
    }

    // 步骤2: 尝试模糊匹配（使用数据库函数）
    const { data: fuzzyMatches, error: fuzzyError } = await supabase.rpc(
      'search_dictionary_fuzzy',
      {
        search_term: normalizedTerm,
        dict_category: category,
        similarity_threshold: similarityThreshold,
        max_results: maxResults
      }
    );

    if (fuzzyError) {
      console.error('Error in fuzzy search:', fuzzyError);
      return { success: false, error: fuzzyError.message };
    }

    if (fuzzyMatches && fuzzyMatches.length > 0) {
      return {
        success: true,
        match: 'fuzzy',
        data: fuzzyMatches as DictionaryEntry[]
      };
    }

    // 步骤3: 无匹配
    return {
      success: true,
      match: 'none',
      data: null
    };
  } catch (error) {
    console.error('Error in searchDictionary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 添加新词条到字典
 * @param input 字典词条数据
 */
export async function addToDictionary(
  input: AddDictionaryInput
): Promise<AddDictionaryResult> {
  try {
    const supabase = await createSupabaseServerClient();

    // 验证输入
    if (!input.name_key || !input.name_translations) {
      return { success: false, error: 'Name key and translations are required' };
    }

    if (!input.name_translations.th || !input.name_translations.en) {
      return {
        success: false,
        error: 'Thai and English translations are required'
      };
    }

    // 检查是否已存在
    const { data: existing } = await supabase
      .from('product_dictionary')
      .select('id')
      .eq('name_key', input.name_key.trim())
      .eq('category', input.category)
      .single();

    if (existing) {
      return {
        success: false,
        error: 'Dictionary entry already exists for this name'
      };
    }

    // 生成标准化名称
    const nameNormalized = input.name_key
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

    // 插入新词条
    const { data, error } = await supabase
      .from('product_dictionary')
      .insert({
        name_key: input.name_key.trim(),
        name_normalized: nameNormalized,
        name_translations: input.name_translations,
        description_translations: input.description_translations || null,
        category: input.category,
        status: 'active',
        usage_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding to dictionary:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as DictionaryEntry
    };
  } catch (error) {
    console.error('Error in addToDictionary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 批量搜索字典（精确匹配）
 * @param input 批量搜索输入
 */
export async function batchSearchDictionary(
  input: BatchSearchInput
): Promise<BatchSearchResult> {
  try {
    const supabase = await createSupabaseServerClient();

    // 验证输入
    if (!input.search_terms || input.search_terms.length === 0) {
      return { success: false, error: 'Search terms are required' };
    }

    const category = input.category || 'merchant_category';

    // 调用数据库批量查询函数
    const { data, error } = await supabase.rpc('batch_lookup_dictionary', {
      search_terms: input.search_terms,
      dict_category: category
    });

    if (error) {
      console.error('Error in batch search:', error);
      return { success: false, error: error.message };
    }

    // 转换结果格式
    const results: BatchSearchResultItem[] = (data || []).map((item: any) => ({
      search_term: item.search_term,
      found: item.found,
      data: item.found
        ? {
            id: item.id,
            name_key: item.name_key,
            name_translations: item.name_translations,
            category: category,
            usage_count: 0
          }
        : undefined
    }));

    return {
      success: true,
      data: results
    };
  } catch (error) {
    console.error('Error in batchSearchDictionary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 更新字典词条使用统计
 * @param dictionaryId 字典词条ID
 */
export async function updateDictionaryUsage(
  dictionaryId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();

    // 调用数据库函数更新使用统计
    const { error } = await supabase.rpc('increment_dictionary_usage', {
      dict_id: dictionaryId
    });

    if (error) {
      console.error('Error updating dictionary usage:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateDictionaryUsage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 获取热门字典词条（推荐功能）
 * @param category 字典分类
 * @param maxResults 最大返回数量
 * @param minUsageCount 最小使用次数
 */
export async function getPopularDictionaryEntries(
  category: 'product' | 'merchant_category' = 'merchant_category',
  maxResults: number = 10,
  minUsageCount: number = 5
): Promise<{
  success: boolean;
  data?: DictionaryEntry[];
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc('get_popular_dictionary_entries', {
      dict_category: category,
      max_results: maxResults,
      min_usage_count: minUsageCount
    });

    if (error) {
      console.error('Error getting popular entries:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: (data || []) as DictionaryEntry[]
    };
  } catch (error) {
    console.error('Error in getPopularDictionaryEntries:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
