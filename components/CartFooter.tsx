// components/CartFooter.tsx
"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/context/CartContext";
import BuyButton from "./BuyButton";
import Image from "next/image";
import {
  HiChevronUp,
  HiXMark,
  HiMinus,
  HiPlus,
  HiTrash,
  HiShoppingBag
} from "react-icons/hi2";
import { useTranslations, useLocale } from 'next-intl';
import { getLocalizedValue } from '@/lib/i18nUtils';

export default function CartFooter() {
  const t = useTranslations('cart');
  const locale = useLocale();
  const { cart, updateQuantity, clearCart } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 确保仅在客户端渲染
  useEffect(() => {
    // 忽略此行警告，这是 Next.js 处理 Hydration 的标准模式
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // 当弹窗打开时，禁止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const { items, merchantId, itemCount: totalItems, total: totalPrice } = cart;
  
  // 购物车为空时不显示
  if (!mounted || totalItems === 0) {
    return null;
  }

  // 获取所有商品ID用于结算
  const productIds = items.map(item => item.product_id);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  // --- 购物车详情模态框内容 ---
  const cartDetailModal = (
    // 使用 style 设置 zIndex 以避免 Tailwind 警告
    <div className="modal modal-open modal-bottom sm:modal-middle" style={{ zIndex: 9999 }}>
      <div className="modal-box relative bg-base-100 max-h-[80vh] flex flex-col p-0">
        
        {/* 标题栏 */}
        <div className="sticky top-0 bg-base-100 z-10 px-4 py-3 border-b border-base-200 flex justify-between items-center shadow-xs">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <HiShoppingBag className="text-primary" />
            {t('selectedItems')}
            <span className="text-sm font-normal text-base-content/60">
              ({t('itemCount', { count: totalItems })})
            </span>
          </h3>
          <div className="flex gap-2">
            <button
              className="btn btn-ghost btn-sm text-error"
              onClick={() => {
                if(confirm(t('clearConfirm'))) {
                  clearCart();
                  setIsOpen(false);
                }
              }}
            >
              <HiTrash className="w-4 h-4" /> {t('clear')}
            </button>
            <button
              className="btn btn-circle btn-ghost btn-sm bg-base-200"
              onClick={() => setIsOpen(false)}
            >
              <HiXMark className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 商品列表 (可滚动) */}
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {items.map((item) => (
            <div key={item.product_id} className="flex gap-3">
              {/* 商品图 */}
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-base-200 shrink-0">
                {item.image_urls?.[0] ? (
                  <Image
                    src={item.image_urls[0]}
                    alt={getLocalizedValue<string>(item.name, locale as 'th' | 'zh' | 'en')}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-base-200 grid place-items-center text-xs">
                    {t('noImage')}
                  </div>
                )}
              </div>

              {/* 信息与操作 */}
              <div className="flex-1 flex flex-col justify-between py-0.5">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-bold text-sm line-clamp-1">
                    {getLocalizedValue<string>(item.name, locale as 'th' | 'zh' | 'en')}
                  </div>
                  <div className="font-bold text-base-content">
                    ฿{item.original_price * item.quantity}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-1">
                  <div className="text-xs text-base-content/50">
                    {t('unitPrice')}: ฿{item.original_price}
                  </div>
                  
                  {/* 数量控制器 */}
                  <div className="flex items-center border border-base-300 rounded-lg h-7 bg-base-100">
                    <button 
                      className="btn btn-ghost btn-xs h-full px-2 rounded-l-lg rounded-r-none text-base-content/70 hover:bg-base-200"
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                    >
                      <HiMinus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm leading-7">{item.quantity}</span>
                    <button 
                      className="btn btn-ghost btn-xs h-full px-2 rounded-r-lg rounded-l-none text-base-content/70 hover:bg-base-200"
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                    >
                      <HiPlus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* 底部提示 */}
        <div className="p-2 bg-base-200/50 text-center text-xs text-base-content/50">
          {t('closeHint')}
        </div>
      </div>
      
      {/* 背景遮罩 (点击关闭) */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={() => setIsOpen(false)}>close</button>
      </form>
    </div>
  );

  // --- 主渲染 ---
  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-base-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 pb-safe">
        <div className="max-w-md mx-auto">
          
          <div className="flex items-center justify-between gap-4">
            {/* 左侧：点击展开详情 */}
            <div
              className="flex-1 cursor-pointer group select-none"
              onClick={() => setIsOpen(true)}
            >
              <div className="flex items-center gap-2 mb-1 text-base-content/80 group-hover:text-primary transition-colors">
                <div className="text-sm font-medium">
                  {t('selected')} {totalItems} {t('items')}
                </div>
                <HiChevronUp className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
              <div className="font-extrabold text-2xl text-primary flex items-baseline gap-1">
                <span className="text-sm">฿</span>
                {totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* 右侧：结算按钮 */}
            <div className="flex-none w-36">
              <BuyButton
                productIds={productIds}
                merchantId={merchantId}
                merchantPromptPayId={merchantId}
                quantity={totalQuantity}
                showQuantitySelector={false}
                buttonText={t('checkout')}
                stockQuantity={999}
              />
            </div>
          </div>

        </div>
      </div>

      {/* 通过 Portal 渲染弹窗，防止被 Footer 遮挡 */}
      {isOpen && mounted && createPortal(cartDetailModal, document.body)}
    </>
  );
}