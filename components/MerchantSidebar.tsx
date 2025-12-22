// 文件: /components/MerchantSidebar.tsx
"use client";

import { useState, useEffect } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { useTranslations, useLocale } from 'next-intl';
import { supabase } from "@/lib/supabaseClient";
import { getCurrentSubscription } from '@/app/actions/subscriptions';
import type { SubscriptionWithPlan } from '@/app/types/subscription';
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
  HiUserGroup,
  HiCalculator,
  HiBoltSlash,
  HiTag,
  HiGift
} from "react-icons/hi2";
import { Crown, Clock } from "lucide-react";

export default function MerchantSidebar() {
  const t = useTranslations('merchantNav');
  const tSub = useTranslations('subscription');
  const locale = useLocale();
  const [isExpanded, setIsExpanded] = useState(true);
  const pathname = usePathname();
  const [subscription, setSubscription] = useState<SubscriptionWithPlan | null>(null);

  const toggleSidebar = () => setIsExpanded(!isExpanded);

  // 获取订阅信息
  const fetchSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: merchant } = await supabase
      .from("merchants")
      .select("merchant_id")
      .eq("owner_id", user.id)
      .single();

    if (merchant) {
      const result = await getCurrentSubscription(merchant.merchant_id);
      if (result.success && result.data) {
        setSubscription(result.data);
      }
    }
  };

  useEffect(() => {
    fetchSubscription();

    // 监听订阅更新事件
    const handleSubscriptionUpdate = () => {
      fetchSubscription();
    };

    window.addEventListener('subscription-updated', handleSubscriptionUpdate);

    return () => {
      window.removeEventListener('subscription-updated', handleSubscriptionUpdate);
    };
  }, []);

  // 检查是否有员工管理功能权限 (专业版和企业版)
  const hasEmployeeManagement = subscription?.plan?.features?.employee_management === true;

  const navItems = [
    { name: t('dashboard'), href: "/merchant/dashboard", icon: <HiSquares2X2 className="w-6 h-6" /> },
    { name: t('orders'), href: "/merchant/orders", icon: <HiClipboardDocumentList className="w-6 h-6" /> },
    { name: t('products'), href: "/merchant/products", icon: <HiShoppingBag className="w-6 h-6" /> },
    { name: t('productCategories'), href: "/merchant/product-categories", icon: <HiTag className="w-6 h-6" /> },
    { name: t('design'), href: "/merchant/design", icon: <HiPaintBrush className="w-6 h-6" /> },
    { name: t('coupons'), href: "/merchant/coupons", icon: <HiTicket className="w-6 h-6" /> },
    { name: t('reviews'), href: "/merchant/reviews", icon: <HiChatBubbleLeftRight className="w-6 h-6" /> },
    { name: t('accounting'), href: "/merchant/accounting", icon: <HiCalculator className="w-6 h-6" /> },
    { name: t('quickEntry'), href: "/merchant/quick-entry", icon: <HiBoltSlash className="w-6 h-6" /> },
    { name: t('wallet'), href: "/merchant/wallet", icon: <HiWallet className="w-6 h-6" /> },
    // 员工管理 - 仅专业版和企业版可见
    ...(hasEmployeeManagement ? [{ name: t('staff'), href: "/merchant/staff", icon: <HiUserGroup className="w-6 h-6" /> }] : []),
    { name: t('redeem'), href: "/merchant/redeem", icon: <HiQrCode className="w-6 h-6" /> },
    { name: t('subscription'), href: "/merchant/subscription", icon: <Crown className="w-6 h-6" /> },
    { name: t('referral'), href: "/merchant/referral", icon: <HiGift className="w-6 h-6" /> },
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

      {/* 订阅状态徽章 */}
      {subscription && (
        <div className={`p-3 border-b border-base-200 ${!isExpanded && 'px-2'}`}>
          <Link
            href="/merchant/subscription"
            className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
              subscription.status === 'trial'
                ? 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                : subscription.status === 'active'
                ? 'bg-green-50 hover:bg-green-100 text-green-700'
                : subscription.status === 'locked'
                ? 'bg-red-50 hover:bg-red-100 text-red-700'
                : 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700'
            }`}
            title={!isExpanded ? tSub(`subscriptionStatus.${subscription.status}`) : ''}
          >
            {subscription.status === 'trial' ? (
              <Clock className="w-5 h-5 shrink-0" />
            ) : (
              <Crown className="w-5 h-5 shrink-0" />
            )}
            {isExpanded && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">
                  {subscription.plan.display_name[locale as 'en' | 'th' | 'zh'] || subscription.plan.display_name.en}
                </div>
                <div className="text-xs opacity-75">
                  {tSub(`subscriptionStatus.${subscription.status}`)}
                </div>
              </div>
            )}
          </Link>
        </div>
      )}

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