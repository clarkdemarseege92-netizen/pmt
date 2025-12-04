// 文件: lib/i18nUtils.ts
// 服务器端和客户端都可以使用的 i18n 工具函数

/**
 * 从多语言对象中获取指定语言的值
 * 这个函数可以在服务器组件和客户端组件中使用
 */
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

  // 辅助函数：检查值是否有效（非空字符串）
  const isValidValue = (value: T): boolean => {
    if (typeof value === 'string') {
      return value.trim() !== '';
    }
    return value != null;
  };

  // 尝试获取当前语言（跳过空字符串）
  if (language in obj && isValidValue(obj[language])) {
    return obj[language];
  }

  // 尝试获取后备语言（跳过空字符串）
  if (fallbackLang in obj && isValidValue(obj[fallbackLang])) {
    return obj[fallbackLang];
  }

  // 尝试获取 'en'（跳过空字符串）
  if ('en' in obj && isValidValue(obj['en'])) {
    return obj['en'];
  }

  // 返回第一个有效的值
  for (const value of Object.values(obj)) {
    if (isValidValue(value as T)) {
      return value as T;
    }
  }

  // 如果都没有有效值，返回空字符串或原始对象
  return ('' as T);
}
