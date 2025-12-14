// 文件: /app/[locale]/client/profile/ProfilePageClient.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { HiPhone, HiEnvelope, HiCalendar, HiPencilSquare } from "react-icons/hi2";
import ProfileEditModal from "@/components/ProfileEditModal";
import {useRouter} from "@/i18n/routing";
import { User } from "@supabase/supabase-js";
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';

// 定义 Profile 接口
export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

interface ProfileClientProps {
  user: User;
  initialProfile: UserProfile | null;
}

export default function ProfilePageClient({ user, initialProfile }: ProfileClientProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations('profile');
  const locale = useLocale();

  const handleSuccess = () => {
    router.refresh();
  };

  const displayAvatar = initialProfile?.avatar_url;
  const displayName = initialProfile?.full_name || user.email || user.phone;
  const displayPhone = initialProfile?.phone || user.phone;
  const displayEmail = initialProfile?.email || user.email;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>

      <div className="card bg-base-100 shadow-xl relative overflow-visible">
        <button
          className="btn btn-circle btn-sm btn-ghost absolute right-2 top-2 text-base-content/50"
          onClick={() => setIsEditOpen(true)}
          title={t('editProfile')}
        >
          <HiPencilSquare className="w-5 h-5" />
        </button>

        <div className="card-body items-center text-center">
          <div className="avatar mb-4">
            <div className="w-24 h-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden relative">
              {displayAvatar ? (
                <Image
                  src={displayAvatar}
                  alt="Avatar"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-neutral text-neutral-content flex items-center justify-center text-3xl font-bold">
                  {displayName?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>

          <h2 className="card-title text-2xl">{displayName}</h2>
          <p className="text-base-content/60">{t('memberType')}</p>

          <div className="card-actions mt-4">
            <button
              className="btn btn-primary btn-sm px-6"
              onClick={() => setIsEditOpen(true)}
            >
              {t('editProfile')}
            </button>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">{t('details.title')}</h3>

          <div className="grid gap-4">
            <div className="flex items-center gap-4 p-3 bg-base-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <HiEnvelope className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-base-content/60">{t('details.email')}</div>
                <div className="font-medium truncate">{displayEmail || t('details.notBound')}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-base-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <HiPhone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-base-content/60">{t('details.phone')}</div>
                <div className="font-medium">{displayPhone || t('details.notBound')}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-base-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                <HiCalendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-base-content/60">{t('details.joinDate')}</div>
                <div className="font-medium">
                  {new Date(user.created_at).toLocaleDateString(locale)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProfileEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        user={user}
        profile={initialProfile}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
