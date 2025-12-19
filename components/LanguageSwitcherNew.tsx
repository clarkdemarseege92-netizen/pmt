// 文件: components/LanguageSwitcherNew.tsx
// 语言切换器 - 使用 next-intl

'use client';

import {useLocale} from 'next-intl';
import {useRouter, usePathname as useI18nPathname} from '@/i18n/routing';
import {usePathname as useNextPathname} from 'next/navigation';
import {HiGlobeAlt, HiCheck} from 'react-icons/hi';
import {localeLabels} from '@/i18n/routing';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const i18nPathname = useI18nPathname(); // 不带语言前缀
  const nextPathname = useNextPathname(); // 完整路径，带语言前缀

  console.log('🔍 LanguageSwitcher rendered:', {
    locale,
    i18nPathname,
    nextPathname,
    windowLocation: typeof window !== 'undefined' ? window.location.pathname : 'SSR',
  });

  const handleLanguageChange = (newLocale: string) => {
    console.log('🌐 Language switch START:', {
      currentLocale: locale,
      newLocale,
      i18nPathname,
      nextPathname,
      windowPathname: window.location.pathname,
    });

    // 使用 i18n 路由器，它会自动处理语言前缀
    // i18nPathname 应该是不带语言前缀的（如 "/"），router.replace 会添加新语言
    console.log('🔄 Calling router.replace with:', {
      pathname: i18nPathname,
      locale: newLocale,
    });

    router.replace(i18nPathname, {locale: newLocale});

    console.log('✅ router.replace called');
  };

  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="btn btn-ghost btn-sm gap-2">
        <HiGlobeAlt className="w-5 h-5" />
        <span className="hidden sm:inline">
          {localeLabels[locale].flag}
        </span>
      </label>
      <ul
        tabIndex={0}
        className="dropdown-content z-100 menu p-2 shadow-lg bg-base-100 rounded-box w-52 mt-2"
      >
        {Object.entries(localeLabels).map(([code, {name, flag}]) => (
          <li key={code}>
            <button
              onClick={() => handleLanguageChange(code)}
              className={locale === code ? 'active' : ''}
            >
              <span>{flag}</span>
              <span>{name}</span>
              {locale === code && <HiCheck className="ml-auto" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
