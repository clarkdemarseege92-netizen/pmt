// 文件: /components/MerchantSidebar.tsx
"use client";

import { useState } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from 'next-intl';
import {
  HiSquares2X2,
  HiShoppingBag,
  HiTicket,
  HiChatBubbleLeftRight,
  HiWallet,
  HiQrCode,
  HiCog6Tooth,
  HiChevronLeft,
  HiChevronRight,
  HiPaintBrush,
  HiArrowLeftStartOnRectangle,
  HiClipboardDocumentList,
  HiUserGroup
} from "react-icons/hi2";

export default function MerchantSidebar() {
  const t = useTranslations('merchantNav');
  const [isExpanded, setIsExpanded] = useState(true);
  const pathname = usePathname();

  const toggleSidebar = () => setIsExpanded(!isExpanded);

  const navItems = [
    { name: t('dashboard'), href: "/merchant/dashboard", icon: <HiSquares2X2 className="w-6 h-6" /> },
    { name: t('orders'), href: "/merchant/orders", icon: <HiClipboardDocumentList className="w-6 h-6" /> },
    { name: t('products'), href: "/merchant/products", icon: <HiShoppingBag className="w-6 h-6" /> },
    { name: t('design'), href: "/merchant/design", icon: <HiPaintBrush className="w-6 h-6" /> },
    { name: t('coupons'), href: "/merchant/coupons", icon: <HiTicket className="w-6 h-6" /> },
    { name: t('reviews'), href: "/merchant/reviews", icon: <HiChatBubbleLeftRight className="w-6 h-6" /> },
    { name: t('wallet'), href: "/merchant/wallet", icon: <HiWallet className="w-6 h-6" /> },
    { name: t('staff'), href: "/merchant/staff", icon: <HiUserGroup className="w-6 h-6" /> },
    { name: t('redeem'), href: "/merchant/redeem", icon: <HiQrCode className="w-6 h-6" /> },
    { name: t('settings'), href: "/merchant/settings", icon: <HiCog6Tooth className="w-6 h-6" /> },
  ];

  return (
    // 【修改点】：将 h-screen 改为 h-full，并确保在移动端隐藏 (hidden md:flex)
    // 这里的 hidden md:flex 是为了配合新的 LayoutWrapper，防止在移动端出现双重导航
    <aside 
      className={`hidden md:flex h-full bg-base-100 text-base-content flex-col transition-all duration-300 border-r border-base-200 ${
        isExpanded ? "w-64" : "w-20"
      }`}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-base-200">
        {isExpanded && <span className="font-bold text-xl truncate text-secondary">{t('merchantCenter')}</span>}
        <button
          onClick={toggleSidebar}
          className="btn btn-square btn-ghost btn-sm"
          title={isExpanded ? t('collapse') : t('expand')}
        >
           {isExpanded ? <HiChevronLeft className="w-5 h-5" /> : <HiChevronRight className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-2 px-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center p-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? "bg-secondary text-secondary-content shadow-md" 
                  : "hover:bg-base-200 text-base-content/70 hover:text-base-content"
              } ${isExpanded ? "justify-start gap-3" : "justify-center"}`}
              title={!isExpanded ? item.name : ""}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className={`whitespace-nowrap transition-all duration-300 origin-left ${
                isExpanded ? "opacity-100 scale-100" : "opacity-0 scale-0 w-0 overflow-hidden"
              }`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-base-200">
         <Link
            href="/"
            className={`flex items-center p-3 rounded-xl hover:bg-error/10 text-base-content/70 hover:text-error transition-all ${
              isExpanded ? "justify-start gap-3" : "justify-center"
            }`}
             title={t('backToHome')}
         >
            <HiArrowLeftStartOnRectangle className="w-6 h-6 shrink-0" />
            <span className={`whitespace-nowrap transition-opacity duration-300 ${
               isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
            }`}>
               {t('backToHome')}
            </span>
         </Link>
      </div>
    </aside>
  );
}