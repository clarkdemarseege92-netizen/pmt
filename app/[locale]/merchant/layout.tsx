// 文件: /app/[locale]/merchant/layout.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect as i18nRedirect } from "@/i18n/routing";
import MerchantLayoutWrapper from "@/components/MerchantLayoutWrapper";
import { setRequestLocale } from 'next-intl/server';

export default async function MerchantLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  // 设置请求的 locale
  setRequestLocale(locale);

  const supabase = await createSupabaseServerClient();

  // 1. 检查会话 (这依然是必须的，未登录不能进 merchant 目录)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    i18nRedirect({ href: "/login", locale });
    return null; // TypeScript 需要确认不会继续执行
  }

  // 2. 获取角色
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // 判断是否为商家
  const isMerchant = profile?.role === 'merchant';

  // 3. 将判断结果交给客户端包装器处理
  return (
    <MerchantLayoutWrapper isMerchant={isMerchant}>
      {children}
    </MerchantLayoutWrapper>
  );
}
