"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { HiShoppingBag, HiTicket, HiBuildingStorefront, HiPhoto } from "react-icons/hi2";
import FavoriteButton from "../../../components/FavoriteButton";

// 定义收藏项的接口 - 统一数据结构
interface ProductItem {
  product_id: string;
  name: string;
  price: number;
  image_url: string;
  merchant_id: string;
}

interface CouponItem {
  coupon_id: string;
  title: string;
  description: string;
  discount_value: number;
  merchant_id: string;
  image_url: string;
}

interface MerchantItem {
  merchant_id: string;
  shop_name: string;
  logo_url?: string;
  description?: string;
}

interface FavoritesClientProps {
  favoriteProducts: ProductItem[];
  favoriteCoupons: CouponItem[];
  favoriteMerchants: MerchantItem[];
}

export default function FavoritesClient({ 
  favoriteProducts, 
  favoriteCoupons, 
  favoriteMerchants 
}: FavoritesClientProps) {
  const [activeTab, setActiveTab] = useState<'product' | 'coupon' | 'merchant'>('product');

  // 计算总数
  const totalCount = favoriteProducts.length + favoriteCoupons.length + favoriteMerchants.length;

  // 选项卡配置
  const tabs = [
    { id: 'product' as const, label: '商品', icon: <HiShoppingBag className="w-4 h-4" />, count: favoriteProducts.length },
    { id: 'coupon' as const, label: '优惠券', icon: <HiTicket className="w-4 h-4" />, count: favoriteCoupons.length },
    { id: 'merchant' as const, label: '店铺', icon: <HiBuildingStorefront className="w-4 h-4" />, count: favoriteMerchants.length },
  ];

  return (
    <div className="w-full max-w-md mx-auto pb-20">
      {/* 顶部标题 */}
      <div className="navbar bg-base-100 sticky top-0 z-20 shadow-sm px-4 min-h-16">
        <div className="flex-1">
          <h1 className="text-xl font-bold">我的收藏</h1>
        </div>
        <div className="flex-none text-sm text-base-content/60">
          共 {totalCount} 项
        </div>
      </div>

      {/* 选项卡 */}
      <div className="px-4 py-4 sticky top-16 z-10 bg-base-100/95 backdrop-blur-sm">
        <div role="tablist" className="tabs tabs-boxed bg-base-200 p-1 grid grid-cols-3 gap-1">
          {tabs.map((tab) => (
            <a
              key={tab.id}
              role="tab"
              className={`tab h-10 gap-2 transition-all duration-300 rounded-btn ${
                activeTab === tab.id 
                  ? "tab-active bg-white text-primary shadow-sm font-bold" 
                  : "text-base-content/60 hover:text-base-content"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && (
                <span className="badge badge-xs">{tab.count}</span>
              )}
            </a>
          ))}
        </div>
      </div>

      {/* 列表内容 */}
      <div className="px-4 space-y-4 min-h-[50vh]">
        {/* 商品列表 */}
        {activeTab === 'product' && (
          favoriteProducts.length > 0 ? (
            favoriteProducts.map((product) => (
              <Link
                key={product.product_id}
                href={`/shop/${product.merchant_id}?product=${product.product_id}`}
                className="card card-side bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-all h-32 group overflow-hidden flex"
              >
                <figure className="relative w-32 h-full bg-base-50 shrink-0 overflow-hidden">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="128px"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-base-content/20 bg-base-200 gap-2">
                      <HiPhoto className="w-8 h-8" />
                      <span className="text-xs">无图片</span>
                    </div>
                  )}

                </figure>

                <div className="card-body p-3 md:p-4 justify-between w-full min-w-0">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm md:text-base line-clamp-2 leading-tight">
                      {product.name}
                    </h3>
                  </div>

                  <div className="flex justify-between items-end mt-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-base-content/40">价格</span>
                      <span className="text-lg font-bold text-primary">฿{product.price.toLocaleString()}</span>
                    </div>

                    <div onClick={(e) => e.preventDefault()} className="z-10">
                      <FavoriteButton
                        itemId={product.product_id}
                        itemType="product"
                        variant="icon"
                        className="shadow-none bg-transparent hover:bg-base-200 border border-base-200"
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <EmptyState type="product" />
          )
        )}

        {/* 优惠券列表 */}
        {activeTab === 'coupon' && (
          favoriteCoupons.length > 0 ? (
            favoriteCoupons.map((coupon) => (
              <Link
                key={coupon.coupon_id}
                href={`/coupon/${coupon.coupon_id}`}
                className="card card-side bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-all h-32 group overflow-hidden flex"
              >
                <figure className="relative w-32 h-full bg-base-50 shrink-0 overflow-hidden">
                  {coupon.image_url ? (
                    <Image
                      src={coupon.image_url}
                      alt={coupon.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="128px"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-base-content/20 bg-base-200 gap-2">
                      <HiTicket className="w-8 h-8" />
                      <span className="text-xs">无图片</span>
                    </div>
                  )}
                </figure>

                <div className="card-body p-3 md:p-4 justify-between w-full min-w-0">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm md:text-base line-clamp-1 leading-tight">
                      {coupon.title}
                    </h3>
                    <p className="text-xs text-base-content/60 line-clamp-1">
                      {coupon.description}
                    </p>
                  </div>

                  <div className="flex justify-between items-end mt-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-base-content/40">折扣</span>
                      <span className="text-lg font-bold text-secondary">-฿{coupon.discount_value}</span>
                    </div>

                    <div onClick={(e) => e.preventDefault()} className="z-10">
                      <FavoriteButton
                        itemId={coupon.coupon_id}
                        itemType="coupon"
                        variant="icon"
                        className="shadow-none bg-transparent hover:bg-base-200 border border-base-200"
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <EmptyState type="coupon" />
          )
        )}

        {/* 店铺列表 */}
        {activeTab === 'merchant' && (
          favoriteMerchants.length > 0 ? (
            favoriteMerchants.map((merchant) => (
              <Link
                key={merchant.merchant_id}
                href={`/shop/${merchant.merchant_id}`}
                className="card card-side bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-all h-32 group overflow-hidden flex"
              >
                <figure className="relative w-32 h-full bg-base-50 shrink-0 overflow-hidden">
                  {merchant.logo_url ? (
                    <Image
                      src={merchant.logo_url}
                      alt={merchant.shop_name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="128px"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-base-content/20 bg-base-200 gap-2">
                      <HiBuildingStorefront className="w-8 h-8" />
                      <span className="text-xs">无Logo</span>
                    </div>
                  )}

                </figure>

                <div className="card-body p-3 md:p-4 justify-between w-full min-w-0">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm md:text-base line-clamp-2 leading-tight">
                      {merchant.shop_name}
                    </h3>
                    {merchant.description && (
                      <p className="text-xs text-base-content/60 line-clamp-1">
                        {merchant.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-base-content/50">
                      <HiBuildingStorefront className="w-3 h-3" />
                      <span>官方旗舰店</span>
                    </div>
                  </div>

                  <div className="flex justify-end items-end mt-2">
                    <div onClick={(e) => e.preventDefault()} className="z-10">
                      <FavoriteButton
                        itemId={merchant.merchant_id}
                        itemType="merchant"
                        variant="icon"
                        className="shadow-none bg-transparent hover:bg-base-200 border border-base-200"
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <EmptyState type="merchant" />
          )
        )}
      </div>
    </div>
  );
}

// 空状态组件
function EmptyState({ type }: { type: 'product' | 'coupon' | 'merchant' }) {
  const config = {
    product: { icon: <HiShoppingBag className="w-10 h-10" />, text: '商品' },
    coupon: { icon: <HiTicket className="w-10 h-10" />, text: '优惠券' },
    merchant: { icon: <HiBuildingStorefront className="w-10 h-10" />, text: '店铺' },
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 text-base-content/40 space-y-4">
      <div className="w-24 h-24 bg-base-200 rounded-full flex items-center justify-center">
        {config[type].icon}
      </div>
      <p className="text-sm">暂无收藏的{config[type].text}</p>
      <Link href="/" className="btn btn-primary btn-sm btn-outline mt-4">
        去逛逛
      </Link>
    </div>
  );
}