// components/ConditionalFooter.tsx
'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

/**
 * ConditionalFooter - 条件性渲染 Footer 组件
 *
 * 在以下路径下隐藏 Footer：
 * - /client/* - 客户后台
 * - /merchant/* - 商户后台
 * - /admin/* - 管理后台
 */
export default function ConditionalFooter() {
  const pathname = usePathname();

  // 检查当前路径是否在后台管理区域
  // pathname 格式: /locale/path，例如 /zh/client/orders
  const isBackendArea = pathname ? (
    pathname.includes('/client/') ||
    pathname.includes('/merchant/') ||
    pathname.includes('/admin/')
  ) : false;

  // 如果在后台区域，不渲染 Footer
  if (isBackendArea) {
    return null;
  }

  // 否则正常渲染 Footer
  return <Footer />;
}
