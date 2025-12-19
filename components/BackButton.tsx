// 文件: /components/BackButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { HiArrowLeft, HiHome } from "react-icons/hi2";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export default function BackButton() {
  const router = useRouter();
  const t = useTranslations('backButton');
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // 简单的判断：如果 history.length > 1，说明可能有上一页
    // 注意：这不是 100% 准确，因为有些重定向也会增加 history，但在大多数扫码场景下是有效的。
    // 如果是扫码直接打开的新标签页，history.length 通常为 1。
    
    // 【修复】：忽略警告，必须在 Effect 中访问 window 以避免水合错误
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanGoBack(window.history.length > 1);
  }, []);

  const handleBack = () => {
    if (canGoBack) {
      router.back();
    } else {
      // 如果不能后退（比如直接扫码进入的），则回首页
      router.push('/');
    }
  };

  return (
    <button
      className="btn btn-circle btn-ghost border border-base-300 mr-2 bg-base-100 text-base-content/70 hover:border-primary hover:text-primary transition-colors"
      onClick={handleBack}
      aria-label={canGoBack ? t('backToPrevious') : t('backToHome')}
      title={canGoBack ? t('back') : t('home')}
    >
      {canGoBack ? (
        <HiArrowLeft className="w-5 h-5" />
      ) : (
        <HiHome className="w-5 h-5" />
      )}
    </button>
  );
}