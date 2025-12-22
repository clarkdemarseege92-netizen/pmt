// 文件: /components/ClientSidebar.tsx
"use client";

import { useState, useEffect } from "react";
import {Link, usePathname} from "@/i18n/routing";
import {
  HiUser,               // 个人资料
  HiTicket,             // 订单/票券
  HiHeart,              // 收藏
  HiClock,              // 浏览历史
  HiChatBubbleBottomCenterText, // 待评价
  HiChevronLeft,
  HiChevronRight,
  HiArrowLeftStartOnRectangle, // 返回主页
  HiQrCode,             // 核销扫码
} from "react-icons/hi2";
import { useTranslations } from 'next-intl';

export default function ClientSidebar() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasStaffPermission, setHasStaffPermission] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('client');

  // 检查用户是否有员工核销权限 - 通过 API 绕过 RLS
  useEffect(() => {
    const checkStaffPermission = async () => {
      console.log('🔍 [ClientSidebar] Checking staff permission via API...');

      try {
        const res = await fetch('/api/client/check-staff');
        const data = await res.json();

        console.log('📋 [ClientSidebar] API response:', data);

        if (data.isStaff) {
          console.log('✅ [ClientSidebar] User is staff, showing redeem option');
          setHasStaffPermission(true);
        } else {
          console.log('⚠️ [ClientSidebar] User is NOT staff');
        }
      } catch (err) {
        console.error('❌ [ClientSidebar] Error checking staff permission:', err);
      }
    };

    checkStaffPermission();
  }, []);

  const toggleSidebar = () => setIsExpanded(!isExpanded);

  const navItems = [
    {
      name: t('sidebar.profile'),
      href: "/client/profile",
      icon: <HiUser className="w-6 h-6" />,
    },
    {
      name: t('sidebar.orders'),
      href: "/client/orders",
      icon: <HiTicket className="w-6 h-6" />,
    },
    {
      name: t('sidebar.favorites'),
      href: "/client/favorites",
      icon: <HiHeart className="w-6 h-6" />,
    },
    {
      name: t('sidebar.history'),
      href: "/client/history",
      icon: <HiClock className="w-6 h-6" />,
    },
    {
      name: t('sidebar.reviews'),
      href: "/client/reviews",
      icon: <HiChatBubbleBottomCenterText className="w-6 h-6" />,
    },
  ];

  return (
    <aside
      className={`hidden md:flex h-screen bg-base-100 text-base-content flex-col transition-all duration-300 border-r border-base-200 ${
        isExpanded ? "w-64" : "w-20"
      }`}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-base-200">
        {isExpanded && <span className="font-bold text-xl truncate text-primary">{t('sidebar.title')}</span>}
        <button
          onClick={toggleSidebar}
          className="btn btn-square btn-ghost btn-sm"
          title={isExpanded ? t('sidebar.collapse') : t('sidebar.expand')}
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
                  ? "bg-primary text-primary-content shadow-md"
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

        {/* 员工核销入口 - 仅在有权限时显示 */}
        {hasStaffPermission && (
          <>
            {isExpanded && (
              <div className="text-xs text-base-content/50 px-3 pt-4 pb-2 uppercase tracking-wider">
                {t('sidebar.staffSection')}
              </div>
            )}
            <Link
              href="/client/staff-redeem"
              className={`flex items-center p-3 rounded-xl transition-all duration-200 ${
                pathname === "/client/staff-redeem"
                  ? "bg-secondary text-secondary-content shadow-md"
                  : "hover:bg-secondary/10 text-secondary hover:text-secondary"
              } ${isExpanded ? "justify-start gap-3" : "justify-center"}`}
              title={!isExpanded ? t('sidebar.staffRedeem') : ""}
            >
              <span className="shrink-0"><HiQrCode className="w-6 h-6" /></span>
              <span className={`whitespace-nowrap transition-all duration-300 origin-left ${
                isExpanded ? "opacity-100 scale-100" : "opacity-0 scale-0 w-0 overflow-hidden"
              }`}>
                {t('sidebar.staffRedeem')}
              </span>
            </Link>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-base-200">
         <Link
            href="/"
            className={`flex items-center p-3 rounded-xl hover:bg-error/10 text-base-content/70 hover:text-error transition-all ${
              isExpanded ? "justify-start gap-3" : "justify-center"
            }`}
             title={t('sidebar.backHome')}
         >
            <HiArrowLeftStartOnRectangle className="w-6 h-6 shrink-0" />
            <span className={`whitespace-nowrap transition-opacity duration-300 ${
               isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
            }`}>
               {t('sidebar.backHome')}
            </span>
         </Link>
      </div>
    </aside>
  );
}
