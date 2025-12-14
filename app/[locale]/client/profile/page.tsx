// app/[locale]/client/profile/page.tsx
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import ProfilePageClient from "./ProfilePageClient";
import {setRequestLocale} from 'next-intl/server';

export default async function ProfilePage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  // 设置请求的 locale
  setRequestLocale(locale);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // 获取 profile 表中的额外信息 (头像、昵称等)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <ProfilePageClient user={user} initialProfile={profile} />
  );
}
