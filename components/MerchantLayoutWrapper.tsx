// 文件: /components/MerchantLayoutWrapper.tsx
"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import MerchantSidebar from "@/components/MerchantSidebar";

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
    // 核心逻辑：如果是普通用户（非商家），且不在入驻页，强制踢去入驻页
    if (!isMerchant && pathname !== "/merchant/onboarding") {
      router.replace("/merchant/onboarding");
    }
    // 反之：如果是商家，且在入驻页（可能是误入），踢回仪表板
    if (isMerchant && pathname === "/merchant/onboarding") {
      router.replace("/merchant/dashboard");
    }
  }, [isMerchant, pathname, router]);

  // 情况 A: 真正的商家 -> 显示侧边栏 + 内容
  if (isMerchant) {
    return (
      <div className="flex h-screen bg-base-100 overflow-hidden">
        <MerchantSidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-base-100 p-4 lg:p-8 relative">
           {children}
        </main>
      </div>
    );
  }

  // 情况 B: 普通用户 (正在入驻) -> 不显示侧边栏，全屏显示内容
  return (
    <main className="min-h-screen bg-base-200">
       {children}
    </main>
  );
}