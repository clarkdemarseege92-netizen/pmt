// 文件: /next.config.ts
import type { NextConfig } from "next";

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
};

export default nextConfig;