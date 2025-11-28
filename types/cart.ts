// types/cart.ts
export interface MultiLangName {
  th: string;
  en: string;
  [key: string]: string;
}

export interface CartItem {
  product_id: string;
  name: MultiLangName;
  original_price: number;
  image_urls: string[];
  quantity: number;
  customizations?: {
    [key: string]: string;
  };
}

export interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
  merchantId: string;
}

export interface TempUser {
  temp_user_id: string;
  session_id: string;
  created_at: Date;
  expires_at: Date;
  cart_items?: CartItem[];
}

export interface User {
  user_id: string;
  phone: string;
  full_name?: string;
  created_at: Date;
  is_temp: boolean;
  session_id?: string; // 添加 session_id 作为可选属性
}

// 创建一个联合类型的基础接口
export interface BaseUser {
  session_id?: string;
  created_at: Date;
}

// 创建一个明确的联合类型
export type AnyUser = TempUser | User;