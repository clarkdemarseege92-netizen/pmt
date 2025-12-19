// app/actions/product-dictionary/category-with-dictionary.ts
'use server';

import {
  searchDictionary,
  addToDictionary,
  updateDictionaryUsage,
  type DictionaryEntry
} from './dictionary';
import {
  createMerchantCategory,
  updateMerchantCategory,
  type CreateMerchantCategoryInput,
  type UpdateMerchantCategoryInput,
  type MerchantCategory
} from '../merchant-categories/merchant-categories';

// ============================================================================
// 类型定义（多语言版本）
// ============================================================================

export type MultilingualName = {
  th: string;
  en: string;
  zh?: string;
};

export type CreateCategoryWithDictionaryInput = {
  merchant_id: string;
  name: MultilingualName;
  icon?: string;
  sort_order?: number;
  auto_add_to_dictionary?: boolean; // 是否自动添加到字典（默认 true）
};

export type CreateCategoryWithDictionaryResult = {
  success: boolean;
  data?: MerchantCategory;
  dictionary_entry_id?: number;
  dictionary_action?: 'found_exact' | 'found_fuzzy' | 'added_new' | 'skipped';
  error?: string;
};

// ============================================================================
// 字典集成功能
// ============================================================================

/**
 * 创建分类并自动集成字典功能
 *
 * 工作流程:
 * 1. 搜索字典中是否有匹配的翻译
 * 2. 如果有精确匹配，使用字典翻译并更新使用统计
 * 3. 如果没有匹配且启用了自动添加，将新翻译添加到字典
 * 4. 创建商户分类（当前版本使用泰语名称，待Phase 4迁移后使用多语言）
 *
 * @param input 创建分类输入（多语言版本）
 */
export async function createCategoryWithDictionary(
  input: CreateCategoryWithDictionaryInput
): Promise<CreateCategoryWithDictionaryResult> {
  try {
    const autoAddToDictionary = input.auto_add_to_dictionary ?? true;
    let dictionaryEntryId: number | undefined;
    let dictionaryAction: CreateCategoryWithDictionaryResult['dictionary_action'] = 'skipped';

    // 步骤1: 搜索字典
    const searchResult = await searchDictionary(
      input.name.th,
      'merchant_category',
      0.6,
      5
    );

    if (searchResult.success) {
      if (searchResult.match === 'exact') {
        // 找到精确匹配，使用字典翻译
        const entry = searchResult.data as DictionaryEntry;
        dictionaryEntryId = entry.id;
        dictionaryAction = 'found_exact';

        // 更新使用统计
        await updateDictionaryUsage(entry.id);

        // 可以在这里覆盖用户输入的翻译（使用字典中的标准翻译）
        // input.name = entry.name_translations;
      } else if (searchResult.match === 'fuzzy') {
        // 找到模糊匹配，但不自动使用（由前端组件决定）
        dictionaryAction = 'found_fuzzy';
      }
    }

    // 步骤2: 如果没有精确匹配且启用了自动添加，添加到字典
    if (
      dictionaryAction !== 'found_exact' &&
      autoAddToDictionary &&
      input.name.th &&
      input.name.en
    ) {
      const addResult = await addToDictionary({
        name_key: input.name.th,
        name_translations: input.name,
        category: 'merchant_category'
      });

      if (addResult.success && addResult.data) {
        dictionaryEntryId = addResult.data.id;
        dictionaryAction = 'added_new';
      }
    }

    // 步骤3: 创建商户分类
    // 使用完整的多语言名称对象，确保所有字段都存在
    const categoryInput: CreateMerchantCategoryInput = {
      merchant_id: input.merchant_id,
      name: {
        th: input.name.th,
        en: input.name.en,
        zh: input.name.zh || '' // 如果没有中文，使用空字符串
      },
      icon: input.icon,
      sort_order: input.sort_order
    };

    const createResult = await createMerchantCategory(categoryInput);

    if (!createResult.success) {
      return {
        success: false,
        error: createResult.error
      };
    }

    return {
      success: true,
      data: createResult.data || undefined,
      dictionary_entry_id: dictionaryEntryId,
      dictionary_action: dictionaryAction
    };
  } catch (error) {
    console.error('Error in createCategoryWithDictionary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 更新分类并自动更新字典
 *
 * @param input 更新分类输入
 * @param updateName 新的多语言名称（如果要更新名称）
 * @param autoAddToDictionary 是否自动添加到字典
 */
export async function updateCategoryWithDictionary(
  input: UpdateMerchantCategoryInput,
  updateName?: MultilingualName,
  autoAddToDictionary: boolean = true
): Promise<CreateCategoryWithDictionaryResult> {
  try {
    let dictionaryEntryId: number | undefined;
    let dictionaryAction: CreateCategoryWithDictionaryResult['dictionary_action'] = 'skipped';

    // 如果提供了新名称，处理字典
    if (updateName && updateName.th && updateName.en) {
      // 搜索字典
      const searchResult = await searchDictionary(
        updateName.th,
        'merchant_category',
        0.6,
        5
      );

      if (searchResult.success) {
        if (searchResult.match === 'exact') {
          const entry = searchResult.data as DictionaryEntry;
          dictionaryEntryId = entry.id;
          dictionaryAction = 'found_exact';
          await updateDictionaryUsage(entry.id);
        } else if (searchResult.match === 'fuzzy') {
          dictionaryAction = 'found_fuzzy';
        }
      }

      // 如果没有精确匹配且启用了自动添加，添加到字典
      if (dictionaryAction !== 'found_exact' && autoAddToDictionary) {
        const addResult = await addToDictionary({
          name_key: updateName.th,
          name_translations: updateName,
          category: 'merchant_category'
        });

        if (addResult.success && addResult.data) {
          dictionaryEntryId = addResult.data.id;
          dictionaryAction = 'added_new';
        }
      }

      // 更新输入的名称为完整的多语言对象，确保所有字段都存在
      input.name = {
        th: updateName.th,
        en: updateName.en,
        zh: updateName.zh || '' // 如果没有中文，使用空字符串
      };
    }

    // 更新商户分类
    const updateResult = await updateMerchantCategory(input);

    if (!updateResult.success) {
      return {
        success: false,
        error: updateResult.error
      };
    }

    return {
      success: true,
      data: updateResult.data || undefined,
      dictionary_entry_id: dictionaryEntryId,
      dictionary_action: dictionaryAction
    };
  } catch (error) {
    console.error('Error in updateCategoryWithDictionary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 搜索字典并返回翻译建议
 *
 * 用于前端组件实时搜索功能
 *
 * @param thaiName 泰语名称
 * @param similarityThreshold 相似度阈值（默认0.6）
 */
export async function getDictionarySuggestions(
  thaiName: string,
  similarityThreshold: number = 0.6
): Promise<{
  success: boolean;
  suggestions?: DictionaryEntry[];
  exactMatch?: DictionaryEntry;
  error?: string;
}> {
  try {
    const searchResult = await searchDictionary(
      thaiName,
      'merchant_category',
      similarityThreshold,
      5
    );

    if (!searchResult.success) {
      return {
        success: false,
        error: searchResult.error
      };
    }

    if (searchResult.match === 'exact') {
      return {
        success: true,
        exactMatch: searchResult.data as DictionaryEntry,
        suggestions: []
      };
    }

    if (searchResult.match === 'fuzzy') {
      return {
        success: true,
        suggestions: searchResult.data as DictionaryEntry[]
      };
    }

    return {
      success: true,
      suggestions: []
    };
  } catch (error) {
    console.error('Error in getDictionarySuggestions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
