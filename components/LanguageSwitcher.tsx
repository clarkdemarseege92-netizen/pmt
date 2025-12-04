// 文件: components/LanguageSwitcher.tsx
// 语言切换器组件

'use client';

import { useLanguage, Language } from '@/contexts/LanguageContext';
import { HiGlobeAlt, HiCheck } from 'react-icons/hi2';

const languages = [
  { code: 'th' as Language, name: 'ไทย', flag: '🇹🇭' },
  { code: 'zh' as Language, name: '简体中文', flag: '🇨🇳' },
  { code: 'en' as Language, name: 'English', flag: '🇺🇸' },
];

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="btn btn-ghost btn-sm gap-2">
        <HiGlobeAlt className="w-5 h-5" />
        <span className="hidden sm:inline">
          {languages.find(l => l.code === language)?.flag}
        </span>
      </label>
      <ul
        tabIndex={0}
        className="dropdown-content z-[100] menu p-2 shadow-lg bg-base-100 rounded-box w-52 mt-2 border border-base-300"
      >
        {languages.map((lang) => (
          <li key={lang.code}>
            <button
              onClick={() => setLanguage(lang.code)}
              className={`flex items-center gap-3 ${
                language === lang.code ? 'active' : ''
              }`}
            >
              <span className="text-2xl">{lang.flag}</span>
              <span className="flex-1">{lang.name}</span>
              {language === lang.code && (
                <HiCheck className="w-5 h-5 text-primary" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
