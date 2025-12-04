// 文件: i18n/request.ts
// 服务器端 i18n 配置

import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';

export default getRequestConfig(async ({locale}) => {
  // next-intl v4 在 App Router 中会自动从 [locale] 路由段提取 locale
  // 这里的 locale 参数直接来自路由段，不需要 await
  console.log('🔍 I18N REQUEST: locale from route segment =', locale);

  // 确保传入的 `locale` 是有效的
  if (!locale || !routing.locales.includes(locale as any)) {
    console.log('⚠️ I18N REQUEST: Invalid locale, falling back to', routing.defaultLocale);
    locale = routing.defaultLocale;
  }

  console.log('🌐 I18N REQUEST: Loading messages for locale =', locale);
  const messages = (await import(`../messages/${locale}.json`)).default;
  console.log('✅ I18N REQUEST: Messages loaded, home.hero.title =', messages?.home?.hero?.title);

  return {
    locale,
    messages
  };
});
