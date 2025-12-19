// app/[locale]/merchant/product-categories/components/DictionaryInput.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { getDictionarySuggestions } from '@/app/actions/product-dictionary';
import type { DictionaryEntry } from '@/app/actions/product-dictionary';
import { HiSparkles, HiCheckCircle, HiXCircle } from 'react-icons/hi2';

// ============================================================================
// 类型定义
// ============================================================================

export type MultilingualName = {
  th: string;
  en: string;
  zh?: string;
};

type DictionaryInputProps = {
  value: MultilingualName;
  onChange: (value: MultilingualName) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  placeholder?: string;
};

// ============================================================================
// DictionaryInput 组件
// ============================================================================

export function DictionaryInput({
  value,
  onChange,
  disabled = false,
  label,
  required = true,
  placeholder = 'ใส่ชื่อหมวดหมู่...'
}: DictionaryInputProps) {
  const t = useTranslations('productCategories.dictionaryInput');

  // 状态
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<DictionaryEntry[]>([]);
  const [exactMatch, setExactMatch] = useState<DictionaryEntry | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // 字典搜索（防抖）
  // ============================================================================

  const searchDictionary = useCallback(async (thaiName: string) => {
    if (!thaiName || thaiName.trim().length === 0) {
      setSuggestions([]);
      setExactMatch(null);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const result = await getDictionarySuggestions(thaiName.trim(), 0.6);

      if (result.success) {
        if (result.exactMatch) {
          // 找到精确匹配
          setExactMatch(result.exactMatch);
          setSuggestions([]);
          setShowSuggestions(true);
        } else if (result.suggestions && result.suggestions.length > 0) {
          // 找到模糊匹配
          setExactMatch(null);
          setSuggestions(result.suggestions);
          setShowSuggestions(true);
        } else {
          // 无匹配
          setExactMatch(null);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else {
        setSearchError(result.error || 'Search error');
        setExactMatch(null);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Dictionary search error:', error);
      setSearchError('Search failed');
      setExactMatch(null);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // ============================================================================
  // 泰语输入变化处理（防抖500ms）
  // ============================================================================

  const handleThaiInputChange = (thaiValue: string) => {
    // 立即更新本地状态
    onChange({
      ...value,
      th: thaiValue
    });

    // 清除之前的搜索定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 设置新的搜索定时器（防抖）
    searchTimeoutRef.current = setTimeout(() => {
      searchDictionary(thaiValue);
    }, 500);
  };

  // ============================================================================
  // 采用建议
  // ============================================================================

  const applySuggestion = (entry: DictionaryEntry) => {
    onChange({
      th: entry.name_key,
      en: entry.name_translations.en,
      zh: entry.name_translations.zh || ''
    });
    setShowSuggestions(false);
    setExactMatch(null);
    setSuggestions([]);
  };

  // ============================================================================
  // 点击外部关闭建议
  // ============================================================================

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showSuggestions]);

  // ============================================================================
  // 清理定时器
  // ============================================================================

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================================
  // 渲染
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* 泰语输入（主输入） */}
      <div className="form-control relative">
        <label className="label">
          <span className="label-text font-semibold">
            {label || t('thaiName')}
            {required && <span className="text-error ml-1">*</span>}
          </span>
          {isSearching && (
            <span className="label-text-alt flex items-center gap-1">
              <span className="loading loading-spinner loading-xs"></span>
              <span className="text-base-content/60">{t('searching')}</span>
            </span>
          )}
        </label>

        <input
          type="text"
          className="input input-bordered w-full"
          placeholder={placeholder}
          value={value.th}
          onChange={(e) => handleThaiInputChange(e.target.value)}
          disabled={disabled}
          autoFocus
        />

        {/* 精确匹配提示 */}
        {exactMatch && showSuggestions && (
          <div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 mt-1 z-50"
          >
            <div className="bg-success text-success-content rounded-lg p-3 shadow-lg border border-success/20">
              <div className="flex items-start gap-2">
                <HiCheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm mb-1">{t('exactMatchFound')}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="opacity-70">EN:</span>
                      <span className="font-medium">{exactMatch.name_translations.en}</span>
                    </div>
                    {exactMatch.name_translations.zh && (
                      <div className="flex items-center gap-2">
                        <span className="opacity-70">ZH:</span>
                        <span className="font-medium">{exactMatch.name_translations.zh}</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-success mt-2"
                    onClick={() => applySuggestion(exactMatch)}
                    disabled={disabled}
                  >
                    <HiSparkles className="w-4 h-4" />
                    {t('applyTranslation')}
                  </button>
                </div>
                <button
                  type="button"
                  className="btn btn-xs btn-circle btn-ghost"
                  onClick={() => setShowSuggestions(false)}
                >
                  <HiXCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 模糊匹配建议列表 */}
        {suggestions.length > 0 && showSuggestions && !exactMatch && (
          <div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 mt-1 z-50"
          >
            <div className="bg-base-100 rounded-lg shadow-lg border border-base-300 max-h-64 overflow-y-auto">
              <div className="p-3 border-b border-base-300 bg-base-200">
                <div className="flex items-center gap-2">
                  <HiSparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">{t('similarSuggestions')}</span>
                  <span className="text-xs text-base-content/60">
                    ({suggestions.length} {t('results')})
                  </span>
                </div>
              </div>
              <div className="divide-y divide-base-200">
                {suggestions.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="w-full text-left p-3 hover:bg-base-200 transition-colors"
                    onClick={() => applySuggestion(entry)}
                    disabled={disabled}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{entry.name_key}</span>
                        {entry.similarity && (
                          <span className="badge badge-sm badge-outline">
                            {Math.round(entry.similarity * 100)}% {t('match')}
                          </span>
                        )}
                      </div>
                      <div className="text-sm space-y-0.5">
                        <div className="flex items-center gap-2 text-base-content/70">
                          <span className="w-8">EN:</span>
                          <span>{entry.name_translations.en}</span>
                        </div>
                        {entry.name_translations.zh && (
                          <div className="flex items-center gap-2 text-base-content/70">
                            <span className="w-8">ZH:</span>
                            <span>{entry.name_translations.zh}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {searchError && (
          <label className="label">
            <span className="label-text-alt text-error">{searchError}</span>
          </label>
        )}
      </div>

      {/* 英语翻译输入 */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">
            {t('englishName')}
            {required && <span className="text-error ml-1">*</span>}
          </span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder="e.g., Hot Beverages, Desserts..."
          value={value.en}
          onChange={(e) => onChange({ ...value, en: e.target.value })}
          disabled={disabled}
        />
      </div>

      {/* 中文翻译输入（可选） */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">
            {t('chineseName')}
            <span className="label-text-alt ml-2 text-base-content/60">
              {t('optional')}
            </span>
          </span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder="例如：热饮、甜点..."
          value={value.zh || ''}
          onChange={(e) => onChange({ ...value, zh: e.target.value })}
          disabled={disabled}
        />
      </div>

      {/* 提示信息 */}
      {!exactMatch && !suggestions.length && value.th.trim().length > 0 && !isSearching && (
        <div className="alert alert-info">
          <HiSparkles className="w-5 h-5" />
          <span className="text-sm">{t('noMatchHint')}</span>
        </div>
      )}
    </div>
  );
}
