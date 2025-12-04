// 文件: components/RootLayoutClient.tsx
// 客户端布局包装器

'use client';

import { ReactNode } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import Navbar from './Navbar';

export default function RootLayoutClient({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <Navbar />
      {children}
    </LanguageProvider>
  );
}
