// utils/tempUser.ts
import { TempUser, CartItem } from '@/types/cart';

export class TempUserManager {
  // 创建临时用户 - 使用正确的类型
  static createTempUser(): TempUser {
    const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionId = crypto.randomUUID();
    
    return {
      temp_user_id: tempUserId,
      session_id: sessionId,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天过期
      cart_items: []
    };
  }
  
  // 保存到 localStorage - 使用正确的类型
  static saveTempUser(tempUser: TempUser): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('temp_user', JSON.stringify(tempUser));
      localStorage.setItem('temp_session', tempUser.session_id);
    }
  }
  
  // 获取临时用户 - 使用正确的类型
  static getTempUser(): TempUser | null {
    if (typeof window !== 'undefined') {
      const tempUserStr = localStorage.getItem('temp_user');
      if (tempUserStr) {
        try {
          const tempUserData = JSON.parse(tempUserStr);
          // 确保返回的数据符合 TempUser 类型
          return {
            temp_user_id: tempUserData.temp_user_id,
            session_id: tempUserData.session_id,
            created_at: new Date(tempUserData.created_at),
            expires_at: new Date(tempUserData.expires_at),
            cart_items: tempUserData.cart_items || []
          };
        } catch (error) {
          console.error('解析临时用户数据失败:', error);
          return null;
        }
      }
    }
    return null;
  }
  
  // 检查是否临时用户
  static isTempUser(): boolean {
    return !!this.getTempUser();
  }

  // 清理临时用户数据
  static clearTempUser(): void {
    if (typeof window !== 'undefined') {
      const tempUser = this.getTempUser();
      if (tempUser) {
        localStorage.removeItem('temp_user');
        localStorage.removeItem('temp_session');
        localStorage.removeItem(`cart_${tempUser.session_id}`);
      }
    }
  }

  // 保存购物车数据
  static saveCart(sessionId: string, cartItems: CartItem[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`cart_${sessionId}`, JSON.stringify(cartItems));
    }
  }

  // 获取购物车数据
  static getCart(sessionId: string): CartItem[] {
    if (typeof window !== 'undefined') {
      const cartStr = localStorage.getItem(`cart_${sessionId}`);
      if (cartStr) {
        try {
          return JSON.parse(cartStr);
        } catch (error) {
          console.error('解析购物车数据失败:', error);
          return [];
        }
      }
    }
    return [];
  }
}