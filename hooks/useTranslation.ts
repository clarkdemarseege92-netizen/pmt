// 文件: hooks/useTranslation.ts
// 翻译 Hook

'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/locales/translations';

export function useTranslation() {
  const { language } = useLanguage();

  // 获取当前语言的翻译对象
  const t = translations[language];

  return { t, language };
}

// 辅助函数：从多语言对象中获取当前语言的值
export function getLocalizedValue<T>(
  multiLangObj: { [key: string]: T } | T,
  language: 'th' | 'zh' | 'en',
  fallbackLang: 'th' | 'zh' | 'en' = 'th'
): T {
  // 如果不是对象，直接返回
  if (typeof multiLangObj !== 'object' || multiLangObj === null) {
    return multiLangObj as T;
  }

  const obj = multiLangObj as { [key: string]: T };

  // 尝试获取当前语言
  if (language in obj) {
    return obj[language];
  }

  // 尝试获取后备语言
  if (fallbackLang in obj) {
    return obj[fallbackLang];
  }

  // 尝试获取 'en'
  if ('en' in obj) {
    return obj['en'];
  }

  // 返回第一个可用的值
  const firstValue = Object.values(obj)[0];
  return firstValue || ('' as T);
}
