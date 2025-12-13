// 文件: i18n/routing.ts
// next-intl 路由配置

import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';

export const routing = defineRouting({
  // 支持的语言列表
  locales: ['th', 'zh', 'en'],

  // 默认语言（泰语 - 因为是泰国市场）
  defaultLocale: 'th',

  // 始终显示语言前缀（方案A：标准路由）
  localePrefix: 'always',

  // 基于浏览器语言自动检测
  localeDetection: true,

  // 路径名称（可选，用于本地化 URL 路径）
  // 例如：/en/about -> /th/เกี่ยวกับเรา
  // pathnames: {
  //   '/': '/',
  //   '/about': {
  //     th: '/เกี่ยวกับเรา',
  //     zh: '/关于我们',
  //     en: '/about'
  //   }
  // }
});

// 语言名称和标识（用于语言切换器）
export const localeLabels: Record<string, { name: string; flag: string }> = {
  th: { name: 'ไทย', flag: '🇹🇭' },
  zh: { name: '简体中文', flag: '🇨🇳' },
  en: { name: 'English', flag: '🇺🇸' },
};

// 创建类型安全的导航辅助函数
export const {Link, redirect, usePathname, useRouter} = createNavigation(routing);
