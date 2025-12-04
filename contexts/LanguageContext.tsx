// 文件: contexts/LanguageContext.tsx
// 国际化语言上下文

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'th' | 'zh' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// 检测浏览器语言
function detectBrowserLanguage(): Language {
  if (typeof window === 'undefined') return 'th'; // 服务端默认泰语

  const browserLang = navigator.language.toLowerCase();

  // 泰语
  if (browserLang.startsWith('th')) return 'th';

  // 简体中文
  if (browserLang.startsWith('zh-cn') || browserLang === 'zh-hans' || browserLang === 'zh') {
    return 'zh';
  }

  // 英语
  if (browserLang.startsWith('en')) return 'en';

  // 默认泰语（因为是泰国项目）
  return 'th';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('th');
  const [mounted, setMounted] = useState(false);

  // 初始化语言
  useEffect(() => {
    setMounted(true);

    // 从 localStorage 读取用户之前的选择
    const savedLang = localStorage.getItem('preferred-language') as Language | null;

    if (savedLang && ['th', 'zh', 'en'].includes(savedLang)) {
      setLanguageState(savedLang);
    } else {
      // 检测浏览器语言
      const detectedLang = detectBrowserLanguage();
      setLanguageState(detectedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('preferred-language', lang);
  };

  // 避免服务端渲染不匹配问题
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
