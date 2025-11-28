// types/css.d.ts
import 'react';

declare module 'react' {
  interface CSSProperties {
    '--theme-button-radius'?: string;
    '--theme-primary'?: string;
    '--theme-secondary'?: string;
    // 添加其他你可能用到的自定义属性
  }
}