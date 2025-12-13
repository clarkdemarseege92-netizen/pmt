// 文件: i18n/request.ts
// 服务器端 i18n 配置

import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';

// 使用 `setRequestLocale` 方式
export default getRequestConfig(async ({requestLocale}) => {
  // 等待 requestLocale (Promise)
  let locale = await requestLocale;

  console.log('🔍 I18N REQUEST: locale from requestLocale =', locale);

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
