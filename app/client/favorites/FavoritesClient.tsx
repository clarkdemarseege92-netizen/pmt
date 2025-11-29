"use client";

import { useState } from "react";
// 替换 Next.js 特有组件为标准 HTML 标签以适应预览环境
// import Link from "next/link";
// import Image from "next/image";
// 替换 react-icons 为 lucide-react
import { Store, Tag, ShoppingBag, Inbox, Building2 } from "lucide-react";
// 修复路径别名 @ 为相对路径
import FavoriteButton from "../../../components/FavoriteButton";

// 定义多语言名称类型
type MultiLangName = { th: string; en: string; [key: string]: string } | null | undefined;

const getLangName = (name: MultiLangName, lang = 'th') => name?.[lang] || name?.['en'] || "N/A";

// 定义收藏项的接口
interface FavoriteItem {
  id: string;
  item_type: 'product' | 'coupon' | 'merchant';
  item_id: string;
  // 假设 Supabase 返回的数据包含关联对象 (如果是视图) 或者你需要根据实际数据结构调整
  product?: any;
  coupon?: any;
  merchant?: any;
  // 如果是扁平化结构
  details?: any;
}

interface FavoritesClientProps {
  initialFavorites: FavoriteItem[];
}

export default function FavoritesClient({ initialFavorites }: FavoritesClientProps) {
  const [activeTab, setActiveTab] = useState<'product' | 'coupon' | 'merchant'>('product');

  // 选项卡配置
  const tabs = [
    { id: 'product', label: '商品', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'coupon', label: '优惠券', icon: <Tag className="w-4 h-4" /> },
    { id: 'merchant', label: '店铺', icon: <Store className="w-4 h-4" /> },
  ] as const;

  // 根据当前选项卡过滤数据
  const filteredFavorites = initialFavorites.filter(fav => fav.item_type === activeTab);

  return (
    <div className="w-full max-w-md mx-auto pb-20">
      {/* 顶部标题 */}
      <div className="navbar bg-base-100 sticky top-0 z-20 shadow-sm px-4 min-h-[64px]">
        <div className="flex-1">
          <h1 className="text-xl font-bold">我的收藏</h1>
        </div>
        <div className="flex-none text-sm text-base-content/60">
          共 {initialFavorites.length} 项
        </div>
      </div>

      {/* 选项卡 (DaisyUI tabs-boxed) */}
      <div className="px-4 py-4 sticky top-[64px] z-10 bg-base-100/95 backdrop-blur-sm">
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
            </a>
          ))}
        </div>
      </div>

      {/* 列表内容 */}
      <div className="px-4 space-y-4 min-h-[50vh]">
        {filteredFavorites.length > 0 ? (
          filteredFavorites.map((fav) => {
            // 解析数据逻辑
            const item = fav.product || fav.coupon || fav.merchant || {};
            const name = fav.item_type === 'merchant' ? item.shop_name : getLangName(item.name);
            const price = fav.item_type === 'product' ? (item.selling_price || item.original_price) : null;
            const image = fav.item_type === 'merchant' ? item.logo_url : item.image_urls?.[0];
            
            // 构建链接
            let link = "#";
            let typeLabel = "";
            let typeColor = "";
            
            switch (fav.item_type) {
              case 'product':
                link = `/shop/${item.merchant_id}?product=${fav.item_id}`; // 假设链接结构
                typeLabel = "商品";
                typeColor = "badge-primary";
                break;
              case 'coupon':
                link = `/coupon/${fav.item_id}`;
                typeLabel = "优惠券";
                typeColor = "badge-secondary";
                break;
              case 'merchant':
                link = `/shop/${fav.item_id}`;
                typeLabel = "店铺";
                typeColor = "badge-accent";
                break;
            }

            return (
              <a 
                key={fav.id} 
                href={link} 
                className="card card-side bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-all h-32 group overflow-hidden block"
                style={{ display: 'flex' }} // 确保 card-side 样式生效
              >
                {/* 左侧图片 */}
                <figure className="relative w-32 h-full bg-base-50 shrink-0 overflow-hidden">
                  {image ? (
                    <img 
                      src={image} 
                      alt={name || 'Favorite Item'} 
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-base-content/20 bg-base-200 gap-2">
                      <Inbox className="w-8 h-8" />
                      <span className="text-xs">无图片</span>
                    </div>
                  )}
                  {/* 类型标签 */}
                  <div className={`absolute top-1 left-1 badge badge-xs ${typeColor} text-white shadow-sm bg-opacity-90`}>
                    {typeLabel}
                  </div>
                </figure>

                {/* 右侧内容 */}
                <div className="card-body p-3 md:p-4 justify-between w-full min-w-0">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm md:text-base line-clamp-2 leading-tight" title={typeof name === 'string' ? name : ''}>
                      {name || "未知名称"}
                    </h3>
                    {fav.item_type === 'merchant' && (
                      <div className="flex items-center gap-1 text-xs text-base-content/50">
                         <Building2 className="w-3 h-3" />
                         <span>官方旗舰店</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-end mt-2">
                    {/* 价格显示 */}
                    <div>
                      {price !== null && price !== undefined ? (
                        <div className="flex flex-col">
                           <span className="text-xs text-base-content/40">价格</span>
                           <span className="text-lg font-bold text-primary">฿{price.toLocaleString()}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-base-content/50 bg-base-200 px-2 py-1 rounded">查看详情</span>
                      )}
                    </div>

                    {/* 收藏按钮 (复用组件) */}
                    <div onClick={(e) => e.preventDefault()} className="z-10">
                       <FavoriteButton 
                          itemId={fav.item_id} 
                          itemType={fav.item_type} 
                          variant="icon"
                          className="shadow-none bg-transparent hover:bg-base-200 border border-base-200"
                       />
                    </div>
                  </div>
                </div>
              </a>
            );
          })
        ) : (
          /* 空状态显示 */
          <div className="flex flex-col items-center justify-center py-20 text-base-content/40 space-y-4">
            <div className="w-24 h-24 bg-base-200 rounded-full flex items-center justify-center">
              {activeTab === 'product' && <ShoppingBag className="w-10 h-10" />}
              {activeTab === 'coupon' && <Tag className="w-10 h-10" />}
              {activeTab === 'merchant' && <Store className="w-10 h-10" />}
            </div>
            <p className="text-sm">暂无收藏的{tabs.find(t => t.id === activeTab)?.label}</p>
            <a href="/" className="btn btn-primary btn-sm btn-outline mt-4">
              去逛逛
            </a>
          </div>
        )}
      </div>
    </div>
  );
}