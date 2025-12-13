// 文件: /next.config.ts
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fqjbbfbcchpxwgbwnyri.supabase.co', // 您的 Supabase 项目域名
        port: '',
        pathname: '/storage/v1/object/public/**',    // 允许访问 storage 下的公共文件
      },
    ],
  },
  // 【关键修复】禁用实验性的部分预渲染，确保认证状态正确
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 30, // 最小值为30
    },
  },
  // 【关键修复】禁用 Vercel 的自动静态优化
  generateBuildId: async () => {
    // 使用时间戳确保每次部署都是新的 build ID
    return `build-${Date.now()}`;
  },
};

export default withNextIntl(nextConfig);