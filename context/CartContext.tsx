// context/CartContext.tsx
'use client';

import React, { 
  createContext, 
  useContext, 
  useReducer, 
  ReactNode, 
  useEffect, 
  useState 
} from 'react';
import { CartState, CartItem, TempUser, User } from '@/types/cart';
import { TempUserManager } from '@/utils/tempUser';

// --- 类型定义 ---
interface CartContextType {
  cart: CartState;
  user: TempUser | User | null;
  isTempUser: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  convertToRegisteredUser: (phone: string) => Promise<void>;
}

// --- Reducer 类型和函数 ---
type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { productId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'RESTORE_CART'; payload: CartState };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.product_id === action.payload.product_id);
      
      if (existingItem) {
        const updatedItems = state.items.map(item =>
          item.product_id === action.payload.product_id
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
        
        return calculateTotals({ ...state, items: updatedItems });
      }
      
      const newItems = [...state.items, action.payload];
      return calculateTotals({ ...state, items: newItems });
    }
    
    case 'REMOVE_ITEM': {
      const filteredItems = state.items.filter(item => item.product_id !== action.payload);
      return calculateTotals({ ...state, items: filteredItems });
    }
    
    case 'UPDATE_QUANTITY': {
      const updatedItems = state.items.map(item =>
        item.product_id === action.payload.productId
          ? { ...item, quantity: Math.max(0, action.payload.quantity) }
          : item
      ).filter(item => item.quantity > 0);
      
      return calculateTotals({ ...state, items: updatedItems });
    }
    
    case 'CLEAR_CART':
      return {
        items: [],
        total: 0,
        itemCount: 0,
        merchantId: state.merchantId
      };
    
    case 'RESTORE_CART':
      return action.payload;
    
    default:
      return state;
  }
}

function calculateTotals(state: CartState): CartState {
  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const total = state.items.reduce((sum, item) => sum + (item.original_price * item.quantity), 0);
  
  return {
    ...state,
    itemCount,
    total
  };
}

// --- Context 创建 ---
const CartContext = createContext<CartContextType | undefined>(undefined);

// --- Provider 组件 ---
export function CartProvider({ 
  children, 
  merchantId 
}: { 
  children: ReactNode; 
  merchantId: string;
}) {
  const [cart, dispatch] = useReducer(cartReducer, {
    items: [],
    total: 0,
    itemCount: 0,
    merchantId
  });
  
  const [user, setUser] = useState<TempUser | User | null>(null);
  const [isTempUser, setIsTempUser] = useState(true);

  // 初始化用户
  useEffect(() => {
    const initializeUser = () => {
      let currentUser = TempUserManager.getTempUser();
      
      if (!currentUser) {
        currentUser = TempUserManager.createTempUser();
        TempUserManager.saveTempUser(currentUser);
      }
      
      setUser(currentUser);
      setIsTempUser(true);
      
      // 从 localStorage 恢复购物车
      const savedCart = localStorage.getItem(`cart_${currentUser.session_id}`);
      if (savedCart) {
        try {
          const cartData = JSON.parse(savedCart);
          dispatch({ type: 'RESTORE_CART', payload: cartData });
        } catch (error) {
          console.error('恢复购物车数据失败:', error);
        }
      }
    };
    
    initializeUser();
  }, []);

  // 保存购物车到 localStorage
  useEffect(() => {
    if (user) {
      // 使用类型守卫来安全地访问 session_id
      const sessionId = 'session_id' in user ? user.session_id : undefined;
      if (sessionId) {
        localStorage.setItem(`cart_${sessionId}`, JSON.stringify(cart));
      }
    }
  }, [cart, user]);

  // --- Action 函数 ---
  const addItem = (item: CartItem) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  };

  const removeItem = (productId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: productId });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  // 转换为注册用户
  const convertToRegisteredUser = async (phone: string) => {
    try {
      // 安全地获取 session_id
      const tempSessionId = user && 'session_id' in user ? user.session_id : undefined;
      
      const response = await fetch('/api/auth/register-temp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          temp_session_id: tempSessionId,
          cart_items: cart.items
        }),
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsTempUser(false);
        
        // 清理临时用户数据
        localStorage.removeItem('temp_user');
        if (tempSessionId) {
          localStorage.removeItem(`cart_${tempSessionId}`);
        }
      } else {
        throw new Error('注册失败');
      }
    } catch (error) {
      console.error('注册失败:', error);
      throw error;
    }
  };

  return (
    <CartContext.Provider value={{ 
      cart, 
      user, 
      isTempUser, 
      addItem, 
      removeItem, 
      updateQuantity, 
      clearCart,
      convertToRegisteredUser 
    }}>
      {children}
    </CartContext.Provider>
  );
}

// --- Hook ---
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}