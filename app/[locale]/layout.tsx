// 文件: app/[locale]/layout.tsx
// next-intl 标准路由 - locale 特定布局

import {NextIntlClientProvider} from 'next-intl';
import {getMessages, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {routing} from '@/i18n/routing';
import Navbar from '@/components/Navbar';
import ConditionalFooter from '@/components/ConditionalFooter';
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  console.log('🌐 LOCALE LAYOUT: Current locale =', locale);

  // 确保locale有效
  if (!routing.locales.includes(locale as 'th' | 'zh' | 'en')) {
    notFound();
  }

  // 设置请求的 locale (关键！这会让 getRequestConfig 中的 requestLocale 有值)
  setRequestLocale(locale);

  // 获取翻译消息
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning data-theme="light">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Navbar />
          <main className="grow">
            {children}
          </main>
          <ConditionalFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
