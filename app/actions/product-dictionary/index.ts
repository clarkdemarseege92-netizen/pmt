// app/actions/product-dictionary/index.ts
/**
 * 商品/分类字典系统 - 统一导出
 *
 * 提供多语言字典的搜索、添加、批量查询等功能
 * 支持精确匹配和模糊搜索（基于PostgreSQL pg_trgm）
 */

// 基础字典操作
export {
  searchDictionary,
  addToDictionary,
  batchSearchDictionary,
  updateDictionaryUsage,
  getPopularDictionaryEntries,
  type DictionaryEntry,
  type DictionarySearchResult,
  type AddDictionaryInput,
  type AddDictionaryResult,
  type BatchSearchInput,
  type BatchSearchResult,
  type BatchSearchResultItem
} from './dictionary';

// 字典集成功能（用于商户分类）
export {
  createCategoryWithDictionary,
  updateCategoryWithDictionary,
  getDictionarySuggestions,
  type MultilingualName,
  type CreateCategoryWithDictionaryInput,
  type CreateCategoryWithDictionaryResult
} from './category-with-dictionary';

// 字典集成功能（用于商品）
export {
  createProductWithDictionary,
  updateProductWithDictionary,
  getProductNameSuggestions
} from './product-with-dictionary';
