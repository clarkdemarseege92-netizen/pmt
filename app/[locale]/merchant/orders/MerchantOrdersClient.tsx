// 文件: /app/[locale]/merchant/orders/MerchantOrdersClient.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { HiTicket, HiShoppingBag, HiUser, HiClock, HiCheckCircle, HiXCircle } from "react-icons/hi2";
import { useTranslations } from 'next-intl';

// 1. 导出类型定义，供父组件 page.tsx 使用
export type MultiLangName = { th: string; en: string; [key: string]: string };

export type OrderDetail = {
  order_id: string;
  created_at: string;
  status: 'pending' | 'paid' | 'used' | 'expired';
  purchase_price: number;
  redemption_code: string;
  coupon_id: string | null;
  // 关联的优惠券信息
  coupons: { name: MultiLangName; image_urls: string[] } | null;
  // 关联的商品订单项
  order_items: {
    quantity: number;
    products: { name: MultiLangName; image_urls: string[]; original_price: number } | null;
  }[];
  // 关联的客户信息
  profiles: { phone?: string; email?: string } | null;
};

// 辅助函数
const getLangName = (name: MultiLangName | null | undefined, lang = 'th') => {
  if (!name) return "N/A";
  return name[lang] || name['en'] || "N/A";
};

const formatDate = (date: string) => new Date(date).toLocaleString('th-TH');

// 2. 导出默认组件
export default function MerchantOrdersClient({ orders }: { orders: OrderDetail[] }) {
  const t = useTranslations('merchantOrders');
  const [activeTab, setActiveTab] = useState<'cart' | 'coupon'>('cart');

  // 状态徽章函数（使用翻译）
  const statusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <span className="badge badge-success text-white gap-1"><HiCheckCircle/> {t('status.paid')}</span>;
      case 'pending': return <span className="badge badge-warning gap-1"><HiClock/> {t('status.pending')}</span>;
      case 'used': return <span className="badge badge-neutral gap-1">{t('status.used')}</span>;
      case 'expired': return <span className="badge badge-error text-white gap-1"><HiXCircle/> {t('status.expired')}</span>;
      default: return <span className="badge badge-ghost">{status}</span>;
    }
  };

  // 核心逻辑：区分两类订单
  // 1. 购物车订单：coupon_id 为空
  const cartOrders = orders.filter(o => !o.coupon_id);
  // 2. 优惠券订单：coupon_id 有值
  const couponOrders = orders.filter(o => o.coupon_id);

  const displayOrders = activeTab === 'cart' ? cartOrders : couponOrders;

  return (
    <div>
      {/* 顶部选项卡 */}
      <div role="tablist" className="tabs tabs-boxed mb-6 bg-base-200 p-1 rounded-lg inline-flex">
        <a
          role="tab"
          className={`tab px-6 transition-all ${activeTab === 'cart' ? 'tab-active bg-white shadow-sm font-bold' : ''}`}
          onClick={() => setActiveTab('cart')}
        >
          <HiShoppingBag className="mr-2" /> {t('tabs.cart')} ({cartOrders.length})
        </a>
        <a
          role="tab"
          className={`tab px-6 transition-all ${activeTab === 'coupon' ? 'tab-active bg-white shadow-sm font-bold' : ''}`}
          onClick={() => setActiveTab('coupon')}
        >
          <HiTicket className="mr-2" /> {t('tabs.coupon')} ({couponOrders.length})
        </a>
      </div>

      {/* 订单列表区域 */}
      <div className="space-y-4">
        {displayOrders.length === 0 ? (
          <div className="text-center py-12 text-base-content/50 bg-base-100 rounded-xl border border-base-200">
            {t('noOrders', { type: activeTab === 'cart' ? t('tabs.cartShort') : t('tabs.couponShort') })}
          </div>
        ) : (
          displayOrders.map((order) => (
            <div key={order.order_id} className="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-shadow">
              <div className="card-body p-5">

                {/* 订单头部：状态与时间 */}
                <div className="flex justify-between items-start mb-4 border-b border-base-100 pb-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-base-content/50 font-mono">{t('orderId')}: {order.order_id.slice(0, 8)}...</span>
                    <span className="text-xs text-base-content/70">{formatDate(order.created_at)}</span>
                  </div>
                  <div className="text-right">
                    {statusBadge(order.status)}
                    <div className="font-bold text-lg text-primary mt-1">฿{order.purchase_price.toLocaleString()}</div>
                  </div>
                </div>

                {/* 订单内容：根据类型不同显示不同结构 */}
                <div className="flex flex-col md:flex-row gap-6">
                  
                  {/* 左侧：商品详情 */}
                  <div className="flex-1 space-y-3">
                    {activeTab === 'cart' ? (
                      // --- A. 购物车模式：显示多件商品 ---
                      order.order_items.map((item, idx) => (
                        <div key={idx} className="flex gap-3 items-center bg-base-50 p-2 rounded-lg">
                          <div className="w-12 h-12 relative rounded overflow-hidden border border-base-200 shrink-0">
                            {item.products?.image_urls?.[0] && (
                              <Image 
                                src={item.products.image_urls[0]} 
                                alt="Product" 
                                fill 
                                className="object-cover" 
                                unoptimized 
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{getLangName(item.products?.name)}</div>
                            <div className="text-xs text-base-content/60">
                              {t('unitPrice')}: ฿{item.products?.original_price} × <span className="font-bold text-base-content">{item.quantity}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      // --- B. 优惠券模式：显示单个优惠券 ---
                      <div className="flex gap-3 items-center bg-base-50 p-2 rounded-lg">
                        <div className="w-12 h-12 relative rounded overflow-hidden border border-base-200 shrink-0">
                          {order.coupons?.image_urls?.[0] && (
                            <Image 
                              src={order.coupons.image_urls[0]} 
                              alt="Coupon" 
                              fill 
                              className="object-cover" 
                              unoptimized 
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{getLangName(order.coupons?.name)}</div>
                          <div className="text-xs badge badge-outline badge-sm mt-1">{t('packageDeal')}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 右侧：客户与核销码 */}
                  <div className="md:w-64 md:border-l md:border-base-200 md:pl-6 flex flex-col justify-center gap-2 text-sm">
                    <div className="flex items-center gap-2 text-base-content/80" title={t('customerContact')}>
                      <HiUser className="w-4 h-4" />
                      <span>{order.profiles?.phone || order.profiles?.email || t('unknownCustomer')}</span>
                    </div>
                    
                    <div className="bg-base-200/50 p-2 rounded text-center">
                      <div className="text-xs text-base-content/50 mb-1">{t('redeemCode')}</div>
                      <div className="font-mono font-bold text-lg tracking-wider select-all text-primary">
                        {order.redemption_code}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}