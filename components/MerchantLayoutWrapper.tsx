// 文件: /components/MerchantLayoutWrapper.tsx
"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import MerchantSidebar from "@/components/MerchantSidebar";
import Link from "next/link";
import { 
  HiSquares2X2, 
  HiClipboardDocumentList, 
  HiQrCode, 
  HiCog6Tooth,
  HiShoppingBag,
  HiTicket,
  HiChatBubbleLeftRight,
  HiPaintBrush,
  HiWallet
} from "react-icons/hi2";

export default function MerchantLayoutWrapper({
  children,
  isMerchant
}: {
  children: React.ReactNode;
  isMerchant: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isMerchant && pathname !== "/merchant/onboarding") {
      router.replace("/merchant/onboarding");
    }
    if (isMerchant && pathname === "/merchant/onboarding") {
      router.replace("/merchant/dashboard");
    }
  }, [isMerchant, pathname, router]);

  // 辅助函数：点击链接后关闭下拉菜单 (通过移除焦点)
  const closeDropdown = () => {
    const elem = document.activeElement as HTMLElement;
    if (elem) {
      elem.blur();
    }
  };

  // 辅助函数：判断是否处于某个功能组内 (用于高亮图标)
  const isOverviewActive = [
    '/merchant/dashboard', 
    '/merchant/products', 
    '/merchant/coupons', 
    '/merchant/reviews'
  ].includes(pathname);

  const isSettingsActive = [
    '/merchant/settings', 
    '/merchant/design', 
    '/merchant/wallet'
  ].includes(pathname);

  // --- 商家已入驻：显示完整布局 ---
  if (isMerchant) {
    return (
      <div className="flex flex-col h-screen bg-base-200">
        {/* 中间主体 */}
        <div className="flex flex-1 overflow-hidden">
          <MerchantSidebar />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 pb-24 md:pb-8 relative">
             {children}
          </main>
        </div>

        {/* 3. 移动端底部导航 (分组下拉菜单版) */}
        <div className="md:hidden btm-nav btm-nav-sm border-t border-base-200 bg-base-100 z-50 flex flex-row justify-evenly p-2">
          
          {/* A. 概览组 (下拉菜单) */}
          <div className={`dropdown dropdown-top ${isOverviewActive ? 'text-secondary' : 'text-base-content/60'}`}>
            <div 
              tabIndex={0} 
              role="button" 
              className={`flex flex-col items-center justify-center w-full h-full ${isOverviewActive ? 'active' : ''}`}
            >
              <HiSquares2X2 className="w-5 h-5" />
              <span className="btm-nav-label text-xs">概览</span>
            </div>
            <ul tabIndex={0} className="dropdown-content z-1 menu p-2 shadow-lg bg-base-100 rounded-box w-48 mb-2 border border-base-200 text-base-content">
              <li><Link href="/merchant/dashboard" onClick={closeDropdown}><HiSquares2X2 className="w-4 h-4"/> 仪表板</Link></li>
              <li><Link href="/merchant/products" onClick={closeDropdown}><HiShoppingBag className="w-4 h-4"/> 商品目录</Link></li>
              <li><Link href="/merchant/coupons" onClick={closeDropdown}><HiTicket className="w-4 h-4"/> 优惠券</Link></li>
              <li><Link href="/merchant/reviews" onClick={closeDropdown}><HiChatBubbleLeftRight className="w-4 h-4"/> 评价管理</Link></li>
            </ul>
          </div>
          
          {/* B. 订单 (直达) */}
          <Link 
            href="/merchant/orders" 
            className={`text-base-content/60 active:text-secondary active:bg-base-200 ${pathname === '/merchant/orders' ? 'active text-secondary' : ''}`}
          >
            <HiClipboardDocumentList className="w-5 h-5" />
            <span className="btm-nav-label text-xs">订单</span>
          </Link>
          
          {/* C. 核销 (直达) */}
          <Link 
            href="/merchant/redeem" 
            className={`text-base-content/60 active:text-secondary active:bg-base-200 ${pathname === '/merchant/redeem' ? 'active text-secondary' : ''}`}
          >
            <HiQrCode className="w-5 h-5" />
            <span className="btm-nav-label text-xs">核销</span>
          </Link>
          
          {/* D. 设置组 (下拉菜单) */}
          <div className={`dropdown dropdown-top dropdown-end ${isSettingsActive ? 'text-secondary' : 'text-base-content/60'}`}>
            <div 
              tabIndex={0} 
              role="button" 
              className={`flex flex-col items-center justify-center w-full h-full ${isSettingsActive ? 'active' : ''}`}
            >
              <HiCog6Tooth className="w-5 h-5" />
              <span className="btm-nav-label text-xs">设置</span>
            </div>
            <ul tabIndex={0} className="dropdown-content z-1 menu p-2 shadow-lg bg-base-100 rounded-box w-48 mb-2 border border-base-200 text-base-content">
              <li><Link href="/merchant/design" onClick={closeDropdown}><HiPaintBrush className="w-4 h-4"/> 店铺装修</Link></li>
              <li><Link href="/merchant/wallet" onClick={closeDropdown}><HiWallet className="w-4 h-4"/> 钱包</Link></li>
              <li><Link href="/merchant/settings" onClick={closeDropdown}><HiCog6Tooth className="w-4 h-4"/> 账户设置</Link></li>
            </ul>
          </div>

        </div>

      </div>
    );
  }

  // --- 新手入驻模式 ---
  return (
    <div className="flex flex-col h-screen bg-base-200">
       <main className="flex-1 overflow-y-auto p-4 md:p-8 flex items-center justify-center">
          {children}
       </main>
    </div>
  );
}