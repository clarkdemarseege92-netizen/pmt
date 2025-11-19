// 文件: /components/MerchantSidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
// 引入 react-icons (使用 Heroicons v2 Outline 风格)
import { 
  HiSquares2X2,          // 仪表板
  HiShoppingBag,         // 商品
  HiTicket,              // 优惠券
  HiChatBubbleLeftRight, // 评价
  HiWallet,
  HiQrCode,
  HiCog6Tooth,           // 设置
  HiChevronLeft,         // 收起箭头
  HiChevronRight,        // 展开箭头
  HiArrowLeftStartOnRectangle // 返回/退出
} from "react-icons/hi2";

export default function MerchantSidebar() {
  const [isExpanded, setIsExpanded] = useState(true);
  const pathname = usePathname();

  // 切换函数
  const toggleSidebar = () => setIsExpanded(!isExpanded);

  // 导航菜单配置
  const navItems = [
    {
      name: "仪表板",
      href: "/merchant/dashboard",
      icon: <HiSquares2X2 className="w-6 h-6" />,
    },
    {
      name: "商品目录",
      href: "/merchant/products",
      icon: <HiShoppingBag className="w-6 h-6" />,
    },
    {
      name: "优惠券管理",
      href: "/merchant/coupons",
      icon: <HiTicket className="w-6 h-6" />,
    },
    {
      name: "评价管理",
      href: "/merchant/reviews",
      icon: <HiChatBubbleLeftRight className="w-6 h-6" />,
    },
        {
      name: "钱包",
      href: "/merchant/wallet",
      icon: <HiWallet className="w-6 h-6" />,
    },
    {
      name: "账户设置",
      href: "/merchant/settings",
      icon: <HiCog6Tooth className="w-6 h-6" />,
    },
    {
      name: "订单核销", 
      href: "/merchant/redeem",
      icon: <HiQrCode className="w-6 h-6" />, 
    },
  ];

  return (
    <aside 
      className={`h-screen bg-base-200 text-base-content flex flex-col transition-all duration-300 border-r border-base-300 ${
        isExpanded ? "w-64" : "w-20"
      }`}
    >
      {/* 顶部：Logo 和 切换按钮 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-base-300">
        {isExpanded && <span className="font-bold text-xl truncate">商家中心</span>}
        <button 
          onClick={toggleSidebar} 
          className="btn btn-square btn-ghost btn-sm"
          title={isExpanded ? "收起菜单" : "展开菜单"}
        >
           {isExpanded ? (
             <HiChevronLeft className="w-5 h-5" />
           ) : (
             <HiChevronRight className="w-5 h-5" />
           )}
        </button>
      </div>

      {/* 导航链接列表 */}
      <nav className="flex-1 py-4 flex flex-col gap-2 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center p-2 rounded-lg transition-colors duration-200 ${
                isActive 
                  ? "bg-primary text-primary-content" 
                  : "hover:bg-base-300"
              } ${isExpanded ? "justify-start gap-3" : "justify-center"}`}
              title={!isExpanded ? item.name : ""}
            >
              <span className="shrink-0">{item.icon}</span>
              
              {/* 文字部分：收缩时隐藏 */}
              <span className={`whitespace-nowrap transition-opacity duration-300 ${
                isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
              }`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* 底部：返回主站 */}
      <div className="p-2 border-t border-base-300">
         <Link
            href="/"
            className={`flex items-center p-2 rounded-lg hover:bg-base-300 text-base-content/70 ${
              isExpanded ? "justify-start gap-3" : "justify-center"
            }`}
             title={!isExpanded ? "返回主站" : ""}
         >
            <HiArrowLeftStartOnRectangle className="w-6 h-6 shrink-0" />
            <span className={`whitespace-nowrap transition-opacity duration-300 ${
               isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
            }`}>
               返回主站
            </span>
         </Link>
      </div>
    </aside>
  );
}