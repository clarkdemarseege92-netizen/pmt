// app/[locale]/merchant/products/components/ProductDictionaryInput.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { searchDictionary } from '@/app/actions/product-dictionary';
import type { DictionaryEntry } from '@/app/actions/product-dictionary';

export type MultilingualProductName = {
  th: string;
  en: string;
  zh?: string;
};

type ProductDictionaryInputProps = {
  value: MultilingualProductName;
  onChange: (value: MultilingualProductName) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  placeholder?: string;
};

export function ProductDictionaryInput({
  value,
  onChange,
  disabled = false,
  label,
  required = false,
  placeholder
}: ProductDictionaryInputProps) {
  const t = useTranslations('merchantProducts');
  const [isSearching, setIsSearching] = useState(false);
  const [exactMatch, setExactMatch] = useState<DictionaryEntry | null>(null);
  const [suggestions, setSuggestions] = useState<DictionaryEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [noMatchMessage, setNoMatchMessage] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 使用翻译或默认值
  const displayLabel = label || t('modal.productName');
  const displayPlaceholder = placeholder || t('dictionaryInput.enterThaiName');

  // 点击外部关闭建议
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 搜索字典（跨类型搜索：同时搜索 product 和 merchant_category）
  const searchDictionaryDebounced = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setExactMatch(null);
      setSuggestions([]);
      setShowSuggestions(false);
      setNoMatchMessage(false);
      return;
    }

    setIsSearching(true);
    setNoMatchMessage(false);

    try {
      // 同时搜索 product 和 merchant_category 两种类型
      // 降低相似度阈值到 0.4，提高泰语短词的匹配率
      const [productResult, categoryResult] = await Promise.all([
        searchDictionary(searchTerm, 'product', 0.4, 5),
        searchDictionary(searchTerm, 'merchant_category', 0.4, 5)
      ]);

      // 检查是否有精确匹配（优先使用 product 类型）
      if (productResult.success && productResult.match === 'exact') {
        setExactMatch(productResult.data);
        setSuggestions([]);
        setShowSuggestions(true);
        return;
      }

      if (categoryResult.success && categoryResult.match === 'exact') {
        setExactMatch(categoryResult.data);
        setSuggestions([]);
        setShowSuggestions(true);
        return;
      }

      // 合并模糊匹配结果
      const allSuggestions: DictionaryEntry[] = [];

      if (productResult.success && productResult.match === 'fuzzy') {
        allSuggestions.push(...productResult.data);
      }

      if (categoryResult.success && categoryResult.match === 'fuzzy') {
        allSuggestions.push(...categoryResult.data);
      }

      if (allSuggestions.length > 0) {
        // 按相似度排序，取前8个
        const sortedSuggestions = allSuggestions
          .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
          .slice(0, 8);

        setExactMatch(null);
        setSuggestions(sortedSuggestions);
        setShowSuggestions(true);
      } else {
        // 无匹配
        setExactMatch(null);
        setSuggestions([]);
        setShowSuggestions(false);
        setNoMatchMessage(true);
      }
    } catch (error) {
      console.error('Dictionary search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 泰语输入变化处理
  const handleThaiChange = (newValue: string) => {
    onChange({ ...value, th: newValue });

    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 设置新的定时器（防抖500ms）
    searchTimeoutRef.current = setTimeout(() => {
      searchDictionaryDebounced(newValue);
    }, 500);
  };

  // 采用建议
  const applySuggestion = (entry: DictionaryEntry) => {
    onChange({
      th: entry.name_translations.th,
      en: entry.name_translations.en,
      zh: entry.name_translations.zh || ''
    });
    setShowSuggestions(false);
    setExactMatch(null);
    setSuggestions([]);
    setNoMatchMessage(false);
  };

  return (
    <div className="form-control" ref={containerRef}>
      <label className="label">
        <span className="label-text font-semibold">
          {displayLabel} {required && <span className="text-error">*</span>}
        </span>
        {isSearching && (
          <span className="label-text-alt flex items-center gap-1">
            <span className="loading loading-spinner loading-xs"></span>
            <span>{t('dictionaryInput.searching')}</span>
          </span>
        )}
      </label>

      {/* 泰语输入框 */}
      <div className="relative">
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder={displayPlaceholder}
          value={value.th}
          onChange={(e) => handleThaiChange(e.target.value)}
          disabled={disabled}
        />
        <label className="label">
          <span className="label-text-alt text-base-content/60">{t('dictionaryInput.thaiPrimaryLanguage')}</span>
          <span className="label-text-alt text-base-content/60">{value.th.length}/100</span>
        </label>

        {/* 精确匹配提示框 */}
        {showSuggestions && exactMatch && (
          <div className="absolute z-10 w-full mt-1 bg-success text-success-content rounded-lg shadow-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-bold">{t('dictionaryInput.exactMatchFound')}</span>
              </div>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setShowSuggestions(false)}
              >
                ✕
              </button>
            </div>
            <div className="space-y-1 text-sm mb-3">
              <p><strong>{t('dictionaryInput.thai')}:</strong> {exactMatch.name_translations.th}</p>
              <p><strong>{t('dictionaryInput.english')}:</strong> {exactMatch.name_translations.en}</p>
              {exactMatch.name_translations.zh && (
                <p><strong>{t('dictionaryInput.chinese')}:</strong> {exactMatch.name_translations.zh}</p>
              )}
            </div>
            <button
              className="btn btn-sm btn-success-content w-full"
              onClick={() => applySuggestion(exactMatch)}
            >
              {t('dictionaryInput.applyTranslation')}
            </button>
          </div>
        )}

        {/* 模糊匹配建议列表 */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-base-100 rounded-lg shadow-lg border border-base-300 max-h-80 overflow-y-auto">
            <div className="p-3 border-b border-base-300 flex items-center justify-between">
              <span className="font-semibold text-sm">
                📊 {t('dictionaryInput.similarSuggestions')} ({suggestions.length} {t('dictionaryInput.results')})
              </span>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setShowSuggestions(false)}
              >
                ✕
              </button>
            </div>
            <div className="divide-y divide-base-300">
              {suggestions.map((entry) => (
                <button
                  key={`${entry.category}-${entry.id}`}
                  className="w-full p-3 hover:bg-base-200 transition-colors text-left"
                  onClick={() => applySuggestion(entry)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{entry.name_translations.th}</div>
                        <span className={`badge badge-xs ${
                          entry.category === 'product' ? 'badge-primary' : 'badge-secondary'
                        }`}>
                          {entry.category === 'product' ? t('dictionaryInput.product') : t('dictionaryInput.category')}
                        </span>
                      </div>
                      <div className="text-sm text-base-content/70">
                        {entry.name_translations.en}
                        {entry.name_translations.zh && ` / ${entry.name_translations.zh}`}
                      </div>
                    </div>
                    {entry.similarity && (
                      <div className="badge badge-sm badge-ghost">
                        {Math.round(entry.similarity * 100)}%
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 无匹配提示 */}
      {noMatchMessage && value.th.trim() && (
        <div className="alert alert-info mt-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">
            {t('dictionaryInput.noMatchHint')}
          </span>
        </div>
      )}

      {/* 英语输入框 */}
      <div className="mt-3">
        <label className="label">
          <span className="label-text">{t('dictionaryInput.english')} <span className="text-error">*</span></span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder="English Name"
          value={value.en}
          onChange={(e) => onChange({ ...value, en: e.target.value })}
          disabled={disabled}
          maxLength={100}
        />
        <label className="label">
          <span className="label-text-alt text-base-content/60">{t('dictionaryInput.englishRequired')}</span>
          <span className="label-text-alt text-base-content/60">{value.en.length}/100</span>
        </label>
      </div>

      {/* 中文输入框 */}
      <div className="mt-3">
        <label className="label">
          <span className="label-text">{t('dictionaryInput.chinese')}</span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder={t('dictionaryInput.chinese')}
          value={value.zh || ''}
          onChange={(e) => onChange({ ...value, zh: e.target.value })}
          disabled={disabled}
          maxLength={100}
        />
        <label className="label">
          <span className="label-text-alt text-base-content/60">{t('dictionaryInput.chineseOptional')}</span>
          <span className="label-text-alt text-base-content/60">{(value.zh || '').length}/100</span>
        </label>
      </div>
    </div>
  );
}
